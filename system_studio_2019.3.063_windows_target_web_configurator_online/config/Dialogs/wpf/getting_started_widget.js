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
    var ns_inst = Namespace("Root.installer");
    var ns_prop   = base("property.js");
    var ns_sender = base("event_sender.js");
    var ns_event = base("event.js");

    var ns_bld = base("builder.js");
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
        Log(Log.l_debug, "getting_started_widget.js::BuildWidgets start building widgets");
        var ns = this;
        var event_download_mode = ns_event.FEvent();
        var event_install_mode = ns_event.FEvent();

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();

        var _getting_started_widget_template =
        {
            control: "DockPanel",
            flowDirection: format("[flow_direction]"),
            margin: {left: widget_left, top: 5, bottom: 1},
            stage: "welcome",
            name: "m_widget_container",
            bindings: [
                {
                    key: "i",
                    mod: "alt",
                    clicked: function() {if(this.js.m_install.enabled) {this.js.m_install.checked = true;}}
                },
                {
                    key: "d",
                    mod: "alt",
                    clicked: function() {if(this.js.m_download.enabled) {this.js.m_download.checked = true;}}
                },
            ],
            children: [
                {
                    control: "StackPanel",
                    Dock: "top",
                    children: [
                        {
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: medium_font,
                            text: StringList.Format("[subtitle_getting_started]"),
                            name: "m_subtitle"
                        }
                    ]
                },
                {
                    control: "Grid",
                    rows: [{minHeight: 30, width: "auto"}, "auto", "*"],
                    children: [
                        { // install
                            control: "StackPanel",
                            valign: "center",
                            orientation: "horizontal",
                            GridRow: 0,
                            children: [
                                {
                                    control: "RadioButton",
                                    group: "getting_started",
                                    name: "m_install",
                                    margin: {left: widget_left/2},
                                    onChecked: event_install_mode,
                                    content: {
                                        control: "Label",
                                        padding: 0,
                                        name: "m_install_label",
                                    }
                                },
                            ]
                        },
                        { // download_only
                            control: "StackPanel",
                            valign: "center",
                            GridRow: 1,
                            children: [
                                {
                                    control: "RadioButton",
                                    group: "getting_started",
                                    name: "m_download",
                                    margin: {left: widget_left/2},
                                    onChecked: event_download_mode,
                                    content: {
                                        control: "Label",
                                        padding: 0,
                                        name: "m_download_label",
                                    }
                                },

                            ]
                        },
                    ]
                },
             
            ]
        };

        Wizard.ControlCollection["GettingStartedWidget"] = function()
        {
            var wdgt_getting_started = Wizard.BuildControl(_getting_started_widget_template);
            wdgt_getting_started.Name = "Getting_Started_Widget";
            wdgt_getting_started.Visible = P(true);
            wdgt_getting_started.Disabled = P(false);
            var original_height = 0;
            wdgt_getting_started.EventInstallMode = event_install_mode;
            wdgt_getting_started.EventDownloadMode = event_download_mode;
            wdgt_getting_started.Visible.Subscribe(function(val)
            {
                if(!val)
                {
                    original_height = wdgt_getting_started.js.m_widget_container.height;
                    wdgt_getting_started.js.m_widget_container.height = 0;
                    wdgt_getting_started.js.m_widget_container.enabled = false;
                }
                else
                {
                    wdgt_getting_started.js.m_widget_container.height = original_height;
                    wdgt_getting_started.js.m_widget_container.enabled = true;
                }
            });

            wdgt_getting_started.OnAttach = function(dialog_name)
            {
                Log("OnAttach Getting Started Widget to dialog " + dialog_name);
                var header_set_text = function(id, notify, text){
                    if(text)
                        wdgt_getting_started.js.m_header.rtfText = text;
                };

                var set_text = function(id, notify, value)
                {
                    if(id == dialog_name + "/getting_started/install_mode")
                        wdgt_getting_started.js.m_install_label.content = format(value);
                    else if(id == dialog_name + "/getting_started/download_mode")
                        wdgt_getting_started.js.m_download_label.content = format(value);
                };

                var enable_install_mode = function(id, notify){
                    if(notify == "enable")
                        wdgt_getting_started.js.m_install.enabled = true;
                    else if(notify == "disable")
                        wdgt_getting_started.js.m_install.enabled = false;
                };

                var set_checked = function(id, notify, value){
                    if(id == dialog_name + "/getting_started/install_mode")
                        wdgt_getting_started.js.m_install.checked = value;
                    else if(id == dialog_name + "/getting_started/download_mode")
                        wdgt_getting_started.js.m_download.checked = value;
                };

                Wizard.Subscribe(dialog_name + "/getting_started/header","set rtf text",header_set_text);
                Wizard.Subscribe(dialog_name + "/getting_started/install_mode", "set text", set_text);
                Wizard.Subscribe(dialog_name + "/getting_started/download_mode", "set text", set_text);
                Wizard.Subscribe(dialog_name + "/getting_started/dir_lable", "set text", set_text);
                Wizard.Subscribe(dialog_name + "/getting_started/install_mode", "enable", enable_install_mode);
                Wizard.Subscribe(dialog_name + "/getting_started/install_mode", "disable", enable_install_mode);
                Wizard.Subscribe(dialog_name + "/getting_started/install_mode", "set checked", set_checked);
                Wizard.Subscribe(dialog_name + "/getting_started/download_mode", "set checked", set_checked);
                Log("OnAttach Getting Started Widget to dialog complete");
            }
            wdgt_getting_started.OnChange = ns_sender.DialogEvent(wdgt_getting_started);
            wdgt_getting_started.EventDownloadMode.Connect(wdgt_getting_started.OnChange.Transmit("NTF_DOWNLOAD"));
            wdgt_getting_started.EventInstallMode.Connect(wdgt_getting_started.OnChange.Transmit("NTF_INSTALL"));

            return wdgt_getting_started;
        }
        Log(Log.l_debug, "getting_started_widget.js::BuildWidgets finish building widgets");
    }
}
