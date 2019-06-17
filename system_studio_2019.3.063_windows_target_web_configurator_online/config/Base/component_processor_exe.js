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

new function ()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns_proc = load("component_processor.js");

    var db_only = function() {return GetOpt.Exists("db-processor");}


    /*
        registry version
        registry uninstall string
        registry existence - key/value/type (filesystem, none)
        exit codes
        ignore errors
        --------------------------
        RegRoot == 'HKLM'
        RegWow  == true/1
        RegKey   - no default value
        RegValue - no default value

        Version**
        UninstallString**
        Exists**

        Example:
          <property name="RegRoot">HKLM</property>
          <property name="RegKey">SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{0C8AD5CD-FE2D-4DA2-B6CE-0F0412B5CE71}_is1</property>
          <property name="VersionRegValue">DisplayVersion</property>
          <property name="UninstallStringRegValue">QuietUninstallString</property>
          <property name="ExistsRegValue">InstallLocation</property>

    */

    var format = StringList.Format;
    
    var parseBoolean = function(string) 
    {
        if(typeof(string) == "undefined")
            return false;
        switch (String(string).toLowerCase()) 
        {
            case "false":
            case "0":
            case "no":
            case "n":
            case "":
                return false;
            default:
                return true;
        }
    }

    var parse_cmd = function(string)
    {
        //example
        //"C:\Program Files (x86)\Intel\Phone Flash Tool Lite\unins000.exe" /SILENT
        if (typeof(string) == "undefined") return null;
        if (String(string) == "") return null;
        Log("parse_cmd " + string);
        //if the first symbol is quote - find the pair to it
        //if the first symbol is not quote - find the first space
        var obj = {}; 
        var res = string.match(/\".*\"/);
        if (res === null)
           res = string.match(/'.*'/);
        var exe;
        if (res === null)
        {
            //first space
            var ind = string.search(/ /);
            if (ind != -1) 
                exe = string.substr(0, ind);
            else
                exe = string;
        }
        else
        {
            exe = res[0];
        }    
        if (exe == "" || exe == string)
        {
            //string doesn't contain parameters
            obj.exe = string;
            obj.params = "";
            obj.command = string;
            return obj;
        }
        obj.exe = exe;
        obj.params = string.substring(exe.length + 1);
        obj.command = string;
        return obj;
    }

    //###################################################################################
    // EXE processor
    //###################################################################################
    this.ProcessorExe = function()
    {
        if(db_only())
            return ns_proc.ProcessorDB();

        var exe_proc = ns_proc.Processor();
        var self = exe_proc;

        var need_UAC = function()
        {
            if(exe_proc.Owner() && exe_proc.Owner().Info())
            {
                var info = exe_proc.Owner().Info();
                var res = parseBoolean(info.Property("need_UAC"));
                return res;
            }
            return false;
        }
        
        var get_value = function(name)
        {
            if(name && exe_proc.Owner() && exe_proc.Owner().Info())
            {
                var info = exe_proc.Owner().Info();

                var get_val = function(_name)
                {
                    if(typeof(info.Property(_name + "RegValue")) != "undefined")
                        return info.Property(_name + "RegValue");
                    return null;
                }

                var get_reg = function(_name)
                {
                    var key_name = null;
                    var root_name = null;
                    var wow = null;
                    
                    if(info.Property(_name + "RegKey"))
                        key_name = info.Property(_name + "RegKey");
                    else if(info.Property("RegKey")) // using default reg key
                        key_name = info.Property("RegKey");
                    else
                        return null;

                    if(info.Property(_name + "RegRoot"))
                        root_name = info.Property(_name + "RegRoot");
                    else if(info.Property("RegRoot"))
                        root_name = info.Property("RegRoot")
                    else
                        root_name = "HKLM";

                    if(info.Property(_name + "RegWow"))
                        wow = info.Property(_name + "RegWow");
                    else if(info.Property("RegWow"))
                        wow = info.Property("RegWow")
                    else
                        wow = true;

                    var reg = Registry(root_name, key_name);
                    if(wow == "false" || wow == "0")
                        reg.WowRedirect(false);
                    return reg;
                }

                var value_name = get_val(name);
                if(value_name)
                {
                    var reg = get_reg(name);
                    if(reg && reg.Exists())
                        return reg.Value(value_name);
                }
            }

            return null;
        }

        exe_proc.IsInstalled = function()
        {
            //Log("Exe component: check for existence");
            var owner = exe_proc.Owner();
            if(owner && owner.Info())
            {
                //Log("Exe component: " + owner.Name());
                var info = owner.Info();

                var ex = get_value("Exists");
                if(ex)
                {
                    var ex_file = info.Property("ExistsFile");
                    if(ex_file)
                    {
                        var p = FileSystem.AbsPath(ex, ex_file);
                        if(!FileSystem.Exists(p))
                            return false;
                    }

                    var ver = get_value("Version");
                    if(ver)
                        return owner.Version().eq(ver);
                }
            }

            return false;
        }

        exe_proc.ActualVersion = function()
        {
            return get_value("Version");
        }

        var install_cmd = function() 
        {
            var cmp = exe_proc.Owner();
            var data = {};
            data["component.name"]      = cmp.Name();
            data["component.id"]        = cmp.Id();
            data["component.version"]   = cmp.Version().Format();
            data["component.path"]      = cmp.InstallDir();
            data["component.path.base"] = cmp.InstallDir.Base();
            data["component.path.own"]  = cmp.InstallDir.Own();
            var params = StringList.FormatNamed(exe_proc.InstallParams(), data);
            
            var obj = {}; 
            obj.exe = '"' + exe_proc.Owner().Source().File() + '"';
            obj.params = params; //exe_proc.InstallParams();
            obj.command = '"' + exe_proc.Owner().Source().File() + '" ' + params;//exe_proc.InstallParams();
            return obj;
        }
        var remove_cmd = function()
        {
            var cmd = get_value("UninstallString");
            if(cmd)
            {
                var obj = parse_cmd(cmd);
                var args = exe_proc.RemoveParams();
                if(args)
                {
                    obj.params = obj.params + " " + args;
                    obj.command = obj.command + " " + args;
                }
                return obj;
            }
            return null;
        }

        var failed = function(code, ignore_codes_txt)
        {
            if(code && ignore_codes_txt)
            {
                Log("Process exit code: " + code);
                var ignore = [];
                var ar = ignore_codes_txt.split(/\D+/);
                for(var i in ar)
                    ignore.push(parseInt(ar[i]));

                for(var k in ignore)
                    if(code == ignore[k])
                    {
                        Log("  Ignored due to config");
                        return false;
                    }
                return true;
            }
            return code ? true : false;
        }
        
        var schedule_reboot = function(code, reboot_codes_txt)
        {
            if(code && reboot_codes_txt)
            {
                Log("Process exit code: " + code);
                var rb = [];
                var ar = reboot_codes_txt.split(/\D+/);
                for(var i in ar)
                    rb.push(parseInt(ar[i]));

                for(var k in rb)
                    if(code == rb[k])
                    {
                        Log("  Reboot is scheduled due to config");
                        return true;
                    }
                return false;
            }
            return false;
        }


        exe_proc.InstallAct = function()
        {
            var cmd_exe = install_cmd();

            var prg = Progress();
            prg.total = -1;
            prg.message = format("[installing]", exe_proc.Owner().Info().Name());

            var exe = {};

            exe.Apply = function()
            {
                Log("Install launch cmd: " + cmd_exe.command);
                var res = null;
                if (need_UAC())
                    res = ShellExecute(cmd_exe.exe, cmd_exe.params, "runas", true);
                else
                    res = CreateProcess(null, cmd_exe.command, true);
                Log("   res.output = " + res.output);
                Log("   res.exitcode = " + res.exitcode);
                Log("   res.failed = " + res.failed);
                Log("   res.error = " + res.error);

                var ignore_errors = false;
                var ignore_codes = "";
                var reboot_codes = "";
                var info = null;
                
                if(exe_proc.Owner() && exe_proc.Owner().Info())
                {
                    info = exe_proc.Owner().Info();
                    if(info.Property("InstallIgnoreErrors"))
                        ignore_errors = (info.Property("InstallIgnoreErrors") == "true");
                    else if(info.Property("IgnoreErrors"))
                        ignore_errors = (info.Property("IgnoreErrors") == "true");

                    if(info.Property("InstallIgnoreCodes"))
                        ignore_codes = info.Property("InstallIgnoreCodes");
                    else if(info.Property("IgnoreCodes"))
                        ignore_codes = info.Property("IgnoreCodes");
                                            
                    if(info.Property("InstallRebootCodes"))
                        reboot_codes = info.Property("InstallRebootCodes");
                    else if(info.Property("RebootCodes"))
                        reboot_codes = info.Property("RebootCodes");
                }
             
                if (reboot_codes)
                {
                    if(ignore_codes)
                        ignore_codes = ignore_codes + ";" + reboot_codes;
                    else
                        ignore_codes = reboot_codes;
                }

                if(!ignore_errors && (res.failed || failed(res.exitcode, ignore_codes)))
                {
                    var err = {message: format("[exe_failed]"), details: []};
                    err.details.push(format("[exe_failed_name]", String(FileSystem.FileName(exe_proc.Owner().Source().File())).replace(/\\/g, "\\\\")));
                    if(res.failed)
                        err.details.push(format("[exe_failed_to_start]"));

                    if(res.exitcode)
                        err.details.push(format("[exe_failed_result]", res.exitcode));

                    if(res.error)
                        err.details.push(res.error);

                    GlobalErrors.Add(err.message);
                    for(var i in err.details)
                        GlobalErrors.Add(err.details[i]);

                    exe.Rollback();
                    exe.Error = function() {return err;}
                    return Action.r_error;
                }
                
                if(schedule_reboot(res.exitcode, reboot_codes))
                {
                    //Register reboot option
                    var ns_inst = load("Installer.js");
                    ns_inst.Installer.RebootRequired(true);
                    if (info && info.Property("RebootReason")) 
                    {
                         ns_inst.Installer.RebootReasons.Add(info.Property("RebootReason"));
                         Log("Reboot is scheduled with reason: " + info.Property("RebootReason"));
                    }
                    else 
                        Log("infor.Property RebootReason is empty");
                }

                return Action.r_ok;
            }

            exe.Rollback = function()
            {
                if(exe_proc.IsInstalled())
                {
                    var rmv_exe = remove_cmd();
                    if(!rmv_exe)
                        return Action.r_ok;
                    Log("Rollback launch cmd: " + rmv_exe.command);
                    var res = null;
                    if (need_UAC())
                        res = ShellExecute(rmv_exe.exe, rmv_exe.params, "runas", true);
                    else
                        res = CreateProcess(null, rmv_exe.command, true);
                    Log("   res.output = " + res.output);
                    Log("   res.exitcode = " + res.exitcode);
                    Log("   res.failed = " + res.failed);
                }
                else
                    Log("Rollback: component is not installed. Skip.");

                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            return exe;
        }

        exe_proc.RemoveAct = function ()
        {
            var cmd_exe = remove_cmd();

            var prg = Progress();
            prg.total = -1;
            prg.message = format("[removing]", exe_proc.Owner().Info().Name());

            var exe = {};

            exe.Apply = function()
            {
                if(exe_proc.IsInstalled())
                {
                    if(!cmd_exe)
                        return Action.r_ok;
                    Log("Remove launch cmd: " + cmd_exe.command);
                    var res = null;
                    if (need_UAC())
                        res = ShellExecute(cmd_exe.exe, cmd_exe.params, "runas", true);
                    else
                        res = CreateProcess(null, cmd_exe.command, true);
                    Log("   res.output = " + res.output);
                    Log("   res.exitcode = " + res.exitcode);
                    Log("   res.failed = " + res.failed);
                    
                    var ignore_errors = false;
                    var ignore_codes = "";
                    var reboot_codes = "";
                    
                    var info = null;

                    if(exe_proc.Owner() && exe_proc.Owner().Info())
                    {
                        info = exe_proc.Owner().Info();
                        if(info.Property("RemoveIgnoreErrors"))
                            ignore_errors = (info.Property("RemoveIgnoreErrors") == "true");
                        else if(info.Property("IgnoreErrors"))
                            ignore_errors = (info.Property("IgnoreErrors") == "true");
                        else
                            ignore_errors = false;

                        if(info.Property("RemoveIgnoreCodes"))
                            ignore_codes = info.Property("RemoveIgnoreCodes");
                        else if(info.Property("IgnoreCodes"))
                            ignore_codes = info.Property("IgnoreCodes");
                                            
                        if(info.Property("RemoveRebootCodes"))
                            reboot_codes = info.Property("RemoveRebootCodes");
                        else if(info.Property("RebootCodes"))
                            reboot_codes = info.Property("RebootCodes");
                    }
                    
                    if (reboot_codes)
                    {
                        if(ignore_codes)
                            ignore_codes = ignore_codes + ";" + reboot_codes;
                        else
                            ignore_codes = reboot_codes;
                    }

                    if(!ignore_errors && (res.failed || failed(res.exitcode, ignore_codes)))
                    {
                        GlobalErrors.Add(format("[exe_failed]"));
                        GlobalErrors.Add(format("[exe_failed_name]", String(cmd_exe.command).replace(/\\/g, "\\\\")));

                        if(res.failed)
                            GlobalErrors.Add(format("[exe_failed_to_start]"));

                        if(res.exitcode)
                            GlobalErrors.Add(format("[exe_failed_result]", res.exitcode));

                        //this.Rollback(); // no rollback for remove action
                        return Action.r_error;
                    }
                    
                    if(schedule_reboot(res.exitcode, reboot_codes))
                    {
                        //Register reboot option
                        var ns_inst = load("Installer.js");
                        ns_inst.Installer.RebootRequired(true);
                        if (info && info.Property("RebootReason")) 
                        {
                             ns_inst.Installer.RebootReasons.Add(info.Property("RebootReason"));
                             Log("Reboot is scheduled with reason: " + info.Property("RebootReason"));
                        }
                        else 
                            Log("infor.Property RebootReason is empty");
                    }
                  
                }

                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            return exe;
        }

        return exe_proc;
    }
}
