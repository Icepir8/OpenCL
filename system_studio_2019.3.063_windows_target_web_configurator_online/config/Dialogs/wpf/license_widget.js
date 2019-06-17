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
    var ns_inst   = base("installer.js");
    var ns_help   = base("helper_sn.js");

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
        var control_top = Wizard.Theme().PixelWidth();
        var medium_font = Wizard.Theme().MediumFont();
        var small_font = Wizard.Theme().SmallFont();
        
        var ww100 = window_width;
        var ww10 = ww100/10;
        var ww5 = ww100/20;
        var ww1 = ww100/100;

        let no_license_check = ns_pb.ParseBoolean(ns.Product().Info().Property("no_license_check"));

        Wizard.ControlCollection["LicenseWidget"] = function()
        {
            Log(Log.l_debug, "Building LicenseWidget");
            var event_alt = ns_event.FEvent();
            var event_sn = ns_event.FEvent();
            var event_sn_click = ns_event.FEvent();
            var event_ex_click = ns_event.FEvent();
            var event_sn_unclick = ns_event.FEvent();
            var event_ex_unclick = ns_event.FEvent();

            let event_no_license_on_checked = ns_event.FEvent();
            
            var obj =
            {
                control: "StackPanel", //here go our five elements
                orientation: "vertical", //we will stack widgets vertically one by one
                //width: ww100 - 2*ww10, //window width (500) minus left margin (45) and right margin (45)
                background: "#00000000", //set alpha-channel to 0 for transparent background
                margin: {left: widget_left, right: widget_left, top: widget_top},
                name: "m_license_widget_container", //it will contain all widgets
                children:
                [
                    
                    //Adding Grid in order to draw license sections in the same place
                    {
                        control: "Grid",
                        //columns: [{width: (ww100 - 2*ww10 - ww5)/2}, {width: (ww100 - 2*ww10 - ww5)/2}],
                        background: "#00000000", //set alpha-channel to 0 for transparent background
                        children:
                        [
                            //#####################
                            //first time activation
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_first_time_activation",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        fontSize: medium_font, //by review
                                        //fontWeight: "bold", //by review
                                        text: StringList.Format("[left_license_activation]")
                                    },

                                    //INST-9834
                                    {
                                        control: "RadioButton",
                                        checked: true,
                                        visible: no_license_check,
                                        group: "activation",
                                        name: "m_first_time_no_license_check",
                                        onChecked: event_no_license_on_checked,
                                        content: {
                                            control: "Label",
                                            content: StringList.Format("[continue_without_license_header]"),
                                            padding: 0,
                                            fontSize: medium_font,
                                        }
                                    },

                                    {
                                        control: "TextBlock",
                                        visible: no_license_check,
                                        fontSize: small_font,
                                        margin: {left: widget_left, top: control_top, bottom: control_top },
                                        text: StringList.Format("[continue_without_license_description]")
                                    },

                                    {
                                        control: "RadioButton",
                                        checked: false,
                                        group: "activation",
                                        name: "m_first_time_serial_check",
                                        visible: no_license_check,
                                        onChecked: event_sn_click,
                                        onUnchecked: event_sn_unclick,
                                        content: {
                                            control: "Label",
                                            content: format("[serial_number_activation]"),
                                            padding: 0,
                                            fontSize: medium_font,
                                        }
                                    },

                                    {
                                        control: "StackPanel", //here go our 4 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        //background: "#00000000", //set alpha-channel to 0 for transparent background
                                        children:
                                        [
                                            {
                                                control: "Grid",
                                                //columns: [{width: (ww100 - 2*ww10 - ww5)/2}, "auto"],
                                                background: "#00000000", //set alpha-channel to 0 for transparent background
                                                children:
                                                [
                                                    {
                                                        control: "TextBlock",
                                                        GridColumn: 0,
                                                        halign: "left",
                                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                                        text: StringList.Format("[provide_sn]")
                                                    },
                                                    {
                                                        control: "TextBlock", //hyperlink holder
                                                        GridColumn: 1,
                                                        halign: "right",
                                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                                        inlines: //contains inlines
                                                        [
                                                            {
                                                                control: "Hyperlink", //one of them is hyperlink
                                                                uri: StringList.Format("[how_to_find_sn_link]"), //here's valid https address
                                                                inlines: [StringList.Format("[how_to_find_sn]")], //link text
                                                                clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                                                name: "m_hyperlink_sn" // set name to avoid object clean
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                control: "TextBox",
                                                minHeight: 24,
                                                maxHeight: 24,
                                                fontSize : small_font,
                                                padding: {left: 3, right: 3, top: 1, bottom: 1},
                                                margin: {top: control_top},
                                                name: "m_serial",
                                                valign: "center",
                                                onFocused: function() {
                                                    if(this.js.m_first_time_serial_check.enabled && !this.js.m_first_time_serial_check.checked) {
                                                        this.js.m_first_time_serial_check.checked = true;
                                                    }
                                                },
                                                changed: event_sn
                                            },
                                            //block was here
                                        ]
                                    },
                                    {
                                        control: "RichTextBox",
                                        vscroll: "auto",
                                        readOnly: true,
                                        borderThickness: 0,
                                        documentEnabled: true,
                                        clicked: function(uri) {Execute.URL(uri);},
                                        foreground: "red",
                                        margin: {top: control_top, left: widget_left},
                                        name: "m_serial_error",
                                    },
                                    //now block is here
                                    {
                                        control: "TextBlock",
                                        margin: {top: widget_top},
                                        name: "m_first_time_activation_alt",
                                        fontSize: medium_font,
                                        inlines: //contains inlines
                                        [
                                            {
                                                control: "Hyperlink", //one of them is hyperlink
                                                uri: StringList.Format("[how_to_find_sn_link]"), //it doesn't matter what is stored here
                                                inlines: [StringList.Format("[alternative_activation_choose_text]")], //link text
                                                clicked: event_alt, 
                                                name: "m_hyperlink_alt1" // set name to avoid object clean
                                            }
                                        ]
                                    },
                                    {
                                        control: "Grid",
                                        visible: false,
                                        margin: {top: 2*control_top, left: widget_left},
                                        columns: [{width: 30}, {width: window_width - 30 - 4*widget_left}],
                                        name: "m_tll_warn_container",
                                        children:
                                        [
                                            {
                                                control: "Image",
                                                uri: FileSystem.MakePath(StringList.Format("[tll_warning_png]"), Origin.Directory()),
                                                stretch: "none",
                                                valign: "center",
                                                halign: "center",
                                                GridColumn: 0,
                                            },
                                            {
                                                control: "RichTextBox",
                                                GridColumn: 1,
                                                Dock: "top",
                                                vscroll: "auto",
                                                readOnly: true,
                                                borderThickness: 0,
                                                documentEnabled: true,
                                                rtfText: format("[tll_warning_expired]"),
                                                clicked: function(uri) {Execute.URL(uri);},
                                            }
                                        ]
                                    }
                                ]
                            },

                            //##################
                            //during tll
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_during_tll",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        fontSize: medium_font, //by review
                                        //fontWeight: "bold", //by review
                                        text: StringList.Format("[left_license_activation]")
                                    },
                                    {
                                        control: "StackPanel", //here go our 5 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        children:
                                        [
                                            {
                                                control: "TextBlock",
                                                halign: "left",
                                                text: StringList.Format("[during_tll_remark]"),
                                                name: "m_during_tll_remark"
                                            },   
                                            {
                                                control: "TextBlock",
                                                margin: {top: control_top},
                                                inlines: //contains inlines
                                                [
                                                    StringList.Format("[first_time_activation_alt] "),
                                                    {
                                                        control: "Hyperlink", //one of them is hyperlink
                                                        uri: StringList.Format("[how_to_find_sn_link]"), //it doesn't matter what is stored here
                                                        inlines: [StringList.Format("[alternative_activation_link_text]")], //link text
                                                        clicked: event_alt, 
                                                        name: "m_hyperlink_alt2" // set name to avoid object clean
                                                    },
                                                    StringList.Format("[Period]")
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },

                            //##################
                            //tll about to expire
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_tll_about_to_expire",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        fontSize: medium_font, //by review
                                        //fontWeight: "bold", //by review
                                        text: StringList.Format("[left_license_activation]")
                                    },
                                    {
                                        control: "StackPanel", //here go our 5 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        children:
                                        [
                                            {
                                                control: "Grid",
                                                //columns: [{width: (ww100 - 2*ww10 - ww5)/2}, "auto"],
                                                rows: ["auto", "auto"],
                                                background: "#00000000", //set alpha-channel to 0 for transparent background
                                                children:
                                                [
                                                    {
                                                        control: "TextBlock",
                                                        GridRow: 0,
                                                        halign: "left",
                                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                                        text: StringList.Format("[provide_sn_during_tll]")
                                                    },
                                                    {
                                                        control: "TextBlock", //hyperlink holder
                                                        GridRow: 1,
                                                        halign: "right",
                                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                                        inlines: //contains inlines
                                                        [
                                                            {
                                                                control: "Hyperlink", //one of them is hyperlink
                                                                uri: StringList.Format("[how_to_find_sn_link]"), //here's valid https address
                                                                inlines: [StringList.Format("[how_to_find_sn]")], //link text
                                                                clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                                                name: "m_hyperlink_sn1" // set name to avoid object clean
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                control: "TextBox",
                                                minHeight: 24,
                                                maxHeight: 24,
                                                fontSize : small_font,
                                                padding: {left: 3, right: 3, top: 1, bottom: 1},
                                                margin: {top: control_top},
                                                name: "m_tll_serial",
                                                valign: "center",
                                                changed: event_sn
                                            },
                                            {
                                                control: "TextBlock",
                                                margin: {top: control_top},
                                                inlines: //contains inlines
                                                [
                                                    StringList.Format("[first_time_activation_alt] "),
                                                    {
                                                        control: "Hyperlink", //one of them is hyperlink
                                                        uri: StringList.Format("[how_to_find_sn_link]"), //it doesn't matter what is stored here
                                                        inlines: [StringList.Format("[alternative_activation_link_text]")], //link text
                                                        clicked: event_alt, 
                                                        name: "m_hyperlink_alt3" // set name to avoid object clean
                                                    },
                                                    StringList.Format("[Period]")
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        control: "RichTextBox",
                                        vscroll: "auto",
                                        readOnly: true,
                                        borderThickness: 0,
                                        documentEnabled: true,
                                        clicked: function(uri) {Execute.URL(uri);},
                                        foreground: "red",
                                        margin: {top: control_top, left: widget_left},
                                        name: "m_tll_serial_error",
                                    },
                                    {
                                        control: "Grid",
                                        margin: {top: 2*control_top, left: widget_left},
                                        columns: [{width: 30}, {width: window_width - 30 - 4*widget_left}],
                                        children:
                                        [
                                            {
                                                control: "Image",
                                                uri: FileSystem.MakePath(StringList.Format("[tll_warning_png]"), Origin.Directory()),
                                                stretch: "none",
                                                valign: "center",
                                                halign: "center",
                                                GridColumn: 0,
                                            },
                                            {
                                                control: "RichTextBox",
                                                GridColumn: 1,
                                                Dock: "top",
                                                vscroll: "auto",
                                                readOnly: true,
                                                borderThickness: 0,
                                                documentEnabled: true,
                                                clicked: function(uri) {Execute.URL(uri);},
                                                name: "m_about_to_expire_tll_remark",
                                            }
                                        ]
                                    }
                                ]
                            },                   
                            
                            //##################
                            //existing license
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_existing_license",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        fontSize: medium_font, //by review
                                        //fontWeight: "bold", //by review
                                        text: StringList.Format("[left_license_activation]")
                                    },

                                    {
                                        control: "RadioButton",
                                        checked: true,
                                        group: "activation",
                                        name: "m_existing_license_check",
                                        onChecked: event_ex_click,
                                        onUnchecked: event_ex_unclick,
                                        margin: {top: widget_top},
                                        content: {
                                            control: "Label",
                                            content: format("[existing_license_activation]"),
                                            padding: 0,
                                            fontSize: medium_font,
                                        }
                                    },
                                    {
                                        control: "StackPanel", //here go our 5 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        children:
                                        [
                                            {
                                                control: "TextBlock",
                                                halign: "left",
                                                text: StringList.Format("[existing_license_file]"),
                                                fontStyle: "italic",
                                                name: "m_existing_license_file"
                                            },     
                                            
                                            
                                        ],
                                    },
                                    {
                                        control: "RadioButton",
                                        checked: false,
                                        group: "activation",
                                        name: "m_existing_serial_check",
                                        onChecked: event_sn_click,
                                        onUnchecked: event_sn_unclick,
                                        margin: {top: widget_top},
                                        content: {
                                            control: "Label",
                                            content: format("[serial_number_activation]"),
                                            padding: 0,
                                            fontSize: medium_font,
                                        }
                                    },
                                    {
                                        control: "StackPanel", //here go our 4 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        //background: "#00000000", //set alpha-channel to 0 for transparent background
                                        children:
                                        [
                                            {
                                                control: "Grid",
                                                //columns: [{width: (ww100 - 2*ww10 - ww5)/2}, "auto"],
                                                background: "#00000000", //set alpha-channel to 0 for transparent background
                                                children:
                                                [
                                                    {
                                                        control: "TextBlock",
                                                        GridColumn: 0,
                                                        halign: "left",
                                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                                        text: StringList.Format("[provide_sn]")
                                                    },
                                                    {
                                                        control: "TextBlock", //hyperlink holder
                                                        GridColumn: 1,
                                                        halign: "right",
                                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                                        inlines: //contains inlines
                                                        [
                                                            {
                                                                control: "Hyperlink", //one of them is hyperlink
                                                                uri: StringList.Format("[how_to_find_sn_link]"), //here's valid https address
                                                                inlines: [StringList.Format("[how_to_find_sn]")], //link text
                                                                clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                                                name: "m_hyperlink_sn2" // set name to avoid object clean
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                control: "TextBox",
                                                minHeight: 24,
                                                maxHeight: 24,
                                                fontSize : small_font,
                                                padding: {left: 3, right: 3, top: 1, bottom: 1},
                                                margin: {top: control_top},
                                                name: "m_existing_serial",
                                                onFocused: function() {if(this.js.m_existing_serial_check.enabled && !this.js.m_existing_serial_check.checked) this.js.m_existing_serial_check.checked = true;}, 
                                                valign: "center",
                                                changed: event_sn
                                            },
                                            {
                                                control: "TextBlock",
                                                margin: {top: control_top},
                                                text: format("[requires_internet_connection]")
                                            },
                                            {
                                                control: "RichTextBox",
                                                vscroll: "auto",
                                                readOnly: true,
                                                borderThickness: 0,
                                                documentEnabled: true,
                                                clicked: function(uri) {Execute.URL(uri);},
                                                foreground: "red",
                                                margin: {top: control_top},
                                                name: "m_existing_serial_error",
                                            },  

                                        ]
                                    },
                                    {
                                        control: "TextBlock",
                                        margin: {top: widget_top},
                                        name: "m_existing_license_block",
                                        fontSize: medium_font,
                                        inlines: //contains inlines
                                        [
                                            /*StringList.Format("[existing_license_alt] "),*/
                                            {
                                                control: "Hyperlink", //one of them is hyperlink
                                                uri: StringList.Format("[how_to_find_sn_link]"), //it doesn't matter what is stored here
                                                inlines: [StringList.Format("[alternative_activation_choose_text]")], //link text
                                                clicked: event_alt, 
                                                name: "m_hyperlink_alt4" // set name to avoid object clean
                                            }/*,
                                            StringList.Format("[Period]")*/
                                        ]
                                    },
                                

                                ]
                            },
                            
                            //##################
                            //just activated by a file
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_activated_by_file",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        fontSize: medium_font, //by review
                                        //fontWeight: "bold", //by review
                                        text: StringList.Format("[left_license_activation]")
                                    },
                                    {
                                        control: "StackPanel", //here go our 5 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        children:
                                        [
                                            {
                                                control: "TextBlock",
                                                halign: "left",
                                                text: StringList.Format("[existing_license_file]"),
                                                fontStyle: "italic",
                                                name: "m_activated_by_file_path"
                                            },     
                                            {
                                                control: "TextBlock",
                                                margin: {top: control_top},
                                                name: "m_activated_by_file_block",
                                                inlines: //contains inlines
                                                [
                                                    StringList.Format("[activated_by_file_alt] "),
                                                    {
                                                        control: "Hyperlink", //one of them is hyperlink
                                                        uri: StringList.Format("[how_to_find_sn_link]"), //it doesn't matter what is stored here
                                                        inlines: [StringList.Format("[alternative_activation_link_text]")], //link text
                                                        clicked: event_alt, 
                                                        name: "m_hyperlink_alt5" // set name to avoid object clean
                                                    },
                                                    StringList.Format("[Period]")
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            
                            //##################
                            //just activated by a serial number
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_activated_by_sn",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        fontSize: medium_font, //by review
                                        //fontWeight: "bold", //by review
                                        text: StringList.Format("[left_license_activation]")
                                    },
                                    {
                                        control: "StackPanel", //here go our 5 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        children:
                                        [
                                            {
                                                control: "TextBlock",
                                                halign: "left",
                                                text: StringList.Format("[existing_license_sn]"),
                                                fontStyle: "italic",
                                                //fontSize: medium_font, 
                                                name: "m_activated_by_sn_val"
                                            },     
                                            {
                                                control: "TextBlock",
                                                margin: {top: control_top},
                                                name: "m_activated_by_sn_block",
                                                inlines: //contains inlines
                                                [
                                                    StringList.Format("[activated_by_sn_alt] "),
                                                    {
                                                        control: "Hyperlink", //one of them is hyperlink
                                                        uri: StringList.Format("[how_to_find_sn_link]"), //it doesn't matter what is stored here
                                                        inlines: [StringList.Format("[alternative_activation_link_text]")], //link text
                                                        clicked: event_alt, 
                                                        name: "m_hyperlink_alt6" // set name to avoid object clean
                                                    },
                                                    StringList.Format("[Period]")
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }, 
                            
                        ]
                    }
                ]
                        
            };
            
            var control = Wizard.BuildControl(obj);
            control.Name = "License_Widget";
            control.Owner = P();
            control.Visible = P(true);
            control.Disabled = P(false);
            control.EventAlt = event_alt;
            control.EventSN = event_sn;
            
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_license_widget_container;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.EventSnClick = event_sn_click;
            control.EventExClick = event_ex_click;
            control.EventSnUnclick = event_sn_unclick;
            control.EventExUnclick = event_ex_unclick;
            control.EventNoLicenseCheck = event_no_license_on_checked;
            
            control.EventSnClick.Connect(function() 
            {
                control.js.m_existing_serial.changed(control.js.m_existing_serial.text);
                control.js.m_existing_serial.Focus();
                Wizard.Notify("activation/type", "type", "sn");
            });
            
            control.EventExClick.Connect(function() 
            {
                Wizard.Notify("activation/type", "type", "use_existent");
            });

            var h = ns_help.Helper();
 
            control.EventSN.Connect(function(sn) 
            {
                var sn_control;
                if (control.js.m_first_time_activation.visible)
                {
                    sn_control = control.js.m_serial;
                }
                else if (control.js.m_tll_about_to_expire.visible)
                {
                    sn_control = control.js.m_tll_serial;
                }
                else if (control.js.m_existing_license.visible)
                {
                    sn_control = control.js.m_existing_serial;
                }

                if (sn_control)
                {
                    h.SetCaret(sn_control.caretIndex);
                    sn_control.text = h.Format(sn);
                    sn_control.caretIndex = h.GetCaret();
                }
                else
                {
                    Log(Log.warning, "serial number control haven't been found");
                }
            });
            
            control.OnAttach = function(dialog_name)
            {
                Log("OnAttach License Widget to dialog " + dialog_name);
                var set_mode = function(id, notify, value)
                {
                    Log("   setting activation mode, incoming value = " + value);
                    control.js.m_first_time_activation.visible = false;
                    control.js.m_during_tll.visible = false;
                    control.js.m_tll_about_to_expire.visible = false;
                    control.js.m_existing_license.visible = false;
                    control.js.m_activated_by_sn.visible = false;
                    control.js.m_activated_by_file.visible = false;                    
                    
                    switch(value)
                    {
                        case "first_time_activation":
                            control.js.m_first_time_activation.visible = true;
                            Wizard.Notify("activation/type", "type", "sn");
                            break;
                        case "during_tll":
                            control.js.m_during_tll.visible = true;
                            Wizard.Notify("activation/type", "type", "use_existent");
                            break;         
                        case "tll_about_to_expire":
                            control.js.m_tll_about_to_expire.visible = true;
                            Wizard.Notify("activation/type", "type", "sn");
                            break;
                        case "existing_license":
                            control.js.m_existing_license.visible = true;
                            Wizard.Notify("activation/type", "type", "use_existent");
                            break;    
                        case "activated_by_sn":
                            control.js.m_activated_by_sn.visible = true;
                            //activation type was already set
                            break;
                        case "activated_by_file":
                            control.js.m_activated_by_file.visible = true;
                            //activation type was already set
                            break;                              
                        default:
                            control.js.m_first_time_activation.visible = true;
                            Wizard.Notify("activation/type", "type", "sn");
                            break;
                    }
                }
                
                var get_mode = function()
                {
                   if (control.js.m_first_time_activation.visible) return "first_time_activation";
                   if (control.js.m_during_tll.visible) return "during_tll";
                   if (control.js.m_tll_about_to_expire.visible) return "tll_about_to_expire";
                   if (control.js.m_existing_license.visible) return "existing_license";
                   if (control.js.m_activated_by_sn.visible) return "activated_by_sn";
                   if (control.js.m_activated_by_file.visible) return "activated_by_file";                   
                   return "";
                }

                Wizard.Subscribe("first_time_activation", "show tll warning", function(id, notify, value){control.js.m_tll_warn_container.visible = value});
                Wizard.Subscribe("first_time_activation/serial_number", "get text", function(){return control.js.m_serial.text});
                Wizard.Subscribe("first_time_activation/serial_number", "set text", function(id, notify, value){control.js.m_serial.text = value});
                Wizard.Subscribe("first_time_activation/serial_number", "set focus", function(id, notify, value){control.js.m_serial.Focus();});
                Wizard.Subscribe("first_time_activation/alt", "set text", function(id, notify, value){/*control.js.m_first_time_activation_alt.inlines[0].text = value*/});
                Wizard.Subscribe("first_time_activation", "error", function(id, notify, value)
                {
                    if(control.js.m_serial_error)
                    {
                        control.js.m_serial_error.rtfText = StringList.Format("[description_format]", value);
                        if (value == "")
                        {
                            control.js.m_serial_error.visible = false;
                        }
                        else
                        {
                            control.js.m_serial_error.visible = true;
                        }
                    }
                });

                Wizard.Subscribe("tll_about_to_expire/serial_number", "get text", function(){return control.js.m_tll_serial.text});
                Wizard.Subscribe("tll_about_to_expire/serial_number", "set text", function(id, notify, value){control.js.m_tll_serial.text = value});
                Wizard.Subscribe("tll_about_to_expire/serial_number", "set focus", function(id, notify, value){control.js.m_tll_serial.Focus();});
                Wizard.Subscribe("tll_about_to_expire/remark", "set text", function(id, notify, value){control.js.m_about_to_expire_tll_remark.rtfText = value});
                Wizard.Subscribe("tll_about_to_expire", "error", function(id, notify, value)
                {
                    if(control.js.m_tll_serial_error)
                    {
                        control.js.m_tll_serial_error.rtfText = StringList.Format("[description_format]", value);
                        if (value == "")
                        {
                            control.js.m_tll_serial_error.visible = false;
                        }
                        else
                        {
                            control.js.m_tll_serial_error.visible = true;
                        }
                    }
                });

                Wizard.Subscribe("during_tll/remark", "set text", function(id, notify, value){control.js.m_during_tll_remark.text = value;});
                Wizard.Subscribe("existing_license/file", "set text", function(id, notify, value){control.js.m_existing_license_file.text = value; control.js.m_activated_by_file_path.text = value});
                Wizard.Subscribe("existing_license/sn", "set text", function(id, notify, value){control.js.m_activated_by_sn_val.text = value});
                Wizard.Subscribe("existing_license/sn_mode", "get", function(){return control.js.m_existing_serial_check.checked;});
                Wizard.Subscribe("existing_license/ex_mode", "get", function(){return control.js.m_existing_license_check.checked;});
                Wizard.Subscribe("existing_license/serial_number", "get text", function(){return control.js.m_existing_serial.text});
                Wizard.Subscribe("existing_license/serial_number", "set text", function(id, notify, value){control.js.m_existing_serial.text = value});
                Wizard.Subscribe("existing_license/serial_number", "set focus", function(id, notify, value){control.js.m_existing_serial.Focus();});
                Wizard.Subscribe("existing_license", "error", function(id, notify, value)
                {
                    if(control.js.m_existing_serial_error)
                    {
                        control.js.m_existing_serial_error.rtfText = StringList.Format("[description_format]", value);
                        if (value == "")
                        {
                            control.js.m_existing_serial_error.visible = false;
                        }
                        else
                        {
                            control.js.m_existing_serial_error.visible = true;
                        }
                    }
                });
                Wizard.Subscribe("activation/mode", "set mode", set_mode);
                Wizard.Subscribe("activation/mode", "get mode", get_mode);

                const FIRST_TIME_ACTIVATION_NO_LICENSE_ID = "first_time_activation/no_license";
                let no_license_is_selected = function(id) {
                    let is_selected = false;
                    switch(id) {
                    case FIRST_TIME_ACTIVATION_NO_LICENSE_ID:
                        if(control.js.m_first_time_no_license_check) {
                            is_selected = control.js.m_first_time_no_license_check.checked;
                        }

                        break;
                    default:
                        is_selected = false;
                    }
                    return is_selected;
                };

                Wizard.Subscribe(FIRST_TIME_ACTIVATION_NO_LICENSE_ID, "is selected", no_license_is_selected);

                Log("OnAttach License Widget to dialog complete");
            }
           
            control.OnChange = ns_sender.DialogEvent(control);
            control.EventAlt.Connect(control.OnChange.Transmit("NTF_ALT"));
            control.EventSN.Connect(control.OnChange.Transmit("NTF_SN"));
            control.EventExClick.Connect(control.OnChange.Transmit("NTF_SN"));
            control.EventSnClick.Connect(control.OnChange.Transmit("NTF_SN"));

            control.EventNoLicenseCheck.Connect(control.OnChange.Transmit("notify_no_license"));
            
            return control;
        }
    }
}
