/*
Copyright 2002-2019 Intel Corporation.

This software and the related documents are Intel copyrighted materials, and
your use of them is governed by the express license under which they were
provided to you (License). Unless the License provides otherwise, you may not
use, modify, copy, publish, distribute, disclose or transmit this software or
the related documents without Intel's prior written permission.

This software and the related documents are provided as is, with no express or
implied warranties, other than those that are expressly stated in the License.
*/

var DumpTrace;
if(typeof(Duktape) == "object")
{
    Log("Duktape infrastructure configuring");
    var Origin = function() {'use duk notail'; return FileSystem.AbsPath(Duktape.act(-3).function.fileName);};
    Origin.Directory = function() {'use duk notail'; return FileSystem.Directory(Duktape.act(-3).function.fileName);};
    Origin.File = function() {'use duk notail'; return FileSystem.FileName(Duktape.act(-3).function.fileName);};

    DumpTrace = function(deep)
    {
        for(var i = -1; -deep < i && Duktape.act(i); i--)
        {
            var t = Duktape.act(i);
            Log(t.function.name + " : " + t.function.fileName + " : " + t.lineNumber);
        }
    };
    
    safecall = function(f1, f2)
    {
        if(typeof(f1) == "function")
        {
            try
            {
                return f1();
            }catch(e)
            {
                Log(Log.l_error, "Exception handled: " + e.stack);
                if(typeof(f2) == "function")
                    return f2();
                else
                    return;
            }
        }
    };
}
else if(GetOpt.Exists("chakra"))
{
    var DumpTrace;
    var ns = this;
    DumpTrace = function(deep)
    {
        var filter = function(coll, cb)
        {
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
        };

        var s = StackTrace(deep);
        filter(s, function(v) {Log(FileSystem.FileName(v.scriptName) + " : " + v.lineNumber + " : " + v.functionName);});
    };
    safecall = function(f1, f2)
    {
        if(typeof(f1) == "function")
        {
            try
            {
                return f1();
            }catch(e)
            {
                Log(Log.l_error, "Exception handled: " + e.stack);
                if(typeof(f2) == "function")
                    return f2();
                else
                    return;
            }
        }
    };
    var get_script_name = function()
    {
        var script_name = null;
        try
        {
            throw new Error();
        }
        catch(e)
        {
            var stack_frames = e.stack.split('\n');
            if(stack_frames.length >= 4)
            {
                var regexp = /\((.*):[\d]*:[\d]*\)/g;
                var stack_frame = regexp.exec(String(stack_frames[3]));
                if(stack_frame && stack_frame.length > 0)
                {
                    Log("Script name requested: " + stack_frame[1]);
                    script_name = stack_frame[1];
                }
            }
        }
        return script_name;
    }
    ns.Origin = function()
    {
        return FileSystem.AbsPath(get_script_name());
    };
    ns.Origin.Directory = function() {
        return FileSystem.Directory(get_script_name());
    };
    ns.Origin.File = function()
    {
        return FileSystem.FileName(get_script_name());
    };

}
else
{
    DumpTrace = function(deep)
    {
        var filter = function(coll, cb)
        {
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
        };

        var s = StackTrace(deep);
        filter(s, function(v) {Log(FileSystem.FileName(v.scriptName) + " : " + v.lineNumber + " : " + v.functionName);});
    };
}

//###############################################################
var required = function()
{
    var func_cache = {};

    var load = function(file)
    {
        var name;
        if(FileSystem.Exists(file))
        {
            name = FileSystem.FileName(file).toLowerCase();
            if(name)
            {
                var files = func_cache[name];
                if(files)
                {
                    for(var i in files)
                    {
                        if(FileSystem.Same(files[i].file, file))
                            return files[i].obj;
                    }
                }
            }
        }

        var obj = Execute.JScript(file);
        if(obj && name)
        {
            var f = {file:file, obj:obj};
            if(!func_cache[name])
                func_cache[name] = [];
            func_cache[name].push(f);
        }
        return obj;
    }

    return load;
}();

var execute = function(file)
{
    return Execute.JScript(file);
};

/** @function ALog
    *  @brief Advanced logging based on input arguments
    *  @details Basically, that's just a wrapper for 'Log' function
    *  @attr message_type exposure - determines whether it is info (default), warning, error or critical
    *  @attr String string - contains string that will be transmitted to 'Log'
    *  @return nothing
    *  @see Log implementation for details
    */
