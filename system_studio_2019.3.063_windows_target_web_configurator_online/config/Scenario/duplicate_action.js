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
    var stat_pick = base("stat_pick.js").Stat_pick;
    var ns_inst = Namespace("Root.installer");

    var Output = function(mes)
    {
        Log(mes);
        ns_inst.Installer.OutputFile().Append(mes);
    }

    this.Actions = function(prod)
    {
        var ns = this;
        Log("Scenario::duplicate_action: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined");
            return;
        }

        var dp_mng = base("dp_manager.js");

        function parseBoolean(string)
        {
            switch (String(string).toLowerCase())
            {
                case "true":
                case "1":
                case "yes":
                case "y":
                    return true;
                case "false":
                case "0":
                case "no":
                case "n":
                    return false;
                default:
                    return;
            }
        }

        //###############################################################
        // Duplicate action for Wizard mode
        //###############################################################
        ns.Config = function()
        {
            var config_file = GetOpt.Get("duplicate");
            if(config_file)
            {
                if(!dp_mng.SetConfig(config_file))
                {
                    Log("Failed on creating install configuration to: " + config_file);
                }
                if(prod.InstallMode() == "install")
                {
                    Log("Run serialize action for install mode.");
                    if(!dp_mng.Serialize())
                    {
                        Log("Failed on creating install configuration to: " + config_file);
                    }
                }
            }
            return Action.r_ok;
        }
        //###############################################################
        // Duplicate action for silent mode
        //###############################################################
        ns.SConfig = function()
        {
            var config_file = GetOpt.Get("silent");
            if(config_file && prod.InstallMode() == "install")
            {
                if(FileSystem.Exists(config_file))
                {
                    Output("Reading install configuration from file: " + config_file);
                    dp_mng.SetConfig(config_file);
                    if(!dp_mng.Deserialize())
                    {
                        Output("Failed on reading install configuration from: " + config_file);
                        return Action.r_error;
                    }
                }
                else
                {
                    Output("Failed on reading install configuration from: " + config_file);
                    return Action.r_error;
                }
            }
            return Action.r_ok;
        }

        let no_license_check = parseBoolean(ns.Product().Info().Property("no_license_check"));

        //////////////////////////////////////////////////////////////////////
        // Serialize callback for common install parameters
        //////////////////////////////////////////////////////////////////////
        var common_scb = function()
        {
            /////////////////////////////////////////////////////////////
            //Serialize selected components
            /////////////////////////////////////////////////////////////
            var obj = {};
            var comps = prod.ComponentsFullSet();
            var list = [];
            for(var i in comps)
            {
                if(comps[i].Action() == comps[i].action_t.install)
                {
                    list.push(comps[i].Info().Property("alias"));
                }
            }
            obj["components"] = list.toString();

            /////////////////////////////////////////////////////////////
            //Serialize install directory
            /////////////////////////////////////////////////////////////
            obj["installdir"] = prod.InstallDir.Base();

            /////////////////////////////////////////////////////////////
            // Serialize silent options
            /////////////////////////////////////////////////////////////
            //--output=<file> [command: all]
            var cmd_line_output = GetOpt.Get("output");
            if(cmd_line_output)
            {
                obj["output"] = cmd_line_output;
            }

            //--eula={accept|reject} [command: install]
            obj["eula"] = "accept"; /* set value explicitly */
            var cmd_line_eula = GetOpt.Get("eula");

            //--update={no|always|coexist} [command: install]
            var cmd_line_update = GetOpt.Get("update");
            if(cmd_line_update)
            {
                if (cmd_line_update == "no" ||
                    cmd_line_update == "always" ||
                    cmd_line_update == "coexist")
                {
                    obj["update"] = cmd_line_update;
                }
                else
                {
                    Log("Wrong value for 'update' command line option: " + cmd_line_update);
                }
            }

            //--log=<path> [command: all]
            var cmd_line_log = GetOpt.Get("log");
            if(cmd_line_log)
            {
                obj["log"] = cmd_line_log;
            }
            /////////////////////////////////////////
            // Serialize activation options
            /////////////////////////////////////////
            //set activation type
            if(ns.ActivationManager)
            {
                Log("Activation type: "  + ns.ActivationManager.Manager.ActivationType());
                obj["activation_type"] = ns.ActivationManager.Manager.ActivationType();

                //Serial number
                obj["sn"] = ns.ActivationManager.Manager.SerialNumber();
                //--sn=<s/n> [command: install]
                var cmd_line_serial_number = GetOpt.Get("sn");
                if(cmd_line_serial_number)
                {
                    obj["sn"] = cmd_line_serial_number;
                }
                //License file
                obj["license"] = ns.ActivationManager.Manager.LicenseFile();
                //--license=<license file> [command: install]
                var cmd_line_lisense_path = GetOpt.Get("license");
                if(cmd_line_lisense_path)
                {
                    obj["license"] = cmd_line_lisense_path;
                }
            }

            /////////////////////////////////////////////////////////////
            // Serialize Intel(R) Software Improvement Program options
            /////////////////////////////////////////////////////////////
            //--intel_sw_improvement_program_consent={yes|no} [command: install]
            if(Ism.OptInIsAccepted())
            {
                obj["intel_sw_improvement_program_consent"] = "yes";
            }
            else
            {
                obj["intel_sw_improvement_program_consent"] = "no";
            }
            var cmd_line_intel_sw_improvement_program_consent = GetOpt.Get("intel_sw_improvement_program_consent");
            if(cmd_line_intel_sw_improvement_program_consent)
            {
                if(cmd_line_intel_sw_improvement_program_consent == "yes" || cmd_line_intel_sw_improvement_program_consent == "no")
                {
                    obj["intel_sw_improvement_program_consent"] = cmd_line_intel_sw_improvement_program_consent.toString();
                }
                else
                {
                    Log("Wrong value for 'intel_sw_improvement_program_consent' command line option: " + cmd_line_intel_sw_improvement_program_consent);
                }
            }
            Log("Serialize callback:" + JSON.stringify(obj));
            return obj;
        };

        //////////////////////////////////////////////////////////////////////
        // Deserialize callback for common install parameters
        //////////////////////////////////////////////////////////////////////
        var common_dcb = function(data)
        {
            Log("Deserialize callback:" + JSON.stringify(data));

            /////////////////////////////////////////////////////////////
            // Deserialize eula
            /////////////////////////////////////////////////////////////
            //otherwise SEula action will be executed to validate command line option '--eula'
            if(!GetOpt.Exists("eula") && !GetOpt.Exists("acceptlicense"))
            {
                if(data.eula && typeof data.eula == "string")
                {
                    if(data.eula.toLowerCase() == "accept")
                    {
                        Log(StringList.Format("[eula_accepted]"));
                        ns.SEula.Skip = function(){return true;};
                        stat_pick.Property("silent_eula_accepted", true);
                    }
                    else
                    {
                        Log("EULA is not accepted explicitly");
                        stat_pick.Property("silent_eula_accepted", false);
                        return;
                    }
                }
                else
                {
                    Log("EULA node is not scripted");
                }
            }
            else if(GetOpt.Exists("eula") && GetOpt.Get("eula") != "accept" || GetOpt.Exists("acceptlicense") && GetOpt.Get("acceptlicense") != "yes")
            {
                Log("EULA is not accepted by the command line parameter");
                stat_pick.Property("silent_eula_accepted", false);
                return;
            }
            else
            {
                Log("EULA is accepted by the command line parameter");
                stat_pick.Property("silent_eula_accepted", true);
            }
            
            /////////////////////////////////////////////////////////////
            // Deserialize selected components
            /////////////////////////////////////////////////////////////
            // Skip config parsing if --components argument is exists
            if(!GetOpt.Exists("components"))
            {
                ns.ApplyComponentsOption.Components(data.components);
            }
            /////////////////////////////////////////////////////////////
            // Deserialize install directory
            /////////////////////////////////////////////////////////////
            // if --installdir is provided prod.InstallDir.Base() will be
            // overwritten later at SDestination action.
            if(!GetOpt.Exists("installdir"))
            {
                if(data.installdir && typeof data.installdir == "string")
                {
                    if(prod.InstallDir.Locked())
                    {
                        Output(StringList.Format("[installdir_is_locked]", prod.InstallDir()));
                    }
                    else
                    {
                        prod.InstallDir.Base(FileSystem.AbsPath(data.installdir));
                        Output(StringList.Format("[required_installation_directory]", data.installdir));
                    }
                }
            }

            /////////////////////////////////////////////////////////////
            // Deserialize activation options
            /////////////////////////////////////////////////////////////
            var process_ret = function(ret)
            {
                if(!ret.exit_code)
                {
                    Output(StringList.Format("[activation_failed]", ret.error_message));
                    return Action.r_error;
                }

                Output(StringList.Format("[activation_success]", ret.error_message));
                return Action.r_ok;
            }

            if(data.hasOwnProperty("activation_type") && typeof data["activation_type"] == "string")
            {
                if (ns.LicenseManagerInit)
                    ns.LicenseManagerInit();
                if(ns.ActivationManager && ns.ActivationManager.Manager.activation_type_t.serial_number == data.activation_type)
                {
                    if(!GetOpt.Exists("sn"))
                    {
                        if(data.sn && typeof data.sn == "string")
                        {
                            Output(StringList.Format("[activate_sn]", data.sn));
                            if(Action.r_ok == process_ret(ns.ActivationManager.activate_sn(data.sn)))
                            {
                                Log("OnlineActivation completed. sn = " + data.sn);
                                ns.SFlexlmAdjustment.Skip = function(){return true;};
                            }
                        }
                    }
                }
                else if(ns.ActivationManager && ns.ActivationManager.Manager.activation_type_t.license_file == data.activation_type)
                {
                    if(!GetOpt.Exists("license"))
                    {
                        if(data.license && typeof data.license == "string")
                        {
                            Output(StringList.Format("[activate_licfile]", data.license));
                            if(Action.r_ok == process_ret(ns.ActivationManager.activate_licfile(data.license)))
                            {
                                Log("LicenseActivation completed. license = " + data.license);
                                ns.SFlexlmAdjustment.Skip = function(){return true;};
                            }
                        }
                    }
                }
                else if(ns.ActivationManager && ns.ActivationManager.Manager.activation_type_t.no_license == data.activation_type && no_license_check)
                {
                    Output(StringList.Format("[silent_activate_without_license]"));
                    ns.SFlexlmAdjustment.Skip = function(){return true;};
                }
                else
                {
                    Log("Wrong activation type is provided in configuration file.");
                }
            }

            /////////////////////////////////////////////////////////////
            // Deserialize Intel(R) Software Improvement Program options
            /////////////////////////////////////////////////////////////
            // if --intel_sw_improvement_program_consent argument is provided skip config value
            if(!GetOpt.Exists("intel_sw_improvement_program_consent"))
            {
                if(data.hasOwnProperty("intel_sw_improvement_program_consent") && typeof data["intel_sw_improvement_program_consent"] == "string")
                {
                    var value = parseBoolean(data["intel_sw_improvement_program_consent"]);
                    Log("Send data config option is: " + value);
                    if(typeof(value) != "undefined")
                    {
                        ns.SetIsmWriter(value);
                        ns.SStoreISMValue.Skip = function(){return true;};
                    }
                }
            }

        };

        dp_mng.AddHandler("common", common_scb, common_dcb);
        ///////////////////////////////////////////////////////////////////////////////////////////
        Log("Scenario::duplicate_action: actions generation completed");
        return Action.r_ok;
    }

    /////////////////////////////////////////////////////////////
    // scenario adjustment for duplicate actions
    /////////////////////////////////////////////////////////////
    this.Scenario = function(acts)
    {
        Log("Scenario::duplicate_action: scenario generation started");
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::duplicate_action: required input parameter acts is undefined ");
            return null;
        }
        //gui mode
        if (ns_inst.Installer.Silent())
            acts.Initialization.Add(acts.SConfig);
        else
            acts.FinalActions.Add(acts.Config);            

        Log("Scenario::duplicate_action: scenario generation completed");
    }
}
