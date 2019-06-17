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
        var pixel_width = Wizard.Theme().PixelWidth();
        var control_top = Wizard.Theme().PixelWidth();
        var control_left = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();
        var small_font = Wizard.Theme().SmallFont();
                
        
        Wizard.ControlCollection["AltLicenseFile"] = function()
        {
            var event_click = ns_event.FEvent();
            var event_unclick = ns_event.FEvent();
            var event_file = ns_event.FEvent();
            var event_browse = ns_event.FEvent();

            var obj =
            { // license file
                control: "StackPanel",
                valign: "center",
                name: "m_license_file_panel",
                margin: {left: widget_left, right: widget_left, top: widget_top},
                bindings: 
                [
                        {
                            key: "f",
                            mod: "alt",
                            clicked: function() {if(this.js.m_license_file.enabled && !this.js.m_license_file.checked) this.js.m_license_file.checked = true;}
                        }
                ],
                children: 
                [
                    {
                        control: "RadioButton",
                        checked: false,
                        group: "activation",
                        name: "m_license_file",
                        onChecked: event_click,
                        onUnchecked: event_unclick,
                        content: {
                            control: "Label",
                            content: format("[license_file_activation]"),
                            padding: 0,
                            fontSize: medium_font,
                        }
                    },
                    {
                        control: "StackPanel",
                        valign: "center",
                        margin: {left: widget_left, top: 2*control_top},
                        children: 
                        [
                            {
                                control: "TextBlock",
                                text: format("[provide_a_license_file]")
                            },
                            {
                                control: "Grid",
                                margin: {top: control_top},
                                children:
                                [
                                    {
                                        control: "TextBox",
                                        minHeight: 24,
                                        maxHeight: 24,
                                        minWidth: window_width *2/3 - 10,
                                        maxWidth: window_width *2/3 - 10,
                                        valign: "center",
                                        halign: "left",
                                        fontSize : small_font,
                                        GridColumn: 0,
                                        padding: {left: 3, right: 3, top: 1, bottom: 1},
                                        margin: {right: control_left},
                                        name: "m_file",
                                        onFocused: function() {if(this.js.m_license_file.enabled && !this.js.m_license_file.checked) this.js.m_license_file.checked = true;}, 
                                        changed: event_file
                                    },
                                    
                                    {
                                        control: "Button",
                                        name: "m_browse",
                                        minHeight: 24,
                                        maxHeight: 24,
                                        fontSize : medium_font,
                                        valign: "center",
                                        halign: "right",
                                        clicked: event_browse,
                                        content: StringList.Format("[destination_button_browse]"),
                                        minWidth: pixel_width*5,
                                        padding: {left: 10, right: 10, bottom: 2},
                                        GridColumn: 1
                                    },
                                ]
                            },

                            {
                                control: "TextBlock", //hyperlink holder
                                margin: {top: control_top},
                                inlines: //contains inlines
                                [
                                    StringList.Format("[license_available_for_download] "),
                                    {
                                        control: "Hyperlink", //one of them is hyperlink
                                        uri: StringList.Format("[reg_center_link]"), //here's valid https address
                                        inlines: [StringList.Format("[reg_center_link]")], //link text
                                        clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                        name: "m_hyperlink1" // set name to avoid object clean
                                    },
                                    StringList.Format("[further_instructions]"),
                                    {
                                        control: "Hyperlink", //one of them is hyperlink
                                        uri: StringList.Format("[instructions_link]"), //here's valid https address
                                        inlines: [StringList.Format("[instructions_link]")], //link text
                                        clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                        name: "m_hyperlink2" // set name to avoid object clean
                                    },
                                    StringList.Format("[Period] "),
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
                                margin: {top: control_top},
                                name: "m_license_file_error"
                            },                            
                        ]
                    },

                ]
            }
  
            var control = Wizard.BuildControl(obj);
            control.Name = "AltLicenseFile";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_license_file_panel;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.EventClick = event_click;
            control.EventUnclick = event_unclick;
            control.EventFile = event_file;
            control.EventBrowse = event_browse;

            control.EventClick.Connect(function() 
            {
                control.js.m_file.changed(control.js.m_file.text);
                control.js.m_file.Focus();
                //Move from here
                Wizard.Notify("activation/type", "type", "lic_file");
            });
                    
            control.EventBrowse.Connect(function()
            {
                var st = control.js.m_file.text;
                var cd = (FileSystem.IsAbsolute(st) && FileSystem.Exists(st)) ? st : "";
                var p = WPF.OpenFileDialog(cd, format('[activation_license_file_format]'));
                if(p)
                {
                    control.js.m_file.text = p;
                    control.js.m_file.Focus();
                }
            });
            
            control.OnAttach = function(dialog_name)
            {
                Wizard.Subscribe(dialog_name + "/alt/license_file", "enable", function(){control.js.m_license_file.enabled = true; control.js.m_file.enabled = true;});
                Wizard.Subscribe(dialog_name + "/alt/license_file", "disable", function(){control.js.m_license_file.enabled = false; control.js.m_file.enabled = false;});
                Wizard.Subscribe(dialog_name + "/alt/license_file", "set checked", function(id, notify, check){control.js.m_license_file.checked = check});
                Wizard.Subscribe(dialog_name + "/alt/license_file", "is checked", function(id, notify){return control.js.m_license_file.checked ? 1 : 0;});      
                Wizard.Subscribe(dialog_name + "/alt/license_file", "set text", function(id, notify, value){control.js.m_file.text = value;}); 
                Wizard.Subscribe(dialog_name + "/alt/license_file", "get text", function(){return control.js.m_file.text;});  
                Wizard.Subscribe(dialog_name + "/alt/license_file", "set focus", function(id, notify, value){control.js.m_file.Focus();});  
                Wizard.Subscribe(dialog_name + "/alt/license_file", "error", function(id, notify, value)
                {
                    if(control.js.m_license_file_error)
                    {
                        Log("control.js.m_license_file_error.text received " + value); 
                        control.js.m_license_file_error.rtfText = StringList.Format("[description_format]", value); 
                        if (value == "")
                        {
                            control.js.m_license_file_error.visible = false;
                        }
                        else
                        {
                            control.js.m_license_file_error.visible = true;
                        } 
                    }
                });
            }
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            control.EventClick.Connect(control.OnChange.Transmit("NTF_LICENSE_FILE"));
            control.EventUnclick.Connect(control.OnChange.Transmit("NTF_UNCLICK"));
            control.EventFile.Connect(control.OnChange.Transmit("NTF_FILE"));
            
       
            return control;
            
        };
        
        
        Wizard.ControlCollection["AltSerialNumber"] = function()
        {
            var event_click = ns_event.FEvent();
            var event_unclick = ns_event.FEvent();
            var event_sn = ns_event.FEvent();
            
            var obj =
            { // serial number
                control: "StackPanel",
                valign: "center",
                name: "m_serial_panel",
                margin: {left: widget_left, right: widget_left, top: widget_top},
                bindings: 
                [
                        {
                            key: "s",
                            mod: "alt",
                            clicked: function() {if(this.js.m_serial_check.enabled && !this.js.m_serial_check.checked) this.js.m_serial_check.checked = true;}
                        }
                ],
                children: 
                [
                    {
                        control: "RadioButton",
                        checked: false,
                        group: "activation",
                        name: "m_serial_check",
                        onChecked: event_click,
                        onUnchecked: event_unclick,
                        content: {
                            control: "Label",
                            content: format("[serial_number_activation]"),
                            padding: 0,
                            fontSize: medium_font,
                        }
                    },
                    {
                        control: "StackPanel",
                        valign: "center",
                        margin: {left: widget_left, top: 2*control_top},
                        children: 
                        [
                            {
                                control: "Grid",
                                background: "#00000000", //set alpha-channel to 0 for transparent background
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        GridColumn: 0,
                                        halign: "left",
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
                                                name: "m_hyperlink3" // set name to avoid object clean
                                            }
                                        ]
                                    }
                                ]
                            },
                            
                            {
                                control: "TextBox",
                                GridColumn: 0,
                                minHeight: 24,
                                maxHeight: 24,
                                valign: "center",
                                fontSize : small_font,
                                padding: {left: 3, right: 3, top: 1, bottom: 1},
                                name: "m_serial",
                                margin: {top: control_top},
                                onFocused: function() {if(this.js.m_serial_check.enabled && !this.js.m_serial_check.checked) this.js.m_serial_check.checked = true;}, 
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
                                name: "m_serial_error",
                            },                            
      
                        ]
                    },

                ]
            }
  
            
            var control = Wizard.BuildControl(obj);
            control.Name = "AltSerialNumber";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_serial_panel;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.EventClick = event_click;
            control.EventUnclick = event_unclick;
            control.EventSN = event_sn;
            control.EventClick.Connect(function() 
            {
                control.js.m_serial.changed(control.js.m_serial.text);
                control.js.m_serial.Focus();
                //move from here
                Wizard.Notify("activation/type", "type", "sn");
            });
            
            var h = ns_help.Helper();
            control.EventSN.Connect(function(sn) 
            {
                h.SetCaret(control.js.m_serial.caretIndex);
                control.js.m_serial.text = h.Format(sn);
                control.js.m_serial.caretIndex = h.GetCaret();
            });
            
            control.OnAttach = function(dialog_name)
            {
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "enable", function(){control.js.m_serial_check.enabled = true; control.js.m_serial.enabled = true;});
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "disable", function(){control.js.m_serial_check.enabled = false; control.js.m_serial.enabled = false;});
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "set checked", function(id, notify, check){control.js.m_serial_check.checked = check});
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "is checked", function(id, notify){return control.js.m_serial_check.checked ? 1 : 0;});      
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "get text", function(){return control.js.m_serial.text});                
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "set text", function(id, notify, value){control.js.m_serial.text = value});
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "set focus", function(id, notify, value){control.js.m_serial.Focus();});  
                Wizard.Subscribe(dialog_name + "/alt/serial_number", "error", function(id, notify, value)
                {
                    if(control.js.m_serial_error)
                    {
                        Log("control.js.m_serial_error.text received " + value); 
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
                
            }
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            control.EventClick.Connect(control.OnChange.Transmit("NTF_SERIAL_NUMBER"));
            control.EventUnclick.Connect(control.OnChange.Transmit("NTF_UNCLICK"));
            control.EventSN.Connect(control.OnChange.Transmit("NTF_SN"));
            
       
            return control;
            
        };      

        Wizard.ControlCollection["AltFloatingLicense"] = function()
        {
            var event_click = ns_event.FEvent();
            var event_unclick = ns_event.FEvent();
            var event_host = ns_event.FEvent();
            var event_port = ns_event.FEvent();
            var event_guide = ns_event.FEvent();
            
            var obj = 
            {
                //floating license
                control: "StackPanel",
                valign: "center",
                name: "m_floating_panel",
                margin: {left: widget_left, right: widget_left, top: widget_top},
                bindings: 
                [
                        {
                            key: "l",
                            mod: "alt",
                            clicked: function() {if(this.js.m_floating_license.enabled && !this.js.m_floating_license.checked) this.js.m_floating_license.checked = true;}
                        }
                ],

                children: 
                [
                    {
                        control: "RadioButton",
                        checked: false,
                        group: "activation",
                        name: "m_floating_license",
                        onChecked: event_click,
                        onUnchecked: event_unclick,
                        content: {
                            control: "Label",
                            content: format("[floating_license_activation]"),
                            padding: 0,
                            fontSize: medium_font,
                        }

                    },
                    {
                        control: "StackPanel",
                        valign: "center",
                        margin: {left: widget_left, top: 2*control_top},
                        children: 
                        [

                            {
                                control: "TextBlock",
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                text: StringList.Format("[activate_through_manager] "),
                                //fontStyle: "italic", //by review
                                inlines: //contains inlines
                                [
                                    {
                                        control: "Hyperlink", //one of them is hyperlink
                                        uri: StringList.Format("[license_manager_guide_link]"), //here's valid https address
                                        inlines: [StringList.Format("[license_manager_guide_text]")], //link text
                                        clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                        name: "m_hyperlink4", // set name to avoid object clean
                                        //fontStyle: "italic", //by review
                                    }
                                ]
                            },
                            {
                                control: "Grid",
                                columns: [{width: 20*pixel_width}, {width: window_width - 5*widget_left - 20*pixel_width - pixel_width}],
                                margin: {top: control_top},
                                children:
                                [                                    
                                    {
                                        control: "TextBlock",
                                        halign: "right",
                                        valign: "center", //by review
                                        text: StringList.Format("[host_name_caption] ")
                                    },
                                    {
                                        control: "TextBox",
                                        minHeight: 24,
                                        maxHeight: 24,
                                        fontSize : small_font,
                                        padding: {left: 3, right: 3, top: 1, bottom: 1},
                                        name: "m_host",
                                        valign: "center",
                                        GridColumn: 1,
                                        onFocused: function() {if(this.js.m_floating_license.enabled && !this.js.m_floating_license.checked) this.js.m_floating_license.checked = true;},
                                        changed: event_host
                                    },
                                ]
                            },
                            {
                                control: "Grid",
                                columns: [{width: 20*pixel_width}, {width: window_width - 5*widget_left - 20*pixel_width - pixel_width}],
                                margin: {top: 2*control_top},
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        halign: "right",
                                        valign: "center", //by review
                                        text: StringList.Format("[port_number_caption] ")
                                    },
                                    {
                                        control: "TextBox",
                                        minHeight: 24,
                                        maxHeight: 24,
                                        valign: "center",
                                        fontSize : small_font,
                                        padding: {left: 3, right: 3, top: 1, bottom: 1},
                                        name: "m_port",
                                        GridColumn: 1,
                                        onFocused: function() {if(this.js.m_floating_license.enabled && !this.js.m_floating_license.checked) this.js.m_floating_license.checked = true;},
                                        changed: event_port
                                    },
                                ]
                            },

                            {
                                control: "RichTextBox",
                                GridColumn: 1,
                                vscroll: "auto",
                                readOnly: true,
                                borderThickness: 0,
                                documentEnabled: true,
                                clicked: function(uri) {Execute.URL(uri);},
                                halign: "left",
                                foreground: "red",
                                //height: 0,
                                margin: {top: control_top},
                                name: "m_floating_license_error"
                            }                            
                        ]
                    },

                ]
                
            }
            
            var control = Wizard.BuildControl(obj);
            control.Name = "AltFloatingLicense";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_floating_panel;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.EventClick = event_click;
            control.EventUnclick = event_unclick;
            control.EventHost = event_host;
            control.EventPort = event_port;
            control.EventGuide = event_guide;
            control.EventClick.Connect(function() 
            {
                control.js.m_host.changed(this.js.m_host.text);
                control.js.m_port.changed(this.js.m_port.text);
                control.js.m_host.Focus();
                Wizard.Notify("activation/type", "type", "floating");
            });
            
            control.OnAttach = function(dialog_name)
            {
                Wizard.Subscribe(dialog_name + "/alt/floating_license", "enable", function(){control.js.m_floating_license.enabled = true; control.js.m_host.enabled = true; control.js.m_port.enabled = true;});
                Wizard.Subscribe(dialog_name + "/alt/floating_license", "disable", function(){control.js.m_floating_license.enabled = false; control.js.m_host.enabled = false; control.js.m_port.enabled = false;});
                Wizard.Subscribe(dialog_name + "/alt/floating_license", "set checked", function(id, notify, check){control.js.m_floating_license.checked = check});
                Wizard.Subscribe(dialog_name + "/alt/floating_license", "is checked", function(id, notify){return control.js.m_floating_license.checked ? 1 : 0;});      
                Wizard.Subscribe(dialog_name + "/alt/floating_license/host", "get text", function(){return control.js.m_host.text});                
                Wizard.Subscribe(dialog_name + "/alt/floating_license/host", "set text", function(id, notify, value){control.js.m_host.text = value});
                Wizard.Subscribe(dialog_name + "/alt/floating_license/host", "set focus", function(id, notify, value){control.js.m_host.Focus();});  
                Wizard.Subscribe(dialog_name + "/alt/floating_license/port", "get text", function(){return control.js.m_port.text});                
                Wizard.Subscribe(dialog_name + "/alt/floating_license/port", "set text", function(id, notify, value){control.js.m_port.text = value});
                Wizard.Subscribe(dialog_name + "/alt/floating_license/port", "set focus", function(id, notify, value){control.js.m_port.Focus();});  
                Wizard.Subscribe(dialog_name + "/alt/floating_license", "error", function(id, notify, value)
                {
                    if(control.js.m_floating_license_error)
                    {
                        Log("control.js.m_floating_license_error.text received " + value); 
                        control.js.m_floating_license_error.rtfText = StringList.Format("[description_format]", value); 
                        if (value == "")
                        {
                            control.js.m_floating_license_error.visible = false;
                        }
                        else
                        {
                            control.js.m_floating_license_error.visible = true;
                        }
                    }
                });
            }
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            control.EventClick.Connect(control.OnChange.Transmit("NTF_FLOATING_LICENSE"));
            control.EventUnclick.Connect(control.OnChange.Transmit("NTF_UNCLICK"));
            control.EventHost.Connect(control.OnChange.Transmit("NTF_HOST"));
            control.EventPort.Connect(control.OnChange.Transmit("NTF_PORT"));

            return control;

        }
    }
    
    //################################################################
    //widgets
    //################################################################
    this.BuildWidgets = function()
    {
        var ns = this;

        var wdgt_serial_number = function()
        {
            var class_ctrl = Wizard.ControlCollection["AltSerialNumber"];
            var w = ns_bld.BuildWidget(class_ctrl());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            w.CB_DisableOnSkip(function(){return false;});
            w.CB_Initialize(function()
            {
                Wizard.Notify(d_name() + "/alt/serial_number", "set checked", false);
                Wizard.Notify(d_name() + "/alt/serial_number", "set text", "");
                Wizard.Notify(d_name() + "/alt/serial_number", "error", "");
            });
            
            w.OnChange(function(sender, event_id)
            {
                var is_sn = Wizard.OnNotify(d_name() + "/alt/serial_number", "is checked"); 
                var sn = Wizard.OnNotify(d_name() + "/alt/serial_number", "get text");   
                var disable = (is_sn && (sn.length != 13));
                if (w.ButtonNext.Disabled() != disable)
                    w.ButtonNext.Disabled(disable); //TODO: need to procees somehow messages when radiobutton is getting uncheked 

                // since Next (OK) button was disabled when dialog starts (see CB_OwnInitialize), we need to enable it
                // to have a possibility to go ahead in case it is allowed by the corresponging widget
                var enable = (is_sn && sn.length == 13);
                if (enable && w.Owner.GetRaw().ButtonNext.Disabled())
                {
                    w.Owner.GetRaw().ButtonNext.Disabled(false);
                }
            });
            
            w.CB_CanGoNext(function()
            {
                Wizard.Notify(d_name() + "/alt/serial_number", "error", "");
                if (!Wizard.OnNotify(d_name() + "/alt/serial_number", "is checked"))
                    return true; 
                if (!ns.ActivationManager)
                    return true;                
                
                var sn = Wizard.OnNotify(d_name() + "/alt/serial_number", "get text");  
                //simple check sn
                if (sn.length != 13)
                {
                    //set focus
                    Wizard.Notify(d_name() + "/alt/serial_number", "set focus");  
                    return false;
                }

                return true; 
            });
            
            w.CB_GoNext(function()
            {
                if (!Wizard.OnNotify(d_name() + "/alt/serial_number", "is checked"))
                    return true; 
                if (!ns.ActivationManager)
                    return true;
                
                var sn = Wizard.OnNotify(d_name() + "/alt/serial_number", "get text");  
                //apply sn activation 

                Log("Processing serial number based activation: " + sn);
                Wizard.BusyStart();
                var r = ns.ActivationManager.Manager.ActivateOnline(sn);
                var ret = {exit_code : r.exit_code, error_message : r.error_message, issa_code : r.issa_code};
                Wizard.BusyStop();
                
                Log("Processing serial number based activation finished with code: " + ret.exit_code);
                if(ret.exit_code)
                    return true;                    
                
                if (ret.issa_code && ret.issa_code == -3 /*ISSA_ERR_CONNECTION*/) //display offline message
                {
                    var ns_dlg = dialogs("win_dialog.js");
                    var dlg_ctrl = ns.ModalOfflineSN.Control.GetRaw();
                    var dlg = ns_dlg.Dialog(dlg_ctrl);
                    ns.Window.Spawn(dlg);
                    return false;
                }
                
                Log("       error_message: " + ret.error_message);  
                Wizard.Notify(d_name() + "/alt/serial_number", "error", ret.error_message);
                Wizard.Notify(d_name() + "/alt/serial_number", "set focus");  
                return false; 
            });

            return w;
        }
        
        
        
        var wdgt_license_file = function()
        {
            var class_ctrl = Wizard.ControlCollection["AltLicenseFile"];
            var w = ns_bld.BuildWidget(class_ctrl());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            w.CB_DisableOnSkip(function(){return false;});
            w.CB_Initialize(function()
            {
                Wizard.Notify(d_name() + "/alt/license_file", "set checked", false);
                Wizard.Notify(d_name() + "/alt/license_file", "set text", "");
                Wizard.Notify(d_name() + "/alt/license_file", "error", "");
            });
            
            w.OnChange(function(sender, event_id)
            {
                var is_lf = Wizard.OnNotify(d_name() + "/alt/license_file", "is checked"); 
                var lf = Wizard.OnNotify(d_name() + "/alt/license_file", "get text");  
                var disable = is_lf && (!lf.length);
                if (w.ButtonNext.Disabled() != disable)
                    w.ButtonNext.Disabled(disable); //TODO: need to procees somehow messages when radiobutton is getting uncheked 

                // since Next (OK) button was disabled when dialog starts (see CB_OwnInitialize), we need to enable it
                // to have a possibility to go ahead in case it is allowed by the corresponging widget
                var enable = (is_lf && lf.length);
                if (enable && w.Owner.GetRaw().ButtonNext.Disabled())
                {
                    w.Owner.GetRaw().ButtonNext.Disabled(false);
                }
            });
            
            w.CB_CanGoNext(function()
            {
                Wizard.Notify(d_name() + "/alt/license_file", "error", "");
                if (!Wizard.OnNotify(d_name() + "/alt/license_file", "is checked"))
                    return true; 
                if (!ns.ActivationManager)
                    return true;
                
                var lf = Wizard.OnNotify(d_name() + "/alt/license_file", "get text");  
                //check
                if (!lf.length)
                {
                    //Set focus
                    Wizard.Notify(d_name() + "/alt/license_file", "set focus");  
                    return false;
                }

                return true; 
            });
            
            w.CB_GoNext(function()
            {
                if (!Wizard.OnNotify(d_name() + "/alt/license_file", "is checked"))
                    return true; 
                if (!ns.ActivationManager)
                    return true;

                var lic_file = Wizard.OnNotify(d_name() + "/alt/license_file", "get text");  
                //apply lic_file
                Log("Processing license file activation: " + lic_file);
                Wizard.BusyStart();
                var r = ns.ActivationManager.Manager.ActivateLicenseFile(lic_file);
                var ret = {exit_code : r.exit_code, error_message : r.error_message, issa_code : r.issa_code};
                Wizard.BusyStop();

                Log("Processing license file activation finished with code: " + ret.exit_code);
                if(ret.exit_code)
                    return true;

                Log("       error_message: " + ret.error_message);  
                Wizard.Notify(d_name() + "/alt/license_file", "error", ret.error_message);
                Wizard.Notify(d_name() + "/alt/license_file", "set focus");  
                return false; 
            });
            
            return w;
        }
        
        
        
        var wdgt_floating_license = function()
        {
            var class_ctrl = Wizard.ControlCollection["AltFloatingLicense"];
            var w = ns_bld.BuildWidget(class_ctrl());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            
            var is_valid_hostname = function(host)
            {
                if(!host || !host.length)
                    return false;
                if(host.length > 255)
                    return false;
                if((!host.match(/^((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]))$/))
                    && (!host.match(/[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g)))
                    return false;
                var host_parts = host.split("."); 
                for(var part in host_parts)
                {
                    if(!host_parts[part].length > 63)
                        return false;
                }
                return true;
            }
            
            var is_valid_ip = function(address)
            {
                if (!address || !address.length)
                    return false;
                if(!address.match(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/))
                    return false;
                return true;
            }
            
            var is_valid_host = function(host)
            {
                if (is_valid_hostname(host))
                    return true;
                if (is_valid_ip(host))
                    return true;
                return false;
            }
            
            var is_valid_port = function(port)
            {
                if(!port || !port.length)
                    return;
                if(!port.match(/^\d{1,5}([ ]\d{1,5})*$/))
                    return false;
                return true;
            }
           
            w.CB_DisableOnSkip(function(){return false;});
            w.CB_Initialize(function()
            {
                Wizard.Notify(d_name() + "/alt/floating_license", "set checked", false);
                Wizard.Notify(d_name() + "/alt/floating_license/host", "set text", "");
                Wizard.Notify(d_name() + "/alt/floating_license/port", "set text", "27009");
                Wizard.Notify(d_name() + "/alt/floating_license", "error", "");
            });
            
            w.OnChange(function(sender, event_id)
            {
                var is_fl = Wizard.OnNotify(d_name() + "/alt/floating_license", "is checked"); 
                var fl_host = Wizard.OnNotify(d_name() + "/alt/floating_license/host", "get text");    
                var fl_port = Wizard.OnNotify(d_name() + "/alt/floating_license/port", "get text");  
                
                var disable = is_fl && (!is_valid_host(fl_host) || !is_valid_port(fl_port));
                if (w.ButtonNext.Disabled() != disable)
                    w.ButtonNext.Disabled(disable); 

                // since Next (OK) button was disabled when dialog starts (see CB_OwnInitialize), we need to enable it
                // to have a possibility to go ahead in case it is allowed by the corresponging widget
                var enable = (is_fl && is_valid_host(fl_host) && is_valid_port(fl_port));
                if (enable && w.Owner.GetRaw().ButtonNext.Disabled())
                {
                    w.Owner.GetRaw().ButtonNext.Disabled(false);
                }
            });
            
            w.CB_CanGoNext(function()
            {
                Wizard.Notify(d_name() + "/alt/floating_license", "error", "");
                if (!Wizard.OnNotify(d_name() + "/alt/floating_license", "is checked"))
                    return true; 
                if (!ns.ActivationManager)
                    return true;                
                
                var host = Wizard.OnNotify(d_name() + "/alt/floating_license/host", "get text");  
                var port = Wizard.OnNotify(d_name() + "/alt/floating_license/port", "get text");  
                //simple check
                if (!host.length)
                {
                    //Set focus on host
                    Wizard.Notify(d_name() + "/alt/floating_license/host", "set focus");  
                    return false;
                }
                if (!port.length)
                {
                    //Set focus on port
                    Wizard.Notify(d_name() + "/alt/floating_license/port", "set focus"); 
                    return false;
                }
                
                return true; 
            });
            
            w.CB_GoNext(function()
            {
                if (!Wizard.OnNotify(d_name() + "/alt/floating_license", "is checked"))
                    return true; 
                if (!ns.ActivationManager)
                    return true;                
                
                var host = Wizard.OnNotify(d_name() + "/alt/floating_license/host", "get text");  
                var port = Wizard.OnNotify(d_name() + "/alt/floating_license/port", "get text");  
                //apply 
                
                var file = port + "@" + host;
                Log("Processing floating license activation: " + file);
                Wizard.BusyStart();
                var r = ns.ActivationManager.Manager.ActivateLicenseFile(file, true);
                var ret = {exit_code : r.exit_code, error_message : r.error_message, issa_code : r.issa_code};
                Wizard.BusyStop();

                Log("Processing floating license activation finished with code: " + ret.exit_code);
                if(ret.exit_code)
                    return true;
                
                Log("       error_message: " + ret.error_message);  
                Wizard.Notify(d_name() + "/alt/floating_license", "error", ret.error_message);
                Wizard.Notify(d_name() + "/alt/floating_license/host", "set focus");  
                return false; 
            });
            return w;
        }
        ///////////////////////////////////////////////////////////////////
        Wizard.WidgetCollection["wdgt_serial_number"] = wdgt_serial_number;
        Wizard.WidgetCollection["wdgt_license_file"] = wdgt_license_file;
        Wizard.WidgetCollection["wdgt_floating_license"] = wdgt_floating_license;
    }    

    //################################################################
    //dialogs
    //################################################################
    this.BuildDialogs = function()        
    {
        var alt_first_time_activation = function(name)
        {
            var d = ns_bld.BuildDialog(ns_bc.BaseModalContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["wdgt_license_file"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_floating_license"]());
            d.ButtonNext.Caption("[Ok]");
            d.ButtonBack.Caption("[Back]");
            d.CB_OwnInitialize(function()
            {
                d.ButtonNext.Disabled(true);
            });

            return d;
        }
        
        var alt_during_tll = function(name)
        {
            var d = ns_bld.BuildDialog(ns_bc.BaseModalContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["wdgt_serial_number"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_license_file"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_floating_license"]());
            d.ButtonNext.Caption("[Ok]");
            d.ButtonBack.Caption("[Back]");            
            d.CB_OwnInitialize(function()
            {
                d.ButtonNext.Disabled(true);
            });
            
            return d;
        }
        var alt_existing_activation = function(name)
        {
            var d = ns_bld.BuildDialog(ns_bc.BaseModalContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["wdgt_serial_number"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_license_file"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_floating_license"]());
            d.ButtonBack.Caption("[Back]");  
            d.ButtonNext.Caption("[Ok]");             
            d.CB_OwnInitialize(function()
            {
                d.ButtonNext.Disabled(true);
            });
            
            return d;
        }
        
        //########################################################
        Wizard.DialogCollection["alt_first_time_activation"] = alt_first_time_activation;
        Wizard.DialogCollection["alt_during_tll"] = alt_during_tll;
        Wizard.DialogCollection["alt_existing_activation"] = alt_existing_activation;
 
    }
}
