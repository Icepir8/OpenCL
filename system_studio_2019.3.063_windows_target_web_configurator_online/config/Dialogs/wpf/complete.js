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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../../Base"));};
    var format = StringList.Format;
    var ns_pb =  base("parse_bool.js");
    var ns_pr =  base("pendingreboot.js");
    var ns_wpf = base("wpf.js");

    var ns_bld    = base("builder.js");
    var ns_prop   = base("property.js");
    var ns_event  = base("event.js");
    var ns_sender = base("event_sender.js");
    var ns_inst   = Namespace("Root.installer");
    var ns_help   = base("helper_sn.js");
    var ns_nav    = dialogs("navigator.js");
    var ns_errhan = dialogs("error_handler.js");

    var ns_bc =   dialogs("base_container.js");

    var P = function(val){return ns_prop.Property(val);};

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

    this.BuildControls = function()
    {
        var ns = this;

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();

        var ww100 = window_width;
        var ww10 = ww100/10;
        var ww5 = ww100/20;
        var ww1 = ww100/100;

        //this is a common function for two widgets
        var set_error_common = function(document_control)
        {
            Log("   adding error report to complete dialog");
            var found_errors = ns_wpf.BuildControl({
                control: "Paragraph",
                fontSize: 14,
                margin: {top: 20, bottom: 10},
                //fontWeight: "bold",
                borderThickness: 0,
                inlines: [format("[found_errors]")]
            });
            var errhan_container = ns_errhan.Container();
            var logs_location = Wizard.BuildControl({
                control: "Paragraph",
                fontSize: 12,
                margin: {top: 10},
                borderThickness: 0,
                inlines: [
                    format("[logs_location]"),
                    {
                        control: "Hyperlink",
                        uri: format(String(Log.GetLogDir())),
                        inlines: [format(String(Log.GetLogDir()))],
                        clicked: function(uri) {Execute.URL(uri);},
                    },
                ]
            });

            document_control.blocks.Add(found_errors);
            document_control.blocks.Add(errhan_container);
            document_control.blocks.Add(logs_location);
        }

        var set_rtf_error_common = function(rtf_header,rtf_footer,stackpanel)
        {
            Log("   adding rtf_error report to complete dialog");
            var found_errors = ns_wpf.BuildControl({
                control: "Paragraph",
                fontSize: 14,
                margin: {top: 20, bottom: 10},
                //fontWeight: "bold",
                borderThickness: 0,
                inlines: [format("[found_errors]")]
            });
            var errhan_container = ns_errhan.Container();
            var logs_location = Wizard.BuildControl({
                control: "Paragraph",
                fontSize: 12,
                margin: {top: 10},
                borderThickness: 0,
                inlines: [
                    format("[logs_location]"),
                    {
                        control: "Hyperlink",
                        uri: format(String(Log.GetLogDir())),
                        inlines: [format(String(Log.GetLogDir()))],
                        clicked: function(uri) {Execute.URL(uri);},
                    },
                ]
            });

            rtf_footer.rtf_blocks.Add(logs_location);
            rtf_header.rtf_blocks.Add(found_errors);
            stackpanel.children.Add(errhan_container);
            stackpanel.children.Add(rtf_footer);
        }

        Wizard.ControlCollection["Complete"] = function()
        {
            var _complete_template =
            {
                control: "DockPanel",
                lastFill: true,
                margin: 10,
                orientation: "vertical",
                name: "m_complete",
                visible: true,
                children:
                [
                    {
                        control: "StackPanel",
                        Dock: "top",
                        children:
                        [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: 14,
                                //fontWeight: "bold",
                                name: "m_complete_title",
                                margin: {bottom: 10},
                                text: format("[subtitle_complete]")
                            }
                        ]
                    },
                    {
                        control: "RichTextBox",
                        Dock: "top",
                        margin: {top: 10},
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        name: "m_complete_text",
                    },
                    {
                        control: "FlowDocumentScrollViewer",
                        Dock: "top",
                        vscroll: "auto",
                        document: {
                            name: "m_complete_document",
                        }
                    },
                ]

            }
            var control = Wizard.BuildControl(_complete_template);
            control.Name = "Complete_Widget";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_complete;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.OnAttach = function(dialog_name)
            {
                var set_title = function(id, notify, value)
                {
                    Log("   setting complete dialog title, incoming value = " + value);
                    control.js.m_complete.text = value;
                }
                var set_error = function()
                {
                    set_error_common(control.js.m_complete_document);
                }
                var set_notes = function(id, notify, value)
                {
                    Log("   setting notes for complete dialog, incoming value = " + value);
                    control.js.m_complete_text.rtfText = value;
                }
                var add_block = function(id, notify, value)
                {
                    Log("   adding block to complete dialog, incoming value = " + value);
                    control.js.m_complete_document.blocks.Add(value);
                }
                Wizard.Subscribe(dialog_name + "/complete/title", "set title", set_title);
                Wizard.Subscribe(dialog_name + "/complete/add_error", "set error", set_error);
                Wizard.Subscribe(dialog_name + "/complete/notes", "set notes", set_notes);
                Wizard.Subscribe(dialog_name + "/complete/add_block", "add block", add_block);
            }
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            return control;
        };

        Wizard.ControlCollection["CompleteCheckbox"] = function()
        {
            var _complete_checkbox_template =
            {
                control: "DockPanel",
                lastFill: true,
                margin: 10,
                orientation: "vertical",
                name: "m_complete_with_checkbox",
                visible: true,
                children:
                [
                    {
                        control: "StackPanel",
                        Dock: "top",
                        children:
                        [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: 14,
                                //fontWeight: "bold",
                                name: "m_complete_with_checkbox_title",
                                margin: {bottom: 10},
                                text: format("[subtitle_complete]")
                            }
                        ]
                    },
                    {
                        control: "RichTextBox",
                        Dock: "top",
                        margin: {top: 10},
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        name: "m_complete_with_checkbox_text",
                    },
                    {
                        control: "FlowDocumentScrollViewer",
                        Dock: "top",
                        vscroll: "auto",
                        document: {
                            name: "m_complete_with_checkbox_document",
                        }
                    },
                    {
                        control: "StackPanel",
                        Dock: "top",
                        name:"m_errors",
                        children: 
                        [
                        {
                            control: "RichTextBox", 
                            vscroll: "auto",
                            readOnly: true,
                            borderThickness: 0,
                            documentEnabled: true,
                            clicked: function(uri) {Execute.URL(uri);},
                            name: "m_error_header",
                                 
                        },
                        ]
                            
                    },
                    {
                        control: "RichTextBox", 
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        name: "m_error_footer",
                    },
                    {
                        control: "CheckBox",
                        flowDirection: "leftToRight",
                        name: "m_complete_with_checkbox_check",
                        valign: "center",
                        checked: true,
                        threeState: false,
                        content:{
                            control: "Label",
                            wrap: "wrap",
                            name: "m_complete_with_checkbox_check_label",
                            padding: {bottom:10},
                            content: format("[launch_after_install]"),
                        }
                    },
                ]
            };

            var control = Wizard.BuildControl(_complete_checkbox_template);
            control.Name = "Complete_Checkbox_Widget";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_complete_with_checkbox;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.OnAttach = function(dialog_name)
            {
                var set_title = function(id, notify, value)
                {
                    Log("   setting complete dialog title, incoming value = " + value);
                    control.js.m_complete_with_checkbox_title.text = value;
                }
                var set_error = function()
                {
                    set_rtf_error_common(control.js.m_error_header,control.js.m_error_footer,control.js.m_errors);
                }
                var set_notes = function(id, notify, value)
                {
                    Log("   setting notes for complete dialog, incoming value = " + value);
                    control.js.m_complete_with_checkbox_text.rtfText = value;
                }
                var add_block = function(id, notify, value)
                {
                    Log("   adding block to complete dialog, incoming value = " + value);
                    control.js.m_complete_with_checkbox_document.blocks.Add(value);
                }
                var checkbox_set_text = function(id, notify, value)
                {
                    control.js.m_complete_with_checkbox_check_label.content = value;
                };
                Wizard.Subscribe(dialog_name + "/complete_checkbox/title", "set title", set_title);
                Wizard.Subscribe(dialog_name + "/complete_checkbox/add_error", "set error", set_error);
                Wizard.Subscribe(dialog_name + "/complete_checkbox/notes", "set notes", set_notes);
                Wizard.Subscribe(dialog_name + "/complete_checkbox/add_block", "add block", add_block);
                Wizard.Subscribe(dialog_name + "/complete_checkbox/checkbox", "set visible", function(id, notify, value){control.js.m_complete_with_checkbox_check.visible = value;});
                Wizard.Subscribe(dialog_name + "/complete_checkbox/checkbox", "set checked", function(id, notify, value){control.js.m_complete_with_checkbox_check.checked = value;});
                Wizard.Subscribe(dialog_name + "/complete_checkbox/checkbox", "set text", checkbox_set_text);
                Wizard.Subscribe(dialog_name + "/complete_checkbox/checkbox", "is checked", function(id, notify){return control.js.m_complete_with_checkbox_check.checked;});
            }
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            return control;
        };

        Wizard.ControlCollection["CompleteReboot"] = function()
        {
            var _complete_reboot_template =
            {
                control: "StackPanel",
                lastFill: true,
                margin: {left:widget_left, right:10},
                orientation: "vertical",
                name: "m_complete_reboot",
                visible: true,
                children:
                [
                    {
                        control: "StackPanel",
                        children:
                        [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: 14,
                                //fontWeight: "bold",
                                name: "m_complete_reboot_title",
                                margin: {bottom: 4},
                                text: format("[subtitle_complete_reboot_header]")
                            },
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: 12,
                                //fontWeight: "bold",
                                name: "m_complete_reboot_reasons",
                                margin: {bottom: 7,left:11},
                            }, 
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: 12,
                                //fontWeight: "bold",
                                name: "m_complete_reboot_footer",
                                margin: {bottom: 2},
                                text: format("[subtitle_complete_reboot_footer]")
                            },
                        ]
                    },
                    {
                        control: "RichTextBox",
                        margin: {top: 10},
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        name: "m_complete_reboot_text",
                    },
                    {
                        control: "FlowDocumentScrollViewer",
                        vscroll: "auto",
                        document: {
                            name: "m_complete_reboot_document",
                        }
                    },
                    {
                        control: "CheckBox",
                        flowDirection: "leftToRight",
                        name: "m_complete_reboot_check",
                        valign: "center",
                        checked: true,
                        threeState: false,
                        content:{
                            control: "Label",
                            wrap: "wrap",
                            name: "m_complete_reboot_check_label",
                            padding: {bottom:10},
                            content: format("[launch_after_reboot]"),
                        }
                    },
                    {
                        control: "StackPanel",
                        orientation: "vertical",
                        margin: {top: 2*ww1},
                        children:
                        [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                halign: "left",
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                name: "m_complete_reboot_desc",
                                text: format("[launch_after_install_desc]")
                            }
                        ]
                    }
                ]
            };


            var control = Wizard.BuildControl(_complete_reboot_template);
            control.Name = "Complete_Reboot_Widget";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_complete_reboot;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.OnAttach = function(dialog_name)
            {
                 var set_header = function(id, notify, value)
                {
                     Log("   setting complete dialog header, incoming value = " + value);
                     control.js.m_complete_reboot_title.text = value;
                }
                var set_footer = function(id, notify, value)
                {
                     Log("   setting complete dialog footer, incoming value = " + value);
                     control.js.m_complete_reboot_footer.text = value;
                }
                var set_title = function(id, notify, value)
                {
                    Log("   setting complete dialog title, incoming value = " + value);
                    control.js.m_complete_reboot_title.text = value;
                }
                var set_desc = function(id, notify, value)
                {
                    control.js.m_complete_reboot_desc.text = value;
                }
                var set_error = function()
                {
                    set_error_common(control.js.m_complete_reboot_document);
                }
                var set_notes = function(id, notify, value)
                {
                    Log("   setting notes for complete dialog, incoming value = " + value);
                    control.js.m_complete_reboot_text.rtfText = value;
                }
                var add_text = function(id,notify,value)
                {
                     Log("   setting complete dialog adding new reason, incoming value = " + value);
                     control.js.m_complete_reboot_reasons.text = control.js.m_complete_reboot_reasons.text + value;
                }
                var clear = function(id,notify,value)
                {
                     Log("   setting complete dialog clear all reasons, incoming value = " + value);
                     control.js.m_complete_reboot_reasons.text="";
                }
                Wizard.Subscribe(dialog_name + "/complete_reboot/header", "set text", set_header);
                Wizard.Subscribe(dialog_name + "/complete_reboot/footer", "set text", set_footer);
                Wizard.Subscribe(dialog_name + "/complete_reboot/add_text", "add text", add_text);
                Wizard.Subscribe(dialog_name + "/complete_reboot/clear", "clear", clear);
                Wizard.Subscribe(dialog_name + "/complete_reboot/desc", "set text", set_desc);
                Wizard.Subscribe(dialog_name + "/complete_reboot/add_error", "set error", set_error);
                Wizard.Subscribe(dialog_name + "/complete_reboot/notes", "set notes", set_notes);
                Wizard.Subscribe(dialog_name + "/complete_reboot/checkbox", "set visible", function(id, notify, value){control.js.m_complete_reboot_check.visible = value;});
                Wizard.Subscribe(dialog_name + "/complete_reboot/checkbox", "set checked", function(id, notify, value){control.js.m_complete_reboot_check.checked = value;});
                Wizard.Subscribe(dialog_name + "/complete_reboot/checkbox", "is checked", function(id, notify){return control.js.m_complete_reboot_check.checked;});
            }
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            return control;
        };
    }
    
    //################################################################
    //widgets
    //################################################################
    this.BuildWidgets = function()
    {
        var ns = this;

        var wdgt_complete = function()
        {
            var class_ctrl = Wizard.ControlCollection["Complete"];
            var w = ns_bld.BuildWidget(class_ctrl());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            var finish_template = "[finish_template]";
            var finish_notes = [];
            var finish_skip_errors = false;
            var finish_cb = function() {};
            w.CB_DisableOnSkip(function(){return false;});

            w.CB_Initialize(function()
            {
                var title = format(ns_inst.Installer.DownloadOnly() ? "[subtitle_complete_download]" : "[subtitle_complete]");
                Wizard.Notify(d_name() + "/complete/title", "set text", title);
                Wizard.Notify(d_name() + "/complete/notes", "set notes", format(finish_template, finish_notes.join(" \\par ")));

                Wizard.Notify("postpone", "hide"); //we need this action, since now base container has buttons 'postpone' and 'reboot'
                Wizard.Notify("reboot", "set text", StringList.Format("[Finish]")); //'reboot' will be titled 'finish'
            });

            w.CB_GoNext(function()
            {
                return true;
            });

            w.CB_Skip(function()
            {
                return true;
            });

            w.Template = function(tmpl)
            {
                if(tmpl)
                    finish_template = tmpl;
                else
                    finish_template = "[finish_template]";
            };

            w.Notes = function(note)
            {
                if(note && typeof(note) == "string")
                    finish_notes.push(note);
            };

            w.SkipErrors = function(skip_errors)
            {
                finish_skip_errors = skip_errors;
            }

            w.OnShow = function(cb) {finish_cb = cb;};

            return w;
        }

        var wdgt_checkbox_complete = function()
        {
            var class_ctrl = Wizard.ControlCollection["CompleteCheckbox"];
            var w = ns_bld.BuildWidget(class_ctrl());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            var finish_launch_template = "[finish_template]";
            var finish_launch_notes = [];
            var finish_launch_skip_errors = false;
            var finish_launch_checkbox_name = "[launch_after_install]";
            var finish_launch_cb = function() {};
            var finish_launch_after_install = function() {};

            w.CB_DisableOnSkip(function(){return false;});

            w.CB_Initialize(function()
            {
                var title = format(ns_inst.Installer.DownloadOnly() ? "[subtitle_complete_download]" : "[subtitle_complete]");
                Wizard.Notify(d_name() + "/complete_checkbox/title", "set title", title);
                Wizard.Notify(d_name() + "/complete_checkbox/notes", "set notes", format(finish_launch_template, finish_launch_notes.join(" \\par ")));
                var checkbox_name = StringList.Format(finish_launch_checkbox_name);
                var prod = ns.Product();
                var checkbox_visible = (checkbox_name ? true : false) && prod.InstallMode() == prod.install_mode_t.install;

                Wizard.Notify(d_name() + "/complete_checkbox/checkbox", "set text", checkbox_name);
                Wizard.Notify(d_name() + "/complete_checkbox/checkbox", "set visible", checkbox_visible);
                Wizard.Notify(d_name() + "/complete_checkbox/checkbox", "set checked", checkbox_visible);

                Wizard.Notify("postpone", "hide");
                Wizard.Notify("reboot", "set text", StringList.Format("[Finish]"));
            });

            w.CB_GoNext(function()
            {
                return true;
            });

            w.CB_Skip(function()
            {
                return true;
            });

            w.Template = function(tmpl)
            {
                if(tmpl){
                    finish_launch_template = tmpl;
                }
                else{
                    finish_launch_template = "[finish_template]";
                }
            }

            w.CheckboxName = function(name)
            {
                if(name){
                    finish_launch_checkbox_name = name;
                }
            }

            w.Notes = function(note)
            {
                if(note && typeof note == "string"){
                    finish_launch_notes.push(note);
                }
            }

            w.SkipErrors = function(skip_errors)
            {
                finish_launch_skip_errors = skip_errors;
            }

            w.LaunchAfterInstall = function(cb_lnch)
            {
                if (cb_lnch)
                {
                    finish_launch_after_install = cb_lnch;
                }
                else
                {
                    finish_launch_after_install();
                }
            }

            w.OnShow = function(cb) {finish_launch_cb = cb;}

            return w;
        }

        var wdgt_complete_reboot = function()
        {
            var class_ctrl = Wizard.ControlCollection["CompleteReboot"];
            var w = ns_bld.BuildWidget(class_ctrl());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            var finish_template = "[finish_reboot_template]";
            var finish_notes = [];
            var finish_skip_errors = false;
            var finish_cb = function() {};

            w.CB_DisableOnSkip(function(){return false;});

            w.CB_Initialize(function()
            {
                Wizard.Notify(d_name() + "/complete_reboot/header", "set text", format("[subtutle_complete_reboot_now_installed]"+"\n"+"\n"+"[subtitle_complete_reboot_header]"));
                Wizard.Notify(d_name() + "/complete_reboot/clear","clear text",format(""));
                var reboot_reasons = ns_inst.Installer.RebootReasons();
                if(reboot_reasons.length)
                   {
                     for(var i in reboot_reasons)
                       {
                          Wizard.Notify(d_name() + "/complete_reboot/add_text", "add text", format("\n-"+"   "+reboot_reasons[i]+"\n"));
                       }
                   }
                else
                   {
                     Wizard.Notify(d_name() + "/complete_reboot/add_text", "add text", format("\n"+"   "+"[reboot_recommended]"+"\n"));
                   }
                Wizard.Notify(d_name() + "/complete_reboot/footer", "set text", format("[subtitle_complete_reboot_footer]"+"\n"));
                Wizard.Notify(d_name() + "/complete_reboot/notes", "set notes", format(finish_template, finish_notes.join(" \\par ")));
            });

            w.CB_GoNext(function()
            {
                return true;
            });

            w.CB_Skip(function()
            {
                return true;
            });

            w.Template = function(tmpl)
            {
                if(tmpl)
                    finish_template = tmpl;
                else
                    finish_template = "[finish_reboot_template]";
            };

            w.Notes = function(note)
            {
                if(note && typeof(note) == "string")
                    finish_notes.push(note);
            };

            w.OnShow = function(cb) {finish_cb = cb;};

            return w;
        }

        Wizard.WidgetCollection["Complete"] = wdgt_complete;
        Wizard.WidgetCollection["CompleteCheckbox"] = wdgt_checkbox_complete;
        Wizard.WidgetCollection["CompleteReboot"] = wdgt_complete_reboot;
    }

    //################################################################
    //dialogs
    //################################################################
    this.BuildDialogs = function()
    {
        var complete = function(name)
        {
            var bc = ns_bc.BaseContainer();
            bc.navigator = ns_nav.RebootPostpone();
            var d = ns_bld.BuildDialog(bc);
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["Complete"]());
            d.AttachWidget(Wizard.WidgetCollection["CompleteCheckbox"]());
            d.AttachWidget(Wizard.WidgetCollection["CompleteReboot"]());
            d.ErrorOccured = P(false);

            return d;
        }

        //########################################################
        Wizard.DialogCollection["complete"] = complete;
    }
}
