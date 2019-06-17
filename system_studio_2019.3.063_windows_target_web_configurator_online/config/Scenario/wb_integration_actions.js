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

    var fm = StringList.Format;

    var ns_inst      = Namespace("Root.installer");
    var ns_cont      = base("container.js");
    var ns_prop      = base("property.js");
    var ns_dump      = base("dumper.js");
    var ns_d_file    = base("dumper_file.js");

    var ConstP = function(val){return ns_prop.Constant(val);}

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

        Log("Scenario::wb_integration: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        var first_visible_parent = function(obj)
        {
            var parent = obj;

            for (; (parent && (!parent.Visible || !parent.Visible())); parent = parent.Parent());

            return parent;
        }

        var wb_integration_supported = function()
        {
            if(prod.CustomObjects().Item("WBIntegration"))
            {
                Log("prod WBI defined");
                return true;
            }

            var cmps = prod.ComponentsFullSet();
            for(var i in cmps)
            {
                if(cmps[i].CustomObjects().Item("WBIntegration"))
                {
                    Log("prod WBI not defined");
                    prod.CustomObjects().Add("WBIntegration", {integrate : 0, location : ""});
                    return true;
                }
            }

            return false;
        }

        //###############################################################
        ns.ApplyUserSettings.Add(function(provider)
        {
            if(!wb_integration_supported()) return;

            if(provider.CustomObjects().Item("WBIntegration"))
            {
                var item = provider.CustomObjects().Item("WBIntegration");
                if(item)
                {
                    var wb = prod.CustomObjects().Item("WBIntegration");
                    wb.integrate = item.integrate;
                    wb.location = item.location;
                    Log(" provider wb.integrate = " + wb.integrate + " prod wb.location = " + wb.location);
                    ns.WBIntegration.SetChecked(wb.integrate);
                    ns.WBIntegration.Set(wb.location);
                 }
            }
        });

        var check_wb_path_is_valid = function(path)
        {
            var wb_path = path;
            var wb_valid = false;

            Log("wb path = " + wb_path);

            var ret = {};
            ret.error_t = {};
            ret.error_t.ok = "ok";
            ret.error_t.incorrect_path = "incorrect_path";
            ret.error_t.incorrect_version = "incorrect_version";

            var error_code = ret.error_t.ok;
            var error_mes = "";

            ret.ErrorCode = function(){return error_code;};
            ret.ErrorMessage = function(){return error_mes;};

            if(!(FileSystem.Exists(wb_path) && FileSystem.IsDirectory(wb_path)))
            {
                error_code = ret.error_t.incorrect_path;
                error_mes = StringList.Format("[wb_location_not_valid_file]");
                return ret;
            }

            var props =  FileSystem.ReadFileUTF8(FileSystem.MakePath("install.properties", wb_path));
            if(!props)
            {
                error_code = ret.error_t.incorrect_path;
                error_mes = StringList.Format("[wb_location_not_valid_file]");
                return ret;
            }
            else if(!props.match(/version=[56]/gmi))
            {
                error_code = ret.error_t.incorrect_version;
                error_mes = StringList.Format("[wb_not_supported_version_file]");
                return ret;
            }

            return ret;
        }

        // it also initializes prod.CustomObjects().Item("WBIntegration") if it is not defined yet
        if(wb_integration_supported())
        {
            var wb = prod.CustomObjects().Item("WBIntegration");
            Log(" prod wb.integrate = " + wb.integrate + " prod wb.location = " + wb.location);
            ns.WBIntegration.SetChecked(wb.integrate);
            ns.WBIntegration.Set(wb.location);
        }

        var cmp_can_be_integrated = function(cmp)
        {
            if(!cmp || !cmp.CustomObjects().Item("WBIntegration"))
              return false;

            if(cmp.Action() == cmp.action_t.install ||
               (cmp.State() == cmp.state_t.installed && cmp.Action() != cmp.action_t.remove)
              )
            {
                return true;
            }
            else
            {
                var obj = cmp;
                var vp = first_visible_parent(obj);
                var pact = vp.Action();
                var pstate = (vp.Type && vp.Type() == "product") ? vp.ProductState() : vp.State();

                // if visible parent isn't going to be removed or going to be intsalled then its wb_integration component should be processed according to the user's choises on wb_integration dlg
                if( pact != obj.action_t.remove && !(pact == obj.action_t.none && pstate == obj.state_t.absent))
                {
                    return true;
                }
            }

            return false;
        }

        var new_cmps_to_integrate_exist = function()
        {
            return prod.FilterComponentsRecursive(function(cmp)
            {
                if(cmp.CustomObjects().Item("WBIntegration"))
                {
                    if(cmp.Action() == cmp.action_t.install)
                    {
                        return true;
                    }
                    else
                    {
                        var obj = cmp;
                        var vp = first_visible_parent(obj);
                        var pact = vp.Action();
                        var pstate = (vp.Type && vp.Type() == "product") ? vp.ProductState() : vp.State();

                        // if visible parent isn't going to be removed or going to be intsalled then its wb_integration component should be processed according to the user's choises on wb_integration dlg
                        if( pact != obj.action_t.remove && !(pact == obj.action_t.none && pstate == obj.state_t.absent))
                        {
                            if(cmp.Action() == cmp.action_t.none && cmp.State() == cmp.state_t.absent)
                                return true;
                        }
                    }
                }
            });

            //return prod.FilterComponentsRecursive(function (cmp) { return (cmp.CustomObjects().Item("WBIntegration") && cmp.Action() == cmp.action_t.install) ? true : false; });
        }

        var cmps_to_integrate_exist = function()
        {
            return prod.FilterComponentsRecursive(function(cmp)
            {
                if(cmp.CustomObjects().Item("WBIntegration"))
                {
                    if(cmp.Action() == cmp.action_t.install ||
                       (cmp.State() == cmp.state_t.installed && cmp.Action() != cmp.action_t.remove)
                      )
                    {
                        cmp.Log("cmp for wb exists");
                        return true;
                    }
                    else
                    {
                        /*var obj = cmp;
                        var vp = first_visible_parent(obj);
                        var pact = vp.Action();
                        var pstate = (vp.Type && vp.Type() == "product") ? vp.ProductState() : vp.State();

                        // if visible parent isn't going to be removed or going to be intsalled then its wb_integration component should be processed according to the user's choises on wb_integration dlg
                        if( pact != obj.action_t.remove && !(pact == obj.action_t.none && pstate == obj.state_t.absent))
                        {
                            cmp.Log("cmp for wb exists");
                            return true;
                        }*/
                    }
                }
            });
        }

        var wb_dlg_required = function()
        {
            var im = prod.InstallMode();
            if(im != prod.install_mode_t.install && im != prod.install_mode_t.modify)
                  return false;

            return cmps_to_integrate_exist();
        }

        ns.WBIntegration.OnChange = function(val){ }
        ns.WBIntegration.Refresh = ns.WBIntegration.OnChange;

        var exit_allowed_prev = ns.WBIntegration.ExitAllowed;

        ns.WBIntegration.ExitAllowed = function(wb_path)
        {
            if(exit_allowed_prev && !exit_allowed_prev(wb_path))
                return false;

            if(!ns.WBIntegration.IsChecked())
                return true;

            //var wmi_query = "Select * from Win32_Process where CommandLine LIKE '%-name \"Wind River Workbench\"%' AND ExecutablePath LIKE '%" + wb_path + "%'";
            var path_to_check = wb_path;
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

                Action.MessageBox({title: fm("[wb_integration_is_running_title]"), text: fm("[wb_integration_is_running_message]"), icon: "warning", buttons: "ok" });

                return false;
            }

            return true;
        }

        var DeIntegrateFromWB = function(cmd)
        {
            Log("deintegrate from WB: launch cmd: \"" + cmd + "\"");

            var ret = CreateProcess("", cmd, true);

            if(ret.exitcode != 0)
                Log("WB deintegration failed, exitcode = " + ret.exitcode);

            Log("WB deintegration successful, exitcode = " + ret.exitcode);

            return Action.r_ok;
        }

        var IntegrateToWB = function(cmd)
        {
            //var exe = "\"" + path + "\\wr-iss-2015\\wr-setup\\postinst_wr_iss.bat\"";
            Log("integrate into WB: launch cmd: \"" + cmd + "\"");

            var ret = CreateProcess("", cmd, true);

            if(ret.exitcode != 0)
            {
                var error_title = fm("[wb_integration_failed_title]");
                var error_mes = fm("[wb_integration_failed_description]");

                Log("WB integration failed, exitcode = " + ret.exitcode);

                if(!ns_inst.Installer.Silent() && "cancel" == Action.MessageBox({title: error_title, text: error_mes, icon: "error", buttons: "okcancel"}))
                {
                    Wizard.Abort();

                    return {exitcode : ret.exitcode, action_result : Action.r_error};
                }

                return {exitcode : ret.exitcode, action_result : Action.r_ok};
            }

            Log("WB integration successful, exitcode = " + ret.exitcode);

            return {exitcode : ret.exitcode, action_result : Action.r_ok};
        }

        // integration
        //var wb_integration_action = function(cmp, wb_location, params)
        var wb_integration_action = function(cmp, wb_location)
        {
            if(!cmp)
            {
              Log(Log.l_warning, "generate wb_integration_action, component is undefined, ignore" );
              return null;
            }

            cmp.Log("wb_integration_action_dmp generation start");
            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format("[wb_integration_progress_message]");

            var wb = cmp.CustomObjects().Item("WBIntegration");
            if(!wb)
            {
                cmp.Log(Log.l_warning, "wb_integration_action_dmp generation failed CustomObject WBIntegration isn't defined. Ignore");
                return {};
            }

            var prod_wb = prod.CustomObjects().Item("WBIntegration");

            if(!wb["integrate_script"] || wb["integrate_script"] == "")
            {
                return {};
            }

            var exe = {};

            exe.Apply = function()
            {
                // we should deintegrate from the required location just to make it clean
                var cmdu = "\"" + FileSystem.MakePath(wb["deintegrate_script"], wb_location) + "\"";
                DeIntegrateFromWB(cmdu);

                var cmdi = FileSystem.MakePath(wb["integrate_script"], wb_location);

                var params = wb["integrate_params"]
                if(params)
                {
                    StringList.Replace("COMPONENTINSTALLDIR", cmp.InstallDir());
                    StringList.Replace("PRODUCTINSTALLDIR", prod.InstallDir());

                    params = StringList.Format(params);

                    cmdi = "\"" + cmdi + "\"" + " " + params;
                }

                var ret = IntegrateToWB(cmdi);

                if(ret.exitcode == 0)
                {
                    //Log("saving wb integration data for cmp loc =" + wb_location);
                    wb.integrate = 1;
                    wb.location = wb_location;

                    if(prod_wb)
                    {
                        //Log("saving wb integration data for prod");
                        // as a result after actions for all components are executed we will have right status in the prod_wb
                        // if at least one component was integrated then product is integrated
                        prod_wb.integrate = 1;
                        prod_wb.location = wb_location;
                    }
                }
                else
                {
                    wb.integrate = 0;
                    wb.location = "";
                }

                return ret.action_result;
            }

            exe.Rollback = function()
            {
                var cmd = "\"" + FileSystem.MakePath(wb["deintegrate_script"], wb_location) + "\"";

                wb.integrate = 0;
                wb.location = "";

                if(prod_wb)
                {
                    Log("removing wb integration data for prod");
                    // as a result after actions for all components are executed we will have right status in the prod_wb
                    // if at least one component was integrated then product is integrated
                    prod_wb.integrate = 0;
                    prod_wb.location = "";
                }

                return DeIntegrateFromWB(cmd);
            }

            exe.ProgressApply = function() {return prg;}

            return exe;
        }

        // DEintegration
        var wb_deintegration_action = function(cmp)
        {
            if(!cmp)
            {
              Log(Log.l_warning, "generate wb_deintegration_action, component is undefined, ignore" );
              return null;
            }

            cmp.Log("wb_integration_action_dmp generation start");

            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format("[wb_deintegration_progress_message]");

            var wb = cmp.CustomObjects().Item("WBIntegration");
            if(!wb)
            {
                cmp.Log(Log.l_warning, "wb_deintegration_action generation failed CustomObject WBIntegration isn't defined. Ignore");
                return {};
            }

            if(!wb["deintegrate_script"] || wb["deintegrate_script"] == "" || !wb.location)
            {
                return {};
            }

            var exe = {};

            exe.Apply = function()
            {
                var cmd = "\"" + FileSystem.MakePath(wb["deintegrate_script"], wb.location) + "\"";

                wb.integrate = 0;
                wb.location = "";

                return DeIntegrateFromWB(cmd);
            }

            exe.Rollback = function()
            {
                return Action.r_ok
            }

            exe.ProgressApply = function() {return prg;}

            return exe;
        }

        // following function returns status regarding required integration options
        // analize cmd parameters and dialogs (depending on mode)
        var get_required_integration_status = function()
        {
            var wb = {};

            wb.integrate = 0;
            wb.location = "";

            if(!ns_inst.Installer.Silent())
            {
                wb.integrate = ns.WBIntegration.IsChecked() ? 1 : 0;
                wb.location  = ns.WBIntegration.TargetPath();
            }
            else
            {
                var wb_location = GetOpt.Get("workbench_location");
                var ret = check_wb_path_is_valid(wb_location);

                if(GetOpt.Exists("workbench_location") && ret.ErrorCode() == ret.error_t.ok)
                {
                    wb.integrate = 1;
                    wb.location = wb_location;
                }
                else
                {
                    wb.integrate = 0;
                    wb.location = "";
                }
            }

            return wb;
        }

        var schedule_integration_to_wb = function(wb_location)
        {
            // following action is targeted to clean up product integration status before real integration actions
            // during integration actions the status will be set to the right one

            var reset_prod_wb_integration_status = {};
            reset_prod_wb_integration_status.Apply = function()
            {
                var wb = prod.CustomObjects().Item("WBIntegration");
                if(wb)
                {
                    wb.integrate = 0;
                    wb.location = "";
                }

                return Action.r_ok;
            }

            ns_inst.Installer.IDumper.PostAction().PostAction().AddAction(reset_prod_wb_integration_status, "reset product WB integration");

            var cmp_action_changed = false;

            var check_action_changed = function(cmp)
            {
              return function(act)
              {
                if(act == cmp.action_t.install || (act == cmp.action_t.none && cmp.State() == cmp.state_t.installed))
                {
                  cmp_action_changed = true;
                }
              }
            };

            prod.FilterComponentsRecursive(function(obj)
            {
                if(cmp_can_be_integrated(obj))
                {
                    obj.Action.Subscribe(check_action_changed(obj));

                    var iact = wb_integration_action(obj, wb_location, "\"" + prod.InstallDir() + "\"");
                    if(iact)
                    {
                        // action is added into PostAction().PostAction() due to copying files to WB location will be done in PostAction()
                        var a = ns_inst.Installer.IDumper.PostAction().PostAction().AddAction(iact, "WB integration");
                        a.Attribute("countable", true);
                        a.Attribute("name", "WB integration");
                    }

                    obj.ConfigurationOptions().Value("WBDIR", FileSystem.MakePath(wb_location));
                }
            });

            do
            {
                cmp_action_changed = false;
                prod.FilterComponentsRecursive(function(cmp)
                {
                    if(cmp_can_be_integrated(cmp))
                    {
                        if(cmp.State() == cmp.state_t.installed && wb.location != wb_location)
                            cmp.Action(cmp.action_t.reinstall);
                        else if(cmp.State() == cmp.state_t.absent)
                            cmp.Action(cmp.action_t.install);
                    }
                });
            }
            while(cmp_action_changed);
        }

        var schedule_deintegration = function()
        {
            prod.FilterComponentsRecursive(function(obj)
            {
                if(obj.CustomObjects().Item("WBIntegration"))
                {
                    //obj.Action(obj.action_t.remove);

                    var dact = wb_deintegration_action(obj);

                    if(dact)
                    {
                        var a = ns_inst.Installer.IDumper.PreAction().AddAction(dact, "WB deintegration");
                        a.Attribute("countable", true);
                        a.Attribute("name", "WB deintegration");
                    }
                }
            });

            var wb = prod.CustomObjects().Item("WBIntegration");
            if(wb)
            {
                wb.integrate = 0;
                wb.location = "";
            }
        }

        ns.ConfigureWBComponents = function()
        {
            Log("action ConfigureWBComponents");

            var wb_current = prod.CustomObjects().Item("WBIntegration");

            var wb_required = get_required_integration_status();
            
            if (!wb_current)
            {
                Log(" WBIntegration isn't defined. Continue...");
                return Action.r_ok;
            }

            Log(" wb_required.integrate = " + wb_required.integrate);
            Log(" wb_current.integrate = " + wb_current.integrate);
            Log(" wb_required.location = " + wb_required.location);
            Log(" wb_current.location = " + wb_current.location);

            if(wb_required.integrate != wb_current.integrate)
            {
                if(wb_required.integrate)
                {
                    schedule_deintegration();
                    schedule_integration_to_wb(wb_required.location);
                }
                else
                {
                    schedule_deintegration();
                }
            }
            else if(wb_required.integrate == 1 && !cmps_to_integrate_exist())
            {
                schedule_deintegration();
            }
            else if(wb_required.integrate == 1 && wb_required.location != wb_current.location)
            {
                schedule_deintegration();
                schedule_integration_to_wb( wb_required.location );
            }
            else if(wb_required.integrate == 1 && new_cmps_to_integrate_exist())
                schedule_integration_to_wb( wb_required.location );

            Log("action ConfigureWBComponents done");
            return Action.r_ok;
        }

        ns.ConfigureWBComponents.Skip = function()
        {
            return (prod.InstallMode() != prod.install_mode_t.install &&
                   prod.InstallMode() != prod.install_mode_t.modify && prod.InstallMode() != prod.install_mode_t.remove)
        }

        ns.ConfigureOptions.Add(ns.ConfigureWBComponents);

        //###############################################################
        // WBIntegration
        ns.WBIntegration.SetLabel("[wb_label]");
        ns.WBIntegration.SetCheckBoxLabel("[wb_check_box_label]");
        ns.WBIntegration.SetHeader(fm("[wb_header_file]"));
        ns.WBIntegration.SetFooter(fm("[wb_footer_message]"));

        ns.WBIntegration.OnPathCheck(function(path)
        {
            var ret = check_wb_path_is_valid(path);

            if(ret.ErrorCode() != ret.error_t.ok)
            {
                ns.WBIntegration.SetInfo(ret.ErrorMessage());
                return false;
            }

            return true;
        });

        ns.WBIntegration.Skip = function(){
        Log("wb required = " + wb_dlg_required());
        return !wb_dlg_required();}

        ns.WBIntegration.PreInstallMessageGenerator = function(msg)
        {
            var wb_current = prod.CustomObjects().Item("WBIntegration");
            var wb_required = get_required_integration_status();

            //var ei = prod.CustomObjects().Item("WBIntegration");
            if(wb_required.integrate != wb_current.integrate)
                msg.Custom(wb_required.integrate ? StringList.Format("[integration_with_wb]", wb_required.location.replace(/\\/g,"\\\\")) : StringList.Format("[deintegration_with_wb]", wb_current.location.replace(/\\/g,"\\\\")));
            else if(wb_required.integrate == 1 && !cmps_to_integrate_exist())
                msg.Custom(StringList.Format("[deintegration_with_wb]", wb_current.location.replace(/\\/g,"\\\\")));
            else if(wb_required.integrate == 1 && wb_required.location != wb_current.location)
            {
                msg.Custom(StringList.Format("[deintegration_with_wb]", wb_current.location.replace(/\\/g,"\\\\")));
                msg.Custom(StringList.Format("[integration_with_wb]", wb_required.location.replace(/\\/g,"\\\\")));
            }
            else if(wb_required.integrate == 1 && new_cmps_to_integrate_exist())
                msg.Custom(StringList.Format("[integration_with_wb]", wb_required.location.replace(/\\/g,"\\\\")));
        }

        ns.WBIntegration.PreInstallMessageGenerator.Skip = ns.WBIntegration.Skip;

        ns.PreInstall.AddMessageGenerator(ns.WBIntegration.PreInstallMessageGenerator, "WBIntegrationPreInstallMessage");

        var wb_dlg_shown_custom = false;

        var show_dlg_wb_def = function()
        {
            if(ns.WBIntegration.Skip && ns.WBIntegration.Skip())
                return false;

            if(wb_dlg_shown_custom)
                return false;

            return true;
        }

        ns.WBIntegrationDefButtonsIdentifier = ns.WBIntegrationDefButtonsIdentifier ? ns.WBIntegrationDefButtonsIdentifier : function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        ns.WBIntegrationDef = function()
        {
            ns.WBIntegration.Buttons = ns.WBIntegrationDefButtonsIdentifier;
            return ns.WBIntegration();
        }
        ns.WBIntegrationDef.Skip = function(){return !show_dlg_wb_def();};

        ns.WBIntegrationCustom = function()
        {
            if(!ns.WBIntegration.Buttons)
                ns.WBIntegration.Buttons = function(){ ns.Buttons("[Next]", "[Prev]", "[Cancel]"); }

            var ret = ns.WBIntegration();

            if(ret == Action.r_ok)
            {
                wb_dlg_shown_custom = true;
            }
            else
            {
                wb_dlg_shown_custom = false;
            }

            return ret;
        }
        ns.WBIntegrationCustom.Skip = ns.WBIntegration.Skip;

        Log("Scenario::wb_integration: actions generation completed");
        return ns;
    }
}
