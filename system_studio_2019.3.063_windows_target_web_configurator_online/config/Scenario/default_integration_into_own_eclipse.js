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

    var from_config = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + ".."));};

    var ns_ecl_inf = base("eclipse_info.js");
    var ns_java = from_config("java.js");

    var mkpath = FileSystem.MakePath;

    var fm = StringList.Format;

    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::default_integration_into_own_eclipse.js: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        if(!ns.EclipseIntegration)
        {
            Log(Log.l_critical, "there isn't action ns.EclipseIntegration");
            return;
        }
        //eclipse files names are too long
        Wizard.Notify("destination/edit_box", "set text limit", 35);

        var ei_onchange_prev = ns.EclipseIntegration.OnChange;

        var ecl = ComponentByAlias(prod, "eclipse");
        if(ecl && ecl.Disabled() == ecl.disabled_t.yes)
        {
            ecl = null;
        }

        var get_eclipse_installdir = function(eclipse_component_key, eclipse_product_code)
        {
            if(!eclipse_component_key || !eclipse_product_code)
                return null;

            var clients = WI.ClientsInstalledComponent(eclipse_component_key);

            if(clients && clients.length > 0)
            {
               for(var cl in clients)
               {
                   if(clients[0].Id == eclipse_product_code)
                       return clients[0].ComponentPath;
               }
            }

            return null;
        }


        var own_eclipse_location = function(ecl_cmp) //according to my calculations, this argument must be passed here from default_integration_into_own_eclipse::SetIntegrationIntoEmbeddedEclipse
        {
            if(ecl_cmp) //and to SetOwnEclipseLocation it is passed from eclipse_integration_actions::ExecEclipseIntegration because ecl is defined globally in this script
                ecl = ecl_cmp; //this is an attempt to avoid love to global variables in JS
            if(ecl)
            {
                var edir = null;
                var eclipse_component_key = ecl.Info().Property("ProductLineGuid") ? ecl.Info().Property("ProductLineGuid") : "{89151D13-554E-430D-BB61-FC9A110FC643}";
                var eclipse_product_code = ecl.Id();

                var edir = get_eclipse_installdir(eclipse_component_key, eclipse_product_code);
                if(edir == null)
                {
                    Log("default_integration_into_own_eclipse.js: get_eclipse_installdir failed to fetch information by eclipse GUID. Trying the old method.")
                    edir = ecl.InstallDir() ? ecl.InstallDir() : prod.InstallDir();
                }
                //We still need to add "\eclipse" to the fetched path
                edir = mkpath(ecl.Info().Property("EclipseSubFolder") ? ecl.Info().Property("EclipseSubFolder") : "eclipse", edir);

                Log("default_integration_into_own_eclipse.js: found eclipse component, installdir \"" + edir +"\" will be used")

                var info = ns_ecl_inf ? ns_ecl_inf.PureEclipseInfo(edir, ecl.Info().Property("EclipseVersion"), ecl.Info().Property("EclipseArchitecture"), ecl.Info().Property("EclipseRequiredJava")) : {};
                ns.EclipseIntegration.OwnEclipseInfo = function(){ return info;}

                return edir;
            }
            else
            {
                Log("default_integration_into_own_eclipse.js: Warning: eclipse component wasn't found!")
                return "";
            }
        };

        ns.EclipseIntegration.IsDefaultOwnLocation = function(path)
        {
            if( path && String(mkpath(path)).toLowerCase() == String(own_eclipse_location()).toLowerCase() )
            {
                return true;
            }

            return false;
        }

        var eclipse_path_is_valid = function(val)
        {
            var invalid_path = function(reason)
            {
                Log("Failed path processing: " + reason);
            }

            var path = val;

            Log("incoming path: " + path);

            if(!path)
            {
                return false;
            }
            else if(path.length < 3 || !FileSystem.IsAbsolute(path))
            {
                invalid_path("Not absolute");
                return false;
            }

            if(path.match(/[<>?*|]/))
            {
                invalid_path("Incorrect symbols");
                return false;
            }

            if(FileSystem.IsNetwork() && path.match(/[:]/))
            {
                invalid_path("Network path contains ':'");
                return false;
            }

            if(path.split(":").length > 2)
            {
                invalid_path("More than one ':'");
                return false;
            }

            if(!ns.EclipseIntegration.IsDefaultOwnLocation(path) && !(FileSystem.Exists(FileSystem.MakePath("eclipse.exe", path)) && FileSystem.Exists(FileSystem.MakePath(".eclipseproduct", path))))
            {
                invalid_path("It is not an Eclipse directory.");
                return false;
            }

            // getting info regarding eclipse to understand which java should be called for it
            // show error message to user in case if java is absent
            var e_info = ns.EclipseIntegration.IsDefaultOwnLocation(path) ? ns.EclipseIntegration.OwnEclipseInfo() : (ns_ecl_inf ? ns_ecl_inf.EclipseInfo(path) : null);
            var java = ns_java.Info();
            if(e_info)
            {
               var java_ver = (e_info && e_info.java_version) ? e_info.java_version : ns_ver.Version(0);

               var jre_required = "";

               if(e_info.arch == e_info.arch_t.x64 &&
                  (!java ||
                   ((!java.jre || !java.jre.x64 || (!java_ver.IsNULL() && java.jre.x64.max.version.lt(java_ver))) &&
                    (!java.jdk || !java.jdk.x64 || (!java_ver.IsNULL() && java.jdk.x64.max.version.lt(java_ver)))
                    )
                   )
                  )
               {
                   jre_required = "64-bit";
               }
               else if(e_info.arch == e_info.arch_t.x32 &&
                  (!java ||
                   ((!java.jre || !java.jre.x32 || (!java_ver.IsNULL() && java.jre.x32.max.version.lt(java_ver))) &&
                    (!java.jdk || !java.jdk.x32 || (!java_ver.IsNULL() && java.jdk.x32.max.version.lt(java_ver)))
                    )
                   )
                  )
               {
                   jre_required = "32-bit";
               }

               if(jre_required)
               {
                   var message = format("[java_required_for_eclipse_integration]", jre_required, (!java_ver.IsNULL() ? java_ver.Str() : "1.7"));
                   invalid_path(message);
                   return false;
               }
            }

            return true;
        }

        //###############################################################
        //
        //###############################################################
        ns.SEclipseIntegration = function()
        {
            var eclipse_idata = prod.CustomObjects().Item("DeserializeEclipseIntegration");
            Log("Setting Eclipse integration");
            if(GetOpt.Get("eclipsedir") || eclipse_idata)
            {
                var arg = GetOpt.Get("eclipsedir") ? GetOpt.Get("eclipsedir") : eclipse_idata.location; //user options have higher priority
                var path = FileSystem.AbsPath(arg);
                Log("eclipse path = " + path);
                if(!eclipse_path_is_valid(path))
                {
                    var output_file = GetOpt.Get("output");
                    if(output_file)
                    {
                        var mes = "Eclipse integration failed. Please see logs for details";
                        var cnt = FileSystem.ReadFileUTF8(output_file, true);
                        FileSystem.WriteFileUTF8(output_file, cnt  ? (cnt + "\r\n" + mes) : mes);
                    }
                    return Action.r_error;
                }
                var EclipseInt = prod.CustomObjects().Item("EclipseIntegration");
                if(EclipseInt)
                {
                    EclipseInt.integrate = 1;
                    EclipseInt.location = path;
                    ns.SetEclipseIntegrationOption();
                }

                var eclipse_cmp = ns.ComponentByAlias(prod, "eclipse");
                var jre_cmp = ns.ComponentByAlias(prod, "sys_dbg_jre");
                if(ns.EclipseIntegration.IsEmbeddedChecked())
                {
                    if(eclipse_cmp)
                        eclipse_cmp.Action(prod.action_t.install);
                }
                else
                {
                    if(eclipse_cmp)
                    {
                        eclipse_cmp.Action(prod.action_t.none);
                    }
                }
            }
            return Action.r_ok;
        }

        /*
        ns.EclipseIntegration.OnChange = function(path)
        {
            if(ei_onchange_prev)
                ei_onchange_prev(path);

            Log("my on change, path = " + path + " own_eclipse_location = " + String(own_eclipse_location()).toLowerCase());

            if( ns.EclipseIntegration.TargetPath() && String(mkpath(ns.EclipseIntegration.TargetPath())).toLowerCase() == String(own_eclipse_location()).toLowerCase() )
            {
                Log("equal");
                ns.EclipseIntegration.UseOwnEclipse(true);
            }
            else
            {
                ns.EclipseIntegration.UseOwnEclipse(false);
                ns.EclipseIntegration.Set(path);
                if(ns.EclipseIntegration.WarningInCaseOfNonDefaultEclipse && typeof(ns.EclipseIntegration.WarningInCaseOfNonDefaultEclipse) == "function")
                    ns.EclipseIntegration.WarningInCaseOfNonDefaultEclipse();
            }
        }
        */
        var ei_refresh_prev = ns.EclipseIntegration.Refresh;

        ns.EclipseIntegration.Refresh = function()
        {
            //ns.EclipseIntegration.SetHeader(fm("[eclipse_header_file]", String(own_eclipse_location()).replace(/\\/g, "\\\\")));
            ns.EclipseIntegration.SetEmbeddedDesc(fm("[eclipse_embedded_desc_file]", String(own_eclipse_location()).replace(/\\/g, "\\\\")));
            ns.EclipseIntegration.EmbeddedEclipseLocation(own_eclipse_location());

            /*if(ns.EclipseIntegration.UseOwnEclipse())
            {
                ns.EclipseIntegration.Set(own_eclipse_location());
            }*/
        }

        ns.SetEclipseIntegrationOption = function()
        {
            var ei = prod.CustomObjects().Item("EclipseIntegration");
            if(ei && ei.integrate == 1)
            {
                if(ns.EclipseIntegration.IsDefaultOwnLocation(ei.location))
                {
                    //ns.EclipseIntegration.SetEmbeddedChecked(true);
                    //ns.EclipseIntegration.EmbeddedEclipseLocation(ei.location);
                    ns.EclipseIntegration.Set(ei.location);
                    ns.EclipseIntegration.SetChecked(true);
                }
                else
                {
                    //ns.EclipseIntegration.SetUserEclipseChecked(true);
                    ns.EclipseIntegration.Set(ei.location);
                }
            }
            else
            {
                //ns.EclipseIntegration.SetDoNotIntegrateChecked(true);
                ns.EclipseIntegration.SetChecked(false);
            }
        }

        ns.SetOwnEclipseLocation = function()
        {
            ns.EclipseIntegration.Set(own_eclipse_location());
            ns.EclipseIntegration.SetChecked(true)
            //ns.EclipseIntegration.UseOwnEclipse(true);
            //ns.EclipseIntegration.SetChecked(true);
            /*if(!ns.EclipseIntegration.IsUserEclipseChecked() && !ns.EclipseIntegration.IsDoNotIntegrateChecked())
                ns.EclipseIntegration.SetEmbeddedChecked(true);*/
            //ns.EclipseIntegration.EmbeddedEclipseLocation(own_eclipse_location());
            //ns.EclipseIntegration.Set(own_eclipse_location());

            var ei = prod.CustomObjects().Item("EclipseIntegration");
            if(ei)
            {
                ei.integrate = 1;
                ei.location = own_eclipse_location();
            }
        }

        ns.SetIntegrationIntoEmbeddedEclipse = function() //ecl_cmp can be null here, it's not the problem, since it is passed to own_eclipse_location
        {
            var ecl_cmp = ns.ComponentByAlias(prod, "eclipse");
            //actually, for windows target eclipse integration must be performed only when system trace is installed
            var sys_trc_cmp = ns.ComponentByAlias(prod, "sys_trc_ia32"); //get this component by alias
            if(sys_trc_cmp) //check if it exists
            {
                Log("eclipse_integration_actions::ExecEclipseIntegration: sys_trc_ia32 component was found");
                if(sys_trc_cmp.Action() == sys_trc_cmp.action_t.install) //check whether it is going to be installed
                {
                    Log("eclipse_integration_actions::ExecEclipseIntegration: system trace is going to be installed");
                    //need to define integration parameters like integrate and eclipse location
                    var ecl_cmp = ns.ComponentByAlias(prod, "eclipse"); //get eclipse component by alias

                    var ei = prod.CustomObjects().Item("EclipseIntegration");
                    if(ei)
                    {
                        ei.integrate = 1;
                        ei.location = own_eclipse_location(ecl_cmp);
                    }
                }
            }
        }

        ns.SetOwnEclipseLocation.Skip = function() { return !ecl || prod.InstallMode() != prod.install_mode_t.install; };

        if(ns.Initialization)
        {
            ns.Initialization.Add(ns.SetOwnEclipseLocation);
            ns.Initialization.Add(ns.SetEclipseIntegrationOption);
        }
        else
          Log("Scenario::default_integration_into_own_eclipse.js: ns.Initialization isn't defined -> ignore");

        ns.ApplyUserSettings.Add(function(provider)
        {
            Log("EclInt callback");
            var EclInt = provider.CustomObjects().Item("EclipseIntegration");

            if(EclInt)
            {
                var ei = prod.CustomObjects().Item("EclipseIntegration");
                if(ei)
                {
                    ei.integrate = 1;
                    ei.location = EclInt.location;
                    if(ns.EclipseIntegration.IsDefaultOwnLocation(ei.location))
                    {
                        if(ns.EclipseIntegration.SetEmbeddedChecked)
                        {
                            ns.EclipseIntegration.SetEmbeddedChecked(true);
                        }
                        if(ns.EclipseIntegration.EmbeddedEclipseLocation)
                        {
                            ns.EclipseIntegration.EmbeddedEclipseLocation(ei.location);
                        }
                    }
                    else
                    {
                        if(ns.EclipseIntegration.SetUserEclipseChecked)
                        {
                            ns.EclipseIntegration.SetUserEclipseChecked(true);
                        }
                        if(ns.EclipseIntegration.Set)
                        {
                            ns.EclipseIntegration.Set(ei.location);
                        }
                    }
                }
             }
         });

        Log("Scenario::default_integration_into_own_eclipse.js: actions generation completed");
        return ns;
    }
    this.Scenario = function(acts)
    {
        Log("Scenario::default_integration_into_own_eclipse: scenario generation started");
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::default_integration_into_own_eclipse: required input parameter acts is undefined ");
            return null;
        }

        var ns = acts;
        var scenario = this;

        var prod = scenario.Product();

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        scenario.AddAfter(ns.ApplyUserSettings, ns.SEclipseIntegration);
        var online_install =  acts.sub_Installer;
        var online_mntnc = acts.sub_Maintenance;
        online_install.AddBefore(ns.ConfigurationDialog, acts.SetIntegrationIntoEmbeddedEclipse);
        online_mntnc.AddBefore(ns.ConfigurationDialog, acts.SetIntegrationIntoEmbeddedEclipse);
        Log("Scenario::default_integration_into_own_eclipse: scenario generation completed");
     }
}
