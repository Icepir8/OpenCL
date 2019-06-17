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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../../Base/" + name);};
    
    var ns_event = base("event.js");

    this.Init = function()
    {
        var ns = this;

        var ns_wpf   = base("wpf.js");
        var ns_inst  = base("installer.js");
        var ns_deco  = load("decorator.js");
        var ns_fin   = load("files_in_use.js");
        var ns_sus   = load("suspend.js");

        var format = StringList.Format;

        var timeout = 0;
        var billboards = [];
        var billboards_url = "";
        var controls = [];
        
        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();

        var download_error_handler_dialog = function()
        {
            var s = ns.Window.Taskbar.State();
            var _msg = {
                control: "FlowDocument",
                name: "m_document",
                fontSize: 14,
                blocks: [
                    {
                        control: "Paragraph",
                        inlines: [format("[download_error_description]")]
                    },
                ]
            };

            var msg = Wizard.BuildControl(_msg);

            ns.SingleMessage.EnablePrev(false);
            ns.SingleMessage.SetTitle(format("[download_error_header]"));
            ns.SingleMessage.SetMessage(msg);
            ns.Window.Taskbar.State("paused");

            switch(ns.Window.Spawn(ns.SingleMessage))
            {
                case Action.r_ok:
                    ns.Window.Taskbar.State(s);
                    return "retry";
                case Action.r_back:
                    ns.Window.Taskbar.State(s);
                    return "ignore";
                case Action.r_cancel:
                    ns.Window.Taskbar.State(s);
                    return "cancel";
                default:
                    return "cancel";
            }
        };

        var connect_disconnect = function(c, cmd, id)
        {
            var name = c == "Progress2" ? "m_progress2" : "m_progress1";
            for(var control in controls)
            {
                var ctl = controls[control];
                if(!ctl.js[name])
                    continue;

                var progid = ctl.js[name].id;
                var prg = Progress(progid);
                if(prg)
                {
                    prg.Disconnect();
                    if(cmd == "connect"){
                        prg.Connect(id);
                        prg.backward = StringList.Format("[flow_direction]") == "rightToLeft" ? !prg.backward : prg.backward;
                    }
                }
            }
        };

        var set_header = function(id, notify, value)
        {
            var name = id == "Progress2" ? "m_header2" : "m_header1";
            for(var control in controls)
            {
                var ctl = controls[control];
                if(!ctl.js[name])
                    continue;

                var header = ctl.js[name];
                if(value)
                    header.text = value;
            }
        };
        
        var set_title = function(id, notify, value)
        {
            var name = "m_title";
            for(var control in controls)
            {
                var ctl = controls[control];
                if(!ctl.js[name])
                    continue;

                var title = ctl.js[name];
                if(value)
                    title.text = value;
            }
        };
        
        Wizard.Subscribe("Progress", "title", set_title);        

        Wizard.Subscribe("Progress1", "header", set_header);
        Wizard.Subscribe("Progress1", "connect", connect_disconnect);
        Wizard.Subscribe("Progress1", "disconnect", connect_disconnect);

        Wizard.Subscribe("Progress2", "header", set_header);
        Wizard.Subscribe("Progress2", "connect", connect_disconnect);
        Wizard.Subscribe("Progress2", "disconnect", connect_disconnect);

        Wizard.Subscribe("ProgressBillboard", "url", function(id, notify, value){billboards_url = value;});
        Wizard.Subscribe("ProgressBillboard", "timeout", function(id, notify, value){timeout = parseInt(value) * 3000;});
        Wizard.Subscribe("ProgressBillboard", "add file", function(id, notify, value){billboards.push(value);});

        var _Progress_ = function(progress_name)
        {
            var title = format("[subtitle_install]");

            var _progress0 =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: {left: widget_left, top: widget_top, right: widget_left, bottom:  widget_top},
                stage: "installation",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: medium_font,
                                //fontWeight: "bold",
                                margin: {bottom: widget_top},
                                text: title,
                                name: "m_title",
                            }
                        ]
                    },
                    {
                        control: "TextBlock",
                        valign: "center",
                        halign: "center",
                        GridRow: 1,
                        text: format("[Wait]")
                    }
                ]
            };

            var _progress1 =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: {left: widget_left, top: widget_top, right: widget_left, bottom:  widget_top},
                stage: "installation",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: medium_font,
                                //fontWeight: "bold",
                                margin: {bottom: widget_top},
                                text: title,
                                name: "m_title",
                            }
                        ]
                    },
                    {
                        control: "StackPanel",
                        //valign: "center",
                        GridRow: 1,
                        children: [
                            {
                                control: "TextBlock",
                                margin: {bottom: 5},
                                height: 48,
                                wrap: "wrap",
                                name: "m_header1"
                            },
                            {
                                control: "TextBlock",
                                margin: {bottom: 5},
                                inlines: [{name: "m_message1"}]
                            },
                            {
                                control: "ProgressBar",
                                height: 10,
                                foreground: "#FF006EC1",
                                margin: {bottom: 5},
                                name: "m_progress1"
                            },
                        ]
                    }
                ]
            };

            var _progress2 =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: {left: widget_left, top: widget_top, right: widget_left, bottom:  widget_top},
                stage: "installation",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: medium_font,
                                //fontWeight: "bold",
                                margin: {bottom: widget_top},
                                text: title,
                                name: "m_title",
                            }
                        ]
                    },
                    {
                        control: "StackPanel",
                        //valign: "center",
                        GridRow: 1,
                        children: [
                            {
                                control: "TextBlock",
                                margin: {bottom: 5},
                                height: 48,
                                wrap: "wrap",
                                name: "m_header2"
                            },
                            {
                                control: "TextBlock",
                                margin: {bottom: 5},
                                wrap: "nowrap",
                                inlines: [{name: "m_message2"}]
                            },
                            {
                                control: "ProgressBar",
                                height: 10,
                                foreground: "#FF006EC1",
                                margin: {bottom: 15},
                                name: "m_progress2"
                            },
                            {
                                control: "TextBlock",
                                margin: {bottom: 5},
                                height: 48,
                                wrap: "wrap",
                                name: "m_header1"
                            },
                            {
                                control: "TextBlock",
                                margin: {bottom: 5},
                                wrap: "nowrap",
                                inlines: [{name: "m_message1"}]
                            },
                            {
                                control: "ProgressBar",
                                height: 10,
                                foreground: "#FF006EC1",
                                margin: {bottom: 5},
                                name: "m_progress1"
                            }
                        ]
                    }
                ]
            };
            
            
            var _progress_billboard =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: {left: widget_left, top: widget_top, right: widget_left, bottom:  widget_top},
                stage: "installation",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: medium_font,
                                //fontWeight: "bold",
                                margin: {bottom: widget_top},
                                text: title,
                                name: "m_title",
                            }
                        ]
                    },
                    {
                        control: "StackPanel",
                        //valign: "center",
                        GridRow: 1,
                        children: [
                            {
                                control: "StackPanel",
                                children: [
                                    {
                                        control: "StackPanel",
                                        name: "m_progress2_group",
                                        children: [
                                            {
                                                control: "TextBlock",
                                                margin: {bottom: 5},
                                                height: 48,
                                                wrap: "wrap",
                                                name: "m_header2"
                                            },
                                            {
                                                control: "TextBlock",
                                                margin: {bottom: 5},
                                                name: "m_message2_label",
                                                wrap: "nowrap",
                                                inlines: [{name: "m_message2"}]
                                            },
                                            {
                                                control: "ProgressBar",
                                                height: 10,
                                                foreground: "#FF006EC1",
                                                margin: {bottom: 5},
                                                name: "m_progress2"
                                            },
                                        ]
                                    },
                                    {
                                        control: "StackPanel",
                                        name: "m_progress1_group",
                                        children: [
                                            {
                                                control: "TextBlock",
                                                margin: {bottom: 5},
                                                height: 48,
                                                wrap: "wrap",
                                                name: "m_header1"
                                            },
                                            {
                                                control: "TextBlock",
                                                margin: {bottom: 5},
                                                name: "m_message1_label",
                                                wrap: "nowrap",
                                                inlines: [{name: "m_message1"}]
                                            },
                                            {
                                                control: "ProgressBar",
                                                height: 10,
                                                foreground: "#FF006EC1",
                                                margin: {bottom: 5},
                                                name: "m_progress1"
                                            },    
                                        ]
                                    },                                    
                                ],
                            },
                            {
                                control: "Button",
                                visible: false,
                                margin: {top: 5},
                                name: "m_billboard_form",
                                clicked: function() {Execute.URL(billboards_url);},
                                content:
                                {
                                    control: "Image",
                                    uri: "",
                                    margin: -2,
                                    stretch: "fill",
                                    name: "m_billboard"
                                }
                            }
                        ]
                    },
                ]
            };

            var window = ns.Window;
            if(window)
            {
                var control = null;
                var threads = null;
                switch(progress_name)
                {
                    case "ProgressBillboard":
                        threads = 2;
                        control = Wizard.BuildControl(_progress_billboard);
                        control.js.m_progress1.run = control.js.m_message1;
                        control.js.m_progress2.run = control.js.m_message2;

                        Wizard.Subscribe("ProgressBillboard", "activate", function(id, notify, value){
                            switch(value)
                            {
                                case "offline":
                                    control.js.m_progress1_group.visible = true;
                                    control.js.m_progress2_group.visible = false;
                                    break;
                                case "download":
                                    control.js.m_progress1_group.visible = false;
                                    control.js.m_progress2_group.visible = true;
                                    break;
                                case "online":
                                    control.js.m_progress1_group.visible = true;
                                    control.js.m_progress2_group.visible = true;
                                    break;
                                default:
                                    break;
                            }
                        });
                        break;
                    case "Progress2":
                        threads = 2;
                        control = Wizard.BuildControl(_progress2);
                        control.js.m_progress1.run = control.js.m_message1;
                        control.js.m_progress2.run = control.js.m_message2;
                        break;
                    default:
                        // Progress1
                        threads = 1;
                        control = Wizard.BuildControl(_progress1);
                        control.js.m_progress1.run = control.js.m_message1;
                        break;
                }

                var dialog = window.Dialog(control, true);

                var install  = null;
                if(typeof(Duktape) == "object")
                    install  = base("install_duk.js");
                else
                    install  = base("install.js");

                var set_cancel = function(navigator, _window)
                {
                    navigator.Cancel = function()
                    {
                        if(navigator.cancel.enabled)
                        {
                            var s = _window.Taskbar.State();
                            _window.Taskbar.State("paused");
                            Wizard.Notify("progress", "lock");
                            if(_window.Cancel())
                            {
                                Wizard.Cancel();
                                navigator.cancel.enabled = false;
                            }
                            _window.Taskbar.State(s);
                            Wizard.Notify("progress", "unlock");
                        }
                    };
                };

                control.Show = function()
                {
                    ns.Buttons("[Next]", "[Prev]", "[Cancel]");
                    Wizard.Notify("next", "disable");
                    Wizard.Notify("prev", "disable");
                    Wizard.Notify("cancel", "disable");

                    set_cancel(dialog.Navigator(), window);

                    if(install)
                    {
                        ns_deco.Decorator(window, install);
                        install.OnRollback(function(){dialog.Navigator().cancel.enabled = false;});
                        install.OnApplyCompleted(function(){dialog.Navigator().cancel.enabled = false;});
                        install.OnDisableRollback(function(){dialog.Navigator().cancel.enabled = false;});
                        install.OnEnableRollback(function(){dialog.Navigator().cancel.enabled = true;});
                    }
                };

                controls.push(control);
                return dialog;
            }
            else
                return _progress0;
        };

        var ProgressDialog = {
            "Progress1" : _Progress_("Progress1"),
            "Progress2" : _Progress_("Progress2"),
            "ProgressBillboard" : _Progress_("ProgressBillboard"),
        };

        this.Installation = function(_prg_num)
        {
            var prg_num = _prg_num ? _prg_num : 1;

            var installation_dlg_name = "Progress" + prg_num;
            var InstallationDlg = ProgressDialog[installation_dlg_name];
            InstallationDlg.Content().Name = "Installation";
            ns_fin.FilesInUse(ns.Window, ns.Product());
            ns_sus.Suspend(ns.Window, ns.Product());
            Wizard.Subscribe("installation", "download error", download_error_handler_dialog);
            Wizard.Notify("Progress", "title", format("[subtitle_install]"));
            return InstallationDlg();
        };

        this.Installation.AssignProgress = function( dmpr, _prg_num )
        {
            var prg_num = _prg_num ? _prg_num : 1;

            if(dmpr && dmpr.Progress)
                Wizard.Notify("Progress" + prg_num, "connect", dmpr.Progress().id);
            else
                return false;

            var inst = this;

            dmpr.PrgHeader = function(mes)
            {
                inst.AssignHeader(mes, prg_num);
            };

            dmpr.PrgTitle = function(mes)
            {
                inst.AssignTitle(mes, prg_num);
            };

            return false;
        };

        this.Installation.AssignHeader = function( mes, _prg_num )
        {
            var prg_num = _prg_num ? _prg_num : 1;

            Log("Assing header with mes = " + mes);
            Wizard.Notify("Progress" + prg_num, "header", mes);
            return false;
        };

        this.Installation.AssignTitle = function( mes, _prg_num )
        {
            var prg_num = _prg_num ? _prg_num : 1;

            Log("Assing title with mes = " + mes);
            Wizard.Notify("Progress" + prg_num, "title", mes);
            return false;
        };

        var clear_destination = function()
        {
            var dir = ns.Installer().DownloadDir();

            if (!FileSystem.Exists(dir)){
                return Action.r_ok;
            }

            var ret = Action.r_ok;

            while (ret == Action.r_ok) //sign of retrying
            {
                FileSystem.Delete(dir);

                if (!FileSystem.Exists(dir)){
                    return Action.r_ok;
                }

                var _msg = {
                    control: "RichTextBox",
                    vscroll: "auto",
                    rtfText: format("[download_folder_in_use_template]", String(dir).replace(/\\/g, "\\\\")),
                    readOnly: true,
                    documentEnabled: true,
                    clicked: function(uri) {Execute.URL(uri);},
                    name: "m_text",
                };

                var msg = Wizard.BuildControl(_msg);

                ns.SingleMessage.EnablePrev(false);
                ns.SingleMessage.SetTitle(format("[subtitle_download]"));
                ns.SingleMessage.SetMessage(msg.document);
                ns.Window.Taskbar.State("paused");

                ret = ns.SingleMessage();
            }
            return ret;
        };

        this.Downloading = function(_prg_num)
        {
            if(!GetOpt.Exists("resume-download"))
            {
                var ret = clear_destination();
                if (ret != Action.r_ok)
                    return ret;
            }

            var prg_num = _prg_num ? _prg_num : 1;

            var installation_dlg_name = "Progress" + prg_num;
            var InstallationDlg = ProgressDialog[installation_dlg_name];
            InstallationDlg.Content().Name = "Downloading";
            Wizard.Subscribe("installation", "download error", download_error_handler_dialog);
            Wizard.Notify("Progress", "title", format("[subtitle_download]"));
            return InstallationDlg();
        };
    };
};
