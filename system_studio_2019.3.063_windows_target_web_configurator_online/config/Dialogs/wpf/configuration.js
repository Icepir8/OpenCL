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
    var ns_prop = base("property.js");
    var ns_date = base("date_format.js");
    var P = function(val){return ns_prop.Property(val);};

    var ns_bld = base("builder.js");

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };
    
    var parseBoolean = function(string)
    {
        if(typeof(string) == "undefined")
            return false;
        switch (String(string).toLowerCase())
        {
            case "false":
            case "0":
            case "no":
            case "n":
            case "":
                return false;
            default:
                return true;
        }
    }

    var isNull = function(string)
    {
        if(typeof(string) == "undefined")
            return "undefined";
        if(string == null)
            return "null";
        return string;
    }    

    this.BuildWidgets = function(prod)
    {
        var ns = this;

        var wdgt_license = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["LicenseWidget"]());
            
            //come in handy
            w.DaysLeft = function()
            {
                var days = 0;
                if (ns.ActivationManager)
                {
                    var days = ns.ActivationManager.Manager.days_remaining;
                    if (!days)
                        days = ns.ActivationManager.Manager.LastResult.days_remaining;
                    if (!days)
                        days = 0;
                }
                return days;
            }
            
            w.IsAboutToExpire = function(days)
            {
                var prod_act = prod.CustomObjects().Item("Activation");
                var about_to_expire_days = prod_act && prod_act.about_to_expire_days && prod_act.about_to_expire_days >= 0 ? prod_act.about_to_expire_days : 10;
                return (days <= about_to_expire_days);
            }
            
            //adjusting
            w.CB_DisableOnSkip(function()
            {
                return false;
            });

            w.CB_Default(function()
            {
                /* if here - the dialog opens slowly
                ns.AltFirstTimeActivation = Wizard.DialogCollection["alt_first_time_activation"]();
                ns.AltDuringTLL = Wizard.DialogCollection["alt_during_tll"]();
                ns.AltExistingActivation = Wizard.DialogCollection["alt_existing_activation"]();
                */
                
                Wizard.Notify("first_time_activation/serial_number", "set text", "");
                Wizard.Notify("first_time_activation", "error", "");

                Wizard.Notify("tll_about_to_expire/serial_number", "set text", "");
                Wizard.Notify("tll_about_to_expire", "error", "");
                
                Wizard.Notify("existing_license/serial_number", "set text", "");
                Wizard.Notify("existing_license", "error", "");

                w.ButtonNext.Disabled(true);
            });
            
            let no_license_check = ns_pb.ParseBoolean(ns.Product().Info().Property("no_license_check"));
            w.CB_Initialize(function()
            {
                var mode = "";
                var days = 0;
                var file = "";
                var sn = "";
                if (ns.ActivationManager)
                {
                    mode = ns.ActivationManager.ActivationMode();
                    days = ns.ActivationManager.Manager.days_remaining;
                    if (!days)
                        days = ns.ActivationManager.Manager.LastResult.days_remaining;
                    if (!days)
                        days = 0;
                    file = ns.ActivationManager.Manager.LastResult.file;
                    if (!file)
                        file = "";
                    sn = ns.ActivationManager.SerialNumber(); //
                    Log("activation - received mode : " + mode);
                    Log("activation - received days : " + days);
                    Log("activation - received file : " + file);
                    Log("activation - received sn : "   + sn);
                }
                var date = new Date();
                date.setDate(date.getDate() + days);
                var date_str = ns_date.Format(date, "month dd, yyyy");
                                               
                Wizard.Notify("activation/mode", "set mode", mode);
                if(w.IsAboutToExpire(days))
                {
                    Wizard.Notify("tll_about_to_expire/remark", "set text", format("[tll_warning_template]", days));
                }
                else
                {
                    Wizard.Notify("during_tll/remark", "set text", StringList.Format("[during_tll_remark]", date_str));
                }

                //check expired tll
                if (days < 0)
                {
                    Wizard.Notify("first_time_activation", "show tll warning", true); //show warning panel
                }
                else
                {
                    Wizard.Notify("first_time_activation", "show tll warning", false);
                }
                
                Wizard.Notify("existing_license/file", "set text", StringList.Format("[existing_license_file]", file));
                Wizard.Notify("existing_license/sn", "set text", StringList.Format("[existing_license_sn]", sn)); //
                
                Wizard.Notify("first_time_activation/alt", "set text", StringList.Format("[first_time_activation_alt] "));

                var disable = false;
                if (mode == "first_time_activation" || mode == "tll_about_to_expire" 
                    || (mode == "existing_license" && Wizard.OnNotify(mode + "/sn_mode", "get")))
                {
                    var sn = Wizard.OnNotify(mode + "/serial_number", "get text");    
                    disable = (sn.length != 13);

                    if (mode == "tll_about_to_expire" && sn.length == 0)
                    {
                        disable = false;
                    }
                }

                if(no_license_check) {
                    disable = false;
                }

                if (w.ButtonNext.Disabled() != disable)
                    w.ButtonNext.Disabled(disable);
                //clear errors
                Wizard.Notify("first_time_activation", "error", "");
                Wizard.Notify("tll_about_to_expire", "error", "");
                Wizard.Notify("existing_license", "error", "");
            });
            
            w.OnChange(function(sender, event_id)
            {
                Log("LicenseWidget OnChange processing started");
                Log(Log.l_debug, "LicenseWidget OnChange event_id = " + event_id);
                if (event_id == "NTF_ALT")
                {
                    //how to bypass ns.AltFirstTimeActivation
                    //who is responsible for its creation
                    var d;
                    var mode = Wizard.OnNotify("activation/mode", "get mode");
                    switch(mode)
                    {
                        case "first_time_activation":
                            d = ns.AltFirstTimeActivation;
                            break;
                        case "tll_about_to_expire":
                            d = ns.AltFirstTimeActivation;
                            break;
                        case "during_tll":
                            d = ns.AltDuringTLL;
                            break;         
                        case "existing_license":
                            d = ns.AltFirstTimeActivation;
                            break;  
                        case "activated_by_sn":
                            d = ns.AltExistingActivation; //need to be replaced with a new widget
                            break;   
                        case "activated_by_file":
                            d = ns.AltExistingActivation;
                            break;                               
                        default:
                            break;
                    }
                    if(d)
                        w.Owner.GetRaw().ShowModal(d, true);
                    else
                    {
                        Log("none of the dialogs matches to mode " + mode);
                    }
                        
                }
                else if (event_id == "NTF_SN")
                {
                    var m = Wizard.OnNotify("activation/mode", "get mode");
                    var disable = false;
                    if (m == "first_time_activation" || m == "tll_about_to_expire" 
                        || (m == "existing_license" && Wizard.OnNotify(m + "/sn_mode", "get")))
                    {
                        var sn = Wizard.OnNotify(m + "/serial_number", "get text");    
                        disable = (sn.length != 13);

                        if (m == "tll_about_to_expire" && sn.length == 0)
                        {
                            disable = false;
                        }
                    }
                    if (w.ButtonNext.Disabled() != disable)
                        w.ButtonNext.Disabled(disable);
                    
                }
                else if (event_id == "notify_no_license")
                {
                    w.ButtonNext.Disabled(false);
                }
                Log("LicenseWidget OnChange processing finished");
            });
            
            w.CB_CanGoNext(function()
            {
                if (!ns.ActivationManager)
                    return true;

                var m = Wizard.OnNotify("activation/mode", "get mode");
                //apply sn
                if (m != "first_time_activation" && m != "tll_about_to_expire" && m != "existing_license")
                    return true;
                if (m == "existing_license" && !Wizard.OnNotify(m + "/sn_mode", "get"))
                    return true;

                if(no_license_check) {
                    if(Wizard.OnNotify(m + "/no_license", "is selected")) {
                        return true;
                    }
                }

                var sn = Wizard.OnNotify(m + "/serial_number", "get text");    
                //simple check sn
                if (sn.length != 13)
                {
                    if (m == "tll_about_to_expire" && sn.length == 0)
                    {
                        return true;
                    }
                    //set focus
                    Wizard.Notify(m + "/serial_number", "set focus");
                    return false;
                }

                return true; 
            });            
            
            w.CB_GoNext(function()
            {
                if (!ns.ActivationManager)
                {
                    Log("LicenseWidget GoNext: ActivationManager is not defined");
                    return true;
                }                    
                
                var m = Wizard.OnNotify("activation/mode", "get mode");
                if (m != "first_time_activation" && m != "tll_about_to_expire" && m != "existing_license")
                {
                    Log("LicenseWidget GoNext: activation mode = " + m);
                    return true;
                }
                if (m == "existing_license" && !Wizard.OnNotify(m + "/sn_mode", "get"))
                {
                    Log("LicenseWidget GoNext: activation mode = " + m);
                    return true;
                }

                if(no_license_check) {
                    if(Wizard.OnNotify(m + "/no_license", "is selected")) {
                        ns.ActivationManager.Manager.ActivationType(ns.ActivationManager.Manager.activation_type_t.no_license);
                        return true;
                    }
                }

                //apply sn
                var sn = Wizard.OnNotify(m + "/serial_number", "get text");  
                if (m == "tll_about_to_expire" && sn.length == 0)
                {
                    Log("LicenseWidget GoNext: activation mode = " + m);
                    return true;
                }
                //apply sn activation 

                Log("Processing serial number based activation: " + sn);
                Wizard.BusyStart();
                var r = ns.ActivationManager.Manager.ActivateOnline(sn);
                var ret = {exit_code : r.exit_code, error_message : r.error_message, issa_code : r.issa_code};
                Wizard.BusyStop();
                
                Log("Processing serial number based activation finished with code: " + ret.exit_code);
                if(ret.exit_code)
                    return true;   
                
                if (ret.issa_code && ret.issa_code == -3/*ISSA_ERR_CONNECTION*/) //display offline message
                {
                    var ns_dlg = dialogs("win_dialog.js");
                    var dlg_ctrl = ns.ModalOfflineSN.Control.GetRaw();
                    var dlg = ns_dlg.Dialog(dlg_ctrl);
                    ns.Window.Spawn(dlg);
                    return false;
                }
                    
                Log("       error_message: " + ret.error_message);
                Wizard.Notify(m, "error", ret.error_message);
                Wizard.Notify(m + "/serial_number", "set focus");
                return false;                 
            });
            
            w.CB_Skip(function()
            {
                //skip if no activation 
                var allow_activation_in_modify = ns_pb.ParseBoolean(prod.Info().Property("allow_activation_in_modify"));
                if (!ns.ActivationManager)
                {
                    Log("LicenseWidget skipped due to ActivationManager is not defined");
                    return true;
                }  
                if((prod.InstallMode() == prod.install_mode_t.install) || (prod.InstallMode() == prod.install_mode_t.modify && allow_activation_in_modify))
                    return false;
                
                Log("LicenseWidget skipped due to Installer is not in install mode or not in modify mode with allow_activation_in_modify set");
                return true;
            });

            return w;
        }
        
        
        //##################################################
        var wdgt_opt_in = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["OptInWidget"]());
            w.CB_DisableOnSkip(function() {return false;});
            w.CB_Skip(function()
            {
                if((prod.InstallMode() == prod.install_mode_t.install) || (prod.InstallMode() == prod.install_mode_t.modify))
                    return false;

                return true;
            });

            w.CB_Default(function()
            {
                w.ButtonNext.Disabled(true);
            });

            var on_click = null;
            var clicked = function(val)
            {
                if(on_click)
                    on_click(val);
                if (w.ButtonNext.Disabled() == true)
                    w.ButtonNext.Disabled(false);
            }

            w.OnClick = function(cb) {on_click = cb;}
            Wizard.Subscribe("ISM agree", "OnClicked", function(){clicked(true);});
            Wizard.Subscribe("ISM degree", "OnClicked", function(){clicked(false);});

            return w;
        }
        
        //##################################################
        var wdgt_ide_integration = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["IDEIntegrationWidget"]());
            var d_name = function(){return w.Owner.GetRaw().Name();}
            //adjusting
            w.CB_DisableOnSkip(function()
            {
                return false;
            });

            w.CB_Skip(function()
            {
                var skip_dialog = false;
                if(ns.IDEDialog.Skip())
                    skip_dialog = true;

                if((prod.InstallMode() == prod.install_mode_t.install) || (prod.InstallMode() == prod.install_mode_t.modify))
                    skip_dialog = skip_dialog || false;

                return skip_dialog;
            });

            w.OnChange(function(sender, event_id)
            {
                Log("IdeIntegrationWidget OnChange processing started");
                ALog(Log.l_debug, "IdeIntegrationWidget OnChange event_id = " + event_id);
                if (event_id == "NTF_IDE_INTEGRATION_CUSTOMIZE")
                {
                    w.Owner.GetRaw().ShowModal(ns.IDEDialog, true);
                }
                Log("IdeIntegrationWidget OnChange processing finished");
            });

            w.SetCaption = function(caption)
            {
                Wizard.OnNotify(d_name() + "/ide_integration_caption", "set text", caption);
            };

            w.SetText = function(text)
            {
                Wizard.OnNotify(d_name() + "/ide_integration_text", "set text", text);
            };

            var create_integration_message = function(title_list)
            {
                if(title_list.length == 0) //do not integrate with anything
                    return format("[ide_text_no_targets]");

                //create comma-separated list of VS
                var msg = title_list.join(", ");
                if(msg)
                    return format("[ide_text_targets]", msg);
            };
            w.CB_Initialize(function(ret_code)
            {
                vs_list = Wizard.OnNotify("IDEDialog/vs_integration", "get items");
                //if there are no items in VS list, do not change the message
                if(vs_list.length == 0) //most likely user hasn't modified anything yet
                    return; //and in that case there should be the default message

                title_list = []
                for(var index in vs_list)
                {
                    var vs_item = vs_list[index];
                    //push titles to list only if this item is selected and enabled
                    if(!vs_item.disabled && vs_item.selected)
                        title_list.push(vs_item.title);
                }
                var integration_msg = create_integration_message(title_list);
                w.SetText(integration_msg);
            });

            return w;
        }

        //##################################################
        var wdgt_cluster = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["ClusterWidget"]());
            //adjusting
            w.CB_DisableOnSkip(function() {return false; });
            
            w.CB_Default(function()
            {
                Wizard.Notify("cluster/install", "set checked", true);
            });
            
            w.CB_Initialize(function()
            {
                if (!cluster)
                {
                    Log("Cluster plugin is not loaded!");
                    return;
                }

                var cnt = cluster.CountNodes(w.ClusterStudioGuid());
                if (cnt == 1)
                    Wizard.Notify("cluster/install", "set text", StringList.Format("[single_cluster_install_message]", cnt));
                else
                    Wizard.Notify("cluster/install", "set text", StringList.Format("[cluster_install_message]", cnt));

            });
            

            w.OnChange(function(sender, event_id)
            {
                Log("ClusterWidget OnChange event_id = " + event_id);
                if (event_id == "NTF_CL")
                {
                    if (Wizard.OnNotify("cluster/install", "is checked"))
                        w.IsClusterInstallSelected(true); 
                    else 
                        w.IsClusterInstallSelected(false); 
                }
            });
                        
            w.ClusterStudioGuid = P(prod.Info().Property("cluster_studio_guid"));
            
            w.IsClusterDetected = function()
            {
                Log("cluster: IsClusterDetected is called");
                return (cluster.CountNodes(w.ClusterStudioGuid()) != 0);
            }

            w.IsClusterInstallSelected = P(false);
           
            w.CB_Skip(function()
            {
                if (ns.Installer().InstallMode() == ns.Installer().install_mode_t.remove || ns.Installer().InstallMode() == ns.Installer().install_mode_t.repair)
                {
                    Log("cluster widget is skipped due to remove/repair mode");
                    return true;
                }
                if (!parseBoolean(prod.Info().Property("cluster_install")))
                {
                    Log("cluster widget is skipped, cluster_install property is not set");
                    return true;
                }
                if (/*(ns.Installer().InstallMode() == ns.Installer().install_mode_t.modify) && */!w.IsClusterDetected())
                {
                    Log("cluster widget is skipped, due to cluster is not detected");
                    return true;
                }
                
                return false;
            });
            
            return w;
        }     

        //##################################################
        var wdgt_optional_removal = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["OptionalRemovalWidget"]());
            var is_optional_removal_dialog_required = function ()
            {
                if (prod.InstallMode() == prod.install_mode_t.install || prod.InstallMode() == prod.install_mode_t.modify)
                {
                    var optional_removal_data = Wizard.OnNotify("optional_removal_dlg/optional_removal_data", "get data");
                    return (optional_removal_data && optional_removal_data.length > 0);
                }
                return false;
            }

            w.CB_Default(function()
            {
                Log("OptionalRemovalWidget CB_Default");
                Wizard.Notify("optional_removal_dlg/header_richedit", "set rtf text", "[previous_version_uninstall_description]");
                Wizard.Notify("optional_removal_dlg/footer_richedit", "set rtf text", "[optional_removal_vs_note]");
            });

            w.CB_Initialize(function()
            {
                Log("OptionalRemovalWidget CB_Initialize");
                var optional_removal_data = Wizard.OnNotify("optional_removal_dlg/optional_removal_data", "get data");
                for(var i in optional_removal_data)
                {

                }
                Wizard.Notify("optional_removal_dlg/header_richedit", "set rtf text", "[previous_version_uninstall_description]");
                Wizard.Notify("optional_removal_dlg/footer_richedit", "set rtf text", "[optional_removal_vs_note]");
            });

            w.OnChange(function(sender, event_id)
            {
                Log("OptionalRemovalWidget OnChange processing started");
                if (event_id == "NTF_OPTIONAL_REMOVAL_CUSTOMIZE")
                {
                    w.Owner.GetRaw().ShowModal(ns.OptionalRemovalModalDialog, true);
                }
            });

            w.CB_DisableOnSkip(function()
            {
                Log("OptionalRemovalWidget CB_DisableOnSkip");
                return false;
            });
            w.CB_GoNext(function()
            {
                Log("OptionalRemovalWidget CB_GoNext");
                var optional_removal_data = Wizard.OnNotify("optional_removal_dlg/optional_removal_data", "get data");
                var entries_processor = function (entry, id, data_id)
                {
                    for(var i in optional_removal_data)
                    {
                        var data = optional_removal_data[i];
                        if (entry.Type() == entry.upgrade_type_t.optional && entry.Targets().length && id == data.id)
                        {
                            var targets = entry.Targets();
                            for(var k in targets)
                            {
                                data.selected ? targets[k].Action(entry.action_t.remove) : targets[k].Action(entry.action_t.none);
                            }
                        }
                    }                    
                }
                prod.Upgrade().FilterEntires(entries_processor);
                prod.FilterFeaturesRecursive(function(ftr)
                {
                    ftr.Upgrade().FilterEntires(entries_processor);
                });
                return true;
            });

            w.CB_Skip(function()
            {
                Log("OptionalRemovalWidget CB_Skip");
                return !is_optional_removal_dialog_required();
            });

            return w;
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        Wizard.WidgetCollection["wdgt_license"] = wdgt_license;
        Wizard.WidgetCollection["wdgt_opt_in"] = wdgt_opt_in;
        Wizard.WidgetCollection["wdgt_ide_integration"] = wdgt_ide_integration;
        Wizard.WidgetCollection["wdgt_cluster"] = wdgt_cluster;
        Wizard.WidgetCollection["wdgt_optional_removal"] = wdgt_optional_removal;
        
    }
    
    //==========================================================================================
    this.BuildDialogs = function(prod)
    {
        var ns = this;
        var config_dialog = function(name)
        {
            var d = ns_bld.BuildDialog(dialogs("base_container.js").BaseContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["wdgt_license"]());
            //d.AttachWidget(Wizard.WidgetCollection["wdgt_opt_in"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_ide_integration"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_cluster"]());
            d.AttachWidget(Wizard.WidgetCollection["wdgt_optional_removal"]());
            d.CB_CustomAction(function() {return true;});
            d.CB_OwnInitialize(function()
            {
                d.ButtonNext.Caption("[Install]");
            });

            d.CB_GoBack(function()
            {
                if(!ns.IDEDialog)
                    return;

                var vs_widget = ns.IDEDialog.VS_Integration_Widget;
                if(!vs_widget)
                    return;
                vs_widget.ResetInit();
            });
            
            var inst = base("installer.js").Installer;
            return d;
        }
        
        var isip_dialog = function(name)
        {
            var d = ns_bld.BuildDialog(dialogs("base_container.js").BaseContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["wdgt_opt_in"]());
            d.CB_CustomAction(function() {return true;});
            return d;
        }
        
        ////////////////////////////////////////////////////////////////////////////////////////
        Wizard.DialogCollection["config_dialog"] = config_dialog;
        Wizard.DialogCollection["isip_dialog"] = isip_dialog;

    }
}
