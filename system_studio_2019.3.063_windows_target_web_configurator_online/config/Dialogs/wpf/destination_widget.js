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
    var ns_path_check = base("path_checker.js");
    var ns_sender = base("event_sender.js");
    var ns_event = base("event.js");
    var ns_prop = base("property.js");
    var P = function(val){return ns_prop.Property(val);};

    var ns_bld = base("builder.js");
    
    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

    this.BuildControls = function()
    {
        Log(Log.l_debug, "destination_widget.js::BuildWidgets start building widgets");
        var ns = this;

        var event_destination_change = ns_event.FEvent();

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();
        var small_font = Wizard.Theme().SmallFont();

        var _destination_widget_template =
        {
            control: "DockPanel",
            flowDirection: format("[flow_direction]"),
            lastFill: true,
            margin: {left: widget_left, right: widget_left, top: 6, bottom: 5},
            stage: "options",
            bindings: [{key: "r", mod: "alt", clicked: function() {this.js.m_browse.clicked();}}],
            name: "m_dock",
            children: [
                {
                    control: "Grid",
                    rows: ["*", "*"],
                    children:[
                        { // destination
                            control: "StackPanel",
                            //margin: {top: ;, bottom: 10},
                            valign: "bottom",
                            GridRow: 0,
                            children: [
                                {
                                    control: "TextBlock",
                                    wrap: "wrap",
                                    enabled: false,
                                    margin: {bottom: pixel_height},
                                    name: "m_dir_label"
                                },  
                                {
                                    control: "Grid",
                                    columns: ["auto", "*", "auto"],
                                    name: "m_destination",
                                    children: [
                                        {
                                            control: "TextBox",
                                            minHeight: 24,
                                            maxHeight: 24,
                                            fontSize : small_font,
                                            //padding: {left: 3, right: 3/*, top: 1, bottom: 1*/},
                                            margin: {/*left: 5, */right: 5},
                                            name: "m_path",
                                            valign: "center",
                                            GridColumn: 1,
                                            changed: event_destination_change//function(path) {Wizard.Notify("destination", "destination_changed", path);}
                                        },
                                        {
                                            control: "Button",
                                            minHeight: 24,
                                            maxHeight: 24,
                                            fontSize : medium_font,
                                            content: format("[destination_button_3dots]"),
                                            GridColumn: 2,
                                            name: "m_browse",
                                            minWidth: 40,
                                            clicked: function()
                                            {
                                                var p = WPF.FolderBrowserDialog(format("[choose_destination]"), this.js.m_path.text);
                                                if(p)
                                                    this.js.m_path.text = p;
                                            }
                                        }
                                    ]
                                },
                                {
                                    control: "TextBlock",
                                    wrap: "wrap",
                                    enabled: false,
                                    margin: {top: 5},
                                    fontStyle: "italic",
                                    name: "m_dir_msg",
                                    visible: false
                                },  
                            ]
                        },
                    ]
                },
            ]
        };

        Wizard.ControlCollection["DestinationWidget"] = function()
        {
            var wdgt_destination = Wizard.BuildControl(_destination_widget_template);
            wdgt_destination.Name = "Destination_Widget";
            wdgt_destination.EventDestinationChanged = event_destination_change;
            wdgt_destination.Owner = P();
            wdgt_destination.Visible = P(true);
            wdgt_destination.Visible.Subscribe(function(val)
            {
                var ctrl = wdgt_destination.js.m_dock;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });

            wdgt_destination.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach Destination Widget to dialog " + dialog_name);
                var edit_box_set_text = function(id, notify, text)
                {
                    if(text)
                        wdgt_destination.js.m_path.text = text;
                };
                
                var dir_set_text = function(id, notify, text)
                {
                    if(text)
                        wdgt_destination.js.m_dir_label.text = text;
                };

                var msg_set_text = function(id, notify, text)
                {
                    if(text)
                        wdgt_destination.js.m_dir_msg.text = text;
                };

                var edit_box_get_text = function(id, notify)
                {
                    return wdgt_destination.js.m_path.text;
                };

                var enable_edit_box = function(id, notify)
                {
                    if(notify == "enable")
                        wdgt_destination.js.m_path.enabled = true;
                    else if(notify == "disable")
                        wdgt_destination.js.m_path.enabled = false;
                };

                var enable_browse = function(id, notify)
                {
                    if(notify == "enable")
                        wdgt_destination.js.m_browse.enabled = true;
                    else if(notify == "disable")
                        wdgt_destination.js.m_browse.enabled = false;
                };

                var visible_control = function(id, notify)
                {

                    if(notify == "visible")
                    {
                        wdgt_destination.js.m_dir_msg.visible = true;
                        wdgt_destination.js.m_dir_label.visible = false;
                    }
                    else if(notify == "invisible")
                    {
                        wdgt_destination.js.m_dir_msg.visible = false;
                        wdgt_destination.js.m_dir_label.visible = true;
                    }
                  
                };
                var edit_box_set_text_limit = function(id, notify, value)
                {
                    if(value && value > 0)
                        wdgt_destination.js.m_path.maxLength = value;
                }

                Wizard.Subscribe(dialog_name + "/destination/browse","enable",enable_browse);
                Wizard.Subscribe(dialog_name + "/destination/browse","disable",enable_browse);
                Wizard.Subscribe(dialog_name + "/destination/edit_box","enable",enable_edit_box);
                Wizard.Subscribe(dialog_name + "/destination/edit_box","disable",enable_edit_box);
                Wizard.Subscribe(dialog_name + "/destination/edit_box","get text",edit_box_get_text);
                Wizard.Subscribe(dialog_name + "/destination/edit_box","set text",edit_box_set_text);
                Wizard.Subscribe(dialog_name + "/destination/edit_box", "set text limit", edit_box_set_text_limit);
                Wizard.Subscribe(dialog_name + "/destination/dir_lable","set text",dir_set_text);
                Wizard.Subscribe(dialog_name + "/destination/msg_lable","set text", msg_set_text);
                Wizard.Subscribe(dialog_name + "/destination/msg_lable/visible","visible", visible_control);
                Wizard.Subscribe(dialog_name + "/destination/msg_lable/visible","invisible", visible_control);
                Log(Log.l_debug, "OnAttach Destination Widget to dialog complete");
            }
            wdgt_destination.OnChange = ns_sender.DialogEvent(wdgt_destination);
            wdgt_destination.EventDestinationChanged.Connect(wdgt_destination.OnChange.Transmit("NTF_DEST"));

            return wdgt_destination;
        }
        Log(Log.l_debug, "destination_widget.js::BuildWidgets finish building widgets");
    }
}
