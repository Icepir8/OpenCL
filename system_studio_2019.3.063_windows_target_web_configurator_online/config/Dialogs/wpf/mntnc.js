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
        
        Wizard.ControlCollection["MaintenanceOptions"] = function()
        {
            var event_modify = ns_event.FEvent(); //ns_sender.DialogEvent("NTF_MODIFY");
            var event_repair = ns_event.FEvent(); //ns_sender.DialogEvent("NTF_REPAIR");
            var event_remove = ns_event.FEvent(); //ns_sender.DialogEvent("NTF_REMOVE");
            
            var create_mntnc_obj = function()
            {
                var obj =
                {
                    control: "Grid",
                    rows: ["auto", "*"],
                    margin: 10,
                    stage: "welcome",
                    bindings: [
                        {
                            key: "m",
                            mod: "alt",
                            clicked: function() {if(this.js.m_modify.enabled) this.js.m_modify.checked = true;}
                        },
                        {
                            key: "e",
                            mod: "alt",
                            clicked: function() {if(this.js.m_repair.enabled) this.js.m_repair.checked = true;}
                        },
                        {
                            key: "r",
                            mod: "alt",
                            clicked: function() {if(this.js.m_remove.enabled) this.js.m_remove.checked = true;}
                        }
                    ],
                    children: [
                        {
                            control: "StackPanel",
                            GridRow: 0,
                            children: [
                                {
                                    control: "TextBlock",
                                    wrap: "wrap",
                                    fontSize: "14",
                                    fontWeight: "bold",
                                    text: StringList.Format("[subtitle_welcome]"),
                                    visible: false, //by review
                                }
                            ]
                        },
                        {
                            control: "Grid",
                            GridRow: 1,
                            rows: ["*", "*", "*", "*"],
                            margin: 30,
                            children: [
                                { // modify
                                    control: "StackPanel",
                                    valign: "center",
                                    GridRow: 0,
                                    margin: {top: widget_top * 2},
                                    children: [
                                        {
                                            control: "RadioButton",
                                            checked: true,
                                            group: "maintenance",
                                            name: "m_modify",
                                            onChecked: event_modify,
                                            content: {
                                                control: "Label",
                                                content: format("[Modify]"),
                                                fontWeight: "bold",
                                                padding: 0
                                            }
                                        },
                                        {
                                            control: "TextBlock",
                                            wrap: "wrap",
                                            margin: {left: 20},
                                            text: format("[modify_prod]")
                                        }
                                    ]
                                },
                                { // repair
                                    control: "StackPanel",
                                    valign: "center",
                                    margin: {top: widget_top * 2},
                                    GridRow: 1,
                                    children: [
                                        {
                                            control: "RadioButton",
                                            group: "maintenance",
                                            name: "m_repair",
                                            onChecked: event_repair,
                                            content: {
                                                control: "Label",
                                                content: format("[Repair_key]"),
                                                fontWeight: "bold",
                                                padding: 0
                                            }
                                        },
                                        {
                                            control: "TextBlock",
                                            wrap: "wrap",
                                            margin: {left: 20},
                                            text: format("[repair_prod]")
                                        }
                                    ]
                                },
                                { // remove
                                    control: "StackPanel",
                                    valign: "center",
                                    margin: {top: widget_top * 2},
                                    GridRow: 2,
                                    children: [
                                        {
                                            control: "RadioButton",
                                            group: "maintenance",
                                            name: "m_remove",
                                            onChecked: event_remove,
                                            content: {
                                                control: "Label",
                                                content: format("[Remove_key]"),
                                                fontWeight: "bold",
                                                padding: 0
                                            }
                                        },
                                        {
                                            control: "TextBlock",
                                            wrap: "wrap",
                                            margin: {left: 20},
                                            text: format("[remove_prod]")
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
               
                return obj;
            };  
            
            var obj = create_mntnc_obj();
            var control = Wizard.BuildControl(obj);
            control.Name = "MaintenanceOptions";
            control.Owner = P();
            
            control.OnAttach = function(dialog_name)
            {
                Wizard.Subscribe(dialog_name + "/maintenance/modify", "enable", function(){control.js.m_modify.enabled = true});
                Wizard.Subscribe(dialog_name + "/maintenance/repair", "enable", function(){control.js.m_repair.enabled = true});
                Wizard.Subscribe(dialog_name + "/maintenance/remove", "enable", function(){control.js.m_remove.enabled = true});
                Wizard.Subscribe(dialog_name + "/maintenance/modify", "disable", function(){control.js.m_modify.enabled = false});
                Wizard.Subscribe(dialog_name + "/maintenance/repair", "disable", function(){control.js.m_repair.enabled = false});
                Wizard.Subscribe(dialog_name + "/maintenance/remove", "disable", function(){control.js.m_remove.enabled = false});
                Wizard.Subscribe(dialog_name + "/maintenance/modify", "set checked", function(id, notify, check){control.js.m_modify.checked = check});
                Wizard.Subscribe(dialog_name + "/maintenance/repair", "set checked", function(id, notify, check){control.js.m_repair.checked = check});
                Wizard.Subscribe(dialog_name + "/maintenance/remove", "set checked", function(id, notify, check){control.js.m_remove.checked = check});
                Wizard.Subscribe(dialog_name + "/maintenance/modify", "is checked", function(id, notify){return control.js.m_modify.checked ? 1 : 0;});
                Wizard.Subscribe(dialog_name + "/maintenance/repair", "is checked", function(id, notify){return control.js.m_repair.checked ? 1 : 0;});
                Wizard.Subscribe(dialog_name + "/maintenance/remove", "is checked", function(id, notify){return control.js.m_remove.checked ? 1 : 0;});                
                
            }
            control.EventModify = event_modify;
            control.EventRepair = event_repair;
            control.EventRemove = event_remove;
            
            control.OnChange = ns_sender.DialogEvent(control);
            event_modify.Connect(control.OnChange.Transmit("NTF_MODIFY"));
            event_repair.Connect(control.OnChange.Transmit("NTF_REPAIR"));
            event_remove.Connect(control.OnChange.Transmit("NTF_REMOVE"));
       
            return control;
        };
        
        Wizard.ControlCollection["DownloadOption"] = function()
        {
            var event_click = ns_event.FEvent(); //ns_sender.DialogEvent("NTF_DOWNLOAD");
            
            var create_dnld_obj = function()
            {
                var obj =
                {
                    control: "Grid",
                    rows: ["auto", "*"],
                    margin: 10,
                    stage: "welcome",
                    bindings: [
                        {
                            key: "d",
                            mod: "alt",
                            clicked: function() {if(this.js.m_download.enabled) this.js.m_download.checked = true;}
                        }
                    ],
                    children: [
                        {
                            control: "Grid",
                            GridRow: 0,
                            rows: ["*", "*", "*", "*"],
                            margin: 30,
                            children: [
                                { // download
                                    control: "StackPanel",
                                    valign: "center",
                                    GridRow: 0,
                                    children: [
                                        {
                                            control: "RadioButton",
                                            checked: true,
                                            group: "maintenance",
                                            name: "m_download",
                                            onChecked: event_click,
                                            content: {
                                                control: "Label",
                                                content: format("[Download]"),
                                                fontWeight: "bold",
                                                padding: 0
                                            }
                                        },
                                        {
                                            control: "TextBlock",
                                            wrap: "wrap",
                                            margin: {left: 20},
                                            text: format("[download_prod]")
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
               
                return obj;
            };             
            
            var obj = create_dnld_obj();
            var control = Wizard.BuildControl(obj);
            control.Name = "DownloadOption";
            control.Owner = P();
            
            control.OnAttach = function(dialog_name)
            {
                Wizard.Subscribe(dialog_name + "/download", "enable", function(){control.js.m_download.enabled = true});
                Wizard.Subscribe(dialog_name + "/download", "disable", function(){control.js.m_download.enabled = false});
                Wizard.Subscribe(dialog_name + "/download", "set checked", function(id, notify, check){control.js.m_download.checked = check});
                Wizard.Subscribe(dialog_name + "/download", "is checked", function(id, notify, check){return control.js.m_download.checked;});                
            }
            
            control.EventClick = event_click;
            control.OnChange = ns_sender.DialogEvent(control);
            event_click.Connect(control.OnChange.Transmit("NTF_DOWNLOAD"));
       
            return control;
        };
        
    };
    
    this.BuildWidgets = function(prod)
    {
        var ns = this;
        
        //###################################################################################
        var mntnc_options_widget = function()
        {
            var maintenance_mode_changed_cb;
            
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["MaintenanceOptions"]());
            var dlg_name = function(){return w.Owner.GetRaw().Name();}
            var media = ns_inst.Installer.FromMedia();
            w.CB_Default(function()
            {
                Wizard.Notify(dlg_name() + "/maintenance/modify", "check btn");
                ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.modify);
                if(!media)
                {
                    if(GetOpt.Exists("uninstall"))
                        ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.remove);
                    else if(GetOpt.Exists("modify"))
                        ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.modify);
                }
            });
            
            w.CB_Initialize(function()
            {
                switch(ns_inst.Installer.DownloadOnly())
                {
                    case true:
                        w.Select("");
                        break;
                    case false:
                        switch(ns_inst.Installer.InstallMode())
                        {
                            case ns_inst.Installer.install_mode_t.modify:
                                w.Select("modify");
                                break;
                            case ns_inst.Installer.install_mode_t.repair:
                                w.Select("repair");
                                break;
                            case ns_inst.Installer.install_mode_t.remove:
                                w.Select("remove");
                                break;
                        };
                        break;
                }
            });
            
            w.CB_GoNext(function()
            {
                var choice = "";
                if (Wizard.OnNotify(dlg_name() + "/maintenance/modify", "is checked"))
                    choice = "NTF_MODIFY";
                if (Wizard.OnNotify(dlg_name() + "/maintenance/repair", "is checked"))
                    choice = "NTF_REPAIR";
                if (Wizard.OnNotify(dlg_name() + "/maintenance/remove", "is checked"))                
                    choice = "NTF_REMOVE";
                //
                var switch_mode = function(m)
                {
                    if (ns_inst.Installer.DownloadOnly())
                        ns_inst.Installer.DownloadOnly(false);
                    if (prod.InstallMode() != m)
                    {
                        prod.ClearAction();
                        prod.InstallMode(m);
                    }
                }
                
                switch(choice)
                {
                    case "NTF_MODIFY":
                        switch_mode(ns_inst.Installer.install_mode_t.modify);
                        break;
                    case "NTF_REPAIR":
                        switch_mode(ns_inst.Installer.install_mode_t.repair);
                        break;
                    case "NTF_REMOVE":
                        switch_mode(ns_inst.Installer.install_mode_t.remove);
                        break;
                    default:
                        break;
                }
                
                return true;
                
            });
 
            var maintenance_mode_cb = function(mode)
            {
                if(maintenance_mode_changed_cb)
                    safecall(function(){maintenance_mode_changed_cb(mode);},
                             function(){Log(Log.l_error, "Maintenance mode changed callback exception handled.");});
            }
            
            var maintenance_type_changed = function(sender, event)
            {
                Log("maintenance_type_changed is called. Incoming event is " + event);
                
                switch(event)
                {
                    case "NTF_MODIFY":
                        ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.modify);
                        maintenance_mode_cb(ns_inst.Installer.install_mode_t.modify);
                        break;
                    case "NTF_REPAIR":
                        ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.repair);
                        maintenance_mode_cb(ns_inst.Installer.install_mode_t.repair);
                        break;
                    case "NTF_REMOVE":
                        ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.remove);
                        maintenance_mode_cb(ns_inst.Installer.install_mode_t.remove);
                        break;
                    default:
                        Log("Maintenance mode: unknown mode: " + event);
                        break;
                }
                Log("maintenance_type_changed finished");
            }
            
            w.OnChange(maintenance_type_changed); 
            
            w.OnModeChange = function(cb) {maintenance_mode_changed_cb = cb;}

            w.EnablePrev = function(val) {w.ButtonBack.Disabled(!val)};

            w.EnableModify = function(en) {Wizard.Notify(dlg_name() + "/maintenance/modify", en ? "enable" : "disable");}
            w.EnableRepair = function(en) {Wizard.Notify(dlg_name() + "/maintenance/repair", en ? "enable" : "disable");}
            w.EnableRemove = function(en) {Wizard.Notify(dlg_name() + "/maintenance/remove", en ? "enable" : "disable");}


            w.Select = function(opt)
            {
                Wizard.Notify(dlg_name() + "/maintenance/modify", "set checked", false);
                Wizard.Notify(dlg_name() + "/maintenance/repair", "set checked", false);
                Wizard.Notify(dlg_name() + "/maintenance/remove", "set checked", false);
                switch(opt)
                {
                case "modify":
                    Wizard.Notify(dlg_name() + "/maintenance/modify", "set checked", true);
                    break;
                case "repair":
                    Wizard.Notify(dlg_name() + "/maintenance/repair", "set checked", true);
                    break;
                case "remove":
                    Wizard.Notify(dlg_name() + "/maintenance/remove", "set checked", true);
                    break;                
                default: 
                    break;
                }
            }

            return w;
        };
        
        //###################################################################################
        var download_option_widget = function()
        {
            var download_mode_changed_cb;
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["DownloadOption"]());
            var dlg_name = function(){return w.Owner.GetRaw().Name();}
            
            w.CB_Initialize(function()
            {
                w.Select(ns_inst.Installer.DownloadOnly());
            });
            
            w.CB_GoNext(function()
            {
                if (Wizard.OnNotify(dlg_name() + "/download", "is checked") && !ns_inst.Installer.DownloadOnly())
                {
                    if (ns_inst.Installer.InstallMode() != ns_inst.Installer.install_mode_t.modify)
                        ns_inst.Installer.InstallMode(ns_inst.Installer.install_mode_t.modify);
                    ns_inst.Installer.DownloadOnly(true);
                }
                return true;
            });
 
            var download_mode_cb = function()
            {
                if(download_mode_changed_cb)
                    safecall(function(){download_mode_changed_cb();},
                             function(){Log(Log.l_error, "download mode changed callback exception handled.");});
            }
            
            var download_changed = function(sender, event)
            {
                Log("download_changed is called. Incoiming event is " + event);
                download_mode_cb();
                Log("download_changed finished");
            }
            
            w.OnChange(download_changed); 
            w.OnModeChange = function(cb) {download_mode_changed_cb = cb;}
            w.EnablePrev = function(val) {w.ButtonBack.Disabled(!val)};
            w.Enable = function(en) {Wizard.Notify(dlg_name() + "/download", en ? "enable" : "disable");}
            w.Select = function(opt)
            {
                Wizard.Notify(dlg_name() + "/download", "set checked", opt ? true : false);
            }

            return w;
        };        
        
        Wizard.WidgetCollection["mntnc_options_widget"] = mntnc_options_widget;
        Wizard.WidgetCollection["download_option_widget"] = download_option_widget;
    }
    
    //###################################################################################
    //###################################################################################
    //################################################################################### 
    
    this.BuildDialogs = function(prod)
    {
        var ns = this;
        
        var offline_mntnc_dlg = function(name)
        {        
            var dlg = ns_bld.BuildDialog(ns_bc.BaseContainer());
            dlg.Name(name);
            dlg.AttachWidget(Wizard.WidgetCollection["mntnc_options_widget"]());
             
            dlg.CB_Skip(function()
            {
                if (prod.InstallMode() == prod.install_mode_t.install
                    && ns_inst.Installer.InstallMode() == ns_inst.Installer.install_mode_t.install)
                {
                    Log("OfflineMaintenance is skipped due to InstallMode eq install");
                    return true;
                }
                if (ns_inst.Installer.InstallationDenied())
                {
                    Log("OfflineMaintenance is skipped due to InstallationDenied");
                    return true;
                }
                return false;
            }); 
             
            return dlg;
        }
        
        //###################################################################################
        var online_mntnc_dlg = function(name)
        {        
            var dlg = ns_bld.BuildDialog(ns_bc.BaseContainer());
            dlg.Name(name);
            dlg.AttachWidget(Wizard.WidgetCollection["mntnc_options_widget"]());
            dlg.AttachWidget(Wizard.WidgetCollection["download_option_widget"]());
            
            //dlg.AddDependency(dlg.MaintenanceOptions, [dlg.DownloadOption]);
            //dlg.AddDependency(dlg.DownloadOption, [dlg.MaintenanceOptions]);
            
            dlg.CB_Skip(function()
            {
                if (prod.InstallMode() == prod.install_mode_t.install
                    && ns_inst.Installer.InstallMode() == ns_inst.Installer.install_mode_t.install) //need to check this to be able to return back in download mode
                {
                    Log("OnlineMaintenance is skipped due to InstallMode eq install");
                    return true;
                }
                if (ns_inst.Installer.InstallationDenied())
                {
                    Log("OnlineMaintenance is skipped due to InstallationDenied");
                    return true;
                }
                return false;
            }); 
             
            return dlg;
        }
        
        //###################################################################################
        Wizard.DialogCollection["offline_mntnc_dlg"] = offline_mntnc_dlg;
        Wizard.DialogCollection["online_mntnc_dlg"] = online_mntnc_dlg;
    }

}
