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

new function()
{
    var ns = this;
    var mkpath = FileSystem.MakePath;
    var config = function(name) {return mkpath(name, Origin.Directory() + "/..");};
    var format = StringList.Format;
    var load = function(name) {return required(mkpath(name, Origin.Directory()));};
    var base = function(name) {return load("../Base/" + name);};
    var dialogs = function(name) {return load("../Dialogs/" + name);};

    var ns_wpf;
    var ns_window;
    var ns_layout;
    var ns_errhan;
    var ns_win_dialog;

    if(typeof (WPF) != "undefined")
    {
        dialogs = function(name) {return load("../Dialogs/wpf/" + name);};
        ns_wpf    = base("wpf.js");
        ns_window = dialogs("window.js");
        ns_layout = dialogs("layout.js");
        ns_errhan = dialogs("error_handler.js");
        ns_win_dialog = dialogs("win_dialog.js");
    }

    this.next = function(txt)
    {
        Wizard.Notify("next", "set text", txt);
    }

    this.prev = function(txt)
    {
        Wizard.Notify("prev", "set text", txt);
    }

    this.cancel = function(txt)
    {
        Wizard.Notify("cancel", "set text", txt);
    }

    this.button4 = function(txt)
    {
        Wizard.Notify("button4", "set text", txt);
    }

    this.buttons = function(n, p, c, b4)
    {
        if(n)
            this.next(n);

        if(p)
            this.prev(p);

        if(c)
            this.cancel(c);

        if(b4)
            this.button4(b4);
    }
    this.Buttons = this.buttons;

    //###############################################################
    // Title
    //###############################################################
    this.Title = function(product_title)
    {
        Wizard.Notify("title", "set text", product_title);
    }
    this.Title.BigIcon = function( icon_path )
    {
        if(icon_path)
            Wizard.Notify("title", "set big icon", icon_path);
    }
    this.Title.SmallIcon = function( icon_path )
    {
        if(icon_path)
            Wizard.Notify("title", "set small icon", icon_path);
    }
    //###############################################################
    // Header
    //###############################################################
    var header_template_file = mkpath("header.rtf", config(format("[templates_location]")));
    var header_template = FileSystem.ReadFileUTF8( FileSystem.Exists(header_template_file) ? header_template_file : mkpath("header.rtf", config("Templates")) );
    var header = "";
    var subheader = "";

    this.HeaderTemplate = function(path)
    {
        if(FileSystem.Exists(path))
        {
            if(!FileSystem.IsDirectory(path))
            {
                header_template = FileSystem.ReadFileUTF8(path);
            }
            else
                Log(Log.l_error, "HeaderTemplate: target path is directory: " + path);
        }
        else
            Log(Log.l_error, "HeaderTemplate: target file doesn't exist: " + path);
    }

    var update = function()
    {
        Wizard.Notify("header", "set rtf text", StringList.Format(header_template, header, subheader));
    }

    this.Header = function(str)
    {
        header = str;
        update();
    }

    this.SubHeader = function(str)
    {
        subheader = str;
        update();
    }

    var headers = {};

    this.DialogHeader = function(dialog, _header, _subheader)
    {
        if(dialog)
        {
            if(_header || _subheader)
            {
                if(!headers[dialog])
                    headers[dialog] = {};
                if(_header)
                    headers[dialog].header = _header;
                if(_subheader)
                    headers[dialog].subheader = _subheader;
            }
            else
            {
                if(headers[dialog])
                {
                    ns.Header(headers[dialog].header);
                    ns.SubHeader(headers[dialog].subheader);
                }
            }
        }
    }
    
    //###############################################################
    // Installer
    //###############################################################
    var installer;

    this.Installer = function(inst)
    {
        if(inst)
            installer = inst;
        else
            return installer;
    }

    var product;

    this.Product = function(prod)
    {
        if(prod)
            product = prod;
        else
            return product;
    }

    //###############################################################
    // Load
    //###############################################################

    this.Load = function(acts, prod)
    {
        //copy initial keys
        for(var key in ns)
            acts[key] = ns[key];
        
        Log("Loading dialog scripts in Actions context");
        var dialog_window = ns_win_dialog.Window();        
        var dir = (dialog_window ? FileSystem.MakePath("../dialogs/wpf", Origin.Directory()) : FileSystem.MakePath("../dialogs", Origin.Directory()));
        acts.Window = dialog_window ? dialog_window : null;
        
        Log("Loading dialog scripts, using directory: ", dir);

        var files = FileSystem.FindFiles(dir, "*.js");

        //in the zero loop we are building Controls
        for(var i in files)
        {
            var item = files[i];
            var file = FileSystem.MakePath(item, dir);
            var obj = required(file);

            //base level - a suite of controls
            if(obj && obj.BuildControls && typeof(obj.BuildControls) == "function")
                obj.BuildControls.call(acts, prod);
        }
        //in the first loop we're calling 'Init' method from all files
        for(var i in files)
        {
            var item = files[i];
            var file = FileSystem.MakePath(item, dir);
            var obj = required(file);

            if(obj && obj.Init && typeof(obj.Init) == "function")
                obj.Init.call(acts, prod);
        }

        //in the second -- 'BuildWidgets' method
        for(var i in files)
        {
            var item = files[i];
            var file = FileSystem.MakePath(item, dir);
            var obj = required(file);

            //base level - a suite of controls
            if(obj && obj.BuildWidgets && typeof(obj.BuildWidgets) == "function")
                obj.BuildWidgets.call(acts, prod);
        }

        //in the last -- 'BuildDialogs'
        for(var i in files)
        {
            var item = files[i];
            var file = FileSystem.MakePath(item, dir);
            var obj = required(file);

            //second level - the dialog is built using widgets
            if(obj && obj.BuildDialogs && typeof(obj.BuildDialogs) == "function")
                obj.BuildDialogs.call(acts, prod);
        }
        
        

    }

    //###############################################################
    // StageSuite (defines set of banners)
    //###############################################################
    var stage_suite = "";
    var prev_stage_suite = "";

    this.StageSuite = function(suite)
    {
        if (typeof(suite) != "undefined"){
            stage_suite = suite;
            if(typeof (WPF) != "undefined")
                ns_win_dialog.SetStage(suite); //it actually does nothing at the moment
        }

        return stage_suite;
    }
    //###############################################################
    // Stage
    //###############################################################
    var stage_directory = config(format("[banners_location]"));
    var stage_directory_default = config("Banners");

    //Log("stage_dir = " + stage_directory);
    //Log("stage_dir_def = " + stage_directory_default);

    this.Stage = function(file)
    {
        var stage_file = mkpath(file, stage_suite);
        var res_file = mkpath(stage_file, stage_directory);

        if(!FileSystem.Exists(res_file))
        {
            res_file = mkpath(stage_file, stage_directory_default);
        }
        if(!FileSystem.Exists(res_file))
        {
            res_file = mkpath(file, stage_directory);
        }
        if(!FileSystem.Exists(res_file))
        {
            res_file = mkpath(file, stage_directory_default);
        }
        Wizard.Notify("background", "set text", res_file);
    }

    this.Stage.Directory = function(dir)
    {
        stage_directory = dir;
    }
    // for backward compatibility
    this.stage = this.Stage;

}