var ALog = function()
{
    var string = ""; //initialize with empty
    var exposure = Log.l_info; //info by default
    var debug_log_opt = "show-extended-log";

    switch(arguments.length)
    {
    case 0:
        return;
    case 1: //only one arguments was specified
        string = arguments[0]; //that must be a string
        break;
    default: //two or more
        exposure = arguments[0]; //in that case, the first one is exposure
        string = arguments[1]; //the second is the string
        for(var i = 2; i < arguments.length; i++)
            string += " " + arguments[i]; //the rest must be concatenation
    }
    if(exposure === "debug" && Log.l_debug)
        exposure = Log.l_debug; 
    if(exposure === "debug") //if the first argument is the string which says "debug"
    {
        if(GetOpt.Exists(debug_log_opt)) //check if debug option is specified
            Log(Log.l_info, string); //if yes, we will show message with type 'Info' without deleting stuff inside curly brackets

        return;//if the option is not specified, do not show the message
    }

    Log(exposure, string.replace(/[\n\r]*\{[\S\s]*\}/g, ""));
};

this.ConfigDir = function()
{
    var config_dir = null;
    var config_dir_calc = function()
    {
        if (config_dir)
            return config_dir;
        
        var get_config_dir = function()
        {
            var product_opt = "product";
            var config_name = "config";
            if(GetOpt.Exists(product_opt) && GetOpt.Get(product_opt))
            {
                return FileSystem.MakePath(GetOpt.Get(product_opt), Cache.CacheDir());
            }
            else
            {
                return FileSystem.MakePath(config_name, FileSystem.exe_dir);
            }
        }
        config_dir = get_config_dir();
        return config_dir;
    }
    return config_dir_calc;
}();

this.Folders = {};
this.Folders.Config = function(){return ConfigDir() + "/";};
this.Folders.Base = function(){return FileSystem.MakePath("Base", ConfigDir()) + "/"};
this.Folders.Scenario = function(){return FileSystem.MakePath("Scenario", ConfigDir()) + "/"};
this.Folders.PreRequisites = function(){return FileSystem.MakePath("PreRequisites", ConfigDir()) + "/"};
this.Folders.ProductConfig = function(){return FileSystem.MakePath("ProductConfig", ConfigDir()) + "/"};
this.Folders.DialogsWpf = function(){return FileSystem.MakePath("Dialogs/wpf", ConfigDir()) + "/"};

new function()
{
    var product_opt = "product";
    var init_name   = "init.js";

    var StartDir = ConfigDir();
    var ScriptToStart = null;
    if(GetOpt.Exists(product_opt) && GetOpt.Get(product_opt))
    {
        Log("   Start directory: " + StartDir);
        StringList.Load(StartDir);
    }
    else
    {
        Log("Launch from media. Start directory: " + StartDir);
    }
    
    ScriptToStart = FileSystem.MakePath(init_name, StartDir);
    Log("Script to start: " + ScriptToStart);

    if( FileSystem.Exists(ScriptToStart) )
    {
        var starter = required(ScriptToStart);
        if(starter)
        {
            var ret = Action.r_ok;

            if(Cache.Cached())
            {
                Log("Cache processing starting...");
                 ret = safecall(function(){return starter.Cache(true);},
                                   function(){Log(Log.l_error, "Exception handled calling init.Cache"); return Action.r_error;});
            }
            else
            {
                Log("Media processing starting...");
                ret = safecall(function(){return starter.Media(true);},
                                   function(){Log(Log.l_error, "Exception handled calling init.Media"); return Action.r_error;});
            }

            Log("Return code: " + ret);
            switch(ret)
            {
            case Action.r_ok:
                System.ExitCode(0); // exitcode_t.success
                break;                 
            case Action.r_error:       
                System.ExitCode(2); // exitcode_t.error
                break;                 
            case Action.r_cancel:      
                System.ExitCode(4); // exitcode_t.canceled
                break;                 
            case Action.r_reboot:      
                System.ExitCode(5); // exitcode_t.reboot_required
                break;
            default:
                System.ExitCode(ret);
                break;
            }
        }
    }
    else
    {
        Log(Log.l_critical, "Script file doesn't exist. Abort");
        System.ExitCode(1); // exitcode_t.failed
    }
}

Log("MICL script execution complete. Thank you.");
