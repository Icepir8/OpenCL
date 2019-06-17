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
    var ns_prop   = base("property.js");
    var inst = base("installer.js").Installer;
    var stat_pick = base("stat_pick.js").Stat_pick;

    var ns_bld = base("builder.js");
    var P = function(val){return ns_prop.Property(val);};

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

    this.BuildWidgets = function(prod)
    {
        var ns = this;

        var build_getting_started_widget = function()
        {
            var getting_started_widget = ns_bld.BuildWidget(Wizard.ControlCollection["GettingStartedWidget"]());
            var d_name = function(){return getting_started_widget.Owner.GetRaw().Name();}

            getting_started_widget.CB_Initialize(function(ret_code)
            {
                var act_dlg = Wizard.ActiveDialog.GetRaw();
                if(!act_dlg || !act_dlg.Name || act_dlg.Name() != d_name())
                {
                    Log("Skip refreshing inactive dialog");
                    return;
                }
                Log("getting_started_widget::CB_Initialize entered");
                var dir_label = "";
                if(ns_inst.Installer.DownloadOnly())
                {
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "set checked", false);
                    Wizard.Notify(d_name() + "/getting_started/download_mode", "set checked", true);
                    dir_label = getting_started_download_path;
                }
                else
                {
                    Wizard.Notify(d_name() + "/getting_started/download_mode", "set checked", false);
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "set checked", true);
                    dir_label = getting_started_install_path;
                }
                Wizard.Notify(d_name() + "/getting_started/dir_lable", "set text", StringList.Format(dir_label));

                if(ns_inst.Installer.InstallationDenied())
                {
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "disable");
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "set checked", false);
                    Wizard.Notify(d_name() + "/getting_started/download_mode", "set checked", true);
                    ns_inst.Installer.DownloadOnly(true);
                }
                else
                {
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "enable");
                }
                Log("getting_started_widget::CB_Initialize left");
            });

            getting_started_widget.CB_Skip(function(ret_code)
            {
                Log("Getting started CB_Skip entered");
                if(ns_inst.Installer.InstallMode() != ns_inst.Installer.install_mode_t.install)
                {
                    Log("Getting started widget is skipped because ns_inst.Installer.InstallMode() = " + ns_inst.Installer.InstallMode());
                    return true;
                }
                if(!ns_inst.Installer.OnlineInstaller())
                {
                    Log("Getting started widget is skipped because this is offline installer");
                    return true;
                }
                return false;
            });

            var ns_path_check = base("path_checker.js");

            var getting_started_space_required = null;
            var getting_started_current_value = "";
            var getting_started_download_folder = "";
            var getting_started_custom_path_checker = null;
            var getting_started_idc_install_mode = "[getting_started_idc_install_mode]";
            var getting_started_install_text = "[getting_started_install_text]";
            var getting_started_install_path = "[getting_started_install_path]";
            var getting_started_modify_text = "[getting_started_modify_text]";
            var getting_started_download_text = "[getting_started_download_text]";
            var getting_started_download_path = "[getting_started_download_path]";
            var getting_started_eula_file = "[eula_rtf_file]";
            var getting_started_preset_download = false;

            var space_update_in_progress = false;

            getting_started_widget.GetCustomPathChecker = function()
            {
                return getting_started_custom_path_checker;
            };

            var getting_started_update_space_info = function()
            {
                if(space_update_in_progress){
                    return;
                }
                space_update_in_progress = true;
                //need to check installdir in case of install mode and selected path in case of download mode
                var prod = ns.Product();
                var current_path = Wizard.Notify(d_name() + "/destination/edit_box", "get text");
                Log("incoming path: " + current_path);

                var pchecker = ns_path_check.PathChecker(current_path);
                pchecker.SpaceRequired(getting_started_space_required);

                if(getting_started_custom_path_checker)
                    getting_started_custom_path_checker(pchecker, prod);

                var message = {
                    required: {text: format("[space_required]", pchecker.SpaceRequired()), foreground: "black"},
                    available: {text: "", foreground: "black"}
                };

                pchecker.IsValid();

                if(pchecker.ErrorCode() != pchecker.target_path_error_t.ok
                    && !ns.Installer().DownloadOnly())
                {
                    //blank message
                    getting_started_widget.SetInfo("");
                    message.available = {text: ""};
                    Wizard.Notify(d_name() + "/feature/space", "set rtf text", message);
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.incorrect_path)
                {
                    getting_started_widget.SetInfo(pchecker.ErrorMessage() + " \\par\\par " + format("[%f]", current_path));
                    message.available = {text: format("[space_available]", 0), foreground: "red"};
                    Wizard.Notify(d_name() + "/feature/space", "set rtf text", message.available);
                    Wizard.Notify("next", "disable");
                    space_update_in_progress = false;
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.access_denied)
                {
                    getting_started_widget.SetInfo(pchecker.ErrorMessage());
                    message.available = {text: format("[space_available]", 0), foreground: "red"};
                    Wizard.Notify(d_name() + "/feature/space", "set rtf text", message.available);
                    Wizard.Notify("next", "disable");
                    space_update_in_progress = false;
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.no_enough_space)
                {
                    message.available = {text: format("[space_available]", pchecker.SpaceAvailable()), foreground: "red"};
                    Wizard.Notify(d_name() + "/feature/space", "set rtf text", message.available);
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.space_unknown)
                {
                    message.available = {text: format("[space_unknown]", "[unknown]")};
                    Wizard.Notify(d_name() + "/feature/space", "set rtf text", message);
                }
                else
                {
                    message.available = {text: format("[space_available]", pchecker.SpaceAvailable())};
                    Wizard.Notify(d_name() + "/feature/space", "set rtf text", message.available);
                }

                Wizard.Notify("next", "enable");
                space_update_in_progress = false;
                return true;
            }

            getting_started_widget.SetText = function()
            {
                var prod = ns.Product();
                if (prod.InstallMode() == prod.install_mode_t.install)
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "set text", StringList.Format(getting_started_install_text));
                else
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "set text", StringList.Format(getting_started_modify_text));
                Wizard.Notify(d_name() + "/getting_started/download_mode", "set text", StringList.Format(getting_started_download_text));

                Wizard.Notify(d_name() + "/getting_started/dir_lable", "set text", StringList.Format(getting_started_download_path));
            }

            getting_started_widget.Set = function(folder_path)
            {
                getting_started_current_value = folder_path;
                Wizard.Notify(d_name() + "/getting_started/dir_edit","set text", getting_started_current_value);

                getting_started_widget.Refresh();
                getting_started_update_space_info();
            }

            getting_started_widget.SetFolder = function(folder)
            {
                getting_started_download_folder = folder;
                getting_started_widget.Refresh();
            }

            getting_started_widget.GetFullPath = function()
            {
                return FileSystem.MakePath(getting_started_download_folder, getting_started_current_value);
            }

            getting_started_widget.SetInfo = function( _mes )
            {
                var expanded = System.ExpandEnvironmentStr(_mes);
                var mes = expanded ? expanded : _mes;
                Wizard.Notify(d_name() + "/getting_started/full_path","set rtf text", mes);
            }

            getting_started_widget.SetHeader = function( mes )
            {
                Wizard.Notify(d_name() + "/getting_started/header","set rtf text", mes);
            }

            getting_started_widget.Disable = function( )
            {
                Wizard.Notify(d_name() + "/getting_started/dir_lable", "disable")
                Wizard.Notify(d_name() + "/getting_started/dir_button","disable");
                Wizard.Notify(d_name() + "/getting_started/dir_edit", "disable");
                Wizard.Notify(d_name() + "/getting_started/full_path", "disable");
            }

            getting_started_widget.Enable = function( )
            {
                Wizard.Notify(d_name() + "/getting_started/dir_lable","enable")
                Wizard.Notify(d_name() + "/getting_started/dir_button","enable");
                Wizard.Notify(d_name() + "/getting_started/dir_edit", "enable");
                Wizard.Notify(d_name() + "/getting_started/full_path", "enable");
            }

            getting_started_widget.SpaceRequired = function(cb)
            {
                getting_started_space_required = cb;
                getting_started_update_space_info();
            }

            getting_started_widget.SetCustomPathChecker = function(cb)
            {
                if(cb && typeof(cb) == "function")
                    getting_started_custom_path_checker = cb;
            }

            getting_started_widget.PresetDownload = function(preset)
            {
                if (typeof(preset) != "undefined")
                {
                    getting_started_preset_download = preset;
                    if (!getting_started_preset_download)
                        Wizard.Notify(d_name() + "/getting_started/install_mode", "enable");
                    Wizard.Notify(d_name() + "/getting_started/download_mode", "set checked", getting_started_preset_download);
                    Wizard.Notify(d_name() + "/getting_started/install_mode", "set checked", !getting_started_preset_download);

                    if(getting_started_preset_download)
                    {
                        Wizard.Notify(d_name() + "/getting_started/dir_lable", "set text", StringList.Format(getting_started_download_path));
                        ns.Installer().DownloadOnly(true);
                        //enable-disable controls
                        getting_started_widget.Enable();
                        getting_started_widget.Refresh();
                    }
                    else
                    {
                        ns.Installer().DownloadOnly(false);
                        //disable-enable controls
                        Wizard.Notify(d_name() + "/getting_started/dir_lable", "set text", StringList.Format(getting_started_install_path));
                        getting_started_widget.Disable();
                        getting_started_widget.Refresh();
                    }
                    getting_started_update_space_info();

                    if (getting_started_preset_download)
                        Wizard.Notify(d_name() + "/getting_started/install_mode", "disable");
                }
                return getting_started_preset_download;
            }

            getting_started_widget.Refresh = function()
            {
                getting_started_widget.SetInfo(StringList.Format(String(getting_started_widget.GetFullPath()).replace(/\\/g, "\\\\")));
            }
            
            getting_started_widget.CB_Default(function()
            {
                Wizard.Notify(d_name() + "/getting_started/dir_edit", "set text limit", 260);
                Wizard.Notify(d_name() + "/getting_started/info", "disable autolink", true);
            });

            getting_started_widget.OnChange(function(sender, event_id)
            {
                var dir_label = "";
                switch(event_id)
                {
                case "NTF_INSTALL":
                    inst.DownloadOnly(false);
                    //disable-enable controls
                    getting_started_widget.Disable();
                    getting_started_widget.Refresh();
                    getting_started_update_space_info();
                    dir_label = getting_started_install_path;
                    break;
                case "NTF_DOWNLOAD":
                    inst.DownloadOnly(true);
                    //enable-disable controls
                    getting_started_widget.Enable();
                    getting_started_widget.Refresh();
                    getting_started_update_space_info();
                    dir_label = getting_started_download_path;
                    break;
                default:
                    return;
                }
                Wizard.Notify(d_name() + "/getting_started/dir_lable", "set text", StringList.Format(dir_label));
            });

            return getting_started_widget;
        }

        var build_destination_widget = function()
        {
            var destination_widget = ns_bld.BuildWidget(Wizard.ControlCollection["DestinationWidget"]());
            var d_name = function(){return destination_widget.Owner.GetRaw().Name();}

            var destination_space_required = null;
            var destination_current_value = "";
            var custom_path_checker = null;
            var space_update_in_progress = false;
            var download_folder = "";

            destination_widget.GetCustomPathChecker = function()
            {
                return custom_path_checker;
            };

            var update_space_info = function()
            {
                if(space_update_in_progress){
                    return;
                }

                space_update_in_progress = true;
                Log("update_space_info::incoming path: " + destination_current_value);

                var pchecker = ns_path_check.PathChecker(destination_current_value);
                pchecker.SpaceRequired(destination_space_required);

                var prod = ns.Product();
                if(custom_path_checker)
                    custom_path_checker(pchecker, prod);

                destination_widget.ButtonNext.Disabled(false);
                pchecker.IsValid();
                if(pchecker.ErrorCode() == pchecker.target_path_error_t.incorrect_path)
                {
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.access_denied)
                {
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.no_enough_space)
                {
                    return false;
                }

                Wizard.Notify("next", "enable");
                space_update_in_progress = false;
                return true;
            }

            destination_widget.Set = function( folder_path )
            {
                Wizard.Notify(d_name() + "/destination/edit_box", "set text", folder_path);
            }

            destination_widget.Disable = function( )
            {
                Wizard.Notify(d_name() + "/destination/edit_box","disable");
                Wizard.Notify(d_name() + "/destination/browse","disable");
            }

            destination_widget.Enable = function( )
            {
                Wizard.Notify(d_name() + "/destination/edit_box","enable")
                Wizard.Notify(d_name() + "/destination/browse","enable");
            }

            destination_widget.SpaceRequired = function(cb)
            {
                destination_space_required = cb;
                update_space_info();
            }

            destination_widget.SetCustomPathChecker = function(cb)
            {
                if(cb && typeof(cb) == "function")
                    custom_path_checker = cb;
            }

            destination_widget.OnChange(function(sender, event_id)
            {
                if(event_id == "NTF_DEST")
                {
                    var value = Wizard.Notify(d_name() + "/destination/edit_box", "get text");

                    var dirs = value.split(/[\\\/]/g);
                    var path = "";
                    for(var i in dirs)
                    {
                        path += dirs[i].trim();
                        path += "\\";
                    }
                    value = path;

                    var expanded = System.ExpandEnvironmentStr(value);
                    if(expanded && expanded != value)
                        value = expanded;

                    if(value.length > 4)
                        value = value.replace(/\\+$/, "");

                    destination_current_value = value;
                    var prod = ns.Product();
                    var mode = inst.DownloadOnly();
                    if(mode)
                    {
                        Log("Setting download directory");
                        inst.DownloadDir(FileSystem.AbsPath(destination_current_value, download_folder));
                    }
                    else
                    {
                        Log("Setting install directory");
                        inst.InstallDir(destination_current_value);
                        prod.InstallDir.Base(destination_current_value);
                    }
                }
            });

            destination_widget.CB_Initialize(function(ret_code)
            {
                var act_dlg = Wizard.ActiveDialog.GetRaw();
                if(!act_dlg || !act_dlg.Name || act_dlg.Name() != d_name())
                {
                    Log("Skip refreshing inactive dialog");
                    return;
                }
                Log("destination_widget::CB_Initialize entered");
                //1. get installer mode (download/install)
                var inst_mode = inst.DownloadOnly();
                //2. get destination directory
                var destination_current_value = "";
                var dir_lock = function()
                {
                    if(prod.InstallDir.Locked())
                    {
                        if(prod.InstallDir.Locked.Attributes)
                        {
                            Wizard.Notify(d_name() + "/destination/msg_lable/visible", "visible");
                            return prod.InstallDir.Locked.Attributes.Value("Description");
                        }

                    }
                    else
                        return "";
                }
                if(inst_mode)
                {
                    var download_dir = inst.DownloadDir();
                    destination_current_value = download_dir.substr(0, download_dir.lastIndexOf(download_folder));
                    Wizard.Notify(d_name() + "/destination/dir_lable", "set text", StringList.Format("[getting_started_download_path]"));
                    Wizard.Notify(d_name() + "/destination/msg_lable/visible", "invisible");
                }
                else
                {
                    destination_current_value = prod.InstallDir.Base();
                    Wizard.Notify(d_name() + "/destination/dir_lable", "set text", StringList.Format("[getting_started_install_path]"));
                    Wizard.Notify(d_name() + "/destination/msg_lable", "set text", dir_lock());
                }
                Log("destination current value: " + destination_current_value);
                //3. set destination directory to control
                Wizard.Notify(d_name() + "/destination/edit_box", "set text limit", 260);
                destination_widget.Set(destination_current_value);
                Log("destination_widget::CB_Initialize left");
            });

            destination_widget.CB_Default(function()
            {
                download_folder = prod.Info().Property("download_folder");
                if(!download_folder)
                    download_folder = prod.Id();
                download_folder = StringList.Format(download_folder);
            });
            
            destination_widget.CB_Skip(function()
            {
                Log("destination_widget CB_Skip entered");
                if(ns_inst.Installer.InstallMode() != ns_inst.Installer.install_mode_t.install
                    && !ns_inst.Installer.DownloadOnly())
                {
                    Log("destination_widget is skipped because ns_inst.Installer.InstallMode() = " + ns_inst.Installer.InstallMode() + " and it is not a DownloadOnly mode ");
                    return true;
                }

                return false;
            });

            return destination_widget;
        }

        var build_features_widget = function()
        {
            var features_widget = ns_bld.BuildWidget(Wizard.ControlCollection["FeaturesWidget"]());
            var d_name = function(){return features_widget.Owner.GetRaw().Name();}

            var feature_space_available = function() {return null; }
            var feature_space_required = function() {return null; }
            var feature_space_required_32 = function() {return null; }
            var feature_space_required_64 = function() {return null; }
            var feature_select_cb = function() {}
            var feature_initailize = function() {}
            var feature_continue_checkers = {};
            var revisible = false;

            var feature_check_continue_is_allowed = function()
            {
                var there_are_checkers = false;
                for(var i in feature_continue_checkers)
                {
                  there_are_checkers = true;

                  if(feature_continue_checkers[i].Skip && feature_continue_checkers[i].Skip())
                    continue;

                  if(feature_continue_checkers[i]())
                    return true;
                }

                return there_are_checkers ? false : true;
            }

            features_widget.AllowContinue = function()
            {
                var args = arguments;

                var id = null;
                var obj = null;

                if(args.length == 2)
                {
                    obj = args[0];
                    id = args[1];
                }
                else if(args.length == 1)
                {
                    obj = args[0];
                    id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
                }
                else if(args.length > 2)
                {
                    Log("AllowContinue too many arguments for function call (> 2). Ignore.");
                    return;
                }
                else
                {
                    Log("AllowContinue was called without arguments -> need to check that continue is allowed");
                    return feature_check_continue_is_allowed();
                }

                if(!id)
                  id = Guid();

                if(!feature_continue_checkers[id])
                {
                    feature_continue_checkers[id] = obj;
                    Log("AllowContinue: add continue_checker " + id);
                }
            };

            features_widget.AllowContinue.Clear = function(){ feature_continue_checkers = {}; }

            features_widget.SpaceAvailable = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_available = val;
                    else
                        feature_space_available = function() {return val;}
                    return;
                }

                return feature_space_available();
            }

            features_widget.SpaceRequired = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_required = val;
                    else
                        feature_space_required = function() {return val;}
                    return;
                }

                return feature_space_required();
            }

            features_widget.SpaceRequired32 = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_required_32 = val;
                    else
                        feature_space_required_32 = function() {return val;}
                    return;
                }

                return feature_space_required_32();
            }

            features_widget.SpaceRequired64 = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_required_64 = val;
                    else
                        feature_space_required_64 = function() {return val;}
                    return;
                }

                return feature_space_required_64();
            }

            features_widget.OnSelected = function(cb)
            {
                if(!cb)
                {
                    Log("Feature Selection Dialog: attempt to assign an undefined callback for the selection processing. Ignore.");
                    return;
                }

                feature_select_cb = cb;

                return feature_select_cb;
            }

            var feature_on_changed = function()
            {
                var required = feature_space_required();
                var available = feature_space_available();

                var message = {
                    required: {text: format("[space_required]", required), foreground: "black"},
                    available: {text: "", foreground: "black"}
                };

                if(required > available)
                {
                    message.available = {text: format("[space_available]", available), foreground: "red"};
                }
                else
                {
                    message.available = {text: format("[space_available]", available)};
                }

                features_widget.ButtonNext.Disabled(!feature_check_continue_is_allowed());
                //looks pretty wicked, but the point is: if continue is not allowed, disable next
            };

            var feature_refresh = function()
            {
                if (ns.Product())
                {
                    ns.Product().FilterFeaturesRecursive(function(ftr)
                    {
                        ftr.Root().Refresh();
                        feature_on_changed();
                        return true;
                    });
                }
            }

            var feature_selected = function(control, command, sel)
            {
                if(command == "OnClicked")
                {
                    switch(control)
                    {
                    case d_name() + "/feature/arch_32":
                        feature_select_cb(32, sel);
                        break;
                    case d_name() + "/feature/arch_64":
                        feature_select_cb(64, sel);
                        break;
                    }

                    feature_refresh();
                }
            }

            var set = function(control, s)
            {
                Wizard.Notify(control, "set checked", s);
                feature_selected(control, "OnClicked", s);
            }

            features_widget.Select32 = function(s){set(d_name() + "/feature/arch_32", arguments.length ? s : true);}
            features_widget.Select64 = function(s){set(d_name() + "/feature/arch_64", arguments.length ? s : true);}

            features_widget.Checked32 = function(s) {return Wizard.Notify(d_name() + "/feature/arch_32", "is checked");}
            features_widget.Checked64 = function(s) {return Wizard.Notify(d_name() + "/feature/arch_64", "is checked");}

            features_widget.Refresh = function(cb)
            {
                if (cb)
                {
                    if (typeof cb != "function")
                    {
                        Log("Feature Selection Dialog: attempt to assign Refresh a wrong value.");
                        return;
                    }
                    feature_refresh = cb;
                    return;
                }
                return feature_refresh();
            }

            features_widget.CB_Initialize(function(ret_code)
            {
                var act_dlg = Wizard.ActiveDialog.GetRaw();
                if(!act_dlg || !act_dlg.Name || act_dlg.Name() != d_name())
                {
                    Log("Skip refreshing inactive dialog");
                    return;
                }
                Log("features_widget::CB_Initialize entered");
                features_widget.Refresh();
                var hide_arch = (ns_inst.Installer.InstallMode() != ns_inst.Installer.install_mode_t.install
                    && !ns_inst.Installer.DownloadOnly()) ? "hide" : "show";
                Wizard.Notify(d_name() + "/feature/eula", hide_arch);
                Wizard.Notify(d_name() + "/feature/button_default", "hide");
                Wizard.Notify(d_name() + "/feature/button_all", "hide");
                Wizard.Notify(d_name() + "/feature/arch", hide_arch);
                Wizard.Notify(d_name() + "/feature/arch", "is required"); //one more check, based on "arch=" in components
                if (prod.InstallMode() == prod.install_mode_t.install)
                {
                    Wizard.Notify(d_name() + "/feature/tree", "set height", ns_inst.Installer.OnlineInstaller() ? 190 : 240);
                }
                else
                {
                    Wizard.Notify(d_name() + "/feature/tree", "set height", 320);
                }
                Log("features_widget::CB_Initialize left");
            });

            features_widget.OnChange(function(sender, event_id)
            {
                switch(event_id)
                {
                case "NTF_FEATURE_SELECTED":
                    features_widget.ButtonNext.Disabled(!feature_check_continue_is_allowed()); //see feature_on_changed for details
                    break;
                case "NTF_ARCH_32_CHECKED":
                    Log("32 is checked");
                    Wizard.Notify(d_name() + "/feature/arch_32", "OnClicked", 1);
                    break;
                case "NTF_ARCH_32_UNCHECKED":
                    Log("32 is unchecked");
                    Wizard.Notify(d_name() + "/feature/arch_32", "OnClicked", 0);
                    break;
                case "NTF_ARCH_64_CHECKED":
                    Log("64 is checked");
                    Wizard.Notify(d_name() + "/feature/arch_64", "OnClicked", 1);
                    break;
                case "NTF_ARCH_64_UNCHECKED":
                    Log("64 is unchecked");
                    Wizard.Notify(d_name() + "/feature/arch_64", "OnClicked", 0);
                    break;
                }
            });

            features_widget.CB_Default(function()
            {
                Wizard.Subscribe(d_name() + "/feature/space_arch", "OnChanged", feature_on_changed);
                Wizard.Subscribe(d_name() + "/feature/space_regular", "OnChanged", feature_on_changed);
                Wizard.Subscribe(d_name() + "/feature/arch_32", "OnClicked", feature_selected);
                Wizard.Subscribe(d_name() + "/feature/arch_64", "OnClicked", feature_selected);
                Wizard.Subscribe(d_name() + "/feature/space", "OnChanged", feature_on_changed);
            });
            
            features_widget.CB_GoNext(function()
            {
                Log("Eula is accepted by clicking Next");
                stat_pick.Property("gui_eula_accepted", true);
                return true;
            });

            return features_widget;
        }

        var build_space_widget = function()
        {
            var space_widget = ns_bld.BuildWidget(Wizard.ControlCollection["SpaceWidget"]());
            var d_name = function(){return space_widget.Owner.GetRaw().Name();}
            // component selection dlg adjustment
            var download_cmp_size = function(c)
            {
                var cmp_size = 0;
                var src = c.Source();
                if(src && src.Filter)
                {
                    src.Filter(function(s)
                    {
                        if(s.File)
                        {
                            var file = s.File();
                            if(s.Size)
                            {
                                cmp_size += s.Size();
                            }
                        }
                    });
                }
                return cmp_size;
            }

            var download_additional_size = function()
            {
                //need to add additional size in download mode - the size of the product without Installs
                var additional_size = 125829120; //about 120Mb
                if (prod.Info().Property("additional_product_size"))
                    additional_size = prod.Info().Property("additional_product_size");

                return additional_size;
            }

            var download_required_space = function()
            {
                var components = prod.ComponentsFullSet();

                var to_download_size = 0;

                for(var i in components)
                {
                    var c = components[i];
                    if (c.Action() == c.action_t.install || c.Action() == c.action_t.repair)
                        to_download_size += download_cmp_size(c);
                }

                if (to_download_size)
                    to_download_size += download_additional_size();

                return to_download_size;
            }

            var install_required_space = function()
            {
                return prod.Size();
            }
            
            var select_all = function()
            {
                filter(prod.FeaturesFullSet(), function(f)
                {
                    f.Action(f.action_t.install);
                });
            }
            
            var clear_all = function()
            {
                prod.Action(prod.action_t.none);                    
            }

            var default_clicked = function()
            {
                Log("Link 'Default' was clicked");
                select_all();
                var set_default_fn = prod.DefaultAction;
                if(set_default_fn)
                {
                    Log("Setting default component selection");
                    set_default_fn();
                    prod.Root().Refresh();
                    space_widget.CB_Initialize();
                    //event_feature_selected();
                }
            }


            var all_clicked = function()
            {
                Log("Link 'All' was clicked");
                if (prod.Action() == prod.action_t.install)
                    clear_all();
                else
                    select_all();
                prod.Root().Refresh();
                space_widget.CB_Initialize();
                //event_feature_selected();
            }
            
            prod.Action.Subscribe(function(act)
            {
                var cmd = (prod.Action() == prod.action_t.install ?  "clear" : "all" );
                Log("Subscription: Wizard.Notify(" + d_name() + "/select_mode, " + cmd +")");
                Wizard.Notify(d_name() + "/select_mode", cmd);
            });
            
            space_widget.OnChange(function(sender, event_id)
            {
                ALog(Log.l_debug, "space_widget.OnChange: event_id = " + event_id);
                switch(event_id)
                {
                case "NTF_DEFAULT":
                    default_clicked();
                    break;
                case "NTF_ALL":
                    all_clicked();
                    break;
                case "NTF_CLEAR":
                    all_clicked();
                    break;
                }
            });

            space_widget.CB_Initialize(function(ret_code)
            {
                var act_dlg = Wizard.ActiveDialog.GetRaw();
                if(!act_dlg || !act_dlg.Name || act_dlg.Name() != d_name())
                {
                    Log("Skip refreshing inactive dialog");
                    return;
                }
                var hide_arch = (ns_inst.Installer.InstallMode() != ns_inst.Installer.install_mode_t.install
                    && !ns_inst.Installer.DownloadOnly()) ? "hide" : "show";
                    
                //Wizard.Notify(d_name() + "/select_mode", hide_arch);
                Wizard.Notify(d_name() + "/select_mode", "show"); //ICARE guidance - show in modify mode as well
                Wizard.Notify(d_name() + "/select_mode", (prod.Action() == prod.action_t.install ? "clear" : "all"));
                    
                Log("space_widget::CB_Initialize entered");
                //1. get installer mode (download/install)
                var inst_mode = inst.DownloadOnly();
                //2. get destination directory
                var destination_current_value = (inst_mode ? inst.DownloadDir() : inst.InstallDir());
                Log("destination current value: " + destination_current_value);
                if(destination_current_value == "")
                    destination_current_value = prod.InstallDir.Base();
                //3. get available space from destination drive
                var available_space = FileSystem.FreeSpace(destination_current_value);

                //4. get required space
                var required_space = (inst_mode ? download_required_space() : install_required_space());
                //5. make up a unified object
                var message = {};
                message.required = required_space;
                message.available = available_space;
                message.error = "";

                var pchecker = ns_path_check.PathChecker(destination_current_value);
                pchecker.SpaceRequired(required_space);

                //aslo, call custom checkers from destination widget
                if(ns.GettingStartedDialog && ns.GettingStartedDialog.Destination_Widget)
                {
                    destination_widget = ns.GettingStartedDialog.Destination_Widget;
                    var destination_custom_path_checker = destination_widget.GetCustomPathChecker();
                    if(destination_custom_path_checker)
                        destination_custom_path_checker(pchecker, prod);
                }
                //... and from getting started widget
                if(ns.GettingStartedDialog && ns.GettingStartedDialog.Getting_Started_Widget)
                {
                    gs_widget = ns.GettingStartedDialog.Getting_Started_Widget;
                    var gs_custom_path_checker = gs_widget.GetCustomPathChecker();
                    if(gs_custom_path_checker)
                        gs_custom_path_checker(pchecker, prod);
                }

                pchecker.IsValid();

                space_widget.ButtonNext.Disabled(false);

                if(pchecker.ErrorCode() == pchecker.target_path_error_t.incorrect_path)
                {
                    space_widget.ButtonNext.Disabled(true);
                    message.available = 0;
                    message.foreground = "red";
                    message.error = pchecker.ErrorMessage();
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.access_denied)
                {
                    space_widget.ButtonNext.Disabled(true);
                    //message.available = 0;
                    message.foreground = "red";
                    message.error = "[space_access_denied]";
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.no_enough_space)
                {
                    space_widget.ButtonNext.Disabled(true);
                    //message.available = 0; //let's display the real size
                    message.foreground = "red";
                    message.error = "[space_not_enough]";
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.path_long)	
                {
                    space_widget.ButtonNext.Disabled(true);
                    message.foreground = "red";
                    message.error = "[path_too_long]";
                }

                if(required_space > available_space)
                    space_widget.ButtonNext.Disabled(true);

                //6. set required, available space to control
                Wizard.Notify(d_name() + "/space_required", "set text", message);

                Log("space_widget::CB_Initialize left");
            });

            return space_widget;
        }
        
        //------------------------------------------------------------
        Wizard.WidgetCollection["build_getting_started_widget"] = build_getting_started_widget;
        Wizard.WidgetCollection["build_destination_widget"] = build_destination_widget;
        Wizard.WidgetCollection["build_features_widget"] = build_features_widget;
        Wizard.WidgetCollection["build_space_widget"] = build_space_widget;
    };
    
    
    //################################################################################
    //################################################################################
    //################################################################################
    
    this.BuildDialogs = function(prod)
    {
        var ns = this;

        var getting_started_dialog = function(name)
        {
            var wdgt_getting_started = Wizard.WidgetCollection["build_getting_started_widget"]();
            var wdgt_destination = Wizard.WidgetCollection["build_destination_widget"]();
            var wdgt_features = Wizard.WidgetCollection["build_features_widget"]();
            var wdgt_space = Wizard.WidgetCollection["build_space_widget"]();
            var wdgt_eula = Wizard.WidgetCollection["build_eula_link"]();

            //==========================================================================================

            var dlg = ns_bld.BuildDialog(dialogs("base_container.js").BaseContainer());
            dlg.Name(name);
            dlg.AttachWidget(wdgt_getting_started);
            dlg.AttachWidget(wdgt_destination);
            dlg.AttachWidget(wdgt_features);
            dlg.AttachWidget(wdgt_space);
            dlg.AttachWidget(wdgt_eula);
            dlg.CB_CustomAction(function() {return true});

            var getting_started_control = dlg.Control.GetRaw();
            dlg.AddDependency(dlg.Destination_Widget, [dlg.Space_Widget]);
            dlg.AddDependency(dlg.Features_Widget, [dlg.Space_Widget]);
            dlg.AddDependency(dlg.Getting_Started_Widget, [dlg.Destination_Widget, dlg.Space_Widget, dlg.Features_Widget, dlg.EulaLink]);
            dlg.AddDependency(dlg.Space_Widget, [dlg.Features_Widget]);
            getting_started_control.navigator = dialogs("navigator.js").BackNextCancel();
            getting_started_control.Show = function()
            {
                Wizard.Notify("GettingStartedDialog/feature/space", "OnChanged");
                //var product_name = prod.Info().Property("name");
                //Wizard.Notify("top/title", "set text", StringList.Format(product_name));
                //var product_edition = prod.Info().Property("edition");
                //Wizard.Notify("top/edition", "set text", StringList.Format(product_edition));
                dlg.Space_Widget.Initialize();
            }

            dlg.CB_Skip(function()
            {
                if(GetOpt.Exists("download-list"))
                {
                    return true;
                }
                if (inst.DownloadOnly())
                {
                    Log("This is DownloadOnly mode - do not skip getting started dialog");
                    return false;
                }
                switch(inst.InstallMode())
                {
                case inst.install_mode_t.install:
                    Log("Install mode is 'install' - do not skip getting started dialog");
                    return false;
                    break;
                case inst.install_mode_t.modify:
                    Log("Install mode is 'modify' - do not skip getting started dialog");
                    return false;
                    break;
                case inst.install_mode_t.repair:
                    Log("Install mode is 'repair' - skip getting started dialog");
                    return true;
                case inst.install_mode_t.remove:
                    Log("Install mode is 'remove' - skip getting started dialog");
                    return true;
                    break;
                default:
                    return false;
                }
                return false;
            });

            dlg.OnChange(function()
            {
                if (ns_inst.Installer.DownloadOnly())
                    Wizard.Notify("next", "set text", "[Download]");
                else
                    Wizard.Notify("next", "set text", "[Next]");
            });

            dlg.Getting_Started_Widget.CB_DisableOnSkip(false);
            dlg.Features_Widget.CB_DisableOnSkip(false);
            dlg.Destination_Widget.CB_DisableOnSkip(false);
            dlg.EulaLink.CB_DisableOnSkip(false);
            
            return dlg;
        }
        //-----------------------------------------------
        Wizard.DialogCollection["getting_started_dialog"] = getting_started_dialog;
    }
}
