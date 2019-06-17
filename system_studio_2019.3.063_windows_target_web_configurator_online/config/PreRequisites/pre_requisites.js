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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "\\..\\"));};
    var base = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "../Base")); };

    var ns = this;

    var ns_prop      = base("property.js");
    var ns_ver       = base("version.js");
    var ns_inst      = Namespace("Root.installer");

    var P = function(val){return ns_prop.Property(val);}

    var PForInstall = function(val, attributes)
    {
        if (typeof(ns_prop.CollectorByAnd) == "undefined")
            return ns_prop.Property(val, attributes);

        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        c.Attributes(attributes);
        return c;
    }

    this.Id = function ()
    {
        return "ISS 2017 prerequisites";
    }

    //get components object by
    this.ComponentByAlias = function (product, alias) {
        return product.FilterComponentsRecursive(function (cmp) { return cmp.Info().Property("alias") == alias ? true : false; });
    }

    //there are base pre-requisites regarding second instance, processor arch, no admin

    this.Check = function (collector, product)
    {
        Log("Pre-requisites generation begin");
        var ns_java = load("java.js");

        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var sys_dbg = null;
        Log("check sys_dbg");
        product.FilterFeaturesRecursive(function(ftr)
        {
            if(ftr.Type() == "product" && ftr.Id().indexOf("_sys_dbg_") != -1)
            {
                Log("sys_dbg found: " + ftr.Id());
                if (System.ProcessorArch() == System.ProcessorArch.pa_x86)
                {
                    ftr.Disabled(PForInstall(true));
                    ftr.Detach();
                    return true;
                }

                sys_dbg = ftr;
                return true;
            }
        });

        // _64bit_java_is_launched_from_cmd checks if there is 64bit java in cmd (certain version)
        // via launching java -version in 64bit cmd
        var _64bit_java_is_launched_from_cmd = function(_version)
        {
            Log("_64bit_java_is_launched_from_cmd: input _version = " + String(_version));

            var cmd_exe = StringList.Format("[$SystemRoot]\\sysnative\\cmd.exe /C ");

            var cmd_for_64_cmd_exe = function(_cmd)
            {
                return cmd_exe + (_cmd || "");
            }

            //check for java in cmd (to make sure that debugger and 64bit eclipse will be able to start after installation)
            var ret = CreateProcess("", cmd_for_64_cmd_exe("java -version"), true);

            if(ret && !ret.failed && ret.output)
            {
                Log("_64bit_java_is_launched_from_cmd: java -version output: " + ret.output);

                if(_version)
                {
                    // check version
                    var arr = ret.output.match(/version \"([\d\.\_]+)\"/);

                    if(arr && arr.length > 1)
                    {
                        Log(" found java version: " + arr[1]);
                        if(ns_ver.Version(arr[1]).lt(_version))
                        {
                            Log(" found version doesn't match required one:" + _version);
                            return false;
                        }
                    }
                }
                // check arch
                if(ret.output.match(/64-bit/i))
                {
                    Log("_64bit_java_is_launched_from_cmd: 64-bit java was found in cmd");
                    return true;
                }
                else
                {
                    var d64_ret = CreateProcess("", cmd_for_64_cmd_exe("java -d64"), true);

                    if(d64_ret && !d64_ret.failed && d64_ret.output)
                    {
                        Log("check_java in cmd: d64 output " + d64_ret.output);

                        if(!d64_ret.output.match(/Error: .* does not support a 64-bit/i))
                        {
                            Log("_64bit_java_is_launched_from_cmd: 64-bit java was found in cmd");
                            return true;
                        }
                    }
                }
            }

            Log("_64bit_java_is_launched_from_cmd: 64-bit java WASN't found in cmd");
            return false;
        }

        var eclipse_cmp = ns.ComponentByAlias(product, "eclipse");

        var check_java = function()
        {
            // no need to check java if there isn't no sys_dbg and eclipse
            if (System.ProcessorArch() == System.ProcessorArch.pa_x86 || (!sys_dbg && !eclipse))
                return;

            var java = ns_java.Info();

            // need to check for JRE only (jdk isn't required)
            if(!java ||
               (!java.jre || !java.jre.x64 || java.jre.x64.max.version.lt("1.7") ||
                !_64bit_java_is_launched_from_cmd("1.7"))
              )
            {
                collector.Warning("[cannot_install_sys_dbg_no_jre]");
                return;
            }
        }

        // check for windows driver kit 10 it is required for WinDBG but not a showstopper
        var check_wdk10 = function()
        {
            var win_dbg = ns.ComponentByAlias(product, "win_dbg");
            var win_dbg_reg_cmp = ns.ComponentByAlias(product, "win_dbg_reg_intel64");

            //skip check if all debugger components exist and are installed
            var skip_check = false;
            if(!win_dbg) //if win_dbg component is not defined, no need to start checks at all
                return;

            if(win_dbg.State() == win_dbg.state_t.installed) //if win_dbg is installed
                skip_check = true; //we must skip check

            if(win_dbg_reg_cmp) //but if the registry component exists, we must consider it too
                skip_check = (skip_check && (win_dbg_reg_cmp.State() == win_dbg.state_t.installed));

            if(skip_check)
                return;

            var reg = Registry("HKLM", "SOFTWARE\\Microsoft\\Windows Kits\\Installed Roots");
            reg.WowRedirect(true);

            if(!reg.Exists() || !reg.Value("WindowsDebuggersRoot10"))
            {
                if(win_dbg_reg_cmp && win_dbg_reg_cmp.Parent().Visible())
                    collector.WarningExt(StringList.Format("[wdk10_not_installed_description_rtf]"));

                if(win_dbg_reg_cmp)
                    win_dbg_reg_cmp.Disabled(PForInstall(true ,{ "Type" : win_dbg_reg_cmp.disabled_type_t.prerequisite})); //do not install WinDBG Theme extensions if WinDBG is not installed
            }
        }

        var check_gpa = function()
        {
            //DotNet for gpa
            var ns_dotnet = base("dot_net_processing.js").GetDotNetInfo(true);

            var gpa_cmp_alias = (System.ProcessorArch() == System.ProcessorArch.pa_intel64) ? "gpa_intel64" : "gpa_ia32";
            var gpa = ns.ComponentByAlias(product, gpa_cmp_alias);

            if(gpa)
            {
              if(gpa.State() == gpa.state_t.installed)
                  return;

              if(!ns_dotnet.dot_net_4_x_full.install)
              {
                    var gpa_f = product.Features().Item("gpa");
                    if(gpa_f)
                    {
                        gpa_f.Action(gpa.action_t.remove);
                        var dprop = PForInstall(gpa.disabled_t.yes);
                        gpa_f.Disabled(dprop);
                        collector.WarningExt(StringList.Format("[cannot_install_gpa_no_dotnet40_title]"), StringList.Format("[cannot_install_gpa_no_dotnet40_description]"));
                    }
              }
              else if(System.ProcessorArch() == System.ProcessorArch.pa_x86)
              {
                  collector.WarningExt(StringList.Format("[cannot_install_fa_on_32_title]"), StringList.Format("[cannot_install_fa_on_32_description]"));
              }
            }
        }

        var skip_python = function()
        {
            Log("Disabling python repair");

            //var py = ns.ComponentByAlias(product, "py_main_ia32") || ns.ComponentByAlias(product, "py_main_x64");
            var python_names = ["py_main_ia32", "py_dot_net_ia32", "py_readline_ia32", "py_main_x64", "py_dot_net_x64", "py_readline_x64"];
            for(var i = 0; i < python_names.length; i++)
            {
                var py = ns.ComponentByAlias(product, python_names[i]);
                if(py)
                {
                    Log(" disabling python installation because python 2.7 msi cannot be repaired");
                    var dprop = PForInstall(py.disabled_t.yes);
                    py.DisabledBecauseItIsAlreadyInstalled = true;
                    py.Disabled(dprop);
                }
            }
        }

        var check_CRT = function() //this function checks if universal C runtime is installed
        {
            var osinfo = System.WindowsInfo(); //check OS version
            var osver = ns_ver.Version([osinfo.major, osinfo.minor]);
            Log("Windows version: " + osver.Format());
            if(osinfo.major == 6 && osinfo.minor == 1) //the check must be performed only on windows 7, a.k.a. 6.1
            {
                var current_dir = FileSystem.SpecialFolder.system + "\\wbem"; //this stands for "c:\windows\system32\wbem"
                var cmd_exe = current_dir + "\\wmic.exe qfe"; //we will need wmic tool with qfe argument. qfe stands for Quick Fix Engineering
                Log("check_CRT: cmd_exe = " + cmd_exe);
                var crt_request_timeout = 1 * 60 * 1000;

                var ret = CreateProcess("", cmd_exe, true, current_dir, crt_request_timeout);

                Log("check_CRT: exit code : \"" + ret.exitcode + "\"");
                Log("check_CRT: cmd output: \"" + ret.output + "\"");
                Log("check_CRT: failed : \"" + ret.failed + "\"");
                Log("check_CRT: cmd error : \"" + ret.error + "\"");
                var reg = new RegExp("KB2999226", "ig"); //output contains the list of installed updates
                if(ret && ret.output && !ret.output.match(reg)) //check if there is KB2999226 among them
                {
                    Log("KB2999226 is not installed");
                    return false;
                }
            }
            return true;
        }
        var py_install_path = function(redirect_to_wow)
        {
            var reg = Registry("HKLM", "SOFTWARE\\Python\\PythonCore\\2.7\\InstallPath");
            reg.WowRedirect(redirect_to_wow);

            if(reg.Exists())
            {
                var val = reg.Value();

                if(val && FileSystem.Exists(FileSystem.MakePath("python.exe", val)))
                {
                    return val;
                }
            }

            return "";
        }


        var handle_python_install = function(install_ia32, install_x64, disable_win_dbg, show_path_warning)
        {
            var py_64 = ns.ComponentByAlias(product, "py_main_x64");
            var py_dot_net_ia32_cmp = ns.ComponentByAlias(product, "py_dot_net_ia32");
            var py_readline_ia32_cmp = ns.ComponentByAlias(product, "py_readline_ia32");
            var py_dot_net_x64_cmp = ns.ComponentByAlias(product, "py_dot_net_x64");
            var py_readline_x64_cmp = ns.ComponentByAlias(product, "py_readline_x64");
            var win_dbg_cmp = ns.ComponentByAlias(product, "win_dbg");
            var win_dbg_reg_cmp = ns.ComponentByAlias(product, "win_dbg_reg_intel64");
            if(disable_win_dbg)
            {
                Log("Disabling win_dbg component");
                if(win_dbg_cmp && win_dbg_cmp.Parent().Visible())
                    collector.WarningExt(StringList.Format("[python27_32b_installed_description]"));

                if(win_dbg_cmp)
                    win_dbg_cmp.Disabled(PForInstall(win_dbg_cmp.disabled_t.yes, { "Type" : win_dbg_cmp.disabled_type_t.dependency})); //do not install WinDBG extensions
                if(win_dbg_reg_cmp)
                    win_dbg_reg_cmp.Disabled(PForInstall(win_dbg_reg_cmp.disabled_t.yes, { "Type" : win_dbg_reg_cmp.disabled_type_t.dependency})); //do not install WinDBG Theme extensions as previous
                if(py_64)
                    py_64.Disabled(PForInstall(py_64.disabled_t.yes)); //do not install 64-bit python
            }
            if(install_ia32) //install 32-bit python modules
            {
                Log("Install 32-bit python modules");
                if(py_dot_net_ia32_cmp)
                    py_dot_net_ia32_cmp.Action(py_dot_net_ia32_cmp.action_t.install);
                if(py_readline_ia32_cmp)
                    py_readline_ia32_cmp.Action(py_readline_ia32_cmp.action_t.install);
            }
            else //disable 32-bit python modules
            {
                Log("Disable 32-bit python modules");
                if(py_dot_net_ia32_cmp)
                    py_dot_net_ia32_cmp.Disabled(PForInstall(py_dot_net_ia32_cmp.disabled_t.yes));
                if(py_readline_ia32_cmp)
                    py_readline_ia32_cmp.Disabled(PForInstall(py_readline_ia32_cmp.disabled_t.yes));
            }
            if(install_x64) //install 64-bit python modules
            {
                Log("Install 64-bit python modules");
                if(py_dot_net_x64_cmp)
                    py_dot_net_x64_cmp.Action(py_dot_net_x64_cmp.action_t.install);
                if(py_readline_x64_cmp)
                    py_readline_x64_cmp.Action(py_readline_x64_cmp.action_t.install);
            }
            else //disable 64-bit python modules
            {
                Log("Disable 64-bit python modules");
                if(py_dot_net_x64_cmp)
                    py_dot_net_x64_cmp.Disabled(PForInstall(py_dot_net_x64_cmp.disabled_t.yes));
                if(py_readline_x64_cmp)
                    py_readline_x64_cmp.Disabled(PForInstall(py_readline_x64_cmp.disabled_t.yes));
            }
            if(show_path_warning && py_64 && py_64.Parent().Visible())
                collector.WarningExt(StringList.Format("[python27_path_will_be_changed]"));
        }

        var check_python_installed = function()
        {
            var py_32_installed = py_install_path(true);
            var py_64_installed = py_install_path(false);
            var py_64 = ns.ComponentByAlias(product, "py_main_x64");
            var py_64_install_dir = "";
            if(py_64)
                py_64_install_dir = py_64.InstallDir() + "\\";
            else
                return;
            Log("py_32_installed: " + py_32_installed);
            Log("py_64_installed: " + py_64_installed);
            Log("py_64_install_dir: " + py_64_install_dir);

/**
 * There was a long discussion how to deal with python, so here's the thing: there're five use cases:
 * 1. Python is not installed on the host – install 64-bit python with modules into C:\Python27
 * 2. 32-bit python is installed into C:\Python27 – disable WinDBG extensions and python 64 installation. Install 32-bit modules into 32-bit user installed python
 * 3. 32-bit python is installed not into C:\Python27 – install 64-bit python into C:\Python27
 * 4. 64-bit python is installed into C:\Python27 – install our 64-bit python into C:\Python27
 * 5. 64-bit python is installed not into C:\Python27 – install our 64-bit python into C:\Python27
 */
            //these values covers the first case
            var install_ia32 = false;
            var install_x64 = true;
            var disable_win_dbg = false;
            var show_path_warning = false;
            py_64.Action(py_64.action_t.install); //install 64-bit python by default

            if(py_32_installed)
            {
                if(String(py_64_install_dir).toLowerCase() == String(py_32_installed).toLowerCase()) //that's the second case
                {
                    Log("32-bit python is installed into C:\\Python27");
                    install_ia32 = true; //install 32-bit python modules
                    install_x64 = false; //disable 64-bit python modules
                    disable_win_dbg = true; //do not install WinDBG extensions
                    show_path_warning = false;
                }
                else //the third case -- install our 64-bit python into C:\Python27
                {
                    Log("32-bit python is installed not into C:\\Python27");
                    install_ia32 = false; //disable 32-bit python modules
                    install_x64 = true; //install 64-bit python modules
                    disable_win_dbg = false; //do not install WinDBG extensions
                    show_path_warning = true; //show path change warning
                }
            }
            else if(py_64_installed)
            {
                if(String(py_64_install_dir).toLowerCase() == String(py_64_installed).toLowerCase()) //that's the fourth case
                {
                    Log("64-bit python is installed into C:\\Python27");
                    install_ia32 = false; //disable 32-bit python modules
                    install_x64 = true; //install 64-bit python modules
                    disable_win_dbg = false; //do not install WinDBG extensions
                    show_path_warning = false; //don't show path change warning
                }
                else //the fifth case -- install our 64-bit python into C:\Python27
                {
                    Log("64-bit python is installed not into C:\\Python27");
                    install_ia32 = false; //disable 32-bit python modules
                    install_x64 = true; //install 64-bit python modules
                    disable_win_dbg = false; //do not install WinDBG extensions
                    show_path_warning = true; //show path change warning
                }
            }
            handle_python_install(install_ia32, install_x64, disable_win_dbg, show_path_warning);
        }


        var sys_dbg_can_be_installed = function()
        {
            //DotNet for gpa
            var ns_dotnet = base("dot_net_processing.js").GetDotNetInfo(true);
            var open_ipc = ns.ComponentByAlias(product, "OpenIPC");
            if(open_ipc)
            {
                var internal_version = open_ipc.Info().Property("internal_version")
                Log("sys_dbg_can_be_installed: open IPC: " + internal_version);
                var open_ipc_install_dir = FileSystem.MakePath(internal_version, open_ipc.InstallDir());
                /*
                if(FileSystem.Exists(open_ipc_install_dir))
                {
                    Log("sys_dbg_can_be_installed: open IPC: " + open_ipc_install_dir + " exists. Disabling OpenIPC");
                    open_ipc.Disabled(PForInstall(true, { "Type" : open_ipc.disabled_type_t.prerequisite}));
                }
                else
                {
                    Log("sys_dbg_can_be_installed: open IPC: " + open_ipc_install_dir + " doesn't exist");
                }
                */
            }

            var dal = ns.ComponentByAlias(product, "sys_dbg_dal");
            var is_CRT_installed = check_CRT();
            /*if(!is_CRT_installed)
                collector.WarningExt(StringList.Format("[KB2999226_is_not_installed_title]"), StringList.Format("[KB2999226_is_not_installed_description]"));*/

            if(dal)
            {
              var dal_install_dir = dal.InstallDir();
              /*
              if(FileSystem.Exists(dal_install_dir))
              {
                  Log("sys_dbg_can_be_installed: DAL: " + dal_install_dir + " exists. Disabling DAL");
                  dal.Disabled(PForInstall(true, { "Type" : dal.disabled_type_t.prerequisite}));
              }
              else
              {
                  Log("sys_dbg_can_be_installed: DAL: " + dal_install_dir + " doesn't exist");
              }
              */
              Log("35_install = " + ns_dotnet.dot_net_3_5.install + " 35_sp = " + ns_dotnet.dot_net_3_5.sp);
              Log("40_install = " + ns_dotnet.dot_net_4_x_client.install);

              if(dal.State() != dal.state_t.installed && (!(ns_dotnet.dot_net_3_5.install && ns_dotnet.dot_net_3_5.sp) || !ns_dotnet.dot_net_4_x_client.install))
              {
                    var sys_dbg = product.Features().Item("sys_dbg");
                    if(sys_dbg)
                    {
                        sys_dbg.Action(sys_dbg.action_t.remove);
                        var dsys_dbgprop = null;

                        if(!(ns_dotnet.dot_net_3_5.install && ns_dotnet.dot_net_3_5.sp) && !ns_dotnet.dot_net_4_x_client.install)
                        {
                            dsys_dbgprop = PForInstall(sys_dbg.disabled_t.yes,
                                    {'Type' : sys_dbg.disabled_type_t.prerequisite});

                            if(sys_dbg.Visible())
                                collector.WarningExt(StringList.Format("[cannot_install_sys_dbg_no_dotnet40_and_dotnet35_title]"), StringList.Format("[cannot_install_sys_dbg_no_dotnet40_and_dotnet35_description_rtf]"));
                        }
                        else if(!(ns_dotnet.dot_net_3_5.install && ns_dotnet.dot_net_3_5.sp))
                        {
                            dsys_dbgprop = PForInstall(sys_dbg.disabled_t.yes,
                                    {'Type' : sys_dbg.disabled_type_t.permanent});

                            if(sys_dbg.Visible())
                                collector.WarningExt(StringList.Format("[cannot_install_sys_dbg_no_dotnet35sp1_title]"), StringList.Format("[cannot_install_sys_dbg_no_dotnet35sp1_description_rtf]"));
                        }
                        else if(!ns_dotnet.dot_net_4_x_client.install)
                        {
                            dsys_dbgprop = PForInstall(sys_dbg.disabled_t.yes,
                                    {'Type' : sys_dbg.disabled_type_t.activation});

                            if(sys_dbg.Visible())
                                collector.WarningExt(StringList.Format("[cannot_install_sys_dbg_no_dotnet40_title]"), StringList.Format("[cannot_install_sys_dbg_no_dotnet40_description_rtf]"));
                        }
                        else if(!is_CRT_installed)
                        {
                            dsys_dbgprop = PForInstall(sys_dbg.disabled_t.yes,
                                    {'Type' : sys_dbg.disabled_type_t.default});

                            if(sys_dbg.Visible())
                                collector.WarningExt(StringList.Format("[KB2999226_is_not_installed_title]"), StringList.Format("[KB2999226_is_not_installed_description_rtf]"));
                        }

                        sys_dbg.Disabled(dsys_dbgprop);
                    }

                    return false;
              }
              else
              {
                  return true;
              }
             }

             return true;
        }


        var check_wb_integration = function()
        {
            var wb = product.CustomObjects().Item("WBIntegration");
            if(!wb || !wb.integrate)
              return;

            var path_to_check = wb.location;

            path_to_check = String(FileSystem.MakePath(path_to_check)).replace(/\\/g,"\\\\");
            var wmi_query = "Select * from Win32_Process where CommandLine LIKE '%-name \"Wind River Workbench\"%' AND ExecutablePath LIKE '%" + path_to_check + "%'";
            Log("Check WB IDE is launched, query : " + wmi_query);

            var p = WMI.Query(wmi_query);

            if(p)
            {
                for(var i in p)
                {
                    Log("Check WB IDE is launched: process found:");
                    Log(JSON.stringify(p[i], " ", "\n   "));
                }

                collector.CriticalExt(StringList.Format("[wb_integration_is_running_title]"), StringList.Format("[wb_integration_is_running_message]"));
            }
        }

        let disable_features_by_id = function(prod, feature_hash_list)
        {
            let process_feat = function(feat_hash)
            {
                let feat_ref = prod.Features().Item(feat_hash["feat_id"]);
                if(feat_ref)
                {
                    var feat_prop = PForInstall(feat_ref.disabled_t.yes);
                    feat_prop.Attributes.Value("Description", StringList.Format(feat_hash["feat_desc"]));
                    feat_ref.Disabled(feat_prop);
                }
            };
            feature_hash_list.forEach(process_feat);
        };

        var check_opencl_can_be_installed = function()
        {
            var osinfo = System.WindowsInfo(); //check OS version
            var osver = ns_ver.Version([osinfo.major, osinfo.minor]);
            Log("Windows version: " + osver.Format());
            if(osinfo.major == 6 && osinfo.minor == 1) //the check must be performed only on windows 7, a.k.a. 6.1
            {
                feat_list = [
                {
                    "feat_id" : "opencl_toplevel",
                    "feat_desc" : "[ocl_unsupported_os_tsd]"
                },
                {
                    "feat_id" : "studio_energy_analysis_ftr",
                    "feat_desc" : "[socwatch_unsupported_os_tsd]"
                }
                ];
                disable_features_by_id(product, feat_list);
            }
        }

        //by install mode
        var im = product.InstallMode();
        switch (im)
        {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                ///////////////////////////////////////////////////////////
                sys_dbg_can_be_installed();
                check_opencl_can_be_installed();
                check_wdk10();
                check_python_installed();

                /*if(sys_dbg)
                    check_java();*/

                check_gpa();
                check_wb_integration();

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                ///////////////////////////////////////////////////////////
                sys_dbg_can_be_installed();
                check_opencl_can_be_installed();
                check_wdk10();
                check_python_installed();

                /*if(sys_dbg)
                    check_java();*/

                check_gpa();
                check_wb_integration();

                break;
            case product.install_mode_t.repair:
                ///////////////////////////////////////////////////////////
                //Repair mode
                ///////////////////////////////////////////////////////////
                check_wb_integration();
                skip_python();

                break;
            case product.install_mode_t.remove:
                ///////////////////////////////////////////////////////////
                //Remove mode
                ///////////////////////////////////////////////////////////
                check_wb_integration();

                break;
        }

        // Customization for the Android compiler
        var on_click_link = function(id, command, value)
        {
            var link = "";

            Log("Catched click: " + id + " : " + command + " : " + value);

            if(value.match(/Microsoft \.NET Framework\* 4\.0 \(standalone installer\)/i))
                link = StringList.Format("[missing_dot_net_40_standalone]");
            else if(value.match(/Microsoft \.NET Framework\* 4\.0/i))
                link = StringList.Format("[missing_dot_net_40]");
            else if(value.match(/Microsoft \.NET Framework\* 3\.5 SP1 \(full package\)/i))
                link = StringList.Format("[missing_dot_net_35sp1_full]");
            else if(value.match(/Microsoft \.NET Framework\* 3\.5 SP1/i))
                link = StringList.Format("[missing_dot_net_35sp1]");
            else if(value.match(/Windows Software Development Kit\* - Windows 10\*/i))
                link = StringList.Format("[wdk10_link]");
            else if(value === "KB2999226 (Update for Universal C Runtime)")
                link = StringList.Format("[KB2999226_link]");
            else if(value.match(/http:\/\//))
                link = value;
            else if(value.match(/https:\/\//))
                link = value;

            if(link.length)
                Execute.URL(link);
        }

        Wizard.Notify("prerequisite_text", "mark link", "Microsoft .NET Framework* 4.0 (standalone installer)");
        Wizard.Notify("prerequisite_text", "mark link", "Microsoft .NET Framework* 4.0");
        Wizard.Notify("prerequisite_text", "mark link", "Microsoft .NET Framework* 3.5 SP1 (full package)");
        Wizard.Notify("prerequisite_text", "mark link", "Microsoft .NET Framework* 3.5 SP1");
        Wizard.Notify("prerequisite_text", "mark link", "Windows Software Development Kit* - Windows 10*");
        Wizard.Notify("prerequisite_text", "mark link", "KB2999226 (Update for Universal C Runtime)");
        Wizard.Subscribe("prerequisite_text", "OnClicked", on_click_link);
    }
}
