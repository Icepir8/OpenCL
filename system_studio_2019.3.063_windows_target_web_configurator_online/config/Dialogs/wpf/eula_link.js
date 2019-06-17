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

    var ns_wpf    = base("wpf.js");
    var ns_enum   = base("enums.js");
    var ns_event  = base("event.js");
    var ns_sender = base("event_sender.js");
    var ns_inst   = base("installer.js");
    var ns_bld    = base("builder.js");
    var ns_prop   = base("property.js");
    
    var ns_bc     = dialogs("base_container.js");
    var P = function(val){return ns_prop.Property(val);}
   
    var format = StringList.Format;
    var iswin7os = (System.WindowsInfo().major == 6 && System.WindowsInfo().minor == 1 && StringList.Locale() ==1041); //indicates only windows 7 Japanese
        
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
        
        Wizard.ControlCollection["EulaLink"] = function()
        {
            var event_click = ns_event.FEvent(); 
            
            var _eula_obj = 
            {
                control: "StackPanel", 
                orientation: "vertical", //we will stack widgets vertically one by one
                //width: ww100 - 2*ww10, //window width (500) minus left margin (45) and right margin (45)
                margin: {top: widget_top, left: widget_left, right: widget_left, bottom: 3},
                background: "#00000000", //set alpha-channel to 0 for transparent background
                name: "m_eula_link", //it will contain all widgets
                children:
                [
                    {
                        control: "TextBlock",
                        wrap: "wrap",
                        GridRow: 3,
                        name: "m_eula_holder",
                        fontFamily : iswin7os? "MS UI Gothic" : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                        text : format("[getting_started_eula_install_template_text] "),
                    },
                    {
                        control: "TextBlock",
                        wrap: "wrap",
                        GridRow: 3,
                        name: "m_eula_hyperlink",
                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                        inlines: [
                            {
                                control: "Hyperlink",
                                name: "m_eula",
                                fontStyle: "italic",
                                fontWeight: "bold",
                                uri: FileSystem.MakePath(format("[getting_started_eula_link]"), Origin.Directory() + ".."),
                                inlines: [format("[getting_started_eula_template_link]")],
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                            },
                            format("[Period]"),
                        ]

                    },
                    
                ]
            };  
            
            var control = Wizard.BuildControl(_eula_obj);
            control.Name = "EulaLink";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_eula_link;
                ctrl.visible = val;
                ctrl.enabled = val;
            });
            
            //TODO to rewrite
            control.js.m_eula.clicked = function()
            {
                Log("EULA link was clicked");
                var ns_dlg = dialogs("win_dialog.js");
                var ns_nav = dialogs("navigator.js");
                var dlg_ctrl = ns.EULAModalDialog.Control.GetRaw();
                dlg_ctrl.navigator = ns_nav.Okay();
                var dlg = ns_dlg.Dialog(dlg_ctrl);
                var ret = ns.Window.Spawn(dlg);
            };
            control.OnAttach = function(dialog_name)
            {
                var process_notify = function(id, notify, value)
                {
                    var ctl = control.js.m_eula_holder;

                    switch(notify)
                    {
                        case "set text":
                            ctl.text = format(value);
                            break;
                        case "show":
                            ctl.visible = true;
                            break;
                        case "hide":
                            ctl.visible = false;
                            break;
                        case "disable":
                            ctl.enabled = false;
                            break;
                        case "enable":
                            ctl.enabled = true;
                            break;
                        default:
                            break;
                    }

                };
                
                var process_subscriptions = function(subscribe_id)
                {
                    var notifications = ["hide", "show", "disable", "enable", "set text"];
                    for(var i in notifications)
                    {
                        Wizard.Subscribe(subscribe_id, notifications[i], process_notify);
                    }
                };
                
                process_subscriptions(dialog_name + "/feature/eula");
                
            }
            control.EventClick = event_click;
            
            control.OnChange = ns_sender.DialogEvent(control);
            //no need to transmit event now
            //event_click.Connect(control.OnChange.Transmit("NTF"));

            return control;
        };
    }    
           
    this.BuildWidgets = function(prod)
    {
        var ns = this;
        
        //###################################################################################
        var build_eula_link = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["EulaLink"]());
            var dlg_name = function(){return w.Owner.GetRaw().Name();}
            
            w.CB_Initialize(function()
            {
                //change the text
                Log("Eula initialization");
                var header = ns_inst.Installer.DownloadOnly() ? "[getting_started_eula_download_template_text] " : "[getting_started_eula_install_template_text] ";
                Wizard.Notify(dlg_name() + "/feature/eula", "set text", header);
            });
            
            w.CB_Skip(function()
            {
                Log("EUlA check skipping...");
                if (prod.InstallMode() != prod.install_mode_t.install)
                {
                    //this check is fair for download-only mode too
                    Log("EUlA is skipped due to prod.InstallMode = " + prod.InstallMode());
                    return true;
                }
                return false;
            });

            return w;
        };
        
        Wizard.WidgetCollection["build_eula_link"] = build_eula_link;
    }
        

}
                