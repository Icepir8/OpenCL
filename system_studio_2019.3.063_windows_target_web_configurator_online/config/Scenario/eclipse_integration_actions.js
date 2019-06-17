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
    
    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");
    var ns_java = from_config("java.js");
    var ns_ecl_inf = base("eclipse_info.js");
    var ns_ver     = base("version.js");
    var ns_dmp = base("dumper.js");
    
    var ecl_int_timeout = 15 * 60 * 1000;

    // made global object java just to have visible for all actions here
    var java = ns_java.Info();
    
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
   
    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::eclipse_integration: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        ns.ComponentByAlias = function (product, alias)
        {
            return product.FilterComponentsRecursive(function (cmp) { return cmp.Info().Property("alias") == alias ? true : false; });
        }

        /*ns.EclipseIntegration.SetEmbeddedDesc(fm("[eclipse_embedded_desc_file]"));
        ns.EclipseIntegration.SetUserEclipseDesc(fm("[eclipse_user_eclipse_desc_file]"));
        ns.EclipseIntegration.SetDoNotIntegrateDesc(fm("[eclipse_do_not_integrate_desc_file]"));
        ns.EclipseIntegration.SetStaticEclipsePath(fm("[eclipse_path_msg]"));
        ns.EclipseIntegration.SetEclipseInfo(fm("[eclipse_info_file]"));*/

        var on_click_link = function(id, command, value)
        {
            var link = "";

            Log("Catched click: " + id + " : " + command + " : " + value);

            if(value.match(/installation guide/i))
            {
                Log("im = " + prod.InstallMode());
                if(prod.InstallMode() == prod.install_mode_t.install)
                {
                    StringList.Replace("EXELOCATION", FileSystem.exe_dir);
                    link = StringList.Format("[installation_guide_link_media]");
                    Log("media link = " + link);
                }
                else
                {
                    StringList.Replace("PRODUCTLOCATION", prod.InstallDir());
                    link = StringList.Format("[installation_guide_link_cache]");
                    Log("cache link = " + link);
                }
            }
            else if(value.match(/http:\/\//))
                link = value;

            if(link.length)
                Execute.URL(link);
        }

        Wizard.Notify("eclipse_integration_rb/info", "mark link", "Intel(R) System Studio installation guide");
        Wizard.Subscribe("eclipse_integration_rb/info", "OnClicked", on_click_link);
        
        //#####
        // EclipseIntegration adjustment
        var cmps_intgr_eclps = [];
        var cmps_unintgr_eclps = [];
        var ei_base = {integrate : 0, location : ""};

        var eclipse_integration_supported = function()
        {
            if(prod.CustomObjects().Item("EclipseIntegration"))
            {
                var ei = prod.CustomObjects().Item("EclipseIntegration")
                return true;
            }

            var cmps = prod.ComponentsFullSet();
            for(var i in cmps)
            {
                if(cmps[i].CustomObjects().Item("EclipseIntegration"))
                {
                    prod.CustomObjects().Add("EclipseIntegration", {integrate : 0, location : "", install : 0, pass : 0});
                    return true;
                }
            }

            return false;
        }

        var eclipse_integration_pre_install_mes = function()
        {
            var mes = [];
            var ei = prod.CustomObjects().Item("EclipseIntegration");
            if(ei.integrate != ei_base.integrate)
                mes.push(ei.integrate ? StringList.Format("[integration_with_eclipse]", ei.location.replace(/\\/g,"\\\\")) : StringList.Format("[deintegration_with_eclipse]", ei_base.location.replace(/\\/g,"\\\\")));
            else if(ei.integrate == 1 && !cmps_to_integrate_exist())
                mes.push(StringList.Format("[deintegration_with_eclipse]", ei_base.location.replace(/\\/g,"\\\\")));
            else if(ei.integrate == 1 && ei.location != ei_base.location)
            {
                mes.push(StringList.Format("[deintegration_with_eclipse]", ei_base.location.replace(/\\/g,"\\\\")));
                mes.push(StringList.Format("[integration_with_eclipse]", ei.location.replace(/\\/g,"\\\\")));
            }
            else if(ei.integrate == 1 && new_cmps_to_integrate_exist())
                mes.push(StringList.Format("[integration_with_eclipse]", ei.location.replace(/\\/g,"\\\\")));

            return mes;
        }
        // it also initializes prod.CustomObjects().Item("EclipseIntegration") if it is not defined yet
        if(eclipse_integration_supported())
        {
            var ei = prod.CustomObjects().Item("EclipseIntegration");
            ei_base.integrate = ei.integrate;
            ei_base.location = ei.location;
        }

        var new_cmps_to_integrate_exist = function()
        {
            var cmps = prod.ComponentsFullSet();
            for(var i in cmps)
                if(cmps[i].CustomObjects().Item("EclipseIntegration") && cmps[i].Action() == prod.action_t.install)
                        return true;

            return false;
        }

        var cmps_to_integrate_exist = function()
        {
            var cmps = prod.ComponentsFullSet();
            for(var i in cmps)
            {
                if(cmps[i].CustomObjects().Item("EclipseIntegration"))
                {
                    if(cmps[i].Action() == prod.action_t.install ||
                       (cmps[i].State() == prod.state_t.installed && cmps[i].Action() != prod.action_t.remove)
                      )
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        var show_dlg_eclipse_integration = function()
        {
            var im = prod.InstallMode();

            var ei = prod.CustomObjects().Item("EclipseIntegration");
            if( im == prod.install_mode_t.install || im == prod.install_mode_t.modify )
            {
                if(cmps_to_integrate_exist()) return true;
            }
            else if( im == prod.install_mode_t.repair ) //do not set integration to 0 in repair
                return false;

            if(ei) ei.integrate = 0;
            return false;
        }

        var collect_cmps_for_eclipse = function()
        {
            cmps_intgr_eclps = [];
            cmps_unintgr_eclps = [];

            var cmps = prod.ComponentsFullSet();
            for(var i in cmps)
            {
                if(cmps[i].CustomObjects().Item("EclipseIntegration"))
                {
                    if(cmps[i].Action() == prod.action_t.install ||
                       (cmps[i].State() == prod.state_t.installed && cmps[i].Action() != prod.action_t.remove)
                      )
                    {
                        cmps_intgr_eclps.push(cmps[i]);
                    }
                    /*
                    else if(cmps[i].Action() == prod.action_t.remove)
                    {
                        cmps_unintgr_eclps.push(cmps[i]);
                    }
                    */
                }
            }

            for(var k in ns_inst.Installer.Products)
            {
                var tp = ns_inst.Installer.Products[k];
                var ucmps = tp.ComponentsFullSet();

                for(var i in ucmps)
                {
                    if(ucmps[i].CustomObjects().Item("EclipseIntegration"))
                    {
                        if(ucmps[i].Action() == tp.action_t.remove)
                        {
                            cmps_unintgr_eclps.push(ucmps[i]);
                            Log("eclipse unintegration scheduled for prod = " + tp.Id() + " cmp.Name = " + ucmps[i].Name());
                        }
                    }
                }

            }
        }

        //ns.EclipseIntegration.Skip = function(){ return !show_dlg_eclipse_integration(); }
        ns.EclipseIntegration.Skip = function()
        {
            ns.SetOwnEclipseLocation();
            var ei = prod.CustomObjects().Item("EclipseIntegration");
            if(ei)
                prod.ConfigurationOptions().Value("ECLIPSEDIR",  ei.location);

            return true;
        }

        ns.EclipseIntegration.OnNext = function(val)
        {
            if(arguments.length)
            {
                var ei = prod.CustomObjects().Item("EclipseIntegration");
                /*var eclipse_cmp = ns.ComponentByAlias(prod, "eclipse");
                var jre_cmp = ns.ComponentByAlias(prod, "sys_dbg_jre");
                if(ns.EclipseIntegration.IsEmbeddedChecked())
                {
                    if(eclipse_cmp && jre_cmp)
                        eclipse_cmp.Action(prod.action_t.install);
                }
                else
                {
                    if(eclipse_cmp)
                    {
                        eclipse_cmp.Action(prod.action_t.none);
                    }
                }*/
                if(eclipse_cmp && jre_cmp)
                    eclipse_cmp.Action(prod.action_t.install);

                //if(ns.EclipseIntegration.IsChecked())
                {
                    ei.integrate = 1;
                    ei.location = val;
                    ei.pass = 1;
                }
                /*else
                {
                    ei.integrate = 0;
                    ei.location = "";
                    ei.pass = 1;
                }*/
            }
        }


        // function determine which java should be used to integrate into certain eclipse
        var get_java_exe_location_required_for_eclipse = function(eclipse_path)
        {
            if(!eclipse_path)
                return "";

            // getting info regarding eclipse to understand which java should be called for it
            var e_info = ns_ecl_inf ? ns_ecl_inf.EclipseInfo(eclipse_path) : null;

            var java_exe_location = "";
            var java_by_path = ns_java.InfoByPath(eclipse_path); //here we're trying to get info about own JRE in eclipse location
            if(java_by_path) //this is by no means the first priority, since eclipse will first use this one
            {
                java_exe_location = java_by_path.jre.max.exe; //yes, we have it
                return java_exe_location; //return it for the consequent use as a JRE location
            }	    

            if(e_info && e_info.arch == e_info.arch_t.x64)
            {
               var java_ver = (e_info && e_info.java_version) ? e_info.java_version : ns_ver.Version(0);

               if(!java ||
                  ((!java.jre || !java.jre.x64 || (!java_ver.IsNULL() && java.jre.x64.max.version.lt(java_ver))) &&
                   (!java.jdk || !java.jdk.x64 || (!java_ver.IsNULL() && java.jdk.x64.max.version.lt(java_ver)))
                  ))
               {
                   Log("java required for eclipse integration doesn't exists ver = " + java_ver.Str() + ". Ignore, lets try in any case.");
                   //return {exitcode : 1, output : fm("[java_required_for_eclipse_integration_not_installed]")};
               }
               else
               {
                   java_exe_location = (java.jre && java.jre.x64 && java.jre.x64.max) ? java.jre.x64.max.exe : ((java.jdk && java.jdk.x64 && java.jdk.x64.max) ? java.jdk.x64.max.exe : "");
               }
            }
            else
            {
               var java_ver = (e_info && e_info.java_version) ? e_info.java_version : ns_ver.Version(0);

               if(!java ||
                  ((!java.jre || !java.jre.x32 || (!java_ver.IsNULL() && java.jre.x32.max.version.lt(java_ver))) &&
                   (!java.jdk || !java.jdk.x32 || (!java_ver.IsNULL() && java.jdk.x32.max.version.lt(java_ver)))
                  ))
               {
                   Log("java required for eclipse integration doesn't exists ver = " + java_ver.Str() + ". Ignore, lets try in any case.");
                   //return {exitcode : 1, output : fm("[java_required_for_eclipse_integration_not_installed]")};
               }
               else
               {
                   java_exe_location = (java.jre && java.jre.x32 && java.jre.x32.max) ? java.jre.x32.max.exe : ((java.jdk && java.jdk.x32 && java.jdk.x32.max) ? java.jdk.x32.max.exe : "");
               }
             }
             // java location detection done
             return java_exe_location;
        }

        var integrate_cmp = function(cmps_array, eclipse_location)
        {
            var final_plugs_location_list = [];
            var final_plugs_location_string = "";
            var final_plgs_list = [];
            var final_plgs_string = "";
            var final_plgs_names_list = [];
            var final_plgs_names_string = "";
            var reps_list = [];
            var reps_string = "";
            var e_info = ns_ecl_inf ? ns_ecl_inf.EclipseInfo(eclipse_location) : null;
            var exe = "";
            var ret = null;
            var ret_cache = new Object(); //this cache is used to avoid requesting plugins from the same location more than once

            var java_exe_location = FileSystem.Directory(get_java_exe_location_required_for_eclipse(eclipse_location));
            Log("java_exe_location \"" + java_exe_location + "\" will be used.");

            var plgs = "";
            var arr = null;
            for(var c in cmps_array) //first, fetch locations of all archives
            {
                var cmp = cmps_array[c];
                Log("doing Eclipse integration for cmp " + cmp.Name());
                var ecl_itgr = cmp.CustomObjects().Item("EclipseIntegration");

                if(!eclipse_location)
                    eclipse_location = ecl_itgr["eclipse_location"];

                var plugs_location = StringList.FormatNamed(ecl_itgr["plugins_location"], {installdir : cmp.InstallDir()});
                var location_found = true; //this variable will be checked during fetching the list of plug-ins
                if(final_plugs_location_list.indexOf(plugs_location) == -1) //avoid adding identical entries
                {
                    final_plugs_location_list.push(plugs_location);
                    location_found = false;
                }
                var reps = plugs_location;
                for(var i in ecl_itgr["repositories"])
                {
                    reps += (reps == "" ? "" : ",") + StringList.FormatNamed(ecl_itgr["repositories"][i], {installdir : cmp.InstallDir()});
                }

                // getting info regarding eclipse to understand which java should be called for it
                if(e_info)
                {
                    iterate(e_info.repositories, function(repo)
                    {
                        reps += (reps == "" ? "" : ",") + repo;
                    });
                }
                if(reps)
                {
                    if(reps_list.indexOf(reps) == -1) //same for repositories
                        reps_list.push(reps);
                }
                if(!location_found) //if we already have this location, use cache, don't waste time
                {
                    //second, get plugins list from specified locations
                    exe = "\"" + eclipse_location + "\\eclipse.exe\" -nosplash -application org.eclipse.equinox.p2.director -repository " + plugs_location + " -l";
                    Log("integrate_cmp: get list of plugs for integration");
                    Log("integrate_cmp: launch cmd: \"" + exe + "\"");

                    //unfortunately, it's inevitable to call list for every plug-in
                    //some of them don't have plugins patterns and so that mask *.group will be used
                    //and pretty much all plugins match it
                    ret = CreateProcess("", exe, true, java_exe_location, ecl_int_timeout);

                    Log("integrate_cmp: cmd execution ret.failed = \"" + ret.failed + "\"");
                    Log("integrate_cmp: cmd execution ret.error = \"" + ret.error + "\"");
                    Log("integrate_cmp: cmd exit code : \"" + ret.exitcode + "\"");
                    Log("integrate_cmp: cmd output: \"" + ret.output + "\"");

                    if(ret.exitcode != 0 || ret.failed)
                        return ret;

                    ret_cache[plugs_location] = ret; //add current return value to hash by location
                }
                else
                {
                    Log("Current location already exists in the list. Fetch corresponding list of plug-ins");
                    ret = ret_cache[plugs_location]; //and here we get this return value by location
                }

                arr = ret.output.split("\r");

                Log("gathering plugins for cmp " + cmp.Name());
                var plugs = []; // common plugs names with version
                var plugs_names = null; // just name without version for deintegration previous versions

                var unshift_plugins = ecl_itgr["plugins_unshift"]; //this is implemented mainly for dependency gdb --before-> cdt

                for(var i in arr)
                {
                    var reg = new RegExp(ecl_itgr["plugins_patterns"] ? String(ecl_itgr["plugins_patterns"]).replace(/;/g, "|") : ".group", "ig");
                    if(arr[i].match(/^\s*$/) || !arr[i].match(/=/) || !arr[i].match(reg))
                        continue;

                    var founds = arr[i].match(/([\w\.\-]+)=/);
                    if(founds)
                    {
                      if(!plugs_names)
                        plugs_names = [];

                      plugs_names.push(founds[1]);
                    }

                    if(!unshift_plugins) //unshift means put into the beginning of the array, not into the end
                        plugs.push(arr[i].replace("=", "\/"));
                    else
                        plugs.unshift(arr[i].replace("=", "\/"));
                }

                plgs = plugs.join(",");
                var plgs_names = plugs_names ? plugs_names.join(",") : "";

                Log("integrate_cmp: list of plugs for integration=  " + plgs);
                Log("integrate_cmp: list of plugs names for integration=  " + plgs_names);
                if(plgs_names)
                {
                    if(!unshift_plugins)
                        final_plgs_names_list.push(plgs_names);
                    else
                        final_plgs_names_list.unshift(plgs_names);
                }
                ecl_itgr["plugins"] = plgs;

                if(ecl_itgr["plugins_prefs"]) //copy preferences file if defined
                {
                    // get plugins preferences file
                    var plugins_preferences = ecl_itgr["plugins_prefs"];
                    plugins_preferences = plugins_preferences.replace(/\[installdir\]/ig, prod.InstallDir());
                    plugins_preferences = plugins_preferences.replace(/\//g, "\\");
                    plugins_preferences = plugins_preferences.replace(/\"/g, "");
                    Log("integrate_cmp: plugins preferences file was defined = " + plugins_preferences);

                    // next - read eclipse configuration file
                    var prefs_content = FileSystem.ReadFileUTF8(FileSystem.MakePath(plugins_preferences));
                    var updated_prefs_content = prefs_content;
                    // if plugins_installdir_var was defined replace it with actual installation directory
                    if(ecl_itgr["plugins_installdir_var"])
                    {
                        Log("integrate_cmp: plugins_installdir_var was defined " + ecl_itgr["plugins_installdir_var"]);
                        var reg_installdir = new RegExp(ecl_itgr["plugins_installdir_var"], "ig");
                        updated_prefs_content = String(prefs_content).replace(reg_installdir, prod.InstallDir());
                        updated_prefs_content = String(updated_prefs_content).replace(/\\/g, "\\\\");
                    }
                    // write the result into eclipse/configuration/.settings directory
                    var eclipse_settings_dir = FileSystem.MakePath("configuration", eclipse_location + "\\");
                    eclipse_settings_dir = FileSystem.MakePath(".settings", eclipse_settings_dir);
                    FileSystem.CreateDirectory(eclipse_settings_dir);
                    // get the name of the prefs file by slicing the initial string from the index of character next to the last slash
                    var prefs_file_name = String(plugins_preferences).slice(String(plugins_preferences).lastIndexOf("\\") + 1);
                    prefs_file_name = prefs_file_name.replace(/\"/g, ""); //remove quotes if there are any
                    var eclipse_config_file = FileSystem.MakePath(prefs_file_name, eclipse_settings_dir);
                    Log("integrate_cmp: preferences destination = " + eclipse_config_file);
                    FileSystem.WriteFileUTF8(eclipse_config_file, updated_prefs_content);
                }


                var prev_eclipse_location = ecl_itgr["eclipse_location"];

                if(!unshift_plugins)
                    final_plgs_list.push(plgs);
                else
                    final_plgs_list.unshift(plgs);
	    }

            reps_string = reps_list.join(",");
            final_plugs_location_string = final_plugs_location_list.join(",");
            Log("final_plugs_location : " + final_plugs_location_string);

            if(prev_eclipse_location && prev_eclipse_location != eclipse_location)
            {
                deintegrate_cmp(cmps_array);
            }
            final_plgs_string = final_plgs_list.join(",");
            Log("final_plgs : " + final_plgs_string);
            final_plgs_names_string = final_plgs_names_list.join(",");
            if(final_plgs_names_string)
            {
              // unregister previous version if any
              /*exe = "\"" + eclipse_location + "\\eclipse.exe\" -nosplash -application org.eclipse.equinox.p2.director -u " + final_plgs_names_string;
              Log("integrate_cmp: deintegration of the previous plugins versions ");
              Log("integrate_cmp: launch cmd: \"" + exe + "\"");
              ret = CreateProcess("", exe, true, java_exe_location, ecl_int_timeout);

              Log("integrate_cmp: cmd exit code : \"" + ret.exitcode + "\"");
              Log("integrate_cmp: cmd output: \"" + ret.output + "\"");*/
              // it is not applicable to do an unintegration of a bunch of plugins at once
              // need something more intellectual here
              // we will need to unintegrate plugins one by one
              // but we don't need to do it this is the first install of system studio
              // hence, unintegration will only be necessary if we already have installed system studio
              // or if we're trying to integrate into users' eclipse

              var found_iss_lt = false; //at first, we need to detect if system studio is already installed
              var found_iss_wt = false;

              var installed_prods = ns_inst.Installer.Products;
              for(var i in installed_prods)
              {
                  Log("Found installed product: " + installed_prods[i].Id() + ", " + installed_prods[i].Name());

                  if(installed_prods[i].Name().match(/system studio/i) && installed_prods[i].Name().match(/for windows/i) && installed_prods[i].Version().ge("2017") && String(installed_prods[i].ImagesList()).match(/\bpsxe\b/i))
                  {
                      Log("Found ISS Windows Target: " + installed_prods[i].Name());
                      found_iss_wt = true;
                  }

                  if(installed_prods[i].Name().match(/system studio/i) && !installed_prods[i].Name().match(/for windows/i) && installed_prods[i].Version().ge("2017") && String(installed_prods[i].ImagesList()).match(/\bpsxe\b/i))
                  {
                      Log("Found ISS Linux Target: " + installed_prods[i].Name());
                      found_iss_lt = true;
                  }
              }
              var ei = prod.CustomObjects().Item("EclipseIntegration");
              var install_in_user_eclipse = (ei.install == 0); //it means that we do not install our own eclipse
              if(found_iss_lt || found_iss_wt || install_in_user_eclipse)
              {
                  for(var current_plugin in final_plgs_names_list)
                  {
                      exe = "\"" + eclipse_location + "\\eclipse.exe\" -nosplash -application org.eclipse.equinox.p2.director -u " + final_plgs_names_list[current_plugin];
                      Log("integrate_cmp: deintegration of the previous plugins versions ");
                      Log("integrate_cmp: launch cmd: \"" + exe + "\"");
                      ret = CreateProcess("", exe, true, java_exe_location, ecl_int_timeout);

                      Log("integrate_cmp: cmd exit code : \"" + ret.exitcode + "\"");
                      Log("integrate_cmp: cmd output: \"" + ret.output + "\"");
                  }
              }
            }
            // try to integrate without additional repositories
            exe = "\"" + eclipse_location + "\\eclipse.exe\" -nosplash -application org.eclipse.equinox.p2.director -repository " + final_plugs_location_string + " -i " + final_plgs_string;
            Log("integrate_cmp: an attempt of the integration into eclipse without additional repositories: \"" + eclipse_location + "\"");
            Log("integrate_cmp: launch cmd: \"" + exe + "\"");
            ret = CreateProcess("", exe, true, java_exe_location, ecl_int_timeout);

            Log("integrate_cmp: cmd exit code : \"" + ret.exitcode + "\"");
            Log("integrate_cmp: cmd output: \"" + ret.output + "\"");

            if( ret.exitcode != 0 && reps != plugs_location)
            {
              exe = "\"" + eclipse_location + "\\eclipse.exe\" -nosplash -application org.eclipse.equinox.p2.director -repository " + reps_string + " -i " + final_plgs_string;
              Log("integrate_cmp: integration into eclipse (with using additional repositories): \"" + eclipse_location + "\"");
              Log("integrate_cmp: launch cmd: \"" + exe + "\"");
              ret = CreateProcess("", exe, true, java_exe_location, ecl_int_timeout);

              Log("integrate_cmp: cmd exit code : \"" + ret.exitcode + "\"");
              Log("integrate_cmp: cmd output: \"" + ret.output + "\"");
            }

            if(!ret.failed && ret.exitcode == 0)
                ecl_itgr["eclipse_location"] = eclipse_location;

            return ret;
        }

        var deintegrate_cmp = function(cmps_array)
        {
            var cmp = null;
            var plgs_list = [];
            var plgs_string = "";
            var ecl_dir = "";
            for(var index in cmps_array)
            {
                cmp = cmps_array[index];
                Log("doing Eclipse unintegration for cmp " + cmp.Name());
                var ecl_itgr = cmp.CustomObjects().Item("EclipseIntegration");

                var plgs = ecl_itgr["plugins"];
                ecl_dir = ecl_itgr["eclipse_location"];
                if(plgs)
                    plgs_list.push(plgs);
            }
            plgs_string = plgs_list.join(",");

            if(ecl_dir)
            {
                var java_exe_location = FileSystem.Directory(get_java_exe_location_required_for_eclipse(ecl_dir));
                Log("java_exe_location \"" + java_exe_location + "\" will be used.");

                var exe = "\"" + ecl_dir + "\\eclipse.exe\" -nosplash -application org.eclipse.equinox.p2.director -u " + plgs_string;
                Log("ExecEclipseIntegration: launch cmd: \"" + exe + "\"");

                var ret = CreateProcess("", exe, true, java_exe_location, ecl_int_timeout);

                Log("deintegrate_cmp: cmd execution ret.failed = \"" + ret.failed + "\"");
                Log("deintegrate_cmp: cmd execution ret.error = \"" + ret.error + "\"");
                Log("deintegrate_cmp: cmd exit code : \"" + ret.exitcode + "\"");
                Log("deintegrate_cmp: cmd output: \"" + ret.output + "\"");

                ecl_itgr["eclipse_location"] = "";

                return ret;
            }

            return {exitcode : 0, output : ""};
        }

        ns.ExecEclipseUnIntegration = function()
        {
            if(ns.ExecEclipseUnIntegration.Done)
                return Action.r_ok;

            ns.ExecEclipseUnIntegration.Done = true;

            // just in case if java was recently installed
            java = ns_java.Info();

            var ei = prod.CustomObjects().Item("EclipseIntegration");

            if(!cmps_to_integrate_exist())
            {
                ei.integrate = 0;
                ei.location = "";
            }

            collect_cmps_for_eclipse();

            if(!ei.integrate)
            {
                //for(var c in cmps_intgr_eclps)
                //    deintegrate_cmp(cmps_intgr_eclps[c]);
                deintegrate_cmp(cmps_intgr_eclps);
            }

            /*for(var c in cmps_unintgr_eclps)
                deintegrate_cmp(cmps_unintgr_eclps[c]);*/
            deintegrate_cmp(cmps_unintgr_eclps);

            return Action.r_ok;
        }

        ns.ExecEclipseIntegration = function()
        {
            if(ns.ExecEclipseIntegration.Done)
                return Action.r_ok;

            ns.ExecEclipseIntegration.Done = true;

            // just in case if java was recently installed need to refresh java info
            java = ns_java.Info();

            var ei = prod.CustomObjects().Item("EclipseIntegration");

            if(!cmps_to_integrate_exist())
            {
                ei.integrate = 0;
                ei.location = "";
            }

            collect_cmps_for_eclipse();

            if(ei.integrate)
            {
                var integration_failed = 1;
                //for(var c in cmps_intgr_eclps)
                {
                    //var ret = integrate_cmp(cmps_intgr_eclps[c], ei.location);
                    var ret = integrate_cmp(cmps_intgr_eclps, ei.location);

                    if(ret.failed || ret.exitcode != 0)
                    {
                        var res = "";
                        var error_mes = fm("[eclipse_integration_failed_general_message]");

                        if(ret.failed)
                        {
                            error_mes = fm("[eclipse_integration_failed_because_of_eclipse_error]", ret.error);
                        }
                        else if(ret.output)
                        {
                            res = ret.output.match(/log file location:\s*(.+)/i);
                            if(res)
                                error_mes = fm("[eclipse_integration_failed_with_message_from_log]", res[1]);
                            else
                                error_mes = fm("[eclipse_integration_failed_with_message_from_log]", " Log file location is not defined");
                        }

                        if(!ns_inst.Installer.Silent() && "cancel" == Action.MessageBox({title: fm("[eclipse_integration_failed_general_message]"), text: error_mes, icon: "error", buttons: "okcancel"}))
                        {
                            Wizard.Abort();
                            return Action.r_error;
                        }
                    }
                    else
                      integration_failed = 0;
                }

                if(integration_failed)
                {
                    ei.integrate = 0;
                    ei.location = "";
                }
            }

            return Action.r_ok;
        }

        var add_ecl_unintegration_to_dmp = function(dmp)
        {
            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format("Processing Eclipse integration");

            var exe = {};

            exe.Apply = function()
            {
                return ns.ExecEclipseUnIntegration();
            }

            exe.Rollback = function()
            {
                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            if(dmp && dmp.IsDumper)
            {
                var a = dmp.AddAction(exe, "Eclipse integration");
                a.Attribute("countable", true);
                a.Attribute("name", "Eclipse integration");
            }
        }

        var add_ecl_action_to_dmp = function(dmp)
        {
            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format("Processing Eclipse integration");

            var exe = {};

            exe.Apply = function()
            {
                return ns.ExecEclipseIntegration();
            }

            exe.Rollback = function()
            {
                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            if(dmp && dmp.IsDumper)
            {
                var a = dmp.AddAction(exe, "Eclipse integration");
                a.Attribute("countable", true);
                a.Attribute("name", "Eclipse integration");
            }
        }

        if(eclipse_integration_supported())
        {
            ns_inst.Installer.Apply.SubscribeOnEnd(function()
            {
                if(prod.InstallMode() == prod.install_mode_t.repair) //don't do anything in repair, it breaks current integration
                    return;

                if(ns_inst.Installer.UDumper.IsEmpty())
                {
                    add_ecl_unintegration_to_dmp(ns_inst.Installer.IDumper.PreAction());
                    Log("add_ecl_unintegration_to_dmp IDumper.PreAction");
                }
                else
                {
                    add_ecl_unintegration_to_dmp(ns_inst.Installer.UDumper.PreAction());
                    Log("add_ecl_unintegration_to_dmp UDumper.PreAction");
                }

                add_ecl_action_to_dmp(ns_inst.Installer.IDumper.PostAction().PreAction());
                Log("add_ecl_action_to_dmp IDumper.PostAction");
            });

        }
       
        
        
        
        var eclipse_dlg_shown_custom = false;

        var show_dlg_eclipse_def = function()
        {
            if(ns.EclipseIntegration.Skip && ns.EclipseIntegration.Skip())
                return false;

            if(eclipse_dlg_shown_custom)
                return false;

            return true;
        }

        ns.EclipseIntegrationDefButtonsIdentifier = ns.EclipseIntegrationDefButtonsIdentifier ? ns.EclipseIntegrationDefButtonsIdentifier : function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        ns.EclipseIntegrationDef = function()
        {
            //ns.EclipseIntegration.Buttons = ns.EclipseIntegrationDefButtonsIdentifier;
            // this should be removed when the common fix is ready
            //ns.EclipseIntegration.Refresh = function(){ ns.Buttons("[Install]", "[Prev]", "[Cancel]"); }
            return ns.EclipseIntegration();
        }
        ns.EclipseIntegrationDef.Skip = function(){return !show_dlg_eclipse_def();};

        ns.EclipseIntegrationCustom = function()
        {
            /*if(!ns.EclipseIntegration.Buttons)
                ns.EclipseIntegration.Buttons = function(){ ns.Buttons("[Next]", "[Prev]", "[Cancel]"); }*/

            var ret = ns.EclipseIntegration();

            if(ret == Action.r_ok)
            {
                eclipse_dlg_shown_custom = true;
            }
            else
            {
                eclipse_dlg_shown_custom = false;
            }

            return ret;
        }
        ns.EclipseIntegrationCustom.Skip = ns.EclipseIntegration.Skip;
        
        ns.EclipsePatchFile = function()
        {
            var patch_var_in_file = function()
            {
                var f = FileSystem.MakePath("ide_support_2019\\eclipse\\com.intel.iss.ide.integration.main.prefs", prod.InstallDir());
                if (!FileSystem.Exists(f))
                {
                    Log("EclipsePatchFile: file " + f + " doesn't exist. Nothing to patch")
                    return;
                }
                
                var cont = FileSystem.ReadFileUTF8(f);
                
                if(!cont)
                {
                    Log("EclipsePatchFile: file " + f + " is empty. Nothing to patch")
                    return;
                }
                var cont_new = cont.replace(/\$ISS_2019_INSTALL_DIR/g, prod.InstallDir());
                if (cont_new == cont)
                {
                    Log("EclipsePatchFile: file " + f + " doesn't contain $ISS_2019_INSTALL_DIR. Nothing to patch. Content: " + cont_new);
                    return;
                }
                //patching    
                FileSystem.WriteFileUTF8(f, cont_new);
                return true;
            }
            
            var component_by_alias = function (alias) {
                return prod.FilterComponentsRecursive(function (cmp) { return cmp.Info().Property("alias") == alias ? true : false; });
            }
            
                     
            var cmp = component_by_alias("COMMON_ECLIPSE_IDE");
            if(!cmp)
            {
                Log("EclipsePatchFile: component COMMON_ECLIPSE_IDE wasnt't found");
                return;
            }
            
            Log("EclipsePatchFile: schedulling dumper action");
            cmp.Configurator().Apply.DoInstall.SubscribeOnEnd(function(dmp)
            {
                var act = new ns_dmp.Dumper();                
                act.hidden = true;
                act.AddAction({Apply : function()
                {
                    Log("EclipsePatchFile: patching the file after install, cmp " + cmp.Name());
                    patch_var_in_file();
                    return Action.r_ok;
                }}, "apply eclipse patch, cmp.id = " + cmp.Id());

                dmp.AddAction(act, "Patch " + cmp.Name());

                return true;
            });
        }
        

        Log("Scenario::eclipse_integration: actions generation completed");
        return ns;
    }
}


