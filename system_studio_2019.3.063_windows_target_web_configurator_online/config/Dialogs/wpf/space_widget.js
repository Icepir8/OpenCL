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
    var ns_event  = base("event.js");
    var ns_sender = base("event_sender.js");

    var ns_bld = base("builder.js");

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

    var feature_space_available = function() {return null; }
    var feature_space_required = function() {return null; }
    var feature_space_required_32 = function() {return null; }
    var feature_space_required_64 = function() {return null; }
    var feature_select_cb = function() {}
    var feature_initailize = function() {}
    var feature_continue_checkers = {};
    var feature_refresh = function() {return null; }
    var revisible = false;
    this.BuildControls = function()
    {
        
        var ns = this;

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var small_font = Wizard.Theme().SmallFont();
        var medium_font = Wizard.Theme().MediumFont();
        
        var default_click = ns_event.FEvent();
        var all_click = ns_event.FEvent();
        var clear_click = ns_event.FEvent();

        var _space_widget_template =
        {
            control: "Grid",
            flowDirection: format("[flow_direction]"),
            margin: {left: widget_left, right: widget_left, bottom: 3},
            //rows: ["auto", "auto", "*", "auto","auto", "auto", {height:0}],
            children: [
                { // space info
                    control: "StackPanel",
                    GridRow: 4,
                    children: [
                        {
                            control: "Grid",
                            columns: ["auto", "*"],
                            margin: {bottom: 5},
                            name: "m_space",
                            children: [
                                {
                                    control: "StackPanel", 
                                    orientation: "vertical", 
                                    GridColumn: 0,
                                    children: 
                                    [
                                        {
                                            control: "TextBlock",
                                            //margin: {right: 5},
                                            halign: "left",
                                            text: format("[space_required_available]", 0.0, 0.0),
                                            name: "m_required"
                                        },
                                        {
                                            control: "TextBlock",
                                            //margin: {right: 5},
                                            halign: "left",
                                            maxWidth: 300,
                                            text: format("[space_error]", 0.0),
                                            name: "m_error"
                                        },
                                    ]
                                },

                                {
                                    control: "StackPanel", //here go our 4 elements
                                    orientation: "vertical", //we will stack widgets vertically one by one
                                    GridColumn: 1,
                                    children: 
                                    [
                                        {    
                                            control: "TextBlock", //hyperlink holder
                                            //GridColumn: 2,
                                            halign: "right",
                                            name: "m_text_default",
                                            visible: true,
                                            inlines: //contains inlines
                                            [
                                                {
                                                    control: "Hyperlink", //one of them is hyperlink
                                                    uri: FileSystem.MakePath(format("[getting_started_eula_link]"), Origin.Directory() + ".."),
                                                    inlines: [StringList.Format("[Recommended]")], //link text
                                                    name: "m_hyperlink_default", // set name to avoid object clean
                                                },
                                            ]
                                        },                                     
                                        {
                                            control: "TextBlock", //hyperlink holder
                                            halign: "right",
                                            visible: true,
                                            name: "m_text_all",
                                            inlines: //contains inlines
                                            [
                                                {
                                                    control: "Hyperlink", //one of them is hyperlink
                                                    uri: FileSystem.MakePath(format("[getting_started_eula_link]"), Origin.Directory() + ".."),
                                                    inlines: [StringList.Format("[SelectAll]")], //link text
                                                    name: "m_hyperlink_all", // set name to avoid object clean
                                                },
                                            ]
                                        },  
                                        {
                                            control: "TextBlock", //hyperlink holder
                                            halign: "right",
                                            visible: false,
                                            name: "m_text_clear",
                                            inlines: //contains inlines
                                            [
                                                {
                                                    control: "Hyperlink", //one of them is hyperlink
                                                    uri: FileSystem.MakePath(format("[getting_started_eula_link]"), Origin.Directory() + ".."),
                                                    inlines: [StringList.Format("[ClearAll]")], //link text
                                                    name: "m_hyperlink_clear", // set name to avoid object clean
                                                },
                                            ]
                                        }, 
                                      
                                    ]
                                },
                            ]
                        },
                    ]
                },
            ]
        };

        Wizard.ControlCollection["SpaceWidget"] = function()
        {
            var wdgt_space = Wizard.BuildControl(_space_widget_template);
            wdgt_space.Name = "Space_Widget";

            var stat_pick = base("stat_pick.js").Stat_pick;
            var ns_path_check = base("path_checker.js");
            
            wdgt_space.js.m_hyperlink_clear.clicked = clear_click;
            wdgt_space.js.m_hyperlink_all.clicked = all_click;
            wdgt_space.js.m_hyperlink_default.clicked = default_click;
            

            wdgt_space.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach Space Widget to dialog " + dialog_name);

                var set_space = function(id, notify, message)
                {
                    if(id == dialog_name + "/space_required")
                    {
                        var required = message.required ? message.required : 0.0;
                        var available = message.available ? message.available : 0.0;
                        var error = message.error ? message.error : "";

                        wdgt_space.js.m_required.text = format("[space_required_available]", required, available);
                        wdgt_space.js.m_error.text = format(error);

                        wdgt_space.js.m_error.foreground = "black";
                        wdgt_space.js.m_error.fontWeight = "regular";
                        if(message.foreground)
                        {
                            wdgt_space.js.m_error.foreground = message.foreground;
                            //wdgt_space.js.m_error.fontWeight = "bold";
                        }
                    }
                };
                
                var set_all = function()
                {
                    if (!wdgt_space.js.m_text_default.visible)
                        return;
                    wdgt_space.js.m_text_all.visible = true; 
                    wdgt_space.js.m_text_clear.visible = false;
                }
                
                var set_clear = function()
                {
                    if (!wdgt_space.js.m_text_default.visible)
                        return;
                    wdgt_space.js.m_text_all.visible = false; 
                    wdgt_space.js.m_text_clear.visible = true;
                }
                
                var set_hide = function()
                {
                    wdgt_space.js.m_text_default.visible = false;
                    wdgt_space.js.m_text_all.visible = false; 
                    wdgt_space.js.m_text_clear.visible = false;
                }
                
                var set_show = function()
                {
                    if (wdgt_space.js.m_text_default.visible)
                        return;
                    wdgt_space.js.m_text_default.visible = true;
                    var prod = ns.Product();
                    var is_all_selected = true;
                    filter(prod.FeaturesFullSet(), function(f)
                    {
                        if(f.Disabled() == f.disabled_t.no && f.Action() != f.action_t.install && f.State() != f.state_t.installed)
                            is_all_selected = false;
                    });
                    wdgt_space.js.m_text_all.visible = !is_all_selected; 
                    wdgt_space.js.m_text_clear.visible = is_all_selected;
                }
                
                Wizard.Subscribe(dialog_name + "/space_required", "set text", set_space);
                Wizard.Subscribe(dialog_name + "/select_mode", "all", set_all);
                Wizard.Subscribe(dialog_name + "/select_mode", "clear", set_clear);
                Wizard.Subscribe(dialog_name + "/select_mode", "hide", set_hide);
                Wizard.Subscribe(dialog_name + "/select_mode", "show", set_show);
                Log(Log.l_debug, "OnAttach Space Widget to dialog complete");
            }
            
            wdgt_space.OnChange = ns_sender.DialogEvent(wdgt_space);
            default_click.Connect(wdgt_space.OnChange.Transmit("NTF_DEFAULT"));
            all_click.Connect(wdgt_space.OnChange.Transmit("NTF_ALL"));
            clear_click.Connect(wdgt_space.OnChange.Transmit("NTF_CLEAR"));

            return wdgt_space;
        }
    }
}
