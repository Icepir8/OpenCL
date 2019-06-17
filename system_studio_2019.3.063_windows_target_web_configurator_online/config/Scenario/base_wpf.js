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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};
    var load_from_config = function(name) {return required(from_config(name));};

    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");
    var ns_path_check = base("path_checker.js");
    var ns_prop      =  base("property.js");
    var ns_pb        =  base("parse_bool.js");
    var stat_pick    =  base("stat_pick.js").Stat_pick;
    var ns_ver       =  base("version.js");
    var ns_date      = base("date_format.js");

    var ns_vs = base("vs_processing.js").GetVSInfo();
    var ns_pr = base("pendingreboot.js");

    var P = function(val, attributes){return ns_prop.Property(val, attributes);}
    var PCollector = function(val){return ns_prop.Collector(val);}
    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }
    var PForDownload = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.DownloadOnly);
        c(val);
        return c;
    }

    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    var ComponentById = function(product, id)
    {
        return product.FilterComponentsRecursive(function(cmp){ if(cmp.Id() == id) return cmp;});
    }

    var MSIProperty = function(id, property_name)
    {
        if(!id || !property_name)
            return "";

        var prop = "";
        var client_WI = WI.Product(id);

        var query = client_WI.Query("SELECT * FROM Property WHERE Property = '" + property_name + "'");
        if(query && query.length)
        {
            Log("Query results: " + JSON.stringify(query));
            for (var i in query)
            {
                if (query[i].Property == property_name)
                    return query[i].Value;
            }
        }

        return "";
    }

    ns_inst.Installer.OutputFile().Clear();
    var Output = function(mes)
    {
        Log(mes);
        ns_inst.Installer.OutputFile().Append(mes);
    }

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "scenario:base:iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    var is_val_in = function(val, list, case_sensitive)
    {
        if(!list || list.length < 1)
            return false;

        return iterate(list, function(k){ return case_sensitive ? k == val : (String(k).toLowerCase() == String(val).toLowerCase()); });
    }

    var IsNull = function(val)
    {
        if(typeof(val) != "undefined" && val !== null)
           return false;

        return true;
    }

    //###############################################################
    // object for validating destination folder
    //###############################################################
    // Custom check path function to detect 64 bit ProgramFiles folder
    var Disallow64BitProgramFiles = function()
    {
         if(arguments.length < 1)
            return false;
         var path = arguments[0];
         if(System.ProcessorArch() != System.ProcessorArch.pa_x86)
         {
             var program_files_x64 = FileSystem.SpecialFolder.program_files_x64.toLowerCase();
             var path_inc = path.toLowerCase();
             if(path_inc.indexOf(program_files_x64) != -1)
             {
                 var tail = path_inc.charAt(program_files_x64.length);
                 if(program_files_x64.length == path_inc.length || tail == '\\' || tail == '/')
                 {
                     return false;
                 }
             }
         }
         return true;
    }
    Disallow64BitProgramFiles.Msg = fm("[64bit_programfiles_path_is_disallowed]");
    //###############################################################
    // Custom check path function to detect spaces
    var DisallowSpaceInInstalldir = function()
    {
        if(arguments.length < 1)
           return false;
        var path = arguments[0];
        if(path.match(/\s/))
        {
           return false;
        }
        return true;
    }
    DisallowSpaceInInstalldir.Msg = fm("[disallow_space_in_installdir]");
    //###############################################################
    var set_custom_install_path_checkers = function (pchecker, prod)
    {
        var disallow_64bit_programfiles = ns_pb.ParseBoolean(prod.Info().Property("disallow_64bit_programfiles"));
        if(disallow_64bit_programfiles)
            pchecker.AddCustomChecker(Disallow64BitProgramFiles)

        var disallow_space_in_installdir = ns_pb.ParseBoolean(prod.Info().Property("disallow_space_in_installdir"));
        if(disallow_space_in_installdir)
            pchecker.AddCustomChecker(DisallowSpaceInInstalldir);
    }
    //###############################################################
    var set_custom_download_path_checkers = function (pchecker, prod)
    {
        var disallow_64bit_programfiles = ns_pb.ParseBoolean(prod.Info().Property("disallow_64bit_programfiles"));
        if(disallow_64bit_programfiles)
            pchecker.AddCustomChecker(Disallow64BitProgramFiles)
    }
    //###############################################################
    var path_is_valid = function(path, space_required, prod, set_custom_checkers, ok_codes)
    {
        var pchecker = ns_path_check.PathChecker(path);
        pchecker.SpaceRequired(space_required);

        set_custom_checkers(pchecker, prod);

        pchecker.IsValid();
        Output(pchecker.ErrorMessage());

        var codes = ok_codes ? ok_codes : [pchecker.target_path_error_t.ok, pchecker.target_path_error_t.space_unknown];
        
        if (codes.indexOf(pchecker.ErrorCode()) == -1)
        {
            return false;
        }

        return true;
    }
    //###############################################################
    var install_path_is_valid = function(path, space_required, prod)
    {
        var pchecker = ns_path_check.PathChecker(path);
        var ok_codes = [pchecker.target_path_error_t.ok, pchecker.target_path_error_t.space_unknown];
        return path_is_valid(path, space_required, prod, set_custom_install_path_checkers, ok_codes);
    }
    //############################################################### 
    var download_path_is_valid = function(path, space_required, prod)
    {
        var pchecker = ns_path_check.PathChecker(path);
        var ok_codes = [pchecker.target_path_error_t.ok, pchecker.target_path_error_t.space_unknown];
        return path_is_valid(path, space_required, prod, set_custom_download_path_checkers, ok_codes);
    }
    
    
    
    //###############################################################
    
    this.Actions = function(prod)
    {
        var ns = this;
        Log("Scenario::base_wpf: actions generation started");
        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }
        var ns_dlg = base("dialogs_base_wpf.js");
        ns_dlg.Installer(ns_inst.Installer);
        ns_dlg.Product(prod);
        //load controls, widgets and dialogs in "this" context
        ns_dlg.Load(ns, prod);
        
        //disable sending statistics
        var disable_stat = function()
        {
           if (ns_pb.ParseBoolean(prod.Info().Property("disable_statistics")))
               return false;
           return true;
        }

        stat_pick.AddFullChecker(disable_stat); 
        stat_pick.AddTruncChecker(disable_stat);
       
        //############################################################################        
        //##################          Creating Dialogs          ######################
        //############################################################################
        
        ns.GettingStartedDialog = Wizard.DialogCollection["getting_started_dialog"]("GettingStartedDialog");
        ns.ConfigurationDialog = Wizard.DialogCollection["config_dialog"]("ConfigurationDialog");
        ns.ISIPDialog = Wizard.DialogCollection["isip_dialog"]("ISIPDialog");
        ns.Prerequisites = Wizard.DialogCollection["prerequistes_dialog"]("Prerequisites");
        ns.InstallPrerequisites = Wizard.DialogCollection["prerequistes_dialog"]("InstallPrerequisites");
        ns.FatalPrerequisites = Wizard.DialogCollection["fatal_dialog"]("FatalPrerequisites");
       
        //no need to have both dialogs simultaneously
        ns.Maintenance = ns_inst.Installer.OnlineInstaller() ? 
            Wizard.DialogCollection["online_mntnc_dlg"]("OnlineMaintenance") :  
            Wizard.DialogCollection["offline_mntnc_dlg"]("OfflineMaintenance");       

        //############################################################################
        //###############         Creating Custom Containers        ##################
        //############################################################################
        // Initialization - container for actions which should be performed first
        ns.Initialization = base("scenario3.js").CreateHead("Initialization");        
        // ConfigureOptions - container for actions which performs required configuration
        ns.ConfigureOptions = base("scenario3.js").CreateHead("ConfigureOptions");
        // ConfigureCacheProducts - container for actions which require cache products to be loaded
        ns.ConfigureCacheProducts = base("scenario3.js").CreateHead("ConfigureCacheProducts");
        // FinalActions - container for actions which must be performed after installation
        ns.FinalActions = base("scenario3.js").CreateHead("FinalActions");   
        // ConfigureByFlexlmFeatures - container for actions which configure product according to available Flexlm Features
        // ConfigureByFlexlmFeatures is called inside FlexlmAdjustment and SFlexlmAdjustment
        ns.ConfigureByFlexlmFeatures = base("scenario3.js").CreateHead("ConfigureByFlexlmFeatures");

        //############################################################################
        //###############      Creating Condition Subscenarios      ##################
        //############################################################################
        
        ns.sub_Silent = base("scenario3.js").CreateHead("Silent");
        ns.sub_SInstaller = base("scenario3.js").CreateHead("SInstaller");
        ns.sub_SInstall = base("scenario3.js").CreateHead("SInstall");
        ns.sub_SMaintenance = base("scenario3.js").CreateHead("SMaintenance");
        ns.sub_SDownloader = base("scenario3.js").CreateHead("SDownloader");
        ns.sub_GUI = base("scenario3.js").CreateHead("GUI");
        ns.sub_Installer = base("scenario3.js").CreateHead("Installer");
        ns.sub_Install = base("scenario3.js").CreateHead("Install");
        ns.sub_Maintenance = base("scenario3.js").CreateHead("Maintenance");
        ns.sub_Downloader = base("scenario3.js").CreateHead("Downloader");       
        
        //############################################################################
        //##################   Creating Aliases to Widgets    ########################
        //############################################################################
       
        if(ns.GettingStartedDialog.Destination_Widget)
            ns.Destination = ns.GettingStartedDialog.Destination_Widget;

        if(ns.GettingStartedDialog.Features_Widget)
            ns.Features = ns.GettingStartedDialog.Features_Widget;

        if(ns.GettingStartedDialog.Getting_Started_Widget)
            ns.GettingStarted = ns.GettingStartedDialog.Getting_Started_Widget;

        if(ns.IDEDialog && ns.IDEDialog.VS_Integration_Widget)
        {
            var vs_integration_ns = ns.IDEDialog.VS_Integration_Widget;
            ns.VSIntegration = function() {return Action.r_ok;};
            for(var key in vs_integration_ns)
                ns.VSIntegration[key] = vs_integration_ns[key];
        }

        //redefinition of these namespaces required for scenario scripts where ns.EclipseIntegration existance is assumed
        if(ns.IDEDialog && ns.IDEDialog.Eclipse_Integration_Widget)
        {
            var eclipse_integration_ns = ns.IDEDialog.Eclipse_Integration_Widget;
            ns.EclipseIntegration = function() {return Action.r_ok;};
            for(var key in eclipse_integration_ns)
                ns.EclipseIntegration[key] = eclipse_integration_ns[key];
        }

        if(ns.IDEDialog && ns.IDEDialog.NDK_Integration_Widget)
        {
            var ndk_integration_ns = ns.IDEDialog.NDK_Integration_Widget;
            ns.NDKIntegration = function() {return Action.r_ok;};
            for(var key in ndk_integration_ns)
                ns.NDKIntegration[key] = ndk_integration_ns[key];
        }

        if(ns.IDEDialog && ns.IDEDialog.WB_Integration_Widget)
        {
            var wb_integration_ns = ns.IDEDialog.WB_Integration_Widget;
            ns.WBIntegration = function() {return Action.r_ok;};
            for(var key in wb_integration_ns)
                ns.WBIntegration[key] = wb_integration_ns[key];
        }
        
        ns.Eula = ns.EULAModalDialog.EULA_Modal_Widget;
        ns.Complete = Wizard.DialogCollection["complete"]("Complete");
        ns.CompleteWidget = ns.Complete.Complete_Widget;
        ns.CompleteWithCheckbox = ns.Complete.Complete_Checkbox_Widget;
        ns.CompleteReboot = ns.Complete.Complete_Reboot_Widget;
       
        //###############################################################
        //Setup billboard refresh timeout (in seconds)
        //Default value is 5 seconds, can be changed in product.xml
        var billboard_refresh_timeout = prod.Info().Property("billboard_refresh_timeout") ? prod.Info().Property("billboard_refresh_timeout") : "5";  
        
        //###############################################################
        ns.InstallationAdjustment = function()
        {
            Log(" Start installation adjustment");
            if (ns.InstallationAdjustment.ConfigureProgress)
                ns.InstallationAdjustment.ConfigureProgress();
            
            Log(" Loading products targeted for second_load_stage");

            if(typeof(ns_inst.Installer.LoadRequiredCachedProducts) == "function")
                ns_inst.Installer.LoadRequiredCachedProducts();

            if(Wizard.Canceled())
                return Action.r_cancel;
            //need to load all others not just second load stage, because previous products don't have this mark
            ns_inst.Installer.Load(null, ns_inst.Installer.GetFilterByLoadStage());
            Log(" Loading products targeted for second_load_stage done");

            if(Wizard.Canceled())
                return Action.r_cancel;

            return Action.r_ok;
        }
        
        //###############################################################
        ns.InstallationAdjustment.ConfigureProgress = function()
        {
            var pprogress = Progress();
            pprogress.total = -1;
            pprogress.message = StringList.Format("[prepare_environment]");

            //ns.LoadBillBoards(); //need to compare with original base.js
            var act_type = "offline";
            if (ns_inst.Installer.OnlineInstaller() && prod.InstallMode() == prod.install_mode_t.install)
            {
                act_type = "online";
            }
            if (ns_inst.Installer.OnlineInstaller() && prod.InstallMode() == prod.install_mode_t.modify)
            {
                //if some components are going to be installed in modify mode
                //we need to show download progress as well
                var cmp_install = prod.FilterComponentsRecursive(function(cmp)
                {
                    if(cmp.State() == cmp.state_t.absent && cmp.Action() == cmp.action_t.install)
                        return true;
                });
                
                if (cmp_install)
                {
                    Log("prod is going to be installed");
                    act_type = "online";
                }
            }

            Wizard.Notify("ProgressBillboard", "activate", act_type);
            if (act_type == "online")
            {
                Wizard.Notify("Progress2", "header", "");
                Wizard.Notify("Progress2", "title", "");
                Wizard.Notify("Progress2", "connect", pprogress.id);
            }
            else
            {
                Wizard.Notify("Progress1", "header", "");
                Wizard.Notify("Progress1", "title", "");
                Wizard.Notify("Progress1", "connect", pprogress.id);                
            }

            if(!ns_inst.Installer.Silent())
                ns.Installation("Billboard");
            if(prod.InstallMode() == prod.install_mode_t.remove)
                Wizard.Notify("Progress", "title", StringList.Format("[subtitle_remove]"));
            else
                Wizard.Notify("Progress", "title", StringList.Format("[subtitle_install]"));             
            
        }
        
        //###############################################################
        ns.AnalizeConfiguration = function()
        {
            ns.Installer().AnalizeConfiguration();
            return Action.r_ok;
        }
        //###############################################################
        // Apply settings from the last installed family product

        var apply_user_settings_callbacks = {};

        //###############################################################
        // function which execute provided callbacks for apply user settings from the provider
        //###############################################################
        var apply_user_settings_call = function(provider)
        {
            for(var i in apply_user_settings_callbacks)
            {
                
                if(apply_user_settings_callbacks[i].Skip && apply_user_settings_callbacks[i].Skip())
                    continue;

                apply_user_settings_callbacks[i](provider);
            }
        }
        //###############################################################
        ns.ApplyUserSettings = function()
        {
            Log("ApplyUserSettings begin");
            var provider = prod.Info().Property("UserSettingsProvider");

            if(!provider)
            {
                Log("no user settings provider was found. Ignore;")
                return Action.r_ok;
            }

            Log("user settings provider name = " + provider.Name() + " id = " + provider.Id());

            apply_user_settings_call(provider);

            Log("ApplyUserSettings done");
            return Action.r_ok;
        }
        //###############################################################
        // adding callbacks which are called to apply user settings
        // each callback can have method Skip
        // usage:
        // ApplyUserSettings.Add(callback)
        // ApplyUserSettings.Add(callback, id)
        // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
        //###############################################################
        ns.ApplyUserSettings.Add = function()
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
                Log("ApplyUserSettings.Add too many arguments for function call (> 2). Ignore.");
                return;
            }
            else
            {
                Log("ApplyUserSettings.Add was called without arguments. Ignore");
                return;
            }

            if(!id)
              id = Guid();

            if(!apply_user_settings_callbacks[id])
            {
                apply_user_settings_callbacks[id] = obj;
                Log("ApplyUserSettings.Add: add setter of user's settings " + id);
            }
        }
        //###############################################################
        ns.ApplyUserSettingsInstallMode = function()
        {
           if (prod.InstallMode() == prod.install_mode_t.install)
            return ns.ApplyUserSettings();
           return Action.r_ok;
        }
        //###############################################################
        var set_provider_act = function(provider)
        {
            Log("setting install action for all components which were installed from provider package");
            provider.FilterComponentsRecursive(function(cmp)
            {
                var tcmp = ComponentByAlias(prod, cmp.Info().Property("alias"));
                if(tcmp && cmp.State() == cmp.state_t.installed)
                    tcmp.Action(tcmp.action_t.install);
            });
            Log("setting install action for all components which were installed from provider package done");

            Log("setting none action for all components which exists but were NOT installed from provider package");
            prod.FilterComponentsRecursive(function(cmp)
            {
                if(typeof cmp.Info().Property("alias") != "undefined")
                {
                    var tcmp = ComponentByAlias(provider, cmp.Info().Property("alias"));

                    if(tcmp && tcmp.State() == tcmp.state_t.absent)
                    {
                        if(tcmp.StateManager() && typeof(tcmp.StateManager().Id) == "function" && tcmp.StateManager().Id() == "download_list_state_manager")
                        {
                        //provider's component state manager is state manager for download-only mode
                        //it occurs in case when this product and provider contains same sub_product and as a result this sub_product's components got this special state manager
                        //because of this to clearly identify real state of such component we need to check previous state manager
                            if(tcmp.StateManager.PreviousValue())
                            {
                                // download mode state manager was assigned after component creation -> previous value was set
                                if(typeof(tcmp.StateManager.PreviousValue().State) == "function" && tcmp.StateManager.PreviousValue().State() == tcmp.state_t.absent)
                                {
                                    Log("setting none for " + cmp.Name());
                                    cmp.Action(cmp.action_t.none);
                                }
                            }
                            else if(tcmp.Processor() && typeof(tcmp.Processor().State) == "function" && tcmp.Processor().State() == tcmp.state_t.absent)
                            {
                                // download mode state manager was provided as a parameter for components creation -> no any previous value, need to use Processor
                                Log("setting none for " + cmp.Name());
                                cmp.Action(cmp.action_t.none);
                            }
                        }
                        else
                        {
                            Log("setting none for " + cmp.Name());
                            cmp.Action(cmp.action_t.none);
                        }
                    }
                }
            });

            Log("setting none action for all components which exists but were NOT installed from provider package done");

        }
        //###############################################################
        ns.ApplyUserSettings.Add(set_provider_act);
        //###############################################################
        ns.SetProviderAct = function()
        {
            Log("SetProviderAct begin");
            var provider = prod.Info().Property("UserSettingsProvider");
            if (provider)
            {
                //still need double call
                set_provider_act(provider);
                set_provider_act(provider);
            }
            else 
            {
                Log("SetProviderAct : provider is null");
            }
            Log("SetProviderAct done");
        }
        //###############################################################
        // Adjusting progress dlg
        //###############################################################
        ns.LoadBillBoards = function()
        {
            StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));

            var dir = FileSystem.MakePath(StringList.Format(prod.Info().Property("billboards")));
            //var dir = FileSystem.MakePath("../1033/BillBoards", Origin.Directory());
            var billboards_url = StringList.Format(prod.Info().Property("billboards_url"));
            if(billboards_url)
                Wizard.Notify("ProgressBillboard", "url", billboards_url);

            Log("Loading billboards dir = " + dir);
            var files = FileSystem.FindFiles(dir, "*.png");

            for(var i in files)
            {
                var item = files[i];
                var file = FileSystem.MakePath(item, dir);
                Log("Adding file = " + file);
                Wizard.Notify("ProgressBillboard", "add file", file);
            }

            Wizard.Notify("ProgressBillboard", "timeout", billboard_refresh_timeout);
            Log("Loading billboards done");
        }
        //###############################################################
        ns.Progress = function()
        {
            var on_start = function(threads)
            {

                Wizard.BusyStop();

                var dummy_progress = Progress(); // to cleanup previous progress
                dummy_progress.total = 100;
                dummy_progress.position = 0;
                dummy_progress.message = StringList.Format("[PrgDownload]");
                Wizard.Notify("Progress2", "connect", dummy_progress.id);
                //Wizard.Notify("Progress2", "header", StringList.Format("[PrgDownload]"));

                var ns_dmp = base("dumper.js");
                var install_mngr = base("install.js");

               install_mngr.ThreadMap({"Progress2":["Download"]});
               //return install_mngr.Process(dmp);
            }
            ns.Installer().OnStart(on_start);
            return Action.r_ok;
        }

        //###############################################################
        // setting common dlgs title and icons
        ns.Title("[title]");
        ns.Title.BigIcon(from_config("Icons/micl.ico"));
        ns.Title.SmallIcon(from_config("Icons/micl.ico"));

        // assign welcome text
        if(GetOpt.Exists("help") || GetOpt.Exists("?"))
        {
            ns.Welcome.Template(StringList.Format("[help_text]"));
            ns.Welcome.Buttons = function()
            {
                ns.Buttons("[Finish]", "[Prev]", "[Cancel]");
                Wizard.Next.Enable();
                Wizard.Prev.Disable();
                Wizard.Cancel.Disable();
            }

            var on_link_click = function(id, command, value)
            {
                if(value.match(/https?:\/\//))
                {
                    Execute.URL(value);
                }
            }
            Wizard.Subscribe("welcome", "OnClicked", on_link_click);
        }
        else
        {
            ns.Welcome.Template(StringList.Format("[welcome_text]"));
        }

        //###############################################################
        // Maintenance adjustment
        //###############################################################
        ns.Maintenance.MaintenanceOptions.OnModeChange(function(mode)
        {
          
            switch(mode)
            {
                    case ns_inst.Installer.install_mode_t.modify:
                        Wizard.Notify("next", "set text", "[Next]");
                        break;
                    case ns_inst.Installer.install_mode_t.repair:
                        Wizard.Notify("next", "set text", "[Repair]");
                        break;
                    case ns_inst.Installer.install_mode_t.remove:
                        Wizard.Notify("next", "set text", "[Remove]");
                        break;
            }
            
        });
        if (ns_inst.Installer.OnlineInstaller()) 
        {
            ns.Maintenance.DownloadOption.OnModeChange(function()
            {
                Wizard.Notify("next", "set text", "[Next]");
            });
        }
        
        //###############################################################
        // configure licensing
        // initial configuration assumes that product will not be installed without additional adjustment
        //###############################################################
        ns.FlexlmAdjustment = function(){ return Action.r_error;};
        ns.SFlexlmAdjustment = function(){ return Action.r_error;};
        ns.ActivationManager = null;
        

        var preset_download_mode = (GetOpt.Exists("download-only") || GetOpt.Exists("download-list"));
        
        //###############################################################
        // Welcome
        //###############################################################
        ns.Welcome.Skip = function()
        {
            if (GetOpt.Exists("help") || GetOpt.Exists("?"))
                return false;

            return (ns_pb.ParseBoolean(prod.Info().Property("disable_welcome_dlg")));
        }

        //###############################################################
        // EULA
        // assign eula
        //###############################################################
        ns.Eula.File(from_config(StringList.Format("[eula_rtf]")));

        //###############################################################
        // destination adjustment
        //###############################################################
        ns.Destination.SetCustomPathChecker(set_custom_install_path_checkers);

        var sort_by_priority = function(a, b){ return (a.Priority ? a.Priority() : 100) - (b.Priority ? b.Priority() : 100); }

        ns.Destination.GetDestinationList = function (ftr, _list)
        {
            var self = arguments.callee;

            var initial_launch = _list ? false : true;
            var list = _list ? _list : [];

            var cmps = ftr.Components().Order();

            Log("analize ftr " + ftr.Id());

            ftr.Components().Filter(function(obj)
            {
                var install_dir = obj.InstallDir();

                if(list.indexOf(install_dir) == -1)
                {
                    var act = obj.Action();
                    var st = obj.State();
                    //if(act == obj.action_t.install || act == obj.action_t.mix || (st == obj.state_t.installed && act != obj.action_t.remove))
                    if(act == obj.action_t.install)
                    {
                        //list = add_destination_to_list(install_dir, list);
                        //iterate(list, function(i){Log("push after: list contains " + i);});
                        list.push(install_dir);
                    }
                }
            });

            var sftrs = ftr.Features().Order(sort_by_priority);

            for(var i in sftrs)
                list = self(sftrs[i], list);

            if (initial_launch && !ns_pb.ParseBoolean(prod.Info().Property("not_delete_subfolders")))
            {
                //remove extended directories, if base directory exists
                //asume that incoming list contains only unique items
                var mark_extended = function(_path, _lst, _del_lst)
                {
                    iterate(_lst, function(_p) {
                        if (_p != _path && _p.length > _path.length)
                        {
                            if (_p.substr(0, _path.length) == _path)
                            {
                                if (_del_lst.indexOf(_p) == -1)
                                {
                                    Log("_del_lst.push " + _p);
                                    _del_lst.push(_p);
                                }
                            }
                        }
                    });
                }

                //delete all extended directories
                var d_list = [];
                iterate(list, function(m_path) {mark_extended(m_path, list, d_list); });
                iterate(d_list, function(_d) {list.splice(list.indexOf(_d), 1); });
            }

            // usable for case when all components are installed and the list is empty, - pre install causes an error "Incorrect path"
            if(initial_launch && list.length < 1)
                list.push(prod.InstallDir());

            return list;
        }

        ns.Destination.GetDestinationInfoMessage = function()
        {
            var list = ns.Destination.GetDestinationList(prod);
            var message = prod.InstallDir();
            var replace = "\\\\";
            var delimiter = "\\line    ";
            var info_template = "[destination_info_template]";

            if(typeof(WPF) != "undefined")
            {
                replace = "\\";
                delimiter = "\n    ";
                info_template = "[destination_selected_folder]";
            }

            if(list && list.length)
            {
                message = "";
                iterate(list, function(i)
                {
                    message = message + delimiter + String(i).replace(/\\/g, replace);
                });
            }

            return StringList.Format(info_template, message);
        }

        ns.Destination.Set(prod.InstallDir.Base());

        ns.Destination.SpaceRequired(function() {return prod.Size();});

        ns.Destination.OnChange = function(val)
        {
            if(arguments.length)
                prod.InstallDir.Base(val);

            ns.Destination.SetInfo(ns.Destination.GetDestinationInfoMessage());
        }

        ns.Destination.Refresh = function()
        {
            ns.Destination.Set(prod.InstallDir.Base());
            ns.Destination.SetInfo(ns.Destination.GetDestinationInfoMessage());
        }

        var cb_i = ns.Destination.CB_Initialize.GetRaw();
        ns.Destination.CB_Initialize(function(ret)
        {
            if(!ns_inst.Installer.DownloadOnly() && prod.InstallDir.Locked())
            {
                ns.Destination.Disable();
            }
            else
            {
                ns.Destination.Enable();
            }
            if (cb_i)
                cb_i(ret);
        });

        //###############################################################
        //  component selection dlg adjustment
        //###############################################################

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

        var download_required_space_32 = function()
        {
            var size = 0;

            if(ns.Features.Checked32())
            {
                filter_components_by_target_architecture("ia32", function(cmp)
                {
                    if( cmp.Action() == cmp.action_t.install && !cmp_is_common(cmp))
                        size += download_cmp_size(cmp);
                });
            }

            if (size)
                size += download_additional_size();

            return size;
        }

        var download_required_space_64 = function()
        {
            var size = 0;
            if(ns.Features.Checked64())
            {
                filter_components_by_target_architecture("intel64", function(cmp)
                {
                    if( cmp.Action() == cmp.action_t.install && !cmp_is_common(cmp))
                        size += download_cmp_size(cmp);
                });
            }

            if (size)
                size += download_additional_size();

            return size;
        }

        var install_required_space = function()
        {
            return prod.Size();
        }

        var install_required_space_32 = function()
        {
            var size = 0;

            if(ns.Features.Checked32())
            {
                filter_components_by_target_architecture("ia32", function(cmp)
                {
                    if( cmp.State() == cmp.state_t.absent &&
                        cmp.Action() == cmp.action_t.install && !cmp_is_common(cmp))
                        size += cmp.Size();
                });
            }

            return size;
        }

        var install_required_space_64 = function()
        {
            var size = 0;
            if(ns.Features.Checked64())
            {
                filter_components_by_target_architecture("intel64", function(cmp)
                {
                    if( cmp.State() == cmp.state_t.absent &&
                        cmp.Action() == cmp.action_t.install && !cmp_is_common(cmp))
                        size += cmp.Size();
                });
            }

            return size;
        }

        var required_space = function()
        {
            return ns_inst.Installer.DownloadOnly() ? download_required_space() : install_required_space();
        }

        var required_space_32 = function()
        {
            return ns_inst.Installer.DownloadOnly() ? download_required_space_32() : install_required_space_32();
        }

        var required_space_64 = function()
        {
            return ns_inst.Installer.DownloadOnly() ? download_required_space_64() : install_required_space_64();
        }

        var free_space_target_path = function()
        {
            return FileSystem.FreeSpace(ns_inst.Installer.DownloadOnly() ? ns_inst.Installer.DownloadDir() : prod.InstallDir.Base());
        }

        var cmp_is_targeted_for = function(cmp, required_arch)
        {
            var target_platform = cmp.Info().Property("target_platform");

            Log(cmp.Name() + " target_acrh = " + target_platform);
            if(!target_platform)
                return true;

            var rgxp_source = ";" + target_platform + ";";
            var rgxp_match = required_arch == "ia32" ? /;ia32;/ : /;intel64;/;
            if(rgxp_source.match(rgxp_match))
                return true;

            Log(cmp.Name() + " isn't targeted for arch " + required_arch);
            return false;
        }

        var cmp_is_common = function(cmp)
        {
            if(cmp_is_targeted_for(cmp, "ia32") && cmp_is_targeted_for(cmp, "intel64"))
               return true;

            return false;
        }

        var processSelection = function(arch_id, selected)
        {
            Log("Selected processing " + arch_id + " selected = " + selected);
            if (arch_id == 32)
                ns.Features.PUnselect32(!selected);
            else
                ns.Features.PUnselect64(!selected);
            Log("Selected processing completed");
        };

        var nothing_selected = function()
        {
            var comps = prod.ComponentsFullSet();
            for(var i in comps)
            {
                if(prod.InstallMode() == prod.install_mode_t.install && comps[i].Action() == comps[i].action_t.install)
                {
                    Log("Action detected in install mode..." + comps[i].Name() + " : " + comps[i].Action() + " : " + comps[i].State());
                    return false;
                }
                if(prod.InstallMode() != prod.install_mode_t.install && comps[i].Action() != comps[i].action_t.none)
                {
                    Log("Action detected (not install mode) ..." + comps[i].Name() + " : " + comps[i].Action() + " : " + comps[i].State());
                    return false;
                }
            }
            Log("nothing selected");
            return true;
        }

        var filter_components_by_target_architecture = function(arch, cb)
        {
            if(!cb || !arch)
            {
               Log("filter_components_by_target_architecture: callback or arch is undefined. Ignore");
               return;
            }

            prod.FilterComponentsRecursive(function(cmp)
            {
                if(cmp_is_targeted_for(cmp, arch))
                   if(cb(cmp))
                      return true;
            });
        }

        var target_arch_dlg_required = prod.FilterComponentsRecursive(function(cmp)
        {
            if(!cmp_is_common(cmp))
            {
                Log(Log.l_debug, "target_arch dlg is required");
                return true;
            }

            Log(Log.l_debug, "target_arch dlg is not required");
            return false;
        });

        ns.Features.SpaceRequired(required_space);
        ns.Features.SpaceAvailable(free_space_target_path);
        ns.Features.SpaceRequired32(required_space_32);
        ns.Features.SpaceRequired64(required_space_64);
        ns.Features.PUnselect32 = P(false);
        ns.Features.PUnselect64 = P(false);

        var PUnselect32 = function()
        {
            var c = ns_prop.CollectorByAnd();
            c(ns.Features.PUnselect32);
            c(true);
            return c;
        }

        var PUnselect64 = function()
        {
            var c = ns_prop.CollectorByAnd();
            c(ns.Features.PUnselect64);
            c(true);
            return c;
        }

        var PUnselectBoth = function()
        {
            var c = ns_prop.CollectorByAnd();
            c(ns.Features.PUnselect32);
            c(ns.Features.PUnselect64);
            c(true);
            return c;
        }

        prod.FilterComponentsRecursive(function (cmp)
        {
            if(cmp.Info().Property("target_platform") == "ia32")
            {
                var dis_32 = PUnselect32();
                dis_32.Attributes.Value("Type", cmp.disabled_type_t.target_arch);
                dis_32.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.target_arch]);
                cmp.Disabled(dis_32);
            }
            else if(cmp.Info().Property("target_platform") == "intel64")
            {
                var dis_64 = PUnselect64();
                dis_64.Attributes.Value("Type", cmp.disabled_type_t.target_arch);
                dis_64.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.target_arch]);
                cmp.Disabled(dis_64);
            }
            else
            {
                var dis_both = PUnselectBoth();
                dis_both.Attributes.Value("Type", cmp.disabled_type_t.target_arch);
                dis_both.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.target_arch]);
                cmp.Disabled(dis_both);
            }
        });
        ns.Features.OnSelected(function(){});
        ns.Features.Select32(true);
        ns.Features.Select64(true);
        ns.Features.OnSelected(processSelection);

        ns.Features.AllowContinue(function()
        {
            //if(ns_inst.Installer.DownloadOnly())
            {
                if(nothing_selected())
                    return false;
                return true;
            }

            /*if(!nothing_selected())
                return true;

            return false;*/
        });

        if(target_arch_dlg_required)
        {
            ns.Features.Disabled3264 = PCollector();

            ns.Features.Disabled3264.ValueEvaluator = function()
            {
                var res = null;
                iterate(ns.Features.Disabled3264.Items(), function(e)
                {
                    if(res === null)
                       res = e();

                    res = res && e();
                });

                return res ? true : false;
            }
        }

        //###############################################################

        var cmp_available_to_download = function()
        {
            if(ns_inst.Installer.OnlineInstaller())
            {
                return prod.FilterComponentsRecursive(function(cmp)
                {
                    if(typeof(cmp.Source) != "function" || !cmp.Source())
                    {
                        return false;
                    }

                    if(!cmp.Source().Resolved())
                    {
                        return true;
                    }
                });
            }
            return false;
        }

        //###############################################################
        // PreRequisites adjustment
        //###############################################################

        var prerequisite_checkers = [];

        var load_prerequisites = function(dir)
        {
            var prereq_dir = dir ? dir : FileSystem.MakePath("/PreRequisites", Origin.Directory() + "/..");
            var load_prerequisite_checker = function(name) {return required(FileSystem.MakePath(name, prereq_dir));}

            Log("Loading prerequisites scripts, using directory: " + prereq_dir);

            Log("Loading prerequisites scripts begin");

            var files = FileSystem.FindFiles(prereq_dir, "*.js");

            for(var i in files)
            {
                var f = files[i];
                Log("Product prerequisite script: " + f);

                var checker = load_prerequisite_checker(f);
                if(checker)
                {
                    var id = checker.Id ? checker.Id() : Guid();
                    if(!prerequisite_checkers[id])
                    {
                        prerequisite_checkers[id] = checker;
                        Log("Added prerequisite checker: " + id);
                    }
                }
                else
                {
                    Log("Can't get checker from " + f);
                }
            }

            Log("Loading prerequisites scripts, from directory: " + prereq_dir + " DONE");
        }

        var call_prerequisite_checker = function(attribute, proc)
        {
            for(var i in prerequisite_checkers)
            {
                if(prerequisite_checkers[i] && prerequisite_checkers[i][attribute])
                    proc(prerequisite_checkers[i][attribute]);
            }
        }

        var collect_prerequisites = function(collector, stage)
        {
            if(!collector)
                return;
            
            if(stage)
            {
                Log("Collecting prerequisites. Stage = " + stage);
                //Dividing prerequisites by the stage
                var func = null;
                var call_check = false;
                switch(stage)
                {
                    case "First" :
                        func = "CheckStage_First";
                        call_check = true;
                        break;
                    case "Second" :
                        func = "CheckStage_Second";
                        call_check = true;
                        break;
                    case "Third" :
                        func = "CheckStage_Third";
                        call_check = false;
                        break;                        
                    default:
                        break;
                }
                if(func)
                   call_prerequisite_checker(func, function(cb){cb.call(null, collector, prod)});
                //Old style prerequisites work in first 2 stages
                if(call_check)
                   call_prerequisite_checker("Check", function(cb){cb.call(null, collector, prod)});
               Log("Collecting prerequisites finished. Stage = " + stage);
            }
            else
            {
               Log("Collecting all prerequisites. Stage is not set");
               //perform all CheckStage functions
               //useful for silent mode
               call_prerequisite_checker("CheckStage_First", function(cb){cb.call(null, collector, prod)});
               call_prerequisite_checker("CheckStage_Second", function(cb){cb.call(null, collector, prod)});
               call_prerequisite_checker("CheckStage_Third", function(cb){cb.call(null, collector, prod)});
               call_prerequisite_checker("Check", function(cb){cb.call(null, collector, prod)});
               Log("Collecting prerequisites finished. Stage is not set");
            }
        }

        load_prerequisites();
        
        //####################################################################

        ns.FillPrerequisites.Callback(function(stage){collect_prerequisites(ns.FillPrerequisites, stage)});
        
        //####################################################################

        var license_prerequisite = {};
        license_prerequisite.Id = function () {return "License prerequisites"; }
        var absent_license_prerequisite_modfiy_mode_was_shown = false;
        license_prerequisite.CheckStage_Third = function (collector, product)
        {
            // if no ActivationManager the no need to check this pre-requisite
            if(!ns.ActivationManager)
                return;

            Log(license_prerequisite.Id() + " generation begin");

            if (!collector) {
                Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
                return;
            }

            var im = product.InstallMode();
            var allow_activation_in_modify = ns_pb.ParseBoolean(prod.Info().Property("allow_activation_in_modify"));
            var ret;
            if(im == product.install_mode_t.modify && allow_activation_in_modify)
            {
                ret = ns.ActivationManager.last_check_result();

                if((!ret || !ret.exit_code) && absent_license_prerequisite_modfiy_mode_was_shown)
                {
                    ret = ns.ActivationManager.check_valid_license_exists();
                }

                if(!ret.exit_code)
                {
                    collector.CriticalExt(StringList.Format("[no_valid_license_found]"), StringList.Format("[IDS_MODIFY_NOLICENSE]"));
                }
            }
            else if (im == product.install_mode_t.repair)
            {
                ret = ns.ActivationManager.last_check_result();

                if((!ret || !ret.exit_code) && absent_license_prerequisite_modfiy_mode_was_shown)
                {
                    ret = ns.ActivationManager.check_valid_license_exists();
                }

                if(!ret.exit_code)
                {
                   collector.CriticalExt(StringList.Format("[no_valid_license_found]"), StringList.Format("[IDS_REPAIR_NOLICENSE]"));
                }
            }

            absent_license_prerequisite_modfiy_mode_was_shown = true;

            Log(license_prerequisite.Id() + " generated successfully");
            return;
        }
        
        prerequisite_checkers[license_prerequisite.Id()] = license_prerequisite;
        
        var logdir_prerequisite = {};
        logdir_prerequisite.Id = function () {return "Log directory prerequisites";}
        logdir_prerequisite.Check = function (collector, product)
        {
            Log(logdir_prerequisite.Id() + " generation begin");
            // Check if log dir is writable
            var logdir = Log.GetLogDir();
            if (!FileSystem.IsWritable(logdir))
            {
                collector.FatalExt(StringList.Format("[log_not_writable_title]"), StringList.Format("[log_not_writable_message]"));
            }
            Log(logdir_prerequisite.Id() + " generated successfully");
            return;
        }

        prerequisite_checkers[logdir_prerequisite.Id()] = logdir_prerequisite;

        //####################################################################
        //First stage prerequisites
        ns.FirstStagePrerequisites = function()
        {
            ns.FillPrerequisites.Stage("First");
            return ns.FillPrerequisites();
        }
        ns.FirstStagePrerequisites.Skip = ns.FillPrerequisites.Skip;
        
        //####################################################################
        //Second stage prerequisites
        ns.SecondStagePrerequisites = function()
        {
            Wizard.BusyStart();
            ns.FillPrerequisites.Stage("Second");
            var ret = ns.FillPrerequisites();
            Wizard.BusyStop();
            return ret;
        }
        ns.SecondStagePrerequisites.Skip = ns.FillPrerequisites.Skip;
        
        //####################################################################
        //Third stage prerequisites
        ns.ThirdStagePrerequisites = function()
        {
            ns.FillPrerequisites.Stage("Third");
            return ns.FillPrerequisites();
        }
        ns.ThirdStagePrerequisites.Skip = ns.FillPrerequisites.Skip;
        
        //###############################################################
        // PreRequisites adjustment Done
        //###############################################################

        //###############################################################
        // ISM Registration configuration
        //###############################################################

        var ism_registrations_list = {};
        var reg_it = "register";
        var unreg_it = "unregister";

        var add_ism_info = function(obj)
        {
            //Log("add_ism_info looking for object " + obj.Name());
            var info = obj.CustomObjects().Item("ISM");

            if(!info)
            {
                //Log("add_ism_info info not defined");
                return;
            }

            Log("add_ism_info for object " + obj.Name());

            var act = null;

            if(obj.Type().match(/component/i))
            {
                Log("add_ism_info it is component");
                if(obj.HasClients())
                {
                    Log("add_ism_info it is component, it has clients = true");
                    if(obj.State() != obj.state_t.installed)
                    {
                        act = reg_it; // it means that it is going to be installed;
                        Log("add_ism_info it is component, register = true");
                    }
                }
                else
                {
                    Log("add_ism_info it is component, register = false");
                    act = unreg_it; // no clients -> going to be removed
                }
            }
            else if(obj.Type().match(/product/i))
            {
                Log("add_ism_info it is product");
                var obj_act = obj.Action();
                if(obj_act == obj.action_t.remove)
                {
                    Log("add_ism_info register = false");
                    act = unreg_it;
                }
                else if(obj_act != obj.action_t.remove && obj.ProductState && obj.ProductState() != obj.state_t.installed)
                {
                    Log("add_ism_info register = true");
                    act = reg_it;
                }
            }
            else
                return;

            if(!act)
                return;

            info.action = act;
            ism_registrations_list[obj.Id()] = info;
        }

        var process_ism_records = function(list, required_action)
        {
            Log("ISM records processing start, ");
            var ism_obj = null;

            if(Ism2.Init())
            {
                Log("ISM2 interafce will be used");
                ism_obj = Ism2;
            }
            else if(Ism.Init())
            {
                Log("ISM interafce will be used");
                ism_obj = Ism;
            }

            if(!ism_obj)
            {
                Log("ISM object isn't defined");
                return;
            }

            var dump_to_log = function(obj, prefix)
            {
                for(var i in obj)
                    Log((prefix ? prefix : "") + i + " = " + obj[i]);
            }

            for(var i in list)
            {
                var info = ism_registrations_list[i];

                if(info.action != required_action)
                    continue;
                
                var record;
                var res;

                if(ism_obj == Ism2)
                {
                    if(!info.RecordID || !info.UpdateID)
                    {
                        Log("ism RecordID or UpdateID (RecordID = " + info.RecordID + ", UpdateID = " + info.UpdateID + ") is undefined -> can't generate record. Ignore");
                        continue;
                    }

                    var record_id = info.RecordID;
                    var update_id = info.UpdateID;

                    record = ism_obj.AccRecord(record_id, info.PerUser ? info.PerUser : 0); //AccRecord(rec_id, per_user)

                    for(var k in info)
                    {
                        if(typeof(info[k]) == "function")
                            continue;

                        record.Set(k, info[k]);
                    }

                    //record.Set("FulfillmentID", ns.ActivationManager ? ns.ActivationManager.Manager.FulfillmentID() : (info.FulfillmentID ? info.FulfillmentID : ""));
                    //record.Set("MediaID", info.MediaID);
                    //record.Set("RecordDemographics", info.RecordDemographics ? info.RecordDemographics : 0 );
                    //record.Set("ProductName", info.ProductName);
                    //record.Set("ProductVersion", info.ProductVersion);
                    //record.Set("ProductID", ns.ActivationManager ? ns.ActivationManager.Manager.ProductID() : (info.ProductID ? info.ProductID : ""));
                    //record.Set("UpdateID", info.UpdateID);
                    //record.Set("PerUser", 0);
                    record.Set("SerialNumber", ns.ActivationManager ? ns.ActivationManager.Manager.SerialNumber() : "");
                    record.Set("ID", record_id);

                    if(info.action == reg_it)
                    {
                        Log("registration of the record");
                        dump_to_log(record, "   ");
                        res = record.Commit(); //Register(record.ID);
                        Log("registration of the record done res = " + res);
                    }
                    else
                    {
                        Log("unregistring ProductID = " + record.Get("ID") + " : " + record.Get("UpdateID"));
                        res = (Ism2 && Ism2.Init(true)) ? Ism2.Unregister(record.Get("ID"), record.Get("UpdateID")) : ((Ism && Ism.Init()) ? ism_obj.Unregister(record.Get("ID")) : false);
                        Log("unregistring ProductID = " + record.Get("ID") + " done res = " + res);
                    }
                }
                else
                {
                    record = ism_obj();

                    record.FulfillmentID = ns.ActivationManager ? ns.ActivationManager.Manager.FulfillmentID() : (info.FulfillmentID ? info.FulfillmentID : "");
                    record.MediaID = info.MediaID;
                    record.RecordDemographics = info.RecordDemographics ? info.RecordDemographics : 0 ;
                    record.ProductName = info.ProductName;
                    record.ProductVersion = info.ProductVersion;
                    record.ProductID = ns.ActivationManager ? ns.ActivationManager.Manager.ProductID() : (info.ProductID ? info.ProductID : "");
                    record.UpdateID = info.UpdateID;
                    record.PerUser  = 0;
                    record.SN       = ns.ActivationManager ? ns.ActivationManager.Manager.SerialNumber() : "";
                    record.ID       = info.RecordID;

                    if(info.action == reg_it)
                    {
                        Log("registration of the record");
                        dump_to_log(record, "   ");
                        res = record.Register(record.ID);
                        Log("registration of the record done res = " + res);
                    }
                    else
                    {
                        Log("unregistring ProductID = " + record.ID + " : " + record.UpdateID);
                        res = (Ism2 && Ism2.Init(true)) ? Ism2.Unregister(record.ID, record.UpdateID) : ((Ism && Ism.Init()) ? ism_obj.Unregister(record.ID) : false);
                        Log("unregistring ProductID = " + record.ID + " done res = " + res);
                    }
                }
            }
            Log("ISM registration processing done");
        }

        //###############################################################
        // action for registering products and components in ISM db
        // this action should be performed before install to have actual states and actions for components and products
        //###############################################################
        ns.CollectISMReg = function()
        {
            Log("ISMReg collect ism info");
            iterate(ns_inst.Installer.Products, add_ism_info);
            iterate(ns_inst.Installer.Components, add_ism_info);
            Log("ISMReg collect ism done");
            return Action.r_ok;
        }

        //ns.ConfigureOptions.Add(ns.CollectISMReg);
        ns.ISMReg = function()
        {
            process_ism_records(ism_registrations_list, reg_it);
            return Action.r_ok;
        }

        ns.ISMUnreg = function()
        {
            process_ism_records(ism_registrations_list, unreg_it);
            return Action.r_ok;
        }

        //###############################################################
        // Install statistics
        //###############################################################
        ns.StaticStat = function()
        {
            var filter = function(coll, cb)
            {
                for(var i in coll)
                if(cb(coll[i], i))
                    return true;
                return false;
            };

            var wmif = function(o)
            {
                if(o && typeof(o) == 'object')
                {
                    var r = {};
                    filter(o, function(v, n)
                    {
                        if(!n.match(/^__/))
                        {
                            r[n] = v;
                        }

                    });
                    return r;
                }
                else
                    return o;
            };

            var get_msvs = function()
            {
                //Collecting installed Visual Studio
                var vs_list = [];
                for(var vs_id in ns_vs)
                {
                    var vs = ns_vs[vs_id];
                    if(vs.devenv)
                    {
                        Log(vs.name + " is installed.");
                        vs_list.push(vs_id.match(/\d+$/i)[0]);
                    }
                }
                return vs_list;
            }

            var os = wmif((WMI.Query("select Caption, OSArchitecture, OSType, Version from Win32_OperatingSystem") || [null])[0]); //from INDE
            var platform = "Windows";
            var platform_details = os ? os.Caption.trim() + " " + os.Version.trim() : "";
            
            var cpu = wmif((WMI.Query("select Caption, Name from Win32_Processor") || [null])[0]); //from ENDE
        
            var mac = typeof(System) == "undefined" ? "" : System.MACaddressCheckSum();

        
            stat_pick.Property("cpu", cpu);
            stat_pick.Property("mac", mac);
            stat_pick.Property("msvs", get_msvs());
            //
            stat_pick.Property("platform_details", platform_details);
            //stat_pick.Property("os_arch", os_arch);
            stat_pick.Property("platform", platform);
            stat_pick.Property("gui_eula_accepted", false);
            stat_pick.Property("silent_eula_accepted", (GetOpt.Get("eula") == "accept" || GetOpt.Get("acceptlicense") == "yes"));
            stat_pick.Property("installed_products", HomePhoneStatistics ? HomePhoneStatistics.InstalledProducts() : "");

            return Action.r_ok;
        }
        //###############################################################

        var FinalStat = function()
        {
            var prod_name = "[Windows] " +fm(prod.Name());
            var license_type = ns.ActivationManager ? ns.ActivationManager.Manager.LicenseType() : "";  // Single or Floating
            var activation_type_t = { support_type_unknown : "unknown", support_type_eval : "eval" , support_type_noneval : "noneval"}; //changed from digits
            var manager_activation_type = !ns.ActivationManager ? null : ns.ActivationManager.Manager.ActivationType();
            var license_support_type = !ns.ActivationManager ? activation_type_t.support_type_unknown
            : ((ns.ActivationManager.Manager.activation_type_t.trial == manager_activation_type) ? activation_type_t.support_type_eval
            : activation_type_t.support_type_noneval);
            var activation_type = !ns.ActivationManager ? ""
                : !ns_inst.Installer.Silent() ?  ns.ActivationManager.gui_activation_type()
                :  ns.ActivationManager.silent_activation_type();

            var license_support_code = ns.ActivationManager ? ns.ActivationManager.Manager.SupportCode() : ""; // COM, NCOM, ACAD etc.
            var fulfillment = !ns.ActivationManager ? "" : ns.ActivationManager.Manager.FulfillmentID();
            var act_ret = !ns.ActivationManager ? null : ns.ActivationManager.last_check_result();
            var activation_retcode = !act_ret ? "NA"
                : act_ret.exit_code ? "success"
                : manager_activation_type ? "fail"
                : "NA";
            var media_mode_type_t = { offline_mode_type : "offline", online_mode_type : "online"}; //changed from digits
            var media_mode =  !ns_inst.Installer.OnlineInstaller() ? media_mode_type_t.offline_mode_type : media_mode_type_t.online_mode_type;
            var ui_type_t = { ui_gui_type : "gui", ui_command_line_type : "command_line" , ui_silent_type : "silent"};
            var ui_mode = ns_inst.Installer.Silent() ? ui_type_t.ui_silent_type : ui_type_t.ui_gui_type;
            var s_number = ns.ActivationManager && manager_activation_type == ns.ActivationManager.Manager.activation_type_t.serial_number ? ns.ActivationManager.Manager.TriedSerialNumber() : ""; //SN
            var serial_number = s_number == "" ? "none" : s_number;
            var media_id = ns.ActivationManager ? ns.ActivationManager.Manager.MediaID() : "";
            //retrieved serial number
            var retrieved_sn = ns.ActivationManager ? ns.ActivationManager.Manager.LastResult.serial_number : "";
            var product_tag = retrieved_sn ? retrieved_sn.substring(1, 4) : ""; //product tag (second, third and fourth digits)

            var eula_accepted =
            prod.InstallMode() != prod.install_mode_t.install ? true
            : ns_inst.Installer.Silent() ? stat_pick.Property("silent_eula_accepted")
            : stat_pick.Property("gui_eula_accepted");

            var internal_complete_fail = stat_pick.Property("complete_fail");
            var complete_code = stat_pick.Property("CompleteCode");

            var install_status = complete_code == "fail"? "fail"
                : complete_code == "cancel"? "cancel"
                : internal_complete_fail && complete_code == "success"? "complete_fail"
                : complete_code == "success"? "success"
                : Wizard.Aborted()? "fail"
                : Wizard.Canceled()? "cancel"
                : internal_complete_fail? "complete_fail"
                : "success";

            /*
            NA – not applicable for the product or cancelled before actual integration happened;
            NO_INTEGRATE - user decided to not integrate to Eclipse;
            INTEGRATE_TO_EXISTING – user decided to integrate to existing Eclipse
            INSTALL_AND_INTEGRATE – user decided to install Eclipse and integrate to it
            */

            var ei = prod.CustomObjects().Item("EclipseIntegration");
            var eclipse_integration = !ei ? "NA"
                : ei.pass == 0 && !ns_inst.Installer.Silent() ? "NA"
                : ei.integrate == 0 ? "NO_INTEGRATE"
                : ei.install == 0 ? "INTEGRATE_TO_EXISTING"
                : "INSTALL_AND_INTEGRATE";

            var mode = ns_inst.Installer.DownloadOnly() ? "Download" : prod.InstallMode();
            var locale = StringList.Locale();
            var node_id = "none";

            //put static statistic into stat_support
            stat_pick.Property("fulfillment", fulfillment);       //:text
            stat_pick.Property("install_status", install_status);   //:text
            stat_pick.Property("product_name", prod_name);        //:text
            stat_pick.Property("lic_type", license_type);       //:text
            stat_pick.Property("support_type", license_support_type); //:text
            stat_pick.Property("support_code", license_support_code); //:text
            stat_pick.Property("activation_type", activation_type);        //:text
            stat_pick.Property("activation_retcode", activation_retcode);        //:text – latest available (actual return code from chklic)
            stat_pick.Property("online_flag", media_mode);        //:(online or offline)
            stat_pick.Property("ui_mode", ui_mode);           //:(silent or gui)
            stat_pick.Property("mode", mode);
            stat_pick.Property("sn", serial_number);          //:text (text “none” by default)
            stat_pick.Property("media_id", media_id);         //:text
            stat_pick.Property("locale", locale);           //:text
            stat_pick.Property("node_id", node_id);           //:text
            stat_pick.Property("eula_accepted", eula_accepted);           //:text
            stat_pick.Property("eclipse_integration", eclipse_integration);    //:text
            stat_pick.Property("product_tag", product_tag);
            stat_pick.rem_install_time();
            stat_pick.rem_download_time();
            //
            stat_pick.Property("product_id", prod_name);
            Log("final statistic info");
        }
        //###############################################################
        stat_pick.SubscribeBeforeSend(FinalStat);

        //Subscribe components
        var ns_stat_dmp = base("dumper.js");

        var CreateDumper = function(dumper)
        {
            if(!dumper)
                return new ns_stat_dmp.Dumper();
            return dumper;
        }
        var filter = function(coll, cb)
        {
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
        };

        filter(prod.ComponentsFullSet(), function(cmp)
        {
            if (typeof(cmp.StatManager) != "function" || !cmp.StatManager())
            return;
            if(typeof(cmp.Source) != "function" || !cmp.Source())
            {
            cmp.StatManager().Property("filename", "");
            }
            else
            {
                cmp.Source().Filter(function(source)
                {
                if (source.File && source.File())
                {
                    var rgxp_match;
                    if (cmp.Info().Property("type") == "msi")
                    rgxp_match = /.msi$/i;
                    else if (cmp.Info().Property("type") == "exe")
                    rgxp_match = /.exe$/i;
                    else if (cmp.Info().Property("type") == "zip")
                    rgxp_match = /.zip$/i;
                    else if (cmp.Info().Property("type") == "cer")
                    rgxp_match = /.cer$/i;
                    if (source.File().match(rgxp_match))
                    {
                    cmp.StatManager().Property("filename", FileSystem.FileName(source.File()));
                    return true;
                    }
                }
                });
            }

            var group = "";
            var parent_feature = cmp.Parent();
            while (parent_feature)
            {
                group = parent_feature.Name() + (group == ""? "" : "|" + group);
                parent_feature = parent_feature.Parent();
            }

            if (group == "")
            group = prod.Name();

            cmp.StatManager().Property("group", group);

            cmp.Configurator().Apply.DoResolveSrc.SubscribeOnBegin(function(dmp)
            {
                var stat_action = CreateDumper();
                stat_action.Group("Download");
                stat_action.hidden = true;

                stat_action.AddAction({Apply : function()
                {
                    Log("launch download timer for cmp " + cmp.Name());
                    cmp.StatManager().StartProcessing();
                    cmp.StatManager().DownloadStage.start();
                    cmp.StatManager().Property("status", "processing");
                    cmp.StatManager().Property("state", "download");
                    return Action.r_ok;
                }},"apply download start cmp.id = " + cmp.Id());

                dmp.AddAction(stat_action, "Start download timer for cmp " + cmp.Name());
                return true;
            });

            cmp.Configurator().Apply.DoResolveSrc.SubscribeOnEnd(function(dmp)
            {
                var stat_action = CreateDumper();
                stat_action.Group("Download");
                stat_action.hidden = true;

                stat_action.AddAction({Apply : function()
                {
                    Log("stop download timer for cmp " + cmp.Name());
                    cmp.StatManager().DownloadStage.stop();
                    //DoResolveSrc can be called within DoInstall, so..
                    cmp.StatManager().InstallStage.start();
                    cmp.StatManager().Property("status", "processing");
                    cmp.StatManager().Property("state", "install");
                    return Action.r_ok;
                }},"apply download stop cmp.id = " + cmp.Id());

                dmp.AddAction(stat_action, "Finish download timer for cmp " + cmp.Name());
                return true;
            });

            cmp.Configurator().Apply.DoInstall.SubscribeOnBegin(function(dmp)
            {
            var stat_action = CreateDumper();
            stat_action.hidden = true;

            stat_action.AddAction({Apply : function()
                {
                    Log(Log.l_debug, "launch install timer for cmp " + cmp.Name());
                    //if DoResolveSrc is not called
                    cmp.StatManager().StartProcessing();
                    cmp.StatManager().InstallStage.start();
                    cmp.StatManager().Property("status", "processing");
                    cmp.StatManager().Property("state", "install");
                    return Action.r_ok;
                }},"apply install start cmp.id = " + cmp.Id());

            dmp.AddAction(stat_action, "Start install timer for cmp " + cmp.Name());
            return true;
            });

            cmp.Configurator().Apply.DoInstall.SubscribeOnEnd(function(dmp)
            {
                var stat_action = CreateDumper();
                stat_action.hidden = true;

                stat_action.AddAction({Apply : function()
                {
                    Log(Log.l_debug, "stop install timer for cmp " + cmp.Name());
                    cmp.StatManager().InstallStage.stop();
                    cmp.StatManager().Property("status", "success");
                    return Action.r_ok;
                }}, "apply install stop cmp.id = " + cmp.Id());

                dmp.AddAction(stat_action, "Finish install timer for cmp " + cmp.Name());

                return true;
            });
        });

        // ########################################################################
        // ISM opt-in dlg adjustment
        // ########################################################################
        ns.ISMOptIn = ns.ISIPDialog.OptIn_Widget;
        ns.ISMOptIn.CB_Skip(function()
        {
            var disable_optin_dlg = ns_pb.ParseBoolean(prod.Info().Property("disable_optin_dlg"));
            return prod.InstallMode() != prod.install_mode_t.install ||
                   disable_optin_dlg == true;
        });
        // Storing into “%LOCALAPPDATA%\Intel Corporation\isip”
        var OptInToLocalData = function(val)
        {
            var isip_dir = FileSystem.MakePath("Intel Corporation", StringList.Format("[$LOCALAPPDATA]"));
            var isip_file = FileSystem.MakePath("isip", isip_dir);
            if (!FileSystem.Exists(isip_dir))
                FileSystem.CreateDirectory(isip_dir);
            
            Log("ISIP file = " + isip_file);
            FileSystem.WriteFileUTF8(isip_file, val ? "1" : "0");
        }
        
        // Default action for storing opt-in value
        var OptInValueSaver = function()
        {
            var disable_optin_dlg = ns_pb.ParseBoolean(prod.Info().Property("disable_optin_dlg"));
            var default_optin_value = ns_pb.ParseBoolean(prod.Info().Property("default_optin_value"));
            if(disable_optin_dlg == true && typeof default_optin_value != 'undefined')
            {
                Log("Use default opt-in value: " + default_optin_value);
                //since phonehome is no longer used, storing additionally in a new place
                OptInToLocalData(default_optin_value);
                                
                if(Ism.OptInAvailable())
                {
                    Ism.OptInSetAccepted(default_optin_value);
                }
            }
            return Action.r_ok;
        }
        ns.StoreISMValue = function() {return OptInValueSaver();}
        
        stat_pick.Property("isip_done", false);
        stat_pick.Property("disable_optin_dlg", ns_pb.ParseBoolean(prod.Info().Property("disable_optin_dlg")));
        
        ns.SetIsmWriter = function(val)
        {
            Log("ISM opt-in writer: value will be stored: " + val);
            OptInValueSaver = function()
            {
                Log("Saving opt-in value: " + val);
                OptInToLocalData(val);
                if(Ism.OptInAvailable())
                    Ism.OptInSetAccepted(val);
                else
                    Log("OptIn is not available");

                return Action.r_ok;
            }
            stat_pick.Property("isip_done", true);
            stat_pick.Property("isip_accepted", val);
        }

        ns.ISMOptIn.OnClick(ns.SetIsmWriter);

        ns.SStoreISMValue = function()
        {
            var cmd_line_send_data = GetOpt.Get("intel_sw_improvement_program_consent");
            if(cmd_line_send_data && cmd_line_send_data == "yes" || cmd_line_send_data == "no")
            {
                ns.SetIsmWriter(cmd_line_send_data == "yes");
            }
            else
            {
                Log("Wrong value for 'intel_sw_improvement_program_consent' command line option: " + cmd_line_send_data);
                var default_optin_value = ns_pb.ParseBoolean(prod.Info().Property("default_optin_value"));
                if(typeof default_optin_value != 'undefined')
                {
                    Log("Use default opt-in value: " + default_optin_value);
                    ns.SetIsmWriter(default_optin_value);
                }
           }
            return Action.r_ok;
        }

        // ########################################################################
        // Installation
        // ########################################################################
        ns.Install = function()
        {
            //let cancel dialog know that install happened
            Wizard.Notify("canceled", "set install", true);
            return ns.Installer().Execute();
        }

        //########################################################################
        //# Upgrade/SXS dlg
        //########################################################################

        var product_requires_sxs_support = function(product)
        {
            var ss_upgrade_code = product.Info().Property("solution_suite_upgrade_code");
            var upgrade_location_key = product.Info().Property("solution_suite_upgrade_location");
            var sxs_installdir_own = product.Info().Property("sxs_installdir_own");

            Log("product_requires_sxs_support");
            if(!IsNull(ss_upgrade_code) && (IsNull(upgrade_location_key) || IsNull(sxs_installdir_own)))
            {
                Log(Log.l_warning, "Not all required properties are defined for sxs installation support for product " + product.Id() + " :");
                Log("ss_upgrade_code =" + ss_upgrade_code + " upgrade_location_key = " + upgrade_location_key + " sxs_installdir_own = " + sxs_installdir_own);
                return false;
            }
            if(!product.UpgradeDirLocker)
            {
                Log("create UpgradedirLocker");
                product.UpgradeDirLocker = P(false, {"Type" : (product.locked_type_t ? product.locked_type_t.upgrade_mode : 70), "Description" : (product.locked_type_description_t ? product.locked_type_description_t[product.locked_type_t.upgrade_mode] : "") });
                /*
                product.UpgradeDirLocker = P(false);
                product.UpgradeDirLocker.Attributes.Value("Type", product.locked_type_t.upgrade_mode);
                product.UpgradeDirLocker.Attributes.Value("Description", product.locked_type_description_t[product.locked_type_t.upgrade_mode]);

                Log(" product.UpgradeDirLocker type = " + product.UpgradeDirLocker.Attributes.Value("Type"));
                Log(" product.UpgradeDirLocker descr = " + product.UpgradeDirLocker.Attributes.Value("Description"));
                Log(" upgrade_mode = " + product.locked_type_t.upgrade_mode);
                Log(" upgrade_mode descr = " + product.locked_type_description_t[product.locked_type_t.upgrade_mode]);
                */
                product.InstallDir.Lock(product.UpgradeDirLocker);
            }

            if(!IsNull(ss_upgrade_code) && product.ProductState() == product.state_t.absent && (product.Action() == product.action_t.install || product.Action() == product.action_t.mix))
            {
               var clients = WI.ClientsInstalledComponent(ss_upgrade_code)

               Log("Check if instances to upgrade exist for product " + product.Id());

               if(!clients || !clients.length || !iterate(clients, function(cl)
                   {
                       // if the client isn't present in current prod  then  it is instance to upgrade
                       if(!ComponentById(product, cl.Id))
                        return true;
                   })
                 )
               {
                   Log("instances NOT found");
                   return false;
               }
               else
               {
                   Log("instances found: " + clients.length);
                   return true;
               }
            }

            return false;
        }

        var get_products_with_sxs_support = function(product, _list)
        {
            var list = _list ? _list : [];

            Log("get_products_with_sxs_support");
            if(product_requires_sxs_support(product))
                list.push(product);

            product.FilterFeaturesRecursive(function(ftr)
            {
                if(ftr.Type() == "product")
                    get_products_with_sxs_support(ftr, list);
            });

            return list;
        }

        var products_sxs_support_list = [];

        var instances_to_upgrade_exists = function()
        {
            products_sxs_support_list = get_products_with_sxs_support(prod);

            if(products_sxs_support_list && products_sxs_support_list.length > 0)
                return true;

            return false;
        }

        var apply_sxs = function(product)
        {
            Log("Apply SXS mode for product " + product.Id());
            var sxs_installdir_own = product.Info().Property("sxs_installdir_own");
            Log("SXS install location = " + sxs_installdir_own);

            if(IsNull(sxs_installdir_own))
            {
                Log("sxs installdir_own isn't defined!");
                return;
            }

            //product.InstallDir.Lock(false);
            product.UpgradeDirLocker(false);
            //previous_base_installdir is defined before in apply_upgrade InstallDir.Base will be set with required upgrade location
            if(product.InstallDir.previous_base_installdir)
                product.InstallDir.Base(product.InstallDir.previous_base_installdir);
            product.InstallDir.Own(sxs_installdir_own);
            product.CheckForUpgrade();

            Log("Apply SXS mode done for product " + product.Id());
        }

        var apply_upgrade = function(product)
        {
            Log("Apply Upgrade mode for product " + product.Id());
            var upgrade_location_key = product.Info().Property("solution_suite_upgrade_location");

            var clients = WI.ClientsInstalledComponent(upgrade_location_key, null, true);

            if(clients && clients.length > 0)
            {
               var installdir_own = product.Info().Property("installdir_own");
               Log("Found clients which have upgrade_location_key = " + upgrade_location_key + " installed");
               Log("Location = " + clients[0].ComponentPath);
               product.InstallDir.previous_base_installdir = product.InstallDir.Base();
               // in bundle product can be installed in upgrade_mode during modify(when all dirs are locked), but bundle originally could be installed into other dir
               // therefore to install this product into its upgrade dir it should be unlocked first
               //product.InstallDir.Lock(false);
               product.UpgradeDirLocker(false);
               product.InstallDir.Base(clients[0].ComponentPath);
               product.InstallDir.Own(installdir_own);
               Log("result installdir = " + product.InstallDir());

               //getting the INTEL_PRODUCT_NAME for Displaying in Message
               var intel_product_name = MSIProperty(clients[0].Id, "INTEL_PRODUCT_NAME");

               if(intel_product_name)
                  product.UpgradeDirLocker.Attributes.Value("Description", fm(product.locked_type_description_t[product.locked_type_t.upgrade_mode], intel_product_name, String(clients[0].ComponentPath).replace(/\\/g, "\\\\")));
               else
                  product.UpgradeDirLocker.Attributes.Value("Description", "");

               product.UpgradeDirLocker(true);
               //product.InstallDir.Lock(true, {"Type" : product.locked_type_t.upgrade_mode, "Description" : product.locked_type_description_t[product.locked_type_t.upgrade_mode]});
               product.CheckForUpgrade();
            }
            else
            {
                Log("There isn't clients which have upgrade_location_key = " + upgrade_location_key + " installed");
            }

            Log("Apply Upgrade mode done for product " + product.Id());
        }

        var install_in_upgrade_prev_value = null;
        var db_install_in_upgrade_val = (IsNull(prod.CustomProperties().Value("install_in_upgrade")) || prod.CustomProperties().Value("install_in_upgrade") == "1") ? true : false;
        var install_in_upgrade = (prod.ProductState() == prod.state_t.absent) ? true : db_install_in_upgrade_val;

        ns.Upgrade.OnChange(function(mode)
        {
            Log("UpgradeSXS mode was changed new = " + mode);
            install_in_upgrade = (mode == "upgrade") ? true : false;

            prod.CustomProperties().Value("install_in_upgrade", install_in_upgrade ? "1" : "0");
        });

        // the SXS dialog is shown only in case there is older version to upgrade and product isn't installed
        ns.Upgrade.Skip = function(){ return (!instances_to_upgrade_exists() || prod.ProductState() == prod.state_t.installed); }

        var apply_upgrade_sxs_required = function()
        {
            // install_in_upgrade_prev_value isn't null means that user already passed through SXS dlg and ns.ApplyUpgradeSXSMode was applied
            // install_in_upgrade_prev_value == install_in_upgrade means that user didn't change the choice from the previous time
            if(install_in_upgrade_prev_value !== null && install_in_upgrade_prev_value == install_in_upgrade)
                return false;

            return true;
        }

        ns.ApplyUpgradeSXSMode = function()
        {
            if(install_in_upgrade_prev_value !== null && install_in_upgrade_prev_value == install_in_upgrade)
            {
                Log("ApplyUpgradeSXSMode: upgrade mode will not be changed due to install_in_upgrade_prev_value equal install_in_upgrade = " + install_in_upgrade);
                return Action.r_ok;
            }

            install_in_upgrade_prev_value = install_in_upgrade;

            if(install_in_upgrade)
                iterate(products_sxs_support_list, function(product){apply_upgrade(product)});
            else
                iterate(products_sxs_support_list, function(product){apply_sxs(product)});

            return Action.r_ok;
        }

        ns.ApplyUpgradeSXSMode.Skip = function(){ return !instances_to_upgrade_exists() || !apply_upgrade_sxs_required(); }
        
        //###############################################################
        

        //###############################################################
        // common location support
        ns.CommonLocation = function()
        {
            var assign_common_location = function(obj)
            {
                if(!obj || !obj.CustomObjects || !obj.CustomObjects().Item("CommonLocations"))
                    return;

                var locations = obj.CustomObjects().Item("CommonLocations");

                for(var i in locations)
                {
                    Log("Looking for common location " + i);
                    var clients = WI.ClientsInstalledComponent(i, null, true);

                    if(clients && clients.length > 0)
                    {
                        Log("Found clients which have commoon_intsall_location_key = " + i + " installed");
                        Log("Location = " + clients[0].ComponentPath);
                        obj.InstallDir.Base(clients[0].ComponentPath);
                        if(locations[i])
                        {
                          Log("It requires locking installdir");

                          var lock_to_common_location = P(true, {"Type" : (obj.locked_type_t ? obj.locked_type_t.same_dir_mode : 90), "Description" : ""});

                          var intel_product_name = MSIProperty(clients[0].Id, "INTEL_PRODUCT_NAME");

                          if(intel_product_name && obj.locked_type_description_t)
                               lock_to_common_location.Attributes.Value("Description",
                                 fm(obj.locked_type_description_t[obj.locked_type_t.same_dir_mode],
                                 intel_product_name,
                                 String(clients[0].ComponentPath).replace(/\\/g, "\\\\")));
                          else
                              lock_to_common_location.Attributes.Value("Description", "");


                          obj.InstallDir.Locked(lock_to_common_location);
                        }

                        Log("Only first found common location can be used. Seek for others will not be done.");
                        return Action.r_ok;
                    }
                }
            }

            prod.FilterComponentsRecursive(function(cmp){assign_common_location(cmp);});
            // last parameter means that last level childs will be processed first
            prod.FilterFeaturesRecursive(function(ftr){assign_common_location(ftr);}, 1);

            assign_common_location(prod);

            return Action.r_ok;
        }

        ns.CommonLocation.Skip = function(){ prod.ProductState() == prod.state_t.installed; }
        //###############################################################
        // Configure WelcomePage launching
        ns.LaunchWelcomePage = function()
        {
            var url = prod.Info().Property("welcome_page");
            if(url)
            {
                StringList.Replace("INSTALLDIR", prod.InstallDir());
                StringList.Replace("BASEINSTALLDIR", prod.InstallDir.Base());
                url = fm(url);
                Execute.URL(url);
            }

            return Action.r_ok;
        }
        //###############################################################
        // action for setting Install/Remove according to some conditions
        ns.FilterComponents = function(cb_cmp_to_install, cb_cmp_to_remove)
        {
            if(!cb_cmp_to_remove && !cb_cmp_to_install)
            {
                Log("action FilterComponents - none cb to_install or cb to_remove is defined. Ignore");
                return;
            }

            var arr_disabled = [];
            var cmp_enabled = false;
            
            //first of all, need to clear the previously set default action 
            prod.FilterComponentsRecursive(function(cmp)
            {
                cmp.Action(cmp.action_t.none);
            });

            //some components can be disabled due to require another components and they can't be set to install
            //therefore it requires special delayed processing for such components
            if(cb_cmp_to_install)
            {
                prod.FilterComponentsRecursive(function(cmp)
                {
                    if(cb_cmp_to_install(cmp))
                      if(cmp.Disabled() == cmp.disabled_t.yes)
                      {
                          arr_disabled.push(cmp);
                          cmp.Disabled.Subscribe(function(val){ if(val == cmp.disabled_t.no) cmp_enabled = true;})
                      }
                      else
                          cmp.Action(cmp.action_t.install);
                });
            }

            //removing of some components can enable another ones
            if(cb_cmp_to_remove)
            {
                prod.FilterComponentsRecursive(function(cmp)
                {
                    if(cb_cmp_to_remove(cmp))
                          cmp.Action(cmp.action_t.remove);
                });
            }

            while(cmp_enabled)
            {
                cmp_enabled = false;
                for(var i in arr_disabled)
                    arr_disabled[i].Action(prod.action_t.install);
            }
            prod.FilterComponentsRecursive(function(cmp)
            {
                if(!cb_cmp_to_install(cmp))
                    cmp.Action(cmp.action_t.none);
            });
        }

        ns.ApplyComponentsOption = function()
        {
            var cmpstr = ns.ApplyComponentsOption.Components();
            if(!GetOpt.Get("components") && !cmpstr)
            {
                Log("ApplyComponentsOption: there isn't option components specified. Ignore");
                return Action.r_ok;
            }

            var scmd = GetOpt.GetRaw(1);

            Log("ApplyComponentsOption: begin");

            if(scmd == "install" || scmd == "modify")
            {
                var cmps = GetOpt.Get("components");
                if(!cmps)
                    cmps = cmpstr;
                var cmps_arr = cmps.split(",");

                var _default = iterate(cmps_arr, function(nm){ return nm.match(/^default$/i) ? true : false; });
                var _all = iterate(cmps_arr, function(nm){ return nm.match(/^all$/i) ? true : false; });
                // if components doesn't contain 'defaults' keyword the we should unselect all components and select only pointed
                var is_modify_mode = ((scmd == "modify") || (scmd == "install" &&  prod.ProductState() == prod.state_t.installed)) ?  true : false;

                var to_install = function(cmp)
                {
                    if(_all)
                        return true;

                    if(_default)
                    {
                        if(cmp.Info().Property("default_act") && cmp.Info().Property("default_act") == "none")
                        {
                            return false;
                        }
                        if(((cmp.State() == cmp.state_t.installed && cmp.Action() != cmp.action_t.remove) || cmp.Action() == cmp.action_t.install) ||
                            (is_modify_mode && cmp.Action() == cmp.action_t.none))
                        {
                            return true;
                        }
                    }

                    var alias = cmp.Info().Property("alias");
                    if(!alias)
                      return true;

                    alias = String(alias).toLowerCase();
                    return iterate(cmps_arr, function(nm){ return String(nm).toLowerCase() == alias ? true : false; })
                }

                var to_remove = function(cmp)
                {
                    return (!to_install(cmp) && scmd != "modify"); // TODO: do not remove components in modify due to cluster scenario.
                }

                ns.FilterComponents(to_install, to_remove);
            }
            else
                Log("ApplyComponentsOption: this option is applicable only for command install or modify");

            Log("ApplyComponentsOption: end");
            return Action.r_ok;
        }
        
        ns.ApplyComponentsOption.Components = P();

        ns.ApplyComponentsOption.Skip = function()
        {
            if(prod.InstallMode() == prod.install_mode_t.modify || prod.InstallMode() == prod.install_mode_t.install)
                return false;

            return true;
        }
        
        //###############################################################
        //################    Silent actions     ########################
        //###############################################################
        
        // silent welcome
        ns.SWelcome = function()
        {
            return Action.r_ok;
        }
        
        var add_feature = function(fea, node)
        {
            fea.Components().Filter(function(cmp)
            {
                var c = node.AddChild("component");
                c.AddAttribute("alias", cmp.Info().Property("alias"));
                c.AddAttribute("name", cmp.Name());
                c.AddAttribute("state", cmp.State());
            });

            var sort_by_priority = function(a, b){ return (a.Priority ? a.Priority() : 100) - (b.Priority ? b.Priority() : 100); }
            var sftrs = fea.Features().Order(sort_by_priority);

            for(var i in sftrs)
            {
                var e = node.AddChild("feature");
                e.AddAttribute("id", sftrs[i].Id());
                e.AddAttribute("name", sftrs[i].Name());
                e.AddAttribute("state", sftrs[i].State());
                add_feature(sftrs[i], e);
            }
        }
        
        ns.SStatus = function()
        {
            var xml_report = XML.Create("product");
            var prod = ns.Product();
            var output = GetOpt.Get("status");
            xml_report.AddAttribute("name", prod.Name());
            xml_report.AddAttribute("version", prod.Version().Str());
            xml_report.AddAttribute("installdir", prod.InstallDir());
            add_feature(prod, xml_report);
            xml_report.Export(output);
            
            return Action.r_ok;
        }

        //###############################################################
        // action for checking eula=accept in silent
        ns.SEula = function()
        {
            if(GetOpt.Get("eula") != "accept" && GetOpt.Get("acceptlicense") != "yes")
            {
                Log(fm("[eula_rejected]"));
                Output(fm("[eula_rejected]"));
                return Action.r_error;
            }

            Log(fm("[eula_accepted]"));
            return Action.r_ok;
        }
        var raw1 = GetOpt.GetRaw(1);
        ns.SEula.Skip = function(){ return (raw1 == "modify" || raw1 == "remove" || raw1 == "repair");}

        //###############################################################
    
        ns.SInternetCheckConnection = function()
        {
            if (!ns_inst.Installer.OnlineInstaller())
                return Action.r_ok;

            var url = prod.Info().Property("internet_check_URL");

            if (!url)
                return Action.r_ok;

            if (FileSystem.InternetCheckConnection(url))
                return Action.r_ok;

            return Action.r_error;
        }
        
        ns.SInternetCheckConnection.Skip = function(){return !ns_inst.Installer.OnlineInstaller();}
        
        //###############################################################
        
        ns.SDownloadCheckDestination = function()
        {
            //remove destination directory
            var dld_dir = ns_inst.Installer.DownloadDir();
            if (FileSystem.Exists(dld_dir))
            {
                FileSystem.Delete(dld_dir);

                if (FileSystem.Exists(dld_dir))
                {
                    Output(fm("[failed_to_remove_target_dir]", dld_dir));
                    return Action.r_error;
                }
            }

            //check available space
            if(!download_path_is_valid(dld_dir, required_space, prod))
            {
                return Action.r_error;
            }

            return Action.r_ok;
        }
        
        //###############################################################
        
        ns.SDestination = function()
        {
            if(GetOpt.Get("installdir"))
            {
                if(prod.InstallDir.Locked())
                {
                    Output(fm("[installdir_is_locked]", prod.InstallDir()));
                }
                else
                {
                    var path = FileSystem.AbsPath(GetOpt.Get("installdir"));
                    var expanded = System.ExpandEnvironmentStr(path);
                    if(expanded && expanded != path)
                        path = expanded;

                    var dirs = path.split(/[\\\/]/g);
                    var destination = "";
                    for(var i in dirs)
                    {
                        destination += dirs[i].trim();
                        destination += "\\";
                    }
                    prod.InstallDir.Base(destination);
                    Output(fm("[required_installation_directory]", GetOpt.Get("installdir")));
                }
            }


            if(!install_path_is_valid(prod.InstallDir(), function() {return prod.Size();}, prod))
            {
                return Action.r_error;
            }

            Output(ns.SDestination.GetDestinationInfoMessage());

            return Action.r_ok;
        }

        ns.SDestination.GetDestinationInfoMessage = function()
        {
            var list = ns.Destination.GetDestinationList(prod);
            var flag = false;
            if(prod.InstallMode() != prod.install_mode_t.install)
                flag = true;
            var message = "";

            flag? message = fm("[s_remove]", String(prod.InstallDir()).replace(/\\/g, "\\\\")) : message = fm("[destination_info]", String(prod.InstallDir()).replace(/\\/g, "\\\\"));

            if(list && list.length)
            {
                flag? message = fm("[s_remove]", String(prod.InstallDir()).replace(/\\/g, "\\\\")) : message = fm("[destination_info]", String(prod.InstallDir()).replace(/\\/g, "\\\\"));
                
                iterate(list, function(i)
                {
                    message = message + "\r\n    " + String(i).replace(/\\/g, "\\\\");
                });
            }
            return message;
        }

        // Destination check isn't required in remove
        ns.SDestination.Skip = function(){ var cmd_opt = GetOpt.GetRaw(1); return (cmd_opt == "remove");}
        
        //################################################################
        
        ns.SilentInstallationAdjustment = function()
        {
            Log(" Start silent installation adjustment");
            Log(" Loading products targeted for second_load_stage");

            if(typeof(ns_inst.Installer.LoadRequiredCachedProducts) == "function")
                ns_inst.Installer.LoadRequiredCachedProducts();

            //need to load all others not just second load stage, because previous products doesn't have this mark
            ns_inst.Installer.Load(null, ns_inst.Installer.GetFilterByLoadStage());
            Log(" Loading products targeted for second_load_stage done");

            return Action.r_ok;
        }
        
        //###############################################################
        // following action is targeted for processing update cmd option
        ns.SUpgrade = function()
        {
            var cmd_line_update = GetOpt.Get("update");
            Log(" cmd_line_update = " + cmd_line_update);

            cmd_line_update = cmd_line_update ? cmd_line_update : "no";
            var mes;

            switch(String(cmd_line_update).toLowerCase())
            {
              case "no":
                  if(instances_to_upgrade_exists())
                  {
                     mes = fm("[s_update_eq_no_another_product_update_found]");
                     Log(mes);
                     Output(mes);

                     install_in_upgrade = true;

                     return Action.r_error;
                  }
                  break;
              case "always":
                   mes = fm("[s_update_eq_always_another_product_update_found]");
                   Log(mes);
                   Output(mes);

                   Log("upgrade_mode = upgrade");
                   install_in_upgrade = true;
                   prod.CustomProperties().Value("install_in_upgrade", "1");
                   break;
              case "coexist":
                   Log(fm("upgrade_mode = sxs"));
                   install_in_upgrade = false;
                   prod.CustomProperties().Value("install_in_upgrade", "0");
                   break;
              default:
                   install_in_upgrade = true;
                   Log(fm("[s_update_option_has_unknown_value]"));
                   Output(fm("[s_update_option_has_unknown_value]"));
                   break;
            }

            return Action.r_ok;
        }
        
        //###############################################################

        ns.SComplete = function()
        {
            var complete_message = "";
            switch(prod.InstallMode())
            {
            case prod.install_mode_t.install:
                complete_message = fm("[s_install_success]");
                break;
            case prod.install_mode_t.modify:
                complete_message = fm("[s_modify_success]");
                break;
            case prod.install_mode_t.repair:
                complete_message = fm("[s_repair_success]");
                break;
            case prod.install_mode_t.remove:
                complete_message = fm("[s_remove_success]");
                break;
            }
            Output(complete_message);
            stat_pick.Property("CompleteCode", "success");
            stat_pick.HPSendStat();
            if (ns_inst.Installer.RebootRequired())
                return Action.r_reboot;
            return Action.r_ok;
        }

        //###############################################################
        
        ns.SError = function()
        {
            Log(fm("[s_installation_failed]"));
            Output(fm("[s_installation_failed]"));
            Output(fm("[logs_location]", Log.GetLogDir()));
            stat_pick.Property("CompleteCode", "fail");
            stat_pick.HPSendStat();
            return Action.r_error;
        }
        
        //###############################################################

        var ns_dnld_dmp = base("dumper.js");
        var dnld_dmp = ns_dnld_dmp.Dumper("Download dumper");
        

        //###############################################################
        //#############     Check Internet Connection   #################
        //###############################################################
        
        ns.InternetCheckConnection.URL(prod.Info().Property("internet_check_URL"));
        ns.InternetCheckConnection.Skip = function(){return !ns_inst.Installer.OnlineInstaller();}
        

        //###############################################################
        //#############       Download Actions           ################
        //###############################################################

        ns.DownloadBusyStart = function()
        {
            Wizard.BusyStart();
            return Action.r_ok;
        }
        
        //################################################################
        
        ns.DownloadBusyStop = function()
        {
            Wizard.BusyStop();
            return Action.r_ok;
        }

        //################################################################
        
        var prg_download = StringList.Format("[PrgDownload]");
        ns.DownloadProgressAdjust = function(ret)
        {
            if (ret == Action.r_ok)
                StringList.Replace("PrgDownload", StringList.Format("[PrgDownloadOnly]", ns_inst.Installer.DownloadDir()));
            else if (ret == Action.r_back)
                StringList.Replace("PrgDownload", prg_download);
            
            //Wizard.Notify("ProgressBillboard", "activate", "download");

            return ret;
        }
        
        ns.DownloadMediaCfg = function()
        {
            Log("Reuse already downloaded media files.");
            var target = ns_inst.Installer.DownloadDir();
            var installs = FileSystem.AbsPath(target, "installs");
            filter(prod.ComponentsFullSet(), function(c)
            {
                 var src = c.Source();
                 if(src)
                     src.AddLocation(installs);
            });
        }
        ns.DownloadMediaCfg.Skip = function()
        {
            return !GetOpt.Exists("resume-download");
        }

        //################################################################
        
        var prev_ret = null;
        var force_download = function(force)
        {
            //to prevent calling twice
            if (prev_ret === null && force == false)
                return;
            if (prev_ret == force)
                return;

            prev_ret = force;
            
            var src;

            var build_list = GetOpt.Get("download-list");
            if (force)
            {
                prod.CustomProperties()("download_only", "1");
                
                //store for returning back
                Log("ForceDownload forward");
                prod.restore_ProductState = prod.ProductState;
                prod.ProductState = function(){ return prod.state_t.absent; };

                var download_list_state_manager = {};

                download_list_state_manager.State = function(){ return prod.state_t.absent; };
                download_list_state_manager.Id = function(){ return "download_list_state_manager";};

                prod.FilterComponentsRecursive(function(cmp)
                {
                    cmp.restore_StateManager = cmp.StateManager;
                    cmp.restore_CommitDone = cmp.Configurator().CommitDone();

                });
                prod.FilterComponentsRecursive(function(cmp)
                {
                    cmp.StateManager = function() {return download_list_state_manager};
                    cmp.Configurator().CommitDone(true);
                });

                if (prod.InstallMode() != prod.install_mode_t.install)
                {
                    prod.restore_InstallMode = prod.InstallMode();
                    prod.InstallMode(prod.install_mode_t.install);
                }
                prod.Action(prod.action_t.install); //need double-step initialization
                prod.Action(prod.action_t.install);
                
                prod.DefaultAction();
                prod.FilterFeaturesRecursive(function(ftr)
                {
                    //support for old bundling model
                    //SetDefaultAct is older, but exists only in install mode
                    //DefaultAction duplicates SetDefaultAct, but exists in all modes
                    if(ftr.Type() == "product")
                    {
                        if (ftr.DefaultAction)
                            ftr.DefaultAction();
                        else if (ftr.SetDefaultAct)
                        ftr.SetDefaultAct();
                    }
                });

                if(!build_list)
                {
                   // in download-only mode installer should looking for media into its own location only
                   filter(prod.ComponentsFullSet(), function(c)
                   {
                        src = c.Source();
                        if(src)
                            src.Filter(function(src){ if(src && src.ClearLocations) src.ClearLocations();});
                   });
                }

            }
            else
            {
                prod.CustomProperties()("download_only", "0");
                
                Log("ForceDownload back");
                //restore stored values
                if (typeof(prod.restore_ProductState) != "undefined")
                    prod.ProductState = prod.restore_ProductState;

                prod.FilterComponentsRecursive(function(cmp)
                {
                    if (typeof(cmp.restore_StateManager) != "undefined")
                        cmp.StateManager = cmp.restore_StateManager;
                    if (typeof(cmp.restore_CommitDone) != "undefined")
                        cmp.Configurator().CommitDone(cmp.restore_CommitDone);
                });

                if (typeof(prod.restore_InstallMode) != "undefined")
                    prod.InstallMode(prod.restore_InstallMode);
                if (prod.InstallMode() == prod.install_mode_t.install)
                {
                    prod.Action(prod.action_t.install);
                    prod.Action(prod.action_t.install);
                }
                else
                {
                    prod.Action(prod.action_t.none);
                }
                if (prod.SetDefaultAct)
                    prod.SetDefaultAct();
                prod.FilterFeaturesRecursive(function(ftr)
                {
                    if(ftr.Type() == "product" && ftr.SetDefaultAct)
                        ftr.SetDefaultAct();
                });
                
                //Apply user settings for install mode
                ns.ApplyUserSettingsInstallMode();

                if(!build_list)
                {
                   // restore locations for install mode
                   filter(prod.ComponentsFullSet(), function(c)
                   {
                        src = c.Source();
                        if(src)
                            src.Filter(function(src){ if(src && src.RestoreLocations) src.RestoreLocations();});
                   });
                }

                
            }
        }

        ns_inst.Installer.DownloadOnly.Subscribe(force_download);

        //###############################################################
        
        ns.DownloadSchedule = function()
        {
            // generation the scenario for creation the offline package from online
            var target = ns_inst.Installer.DownloadDir();

            Log("Generating scenario for creating offline image");
            Log("Prepare offline data infrastructure");

            var schedule = function()
            {
                var build_list = GetOpt.Get("download-list");
                var xml;

                if(build_list)
                {
                    var bdir = FileSystem.Parent(build_list);
                    FileSystem.CreateDirectory(bdir);
                    xml = XML.Create("process");
                }
                var installs = FileSystem.AbsPath(target, "installs");

                filter(prod.ComponentsFullSet(), function(c)
                {
                    if(c.Action() == c.action_t.install)
                    {
                        if(typeof(c.Source) != "function" || !c.Source())
                            return;

                        Log("adding download action for " + c.Name());
                        var src = c.Source();

                        var src_path = FileSystem.AbsPath(installs, src.Relative());
                        var cmp_dmp = ns_dnld_dmp.Dumper("Download cmp dumper", c);

                        cmp_dmp.AddAction({Apply : function()
                        {
                            Log("launch download timer for cmp " + c.Name());
                            c.StatManager().StartProcessing();
                            c.StatManager().DownloadStage.start();
                            c.StatManager().Property("status", "processing");
                            c.StatManager().Property("state", "download");
                            return Action.r_ok;
                        }},"apply download start cmp.id = " + c.Id());

                        if(src && src.Url && src.Url() && c.Info().Property("from_media"))
                        {
                            src.Filter(function(s) {s.Root(installs);});
                            src.Root(installs);
                            Log("  Download " + src.Url());
                            Log("  Target: " + FileSystem.AbsPath(src.Root(), src.Relative())); //src.File());
                            Log("  Size: " + src.Size());
                            if(!build_list)
                            {
                                // in download-only mode installer should looking for media into its own location only
                                // src.Filter(function(src){ if(src) src.ClearLocations();});
                                src.Resolve(cmp_dmp);
                            }
                            else if (!FileSystem.Exists(src_path))
                            {
                                src.Filter(function(s)
                                {
                                    Log("xml build_list for " + s.File() + "");
                                    var d = xml.AddChild("download");
                                    if (s.CheckerList)
                                    {
                                        filter(s.CheckerList(), function(chk)
                                        {
                                            Log("xml add " + chk.id + " = " + chk.reference + "");
                                            d.AddChild(chk.id).text = chk.reference;
                                        });
                                    }
                                    else
                                    {
                                        Log(Log.l_warning, "xml add size = " + s.Size() + "");
                                        d.AddChild("size").text = s.Size();
                                    }
                                    d.AddChild("url").text = s.Url();
                                    //need to use Root & Relative, because File is refreshed afterwards - after downloading and resolving
                                    d.AddChild("target").text = FileSystem.AbsPath(s.Root(), s.Relative());//s.File();
                                });
                            }
                        }
                        else if(!(src && src.Url && src.Url()))
                        {
                            Log("check failed for src && src.Url && src.Url()");
                        }
                        cmp_dmp.AddAction({Apply : function()
                        {
                            Log("stop download timer for cmp " + c.Name());
                            c.StatManager().DownloadStage.stop();
                            return Action.r_ok;
                        }},"apply download stop cmp.id = " + c.Id());

                        dnld_dmp.AddAction(cmp_dmp);
                    }
                });

                if(build_list)
                {
                    var e = xml.AddChild("execute");
                    e.AddChild("module").text = FileSystem.AbsPath(target, FileSystem.exe_name);
                    e.AddChild("arguments").text = "";
                    xml.Export(build_list);
                }

                var ns_fdmp = base("dumper_file.js");
                var dirop = ns_fdmp.Directory();
                dirop.Remove(target, true);
                dirop.Create(target);
                dirop.CopyContent(FileSystem.exe_dir, target);
                dnld_dmp.AddAction(dirop);

                var filecr = {};
                filecr.Apply = function(){Log("creating indicator for offline image made from online installer"); FileSystem.WriteFileUTF8(FileSystem.MakePath("offline.ind", target), "offline.ind"); return Action.r_ok;}
                dnld_dmp.AddAction(filecr);

                var filecr_offline_inst = {};
                filecr_offline_inst.Apply = function(){Log("creating offline_installation.ind"); FileSystem.WriteFileUTF8(FileSystem.MakePath("offline_installation.ind", target + "/config"), "offline_installation.ind"); return Action.r_ok;}
                dnld_dmp.AddAction(filecr_offline_inst);

                dnld_dmp.Group("Download");

                return Action.r_ok;
            }

            return schedule();
        }

        //###############################################################
        
        ns.DownloadBillboard = function() //not silent
        {
            StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));
            var full_path = ns_inst.Installer.DownloadDir();
            var dwnld_dir = full_path.substr(0, full_path.length - download_folder.length - 1);
            if (dwnld_dir)
            {
               var open_download_dir = function()
               {
                   Log("open download dir " + dwnld_dir);
                   ShellExecute("explorer", dwnld_dir, "open", true);
               }
               ns.CompleteWithCheckbox.Template(fm("[downloaded_template]", download_folder, dwnld_dir.replace(/\\/g, "\\\\")));
               ns.CompleteWithCheckbox.CheckboxName("[launch_after_download]");
               ns.CompleteWithCheckbox.LaunchAfterInstall(open_download_dir);
            }

            var dir = FileSystem.MakePath(StringList.Format(prod.Info().Property("billboards")));

            var billboards_url = StringList.Format(prod.Info().Property("billboards_url"));
            if(billboards_url)
                Wizard.Notify("ProgressBillboard", "url", billboards_url);

            Log("Loading billboards dir = " + dir);
            var files = FileSystem.FindFiles(dir, "*.png");

            for(var i in files)
            {
                var item = files[i];
                var file = FileSystem.MakePath(item, dir);
                Log("Adding file = " + file);
                Wizard.Notify("ProgressBillboard", "add file", file);
            }

            Wizard.Notify("ProgressBillboard", "timeout", billboard_refresh_timeout);
            Log("Loading billboards done");

            Wizard.Notify("ProgressBillboard", "activate", "download");
            Wizard.Notify("Progress2", "header", StringList.Format("[PrgDownloadOnly]", ns_inst.Installer.DownloadDir()));

            return ns.Downloading("Billboard");
        }
        
        //###############################################################

        ns.DownloadThread = function()
        {
            var install_mngr = base("install.js");
            install_mngr.ThreadMap({"Progress2":["Download"]});
            //let cancel dialog know that download happened
            Wizard.Notify("canceled", "set install", true);
            return install_mngr.Process(dnld_dmp);
        }

        //###############################################################
        //DownloadDir adjustment for gui and silent mode
        
        var download_folder = prod.Info().Property("download_folder");
        if (!download_folder)
           download_folder = prod.Id();
        download_folder = StringList.Format(download_folder);
        
        var download_dir;
        
        var target_dir = GetOpt.Get("download-dir");
        if (target_dir && GetOpt.Exists("download-list"))
        {
            //option download-dir is passed in the special mode for making upgrade through ISM
            //In this case download dirictory should be equal passing path
            download_dir = target_dir;
        }
        else 
        {
            if (!target_dir)
                target_dir = FileSystem.AbsPath(FileSystem.GetDownloadDirectory(), "Intel");
            download_dir = FileSystem.AbsPath(target_dir, download_folder);
        }

        ns_inst.Installer.DownloadDir(download_dir);
        ns_inst.Installer.InstallationDenied(GetOpt.Get("download-dir") ? true : false);

        //###############################################################
        //##############    GettingStarted adjustment     ###############
        //###############################################################

        ns.GettingStarted.PresetDownload(preset_download_mode);
        ns.GettingStarted.SpaceRequired(required_space);
        ns.GettingStarted.SetFolder(download_folder);
        ns.GettingStarted.Set(target_dir);
        ns.GettingStarted.OnChange = function(val)
        {
            if(arguments.length)
                ns_inst.Installer.DownloadDir(val);
        }
        //need to set text just once, due to InstallMode may be changed
        ns.GettingStarted.SetText();

        //download-only for silent mode
        if (preset_download_mode && ns_inst.Installer.Silent())
            ns_inst.Installer.DownloadOnly(true);

        //###############################################################
        //##############       Final adjustments     ####################
        //###############################################################

        var dump_cmps = function(ftr)
        {
           Log(" cmps for feature " + ftr.Name());
           ftr.Components().Filter(function(cmp)
           {
               Log("      cmp " + "alias = "+ cmp.Info().Property("alias") + " " + cmp.Name() + "/" + cmp.Id() + ":");
               Log("          state = " + cmp.State() + " action = " + cmp.Action());
           });
        }

        var dump_ftrs = function(ftr)
        {
           dump_cmps(ftr);
           ftr.Features().Filter(function(f)
           {
               dump_ftrs(f);
           });
        }
        
        ns.CmpInfo = function(_ret)
        {
           Log(" list components actions");
           dump_ftrs(prod);
           Log(" list components actions done");
           return _ret;
        }
        
        ns.CheckForReboot = function()
        {    
            Log("Check ask_for_reboot triggers started.");
            var evaluate = function (expression, context)
            {
                with(context)
                {
                    return safecall(function(){return eval(expression)});
                }
            }

            var auto = ns_pr.PendingReboot();
            Log("Pending reboot status: " + auto);

            var products = ns_inst.Installer.Products;
            
            var filter_prod = function(context)
            {
                return function(prod)
                {
                    var exp = prod.Info().Property("ask_for_reboot");
                    if( exp )
                    {
                        if(exp.match(/auto/) && auto)
                        {
                            return true;
                        }
                        context.action = prod.Action();
                        context.state = prod.State();
                        Log("Evaluate expression for product: '" + exp + "' against context: " +  JSON.stringify(context));
                        return evaluate(exp,context);
                    }
                }
            }
            
            var filter_ftr = function(context) 
            {
                return function(ftr)
                {
                    var res = false;               
                    var exp = ftr.Info().Property("ask_for_reboot");
                    if( exp )
                    {
                        if(exp.match(/auto/) && auto)
                        {
                            return true;
                        }
                        context.action = ftr.Action();
                        context.state = ftr.State();      
                        Log("Evaluate expression for feature: " + ftr.Id() +  " '" + exp + "' against context: " +  JSON.stringify(context));
                        return evaluate(exp, context);
                    }
                }
            }
            
            var filter_cmp = function(context) 
            {
                return function(cmp)
                {
                    var exp = cmp.Info().Property("ask_for_reboot");
                    if( exp )
                    {
                        if(exp.match(/auto/) && auto)
                        {
                            return true;
                        }
                        context.action = cmp.Action();
                        context.state = cmp.State();   
                        Log("Evaluate expression for component: " + cmp.Info().Property("alias") +  " '" + exp + "' against context: " +  JSON.stringify(context));
                        return evaluate(exp, context);
                    }
                }
            }
            
            for(var i in products)
            {
                var product = products[i];
                var context = {install_mode: product.InstallMode()};
                
                var fp = filter_prod(context);
                if (fp(product))
                {
                    ns_inst.Installer.RebootRequired(true);
                    return;
                }
                
                if(product.FilterFeaturesRecursive(filter_ftr(context)))
                {
                    ns_inst.Installer.RebootRequired(true);
                    return;
                }
                
                if(product.FilterComponentsRecursive(filter_cmp(context)))
                {
                    ns_inst.Installer.RebootRequired(true);
                    return;
                }
            }
        }
        
        ns.Initialization.Add(ns.CmpInfo);
        ns.ConfigureOptions.Add(ns.CmpInfo);
        ns.FinalActions.Add(ns.CheckForReboot);        

        ns.CompleteGui = function()
        {
           if(prod.Action() == prod.action_t.remove)
           {
                ns.CompleteWithCheckbox.Template("[removed_template]");
                ns.CompleteWithCheckbox.SkipErrors(true);
                ns.CompleteWidget.Template("[removed_template]");
                ns.CompleteWidget.SkipErrors(true);
           }
           return Action.r_ok;
        }
        
        

        var finish_gui_callback_custom = null;
        var finish_gui_default_callback = function()
        {
            stat_pick.HPSendStat();
            
            Wizard.Notify("title", "no-cancel-confirm");
            var res;
            if (ns_inst.Installer.DownloadOnly())
            {
                ns.CompleteWithCheckbox.CB_Skip(function() {return false;});
                ns.Complete.Skip();
                if(ns.Complete.ErrorOccured())
                {
                    Wizard.OnNotify("Complete/complete_checkbox/add_error", "set error");
                }
                res = ns.Complete();
                if(Wizard.OnNotify("Complete/complete_checkbox/checkbox", "is checked"))
                  ns.CompleteWithCheckbox.LaunchAfterInstall();
            }
            else 
            {
                if (ns_inst.Installer.RebootRequired())
                {
                    ns.CompleteReboot.CB_Skip(function() {return false;});
                    ns.Complete.Skip();
                    if(ns.Complete.ErrorOccured())
                    {
                        Wizard.OnNotify("Complete/complete_reboot/add_error", "set error");
                    }
                    res = ns.Complete();
                    if(res == "reboot")
                    {
                        if(prod.InstallMode() == prod.install_mode_t.install && Wizard.OnNotify("Complete/complete_reboot/checkbox", "is checked"))
                        {
                            //Schedule launching welcome page after reboot
                            //only install mode, but any return value
                            var ns_startup_action = base("startup_action.js");
                            var url = prod.Info().Property("welcome_page");
                            if(url)
                            {
                                StringList.Replace("INSTALLDIR", prod.InstallDir());
                                StringList.Replace("BASEINSTALLDIR", prod.InstallDir.Base());
                                url = fm(url);
                            }

                            if(ns_startup_action && url)
                            {
                                var command = FileSystem.SpecialFolder.system + "\\cmd.exe /c \"start \"\" \"" + url + "\"\"";
                                ns_startup_action.CreateRunOnce(command, System.IsAdmin());
                            }
                            else
                                Log("base_wpf.js: Failed to add action after reboot");
                        }
                        System.Reboot();
                    }
                    else if(Wizard.OnNotify("Complete/complete_reboot/checkbox", "is checked"))
                    {
                        Log("Launching welcome page");
                        ns.LaunchWelcomePage();
                    }
                }
                else
                {
                    ns.CompleteWithCheckbox.LaunchAfterInstall(ns.LaunchWelcomePage);
                    ns.CompleteWithCheckbox.CheckboxName("[launch_welcome_page]");
                    if(prod.Info().Property("PythonOnComplete") == "1")
                    {
                        ns.CompleteWithCheckbox.Notes("[python_on_complete]");
                    }
                    var url = prod.Info().Property("welcome_page");
                    if(!url)
                    {
                        ns.CompleteWidget.CB_Skip(function(){return false;});
                        ns.Complete.Skip();
                        if(ns.Complete.ErrorOccured())
                        {
                            Wizard.OnNotify("Complete/complete/add_error", "set error");
                        }
                        res = ns.Complete();
                    }
                    else
                    {
                        ns.CompleteWithCheckbox.CB_Skip(function(){return false;});
                        ns.Complete.Skip();
                        if(ns.Complete.ErrorOccured())
                        {
                            Wizard.OnNotify("Complete/complete_checkbox/add_error", "set error");
                        }
                        res = ns.Complete();
                        if(Wizard.OnNotify("Complete/complete_checkbox/checkbox", "is checked"))
                            ns.CompleteWithCheckbox.LaunchAfterInstall();
                    }
                }
            }

            return Action.r_ok;
        }

        ns.FinishGui = function()
        {
            if(finish_gui_callback_custom)
                return finish_gui_callback_custom();

            return finish_gui_default_callback();
        }

        ns.FinishGui.Customize = function(input_callback)
        {
            finish_gui_callback_custom = input_callback;
        }
        
        Log("Scenario::base_wpf: actions generation completed");
        return ns;
  
    }
}
