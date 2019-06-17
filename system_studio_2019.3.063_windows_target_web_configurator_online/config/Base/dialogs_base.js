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
    // Load
    //###############################################################
    this.Load = function(_dir)
    {
        Log("Loading dialog scripts");
        var dir = _dir ? _dir : FileSystem.MakePath("../dialogs", Origin.Directory());

        Log("Loading dialog scripts, using directory: ", dir);

        var files = FileSystem.FindFiles(dir, "*.js");

        for(var i in files)
        {
            var item = files[i];
            var file = FileSystem.MakePath(item, dir);
            var dialog = required(file);

            if(dialog && dialog.Init && typeof(dialog.Init) == "function")
                dialog.Init.call(ns);
        }
    }
    
    //###############################################################
    // StageSuite (defines set of banners)
    //###############################################################
    var stage_suite = "";
   
    this.StageSuite = function(suite)
    {
        if (typeof(suite) != "undefined")
            stage_suite = suite;
        
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
}

