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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "Base"));};

    var fm = StringList.Format;
    var ns_inst = Namespace("Root.installer");
    var stat_pick    =  base("stat_pick.js").Stat_pick;
    var ns_enums     =  base("enums.js");
    
    var Output = function(mes)
    {
        Log(mes);
        ns_inst.Installer.OutputFile().Append(mes);
    }
    //###############################################################
    // scenario adjustment
    //###############################################################
    this.Main = function(acts)
    {
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::Scenario required input parameter acts is undefined ");
            return null;
        }

        var scenario = this;

        var prod = scenario.Product();

        scenario.Add(acts.StaticStat);
        var message;
        //installer is called with the help option
        if(GetOpt.Exists("help") || GetOpt.Exists("?"))
        {
            scenario.Add(acts.Welcome);
            scenario.AddAfter(acts.Welcome, this.Exit);
        }
        //installer is called with the status option
        if(GetOpt.Exists("status"))
        {
            //this option allows to generate features state report by calling installer in a silent mode 
            var report_file = GetOpt.Get("status");
            if(!report_file)
            {
                message = fm("[s_no_report_specified]");
                Log(message);
                Action.MessageBox({ title: "[title]", text: message, icon: "error", buttons: "ok" });
                scenario.Add(function(){return Action.r_error;});
                scenario.Add(this.Exit);
            }
            else if(!Filesystem.WriteFileUTF8(report_file, ""))
            {
                message = fm("[s_failed_to_create_report]");
                Log(message);
                Action.MessageBox({ title: "[title]", text: message, icon: "error", buttons: "ok" });
                scenario.Add(function(){return Action.r_error;});
                scenario.Add(this.Exit);
            }
            else
            {   
                scenario.Add(acts.SStatus);
                scenario.AddAfter(acts.SStatus, this.Exit);
            }
        }
        
        //check if installer is called in the silent mode
        var scmd = GetOpt.GetRaw(1);
        if((scmd == "install" || scmd == "modify" || scmd == "remove" || scmd == "repair"))
        {
            if(!GetOpt.Exists("output"))
            {
                message = fm("[s_no_output_specified]");
                Log(message);
                Action.MessageBox({ title: "[title]", text: message, icon: "error", buttons: "ok" });
                scenario.Add(function(){return Action.r_error;});
                scenario.Add(this.Exit);
            }
            else
            {
                var ouput_file = GetOpt.Get("output");
                if(!Filesystem.WriteFileUTF8(ouput_file, ""))
                {
                    message = fm("[s_failed_to_create_output]");
                    Log(message);
                    Action.MessageBox({ title: "[title]", text: message, icon: "error", buttons: "ok" });
                    scenario.Add(function(){return Action.r_error;});
                    scenario.Add(this.Exit);
                }
                else
                {
                    Output(fm("[s_welcome]"));
                }

                //Set install mode at early stage to use it along scenario build procedure
                //install mode 'install' and 'modify' is detected automatically based on the product state
                if(scmd == "install")
                {
                    Output(fm("[s_install]"));
                }
                else if(scmd == "modify")
                {
                    Output(fm("[s_modify]"));
                }
                else if(scmd == "repair")
                {
                    if(prod.State() != prod.state_t.installed)
                    {
                        Output(fm("[s_product_is_absent]"));
                        scenario.Add(function(){return Action.r_error;});
                        scenario.Add(this.Exit);
                    }
                    else
                    {
                        Output(fm("[s_repair]"));
                        prod.InstallMode(prod.install_mode_t.repair);
                        prod.Action(prod.action_t.repair);
                    }
                }
                else if(scmd == "remove")
                {
                    if(prod.State() != prod.state_t.installed)
                    {
                        Output(fm("[s_product_is_absent]"));
                        scenario.Add(function(){return Action.r_error;});
                        scenario.Add(this.Exit);
                    }
                    else
                    {
                        Output(fm("[s_remove]"));
                        prod.InstallMode(prod.install_mode_t.remove);
                        prod.Action(prod.action_t.remove);
                    }
                }
                
                if(GetOpt.Exists("components") && (GetOpt.Exists("finstall") || GetOpt.Exists("fremove")))
                {
                    Output(fm("[s_components_wrong_options]"));
                    scenario.Add(function(){return Action.r_error;});
                    scenario.Add(this.Exit);
                }
            }
        }

        //#######################################################
        // scenario generation
        Log("Generating scenario");

        //#################################################################################
        //this is the first point to customize scenario
        scenario.Add(acts.Initialization);
        scenario.IIF(function(){return ns_inst.Installer.Silent();}, acts.sub_Silent, acts.sub_GUI);

        //#################################################################################

        var silent = acts.sub_Silent;
        silent.Add(acts.SInternetCheckConnection);
        silent.IIF(function(){return ns_inst.Installer.DownloadOnly();}, acts.sub_SDownloader, acts.sub_SInstaller);

        //#################################################################################

        var s_downloader = acts.sub_SDownloader;
        //s_downloader.Add(acts.ApplyUserSettings);
        s_downloader.Add(acts.SDownloadCheckDestination);
        s_downloader.Add(acts.DownloadMediaCfg);
        s_downloader.Add(acts.DownloadSchedule);
        s_downloader.Add(acts.DownloadProgress);
        s_downloader.Add(acts.DownloadThread);

        //#################################################################################

        var s_installer = acts.sub_SInstaller;
        s_installer.Add(acts.SWelcome);
        s_installer.Add(acts.SPreRequisites);
        s_installer.IIF(function(){return prod.InstallMode() == prod.install_mode_t.install;}, acts.sub_SInstall, acts.sub_SMaintenance);

        //#################################################################################

        var s_install = acts.sub_SInstall;
        s_install.Add(acts.ApplyUserSettings);
        s_install.Add(acts.SEula);
        s_install.Add(acts.SFlexlmAdjustment);
        s_install.Add(acts.ApplyComponentsOption);
        s_install.Add(acts.SStoreISMValue);
        s_install.Add(acts.SUpgrade);
        s_install.Add(acts.ApplyUpgradeSXSMode);
        s_install.Add(acts.SDestination);
        //customizing point
        s_install.Add(acts.ConfigureOptions, "once");
        s_install.Add(acts.SilentInstallationAdjustment, "once");
        //customizing point for actions requiring cache products were loaded
        s_install.Add(acts.ConfigureCacheProducts, "once");
        s_install.Add(acts.AnalizeConfiguration, "once");
        s_install.Add(acts.CollectISMReg, "once");

        s_install.Add(acts.ISMUnreg, "once");
        s_install.Add(acts.CmpInfo);
        s_install.Add(acts.Install, "once");
        s_install.Add(acts.StoreISMValue, "once");
        s_install.Add(acts.ISMReg, "once");
        //customizing point for final actions
        s_install.Add(acts.FinalActions);

        //#################################################################################

        var s_mntnc = acts.sub_SMaintenance;
        s_mntnc.Add(acts.ApplyUpgradeSXSMode);
        s_mntnc.Add(acts.ApplyComponentsOption);
        s_mntnc.Add(acts.SDestination);
        //customizing point
        s_mntnc.Add(acts.ConfigureOptions, "once");
        s_mntnc.Add(acts.SilentInstallationAdjustment, "once");
        //customizing point for actions requiring cache products were loaded
        s_mntnc.Add(acts.ConfigureCacheProducts, "once");
        s_mntnc.Add(acts.AnalizeConfiguration, "once");
        s_mntnc.Add(acts.CollectISMReg, "once");

        s_mntnc.Add(acts.ISMUnreg, "once");
        s_mntnc.Add(acts.CmpInfo);
        s_mntnc.Add(acts.Install, "once");
        s_mntnc.Add(acts.StoreISMValue, "once");
        s_mntnc.Add(acts.ISMReg, "once");
        //customizing point for final actions
        s_mntnc.Add(acts.FinalActions);

        //#################################################################################

        var gui = acts.sub_GUI;
        gui.Add(acts.InternetCheckConnection); //skipped in offline mode
        gui.Add(acts.Maintenance); //skipped in install mode, dynamically selects right version
        gui.Add(acts.FirstStagePrerequisites, "skip-back");   //skipped in DownloadOnly mode 
        gui.Add(acts.FatalPrerequisites);   //skipped in DownloadOnly mode     
        gui.Add(acts.CommonLocation, "skip-back");   
        gui.Add(acts.ApplyUserSettingsInstallMode, "skip-back");
        gui.Add(acts.GettingStartedDialog); //dynamically selects right version
        gui.IIF(function(){return ns_inst.Installer.DownloadOnly();}, acts.sub_Downloader, acts.sub_Installer);

        //#################################################################################
        
        var downloader = acts.sub_Downloader;
        downloader.Add(acts.DownloadBusyStart);
        downloader.Add(acts.DownloadProgressAdjust);
        downloader.Add(acts.DownloadMediaCfg);
        downloader.Add(acts.DownloadSchedule);
        downloader.Add(acts.DownloadBusyStop);          
        downloader.Add(acts.DownloadBillboard);
        downloader.Add(acts.DownloadThread);

        //#################################################################################
        
        var installer = acts.sub_Installer;
        installer.IIF(function(){return prod.InstallMode() == prod.install_mode_t.install;}, acts.sub_Install, acts.sub_Maintenance);

        //#################################################################################
        
        var install =  acts.sub_Install;
        install.Add(acts.ISIPDialog);
        install.Add(acts.SecondStagePrerequisites, "skip-back"); 
        install.Add(acts.Prerequisites);
        install.Add(acts.FlexlmAdjustment);
        install.Add(acts.ConfigurationDialog);
        install.Add(acts.FlexlmConfigure);
        install.Add(acts.Upgrade);
        install.Add(acts.ApplyUpgradeSXSMode);
        install.Add(acts.ThirdStagePrerequisites, "skip-back");
        install.Add(acts.InstallPrerequisites);
        //customizing point
        install.Add(acts.ConfigureOptions, "once");
        install.Add(acts.InstallationAdjustment, "once");
        //customizing point for actions requiring cache products were loaded
        install.Add(acts.ConfigureCacheProducts, "once");
        install.Add(acts.AnalizeConfiguration, "once");
        install.Add(acts.CollectISMReg, "once");
        install.Add(acts.Progress, "once");
        install.Add(acts.ISMUnreg, "once");
        install.Add(acts.CmpInfo);
        install.Add(acts.Install, "once");
        install.Add(acts.StoreISMValue, "once");
        install.Add(acts.ISMReg, "once");
        //customizing point for final actions
        install.Add(acts.FinalActions);
        install.Add(acts.CompleteGui, "once");

        //#################################################################################

        var mntnc = acts.sub_Maintenance;
        mntnc.Add(acts.ISIPDialog);
        mntnc.Add(acts.SecondStagePrerequisites, "skip-back"); 
        mntnc.Add(acts.Prerequisites);
        mntnc.Add(acts.FlexlmAdjustment);
        mntnc.Add(acts.ConfigurationDialog);
        mntnc.Add(acts.FlexlmConfigure);
        mntnc.Add(acts.ApplyUpgradeSXSMode);
        mntnc.Add(acts.ThirdStagePrerequisites, "skip-back");
        mntnc.Add(acts.InstallPrerequisites);
        //customizing point
        mntnc.Add(acts.ConfigureOptions, "once");
        mntnc.Add(acts.InstallationAdjustment, "once");
        //customizing point for actions requiring cache products were loaded
        mntnc.Add(acts.ConfigureCacheProducts, "once");
        mntnc.Add(acts.AnalizeConfiguration, "once");
        mntnc.Add(acts.CollectISMReg, "once");
        mntnc.Add(acts.Progress, "once");
        mntnc.Add(acts.ISMUnreg, "once");
        mntnc.Add(acts.CmpInfo);
        mntnc.Add(acts.Install, "once");
        mntnc.Add(acts.StoreISMValue, "once");
        mntnc.Add(acts.ISMReg, "once");
        //customizing point for final actions
        mntnc.Add(acts.FinalActions);
        mntnc.Add(acts.CompleteGui, "once");

        //#################################################################################
        
        if (!ns_inst.Installer.Silent())
        {
            scenario.OnCancel(acts.Cancel);
            scenario.OnError(acts.Error);
            scenario.OnFinish(acts.FinishGui);
        }
        else
        {
            scenario.OnError(acts.SError);
            scenario.OnFinish(acts.SComplete);
            scenario.DefaultOn("finish", acts.SComplete);
        }

        scenario.DefaultOn(Action.r_abort, function()
        {
            stat_pick.Property("CompleteCode", "cancel");
            stat_pick.HPSendStat();
        });

        Log("Scenario generated successfully");

    }
 }

 
