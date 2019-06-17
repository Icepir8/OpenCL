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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns_wpf = base("wpf.js");
    var ns_window = load("window.js");
    var ns_errhan = load("error_handler.js");
    var ns_layout = load("layout.js");
    var ns = this;
    
    var set_stage_suite = function(suite)
    {
        var stages = [];
        switch(suite)
        {
            case "suite_install":
                stages = [
                    {id: "welcome",      name: StringList.Format("[left_getting_started]") },
                    {id: "license",      name: StringList.Format("[left_license_agreement]") },
                    ns.ActivationManager ? {id: "activation",   name: StringList.Format("[left_license_activation]") } : {},
                    {id: "options",      name: StringList.Format("[left_options]") },
                    {id: "installation", name: StringList.Format("[left_installation]") },
                    {id: "complete",     name: StringList.Format("[left_complete]") },
                ];
                break;
            case "suite_online":
                stages = [
                    {id: "welcome",      name: StringList.Format("[left_getting_started]") },
                    {id: "license",      name: StringList.Format("[left_license]") },
                    {id: "options",      name: StringList.Format("[left_options]") },
                    {id: "installation", name: StringList.Format("[left_installation]") },
                    {id: "complete",     name: StringList.Format("[left_complete]") },
                ];
                break;
            case "suite_download":
                stages = [
                    {id: "welcome",      name: StringList.Format("[left_getting_started]") },
                    {id: "options",      name: StringList.Format("[left_options]") },
                    {id: "installation", name: StringList.Format("[left_downloading]") },
                    {id: "complete",     name: StringList.Format("[left_complete]") },
                ];
                break;
            default:
                stages = [
                    {id: "welcome",      name: StringList.Format("[left_welcome]") },
                    {id: "license",      name: StringList.Format("[left_license]") },
                    ns.ActivationManager ? {id: "activation",   name: StringList.Format("[left_activation]") } : {},
                    {id: "options",      name: StringList.Format("[left_options]") },
                    {id: "installation", name: StringList.Format("[left_installation]") },
                    {id: "complete",     name: StringList.Format("[left_complete]") },
                ];
                break;
        }
        return stages;
    }

    var window_handle = null;
    this.WindowHandle = function(input_handle) //this function returns current window handle and sets input if any
    {
        if(input_handle)
            window_handle = input_handle;
        return window_handle;
    }

    this.Window = function()
    {
        var window = null;
        if(!this.WindowHandle()) //need this check to avoid spamming new window for each dialog
        {
            var window = ns_window.Window(ns_layout.Lefted());
            window.Window().onLoaded = function(){Wizard.Notify("splash", "hide");};
            ns_errhan.Window(window);
            this.WindowHandle(window);
        }
        else
            window = this.WindowHandle();

        return window;
    }

    this.SetStage = function(stage)
    {
        return set_stage_suite(stage);
    }

    this.Dialog = function(d)
    {
        var w = ns.Window();
        if (!w)
            return;

        return w.Dialog(d);
    }
 };
