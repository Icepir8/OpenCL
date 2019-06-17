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
    var ns_errhan = dialogs("error_handler.js");
    
    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "scenario:vs_integration:iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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
    
    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    var sleep = function(delay)
    {
        var d_beg = new Date();
        var d_end = null;
        do
        {
            d_end = new Date();
        }
        while(d_end - d_beg < delay);
    }
    
    var ns_inst = Namespace("Root.installer");
   
    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::vs_integration: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }
        var post_install_dumper_added = false;
        var post_install_rm_dumper_added = false;
        
        // ########################################################################
        // # VS integration data gathering start                                  #
        // ########################################################################
        var ns_vs = base("vs_processing.js").GetVSInfo();
        // ########################################################################
        // function which creates list of VS to integrate base on VSIntegration custom object for each component
        // it goes through the whole components list and creates combained list of the VSes
        // ########################################################################
        var vs_integration_status_list = function(_product)
        {
            var list = {};
            var cmps = _product.ComponentsFullSet();
            var offline_installation = !ns_inst.Installer.OnlineInstaller();

            for(var i in cmps)
            {
              var cmp = cmps[i];
              var vsi = cmp.CustomObjects().Item("VSIntegration");

              if(vsi)
              {
                //check for cmp.Source was added for DBInfo products, which don't have Source function
                //in case of DBInfo products, it doesn't matter, what value check_cmp_in_offline_mode contains -
                //property "disabled" shouldn't be inherited and should be taken from the main product
                var check_cmp_in_offline_mode = (offline_installation && (cmp.State() == cmp.state_t.installed || !cmp.Source || (cmp.Source() && cmp.Source().Resolved())));
                var check_cmp_in_online_mode = !offline_installation;

                for(var vs in vsi)
                {
                  Log("vs_integration_status_list adding  " + vs);

                  if(!list[vs])
                    list[vs] = {};

                  if(typeof(list[vs].fully_integrated) == "undefined")
                     list[vs].fully_integrated = 1;

                  if(typeof(list[vs].integrated) == "undefined")
                     list[vs].integrated = 0;

                  if(typeof(list[vs].disabled) == "undefined")
                     list[vs].disabled = 1;

                  list[vs].disabled = ((check_cmp_in_offline_mode || check_cmp_in_online_mode) ? 0 : 1) & list[vs].disabled; //if at least one component is going to be installed it will be 0
                  list[vs].fully_integrated = ((cmp.State() == cmp.state_t.installed && vsi[vs].integrated) ? 1 : 0) & list[vs].fully_integrated; // if not all components are integrated then it will be 0
                  list[vs].integrated = ((cmp.State() == cmp.state_t.installed && vsi[vs].integrated) ? 1 : 0) | list[vs].integrated;
                  list[vs].default_selected = (vsi[vs].default_selected ? 1 : 0) | list[vs].default_selected;
                }
              }
            }

            for(var j in list)
            {
              Log("vs_integration_status_list: the result list: " + j + " integr = " + list[j].integrated + " fint = " + list[j].fully_integrated + " disabled = " + list[j].disabled);
            }
            return list;
        }
        //########################################################################
        // function generates an array of vs_data objects for each vs
        // this array will be used for displaying VS lists on the dialog
        //########################################################################
        var gen_vs_data = function(list, _product)
        {
          var vs_data = [];
          var use_default_selection = false;

          if(_product.ProductState() == _product.state_t.absent)
          {
             use_default_selection = true;
             for(var l in list)
               if(list[l].integrated)
                 use_default_selection = false;
          }

          for(var vs_id in list)
          {
            var vs = ns_vs[vs_id];
            if(vs)
            {
                Log("gen_vs_data for " + vs_id);
                // attribute list[vs_id].new_added is generated only in case if there is settings provider and it doesn't contain this vs
                // in that case default selection should be used
                var vs_data_obj = {
                    title: StringList.Format ( "[" + vs.id + "]") ,
                    description: StringList.Format("[" + vs_id + "_description]"),
                    disabled: list[vs_id].disabled ? true : ((vs.dir && vs.devenv) ? false : true),
                    selected: ((vs.dir && vs.devenv) ? ((use_default_selection || list[vs_id].new_added) ? (list[vs_id].default_selected ? true : false) : (list[vs_id].integrated ? true : false)) : false),
                    id: vs_id,
                    label: StringList.Format("[" + vs_id + "_label]"),
                };

                if(vs.hasOwnProperty("instances") && typeof(VSSetupConfig) != "undefined")
                {
                    var ids = VSSetupConfig.GetIds();
                    vs_data_obj.incomplete = (vs.instances.length != ids.length ) ? true: false;
                }

                if(vs_data_obj.disabled)
                {
                    var shell = ComponentByAlias(_product, "shell_" + vs_id) || ComponentByAlias(_product, "shell_" + vs_id + "_jp");

                    if(shell && (shell.Action() == shell.action_t.install || shell.State() == shell.state_t.installed))
                    {
                        vs_data_obj.title = StringList.Format("[" + vs_id + "_shell_title]");
                        vs_data_obj.description = StringList.Format("[" + vs_id + "_shell_description]");
                        vs_data_obj.label = StringList.Format("[" + vs_id + "_shell_label]");
                        vs_data_obj.disabled = false;
                        vs_data_obj.selected = use_default_selection ? (list[vs_id].default_selected ? true : false) : (list[vs_id].integrated ? true : false);

                        //DB_info components don't have Subscribe method.
                        //Subscribing is not required for any other products loaded from cache
                        if (shell.Action.Subscribe)
                        {
                            shell.Action.Subscribe(function(new_val)
                            {
                                ns.GenerateVSIntegrationData();
                            })
                        }
                        if (shell.Disabled && shell.Disabled.Subscribe)
                        {
                            shell.Disabled.Subscribe(function(new_val)
                            {
                                ns.GenerateVSIntegrationData();
                            })
                        }

                    }
                }

                vs_data.push(vs_data_obj);
            }
            else
            {
              Log(Log.l_warning, vs_id + " isn't supported by engine! ");
            }
          }
          Log("VS DATA: " + JSON.stringify(vs_data));
          return vs_data;
        }

        // ########################################################################
        ns.GenerateVSIntegrationData = function()
        {
            var product_vs_list = vs_integration_status_list(prod);

            ns.VSIntegration.Data(gen_vs_data(product_vs_list, prod));

            return Action.r_ok;
        }
        // ########################################################################
        // function is used for getting user settings from already installed product
        ns.SetVSIntegrationUserChoiseFromAlreadyInstalledProduct = function(provider)
        {
            var product_vs_list = vs_integration_status_list(provider);

            // if user didn't perform integration for previous install the default settings should be left
            if(iterate(product_vs_list, function(obj)
            {
                if(obj.integrated)
                  return true;
            }))
            {
              // final vs list is intersection of the VSes supported by provider and current product
              // for example new VS support cn be added for current product, at the same time some old can be removed
              // new_added is targeted to inform gen_vs_data that this vs should be process with selection by default
              var final_list = {};
              var curr_product_vs_list = vs_integration_status_list(prod);
              for(var i in curr_product_vs_list)
              {
                  final_list[i] = curr_product_vs_list[i];
                  if(product_vs_list[i])
                  {
                    //inherit only "integrated" property
                    final_list[i].integrated = product_vs_list[i].integrated;
                  }
                  else
                  {
                    final_list[i].new_added = true;
                  }
              }
              ns.VSIntegration.Data(gen_vs_data(final_list, provider));
            }

            return Action.r_ok;
        }

        ns.ApplyUserSettings.Add(ns.SetVSIntegrationUserChoiseFromAlreadyInstalledProduct);
        // ########################################################################
        // # VS integration data gathering end                                    #
        // ########################################################################
        // ########################################################################
        // # VS integration dialog adjustment start                               #
        // ########################################################################

        // ########################################################################
        // function which performs check if the vsintegration dlg is required if any callback returns true then dlg is required
        // by default it returns true (if there are not any callbacks)
        // ########################################################################
        var vs_dlg_required_checkers = {};

        var check_vs_dlg_is_required = function()
        {
            var there_are_checkers = false;
            for(var i in vs_dlg_required_checkers)
            {
              there_are_checkers = true;

              if(vs_dlg_required_checkers[i].Skip && vs_dlg_required_checkers[i].Skip())
                continue;

              if(vs_dlg_required_checkers[i]())
                return true;
            }

            return there_are_checkers ? false : true;
        }
        
        //###############################################################
        // adding callbacks which called to check if continue is allowed or not
        // if any callback returns true then continue is allowed
        // each callback can have method Skip
        // usage:
        // ns.VSIntegration.DlgRequired(callback)
        // ns.VSIntegration.DlgRequired(callback, id)
        // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
        //###############################################################
        ns.VSIntegration.DlgRequired = function()
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
                Log("ns.VSIntegration.DlgRequired too many arguments for function call (> 2). Ignore.");
                return;
            }
            else
            {
                Log("ns.VSIntegration.DlgRequired was called without arguments -> need to check that continue is allowed");
                return check_vs_dlg_is_required();
            }

            if(!id)
              id = Guid();

            if(!vs_dlg_required_checkers[id])
            {
                vs_dlg_required_checkers[id] = obj;
                Log("ns.VSIntegration.DlgRequired: add continue_checker " + id);
            }
        }

        ns.VSIntegration.DlgRequired.Clear = function(){ vs_dlg_required_checkers = {}; }

        var vs_dlg_required = function()
        {
            Log("vs_dlg_required: started");
            var vs_enabled = false;

            var vs_idata = ns.VSIntegration.Data();

            for(var i in vs_idata)
                if(!vs_idata[i].disabled)
                    vs_enabled = true;

            var im = prod.InstallMode();
            Log("vs_dlg_required: im = " + im);
            Log("vs_dlg_required: vs_enabled = " + vs_enabled);

            var first_visible_parent = function(obj)
            {
                var parent = obj;
                for (; (parent && (!parent.Visible || !parent.Visible())); parent = parent.Parent());
                return parent;
            }

            if(vs_enabled && (im == prod.install_mode_t.install || im == prod.install_mode_t.modify))
            {
                if(iterate(prod.ComponentsFullSet(), function(obj)
                {
                   if(obj.CustomObjects().Item("VSIntegration"))
                   {
                        if(obj.Disabled() == obj.disabled_t.yes)
                        {
                            return false;
                        }
                        else if (obj.Action() == obj.action_t.install ||
                            (obj.State() == obj.state_t.installed && obj.Action() != obj.action_t.remove))
                        {
                            Log(": finished, vs dialog required");
                            return true;
                        }
                        else
                        {
                            var vp = first_visible_parent(obj);
                            var pact = vp.Action();
                            var pstate = (vp.Type && vp.Type() == "product") ? vp.ProductState() : vp.State();
                            //if visible parent isn't going to be removed or going to be installed then vs_integration dialog shall be shown
                            if( pact != obj.action_t.remove && !(pact == obj.action_t.none && pstate == obj.state_t.absent))
                            {
                                return true;
                            }
                        }
                    }
                }))
                {return true;}
            }
            Log("vs_dlg_required: finished, vs dialog not required");
            return false;
        }

        ns.VSIntegration.DlgRequired(vs_dlg_required, "base vs_dlg_required");
        ns.VSIntegration.Skip = function(){ return !ns.VSIntegration.DlgRequired(); }

        // ########################################################################
        // Adjust PreInstall and Features dialogs
        // ########################################################################
        ns.VSIntegration.PreInstallMessageGenerator = function(msg)
        {
            Log("VS pre in mes");
            if(prod.InstallMode() == prod.install_mode_t.install || prod.InstallMode() == prod.install_mode_t.modify)
            {
              Log("VS pre in mes 1");
              var vs_idata = ns.VSIntegration.Data();
              var product_vs_list = vs_integration_status_list(prod);

              for(var k in vs_idata)
              {
                 var vs = vs_idata[k];
                 Log("VS pre in mes " + vs.id);
                 if(vs.selected && !product_vs_list[vs.id].fully_integrated)
                     msg.Custom(StringList.Format("[add_integration_opt]", vs_idata[k].title));
                 else if(!vs.selected && product_vs_list[vs.id].integrated)
                     msg.Custom(StringList.Format("[rm_integration_opt]", vs_idata[k].title));
              }
            }
        }
        
        ns.VSIntegration.PreInstallMessageGenerator.Skip = ns.VSIntegration.Skip;
        ns.PreInstall.AddMessageGenerator(ns.VSIntegration.PreInstallMessageGenerator, "VSIntegrationPreInstallMessage");
        ns.Features.AllowContinue(ns.VSIntegration.DlgRequired, "VSDLGrequired checker");
        // ########################################################################
        //  VS integration dialog adjustment --> end
        // ########################################################################

        /** @fn ExecVSPostInstallAction(Path vs_output_file, Component cmp, String vs_title)
         *  @brief Executes post-install action for vsix installation
         *  @details This function parses vs_output_file (which is supposed to be in
         *  Unicode), splits it at first into strings. Then it iterates through the
         *  array of strings and splits them by pipe. The token before the pipe is module
         *  name, after the pipe arguments come. They must be pipe-separated, otherwise
         *  function skips the string. In the end, it calls CreateProcess with obtained
         *  module and arguments and checks the return code. If it is not 0 and 1001,
         *  the function creates error handler and shows warnings on the complete dialog.
         *  @param Path vs_output_file - path to file which must be parsed
         *  @param Component cmp - used for error handler, otherwise handler doesn't work
         *  @param String vs_title - also used for error handler to indicate which VS failed
         *  @param String mode - mode of installation ("install" or "remove")
         *  @usage
         *    ns.ExecVSPostInstallAction("C:/temp/vsix-list.cfg", obj, "Visual Studio 2017", "install");
         *    ns.ExecVSPostInstallAction(vs_output_file, obj, vs.title, "remove");
         *  @see ns.ComponentsConfiguration
         */
        ns.ExecVSPostInstallAction = function(vs_output_file, cmp, vs_title, mode)
        {
            Log("ExecVSPostInstallAction: parsing file " + vs_output_file);
            var vs_file_content = FileSystem.ReadFileUnicode(vs_output_file); //first, read MSI output
            //define codes of successful VS integration
            var IntegrationSuccessful = 0;
            var AlreadyInstalledException = 1001;
            var NotInstalledException = 1002;
            var BlockingProcessesException = 2004;
            var number_of_retries = 5;
            var retry_timeout = 10000;
            var error_occurred = false; //used to trigger wizard notify in the end
            if(vs_file_content)
            {
                if(vs_file_content.charCodeAt(0) == 0xFEFF || vs_file_content.charCodeAt(0) == 0xFFFE) //removing unicode control characters from the string
                    vs_file_content = vs_file_content.slice(1, vs_file_content.length);
                var vs_strings_arr = String(vs_file_content).split("\r\n"); //split by strings
                if(vs_strings_arr && vs_strings_arr.length)
                {
                    for(var i in vs_strings_arr)
                    {
                        if(vs_strings_arr[i].length)
                        {
                            var split_result = vs_strings_arr[i].split("|"); //arguments and commands are separated by pipes
                            if(split_result[0] && split_result[1])
                            {
                                var module = split_result[0];
                                var args = split_result[1];
                                Log("ExecVSPostInstallAction: Command is about to start: " + module + " with arguments " + args);
                                ns.TaskKill();
                                ret = CreateProcess("", "\"" + module + "\" " + args, true, Origin.Directory(), 0);

                                Log("ExecVSPostInstallAction: cmd execution ret.failed = \"" + ret.failed + "\"");
                                Log("ExecVSPostInstallAction: cmd execution ret.error = \"" + ret.error + "\"");
                                Log("ExecVSPostInstallAction: cmd exit code : \"" + ret.exitcode + "\"");
                                Log("ExecVSPostInstallAction: cmd output: \"" + ret.output + "\"");
                                //new request INST-7086
                                //please add support of VSIXinstaller exit code 2004 into our PSET and installer
                                //add retry functionality during 5 minutes
                                //if we have "2004 VSIXInstaller.BlockingProcessesException" exit code.
                                //actually, for every exit code, except for these two successfull
                                //and one more for remove
                                if((mode === "install" && ret.exitcode != IntegrationSuccessful && ret.exitcode != AlreadyInstalledException) ||
                                   (mode === "remove" && ret.exitcode != IntegrationSuccessful && ret.exitcode != NotInstalledException))
                                {
                                    for(var i = 1; i <= number_of_retries; i++)
                                    {
                                        sleep(retry_timeout);
                                        ns.TaskKill();
                                        Log("ExecVSPostInstallAction: retrying the command. Attempt: " + i + " out of " + number_of_retries);
                                        Log("ExecVSPostInstallAction: Command is about to start: " + module + " with arguments " + args);
                                        ret = CreateProcess("", "\"" + module + "\" " + args, true, Origin.Directory(), 0);
                                        Log("ExecVSPostInstallAction: cmd exit code : \"" + ret.exitcode + "\"");
                                        if(ret.exitcode == IntegrationSuccessful ||
                                          (mode === "install" && ret.exitcode == AlreadyInstalledException) ||
                                          (mode === "remove" && ret.exitcode == NotInstalledException))
                                        {
                                            Log("ExecVSPostInstallAction: integration successfull. Breaking the retry loop");
                                            break;
                                        }
                                    }
                                }
                                if(((mode === "install" && ret.exitcode != IntegrationSuccessful && ret.exitcode != AlreadyInstalledException) ||
                                   (mode === "remove" && ret.exitcode != IntegrationSuccessful && ret.exitcode != NotInstalledException)) && !error_occurred)
                                {
                                    //here comes the most exciting thing: adding messages to error handler
                                    //first, set this flag, so add error could be called in the end
                                    error_occurred = true;
                                    //next, create error message. so far, so good
                                    var err_msg = StringList.Format("[vs_integration_failed]", vs_title, vs_title, ret.exitcode);
                                    
                                    var ftr = cmp.Parent();
                                    //create error handler from the namespace
                                    //otherwise errors will not appear on the end dialog
                                    //handler really needs parent feature, or else it would die
                                    //false here means that we don't want 'continue' dialog to appear
                                    var handler = ns_errhan.Handler(ftr, false);
                                    //moreover, we must call created handler
                                    //but it doesn't work without iterator
                                    //also, iterator must have Item method which would return item with method Error
                                    //and item.Error finally returns error message
                                    var error_item = {};
                                    error_item.Error = function() {return err_msg};
                                    var iterator = {};
                                    iterator.Item = function() {return error_item};
                                    
                                    handler(iterator);
                                }
                            }
                            else
                                Log("ExecVSPostInstallAction: String " + vs_strings_arr[i] + " doesn't contain pipes. Skipping");
                        }
                    }
                }
                else
                    Log("ExecVSPostInstallAction: File " + vs_output_file + " doesn't seem to contain any data");
            }
            else
                Log("ExecVSPostInstallAction: Failed to read file " + vs_output_file);

            if(error_occurred)
            {
                ns.Complete.ErrorOccured(true);
            }

            return Action.r_ok;
        };

        // ########################################################################
        // NEED_VS20XX_INTEGRATION options adjustment --> start
        // ########################################################################
        ns.ComponentsConfiguration = function()
        {
            Log("action ComponentsConfiguration");

            var cmps = [];
            prod.FilterComponentsRecursive(function(obj)
            {
              if(obj.CustomObjects().Item("VSIntegration"))
              {
                cmps.push(obj);
              }
            });

            var first_visible_parent = function(obj)
            {
                var parent = obj;

                for (; (parent && (!parent.Visible || !parent.Visible())); parent = parent.Parent());

                return parent;
            }

            iterate(cmps, function(obj)
            {
                var vsi = obj.CustomObjects().Item("VSIntegration");

                var vp = first_visible_parent(obj);

                var pact = vp.Action();
                var pstate = (vp.Type && vp.Type() == "product") ? vp.ProductState() : vp.State();

                // if visible parent isn't going to be removed or not installed then its component will be processed according to the user's choises on vs dlg
                if( !(pact == obj.action_t.remove || (pact == obj.action_t.none && pstate == obj.state_t.absent)))
                {
                  var vs_idata = ns.VSIntegration.Data();

                  var obj_vs_integration_required = 0;

                  for(var k in vs_idata)
                  {
                    var vs = vs_idata[k];

                    if(!vsi[vs.id])
                      continue;

                    vsi[vs.id].integrated = vs.selected;
                    if(vs.selected && obj.Disabled() != obj.disabled_t.yes)
                    {
                        Log("The integration into " + vs.id + " was requested. Set action install for cmp " + obj.Name() + " alias = " + obj.Info().Property("alias"));
                        obj.Action(obj.action_t.install);
                        obj_vs_integration_required = 1;
                    }

                    obj.Log("add component integrated = " + vsi[vs.id].integrated + " config option " + vsi[vs.id].property + " selected = " + (vs.selected ? "1" : "0"));

                    // It is required to pass "" instead of 0 in case when VS isn't selected for integration i.e. NEED_VS_2010=
                    obj.ConfigurationOptions().Add(vsi[vs.id].property + "=" + (vs.selected ? "1" : "\"\""));
                    if(vs.id === "vs_2017" && obj.Action() != obj.action_t.remove)
                    {
                        Log("Integration into VS 2017 is required, adding postinstall actions");
                        var vs_output_file = FileSystem.MakePath("msi-vsix.cfg", FileSystem.GetTemp());
                        obj.ConfigurationOptions().Add("PSET_VSIX_LAUNCHER_SCHEDULE_FILE", vs_output_file);
                        if(!post_install_dumper_added) //add post-install dumper only once
                        {
                            post_install_dumper_added = true;
                            ns_inst.Installer.Apply.SubscribeOnEnd(function()
                            {
                                var add_vs_post_action_to_dmp = function(dmp)
                                {
                                    var prg = Progress();
                                    prg.total = -1;
                                    prg.message = StringList.Format("Processing integration into " + vs.title);

                                    var exe = {};

                                    exe.Apply = function()
                                    {
                                        return ns.ExecVSPostInstallAction(vs_output_file, obj, vs.title, "install");
                                    }

                                    exe.Rollback = function()
                                    {
                                        return Action.r_ok;
                                    }

                                    exe.ProgressApply = function() {return prg;}

                                    if(dmp && dmp.IsDumper)
                                    {
                                        var a = dmp.AddAction(exe, "Visual Studio 2017 integration");
                                        a.Attribute("countable", true);
                                        a.Attribute("name", "Visual Studio 2017 integration");
                                    }
                                }

                                add_vs_post_action_to_dmp(ns_inst.Installer.IDumper.PostAction().PreAction());
                                Log("add_vs_post_action_to_dmp IDumper.PostAction");
                            });
                        }
                        else
                            Log("Post action for VS integration has already been added, skipping");
                    }
                  }

                  // all VSes where the object can be integrated were unselected -> remove it.
                  if(!obj_vs_integration_required)
                  {
                      Log("The integrations from all studios where cmp can be integrated are required to be removed. Set action remove for cmp " + obj.Name() + " alias = " + obj.Info().Property("alias"));
                      obj.Action(obj.action_t.remove);
                  }
                }
                else if (obj.Action() == obj.action_t.remove && obj.Configurator().TestRemove())
                {
                  for(var v in vsi)
                  {
                    vsi[v].integrated = 0;
                  }
                }
            });

            return Action.r_ok;
        }

        ns.RemoveVSIXConfiguration = function()
        {
            Log("action RemoveVSIXConfiguration");

            var cmps = [];
            prod.FilterComponentsRecursive(function(obj)
            {
              if(obj.CustomObjects().Item("VSIntegration"))
              {
                cmps.push(obj);
              }
            });

            var first_visible_parent = function(obj)
            {
                var parent = obj;

                for (; (parent && (!parent.Visible || !parent.Visible())); parent = parent.Parent());

                return parent;
            }
            var local_upgrade_required = false;

            iterate(cmps, function(obj)
            {
                var vsi = obj.CustomObjects().Item("VSIntegration");

                var vp = first_visible_parent(obj);

                var pact = vp.Action();
                var pstate = (vp.Type && vp.Type() == "product") ? vp.ProductState() : vp.State();

                // if visible parent isn't going to be removed or not installed then its component will be processed according to the user's choises on vs dlg
                var vs_idata = ns.VSIntegration.Data();

                for(var k in vs_idata)
                {
                    var vs = vs_idata[k];

                    if(!vsi[vs.id])
                      continue;

                    obj.Log("add component integrated = " + vsi[vs.id].integrated + " config option " + vsi[vs.id].property + " selected = " + (vs.selected ? "1" : "0"));

                    // It is required to pass "" instead of 0 in case when VS isn't selected for integration i.e. NEED_VS_2010=
                    if(vs.id === "vs_2017")
                    {
                        Log("Integration into VS 2017 is required, adding VSIX remove actions");
                        var vs_rm_file = FileSystem.MakePath("msi-vsix-rm.cfg", FileSystem.GetTemp());
                        var vs_rm_prev_file = FileSystem.MakePath("msi-prev-vsix-rm.cfg", FileSystem.GetTemp());
                        obj.ConfigurationOptions().Add("PSET_VSIX_UNINSTALL_LAUNCHER_SCHEDULE_FILE", vs_rm_file);
                        obj.RemoveConfigurationOptions().Add("PSET_VSIX_UNINSTALL_LAUNCHER_SCHEDULE_FILE", vs_rm_file);
                        //for upgrade scenario, we also need to add configuration option for upgrade targets
                        var targets = obj.Upgrade().Targets();
                        if(targets && targets.length) //if array exists
                        {
                            for(var index in targets) //iterate through elements
                            {
                                var target = targets[index]; //fancy redefinition
                                if(target.State() != obj.upgrade_state_t.same) //avoid adding option to the component itself
                                {
                                    var target_object = target.Object(); //get object, representing this target
                                    //add remove option
                                    target_object.RemoveConfigurationOptions().Add("PSET_VSIX_UNINSTALL_LAUNCHER_SCHEDULE_FILE", vs_rm_prev_file);
                                    local_upgrade_required = true;
                                }
                            }
                        }

                        if(!post_install_rm_dumper_added) //add post-install dumper only once
                        {
                            post_install_rm_dumper_added = true;
                            ns_inst.Installer.Apply.SubscribeOnEnd(function()
                            {
                                var add_vs_rm_action_to_dmp = function(dmp, is_upgrade)
                                {
                                    var prg = Progress();
                                    prg.total = -1;
                                    prg.message = StringList.Format("Processing deintegration from " + vs.title);

                                    var exe = {};

                                    exe.Apply = function()
                                    {
                                        var result = Action.r_ok;
                                        if(is_upgrade)
                                            ns.ExecVSPostInstallAction(vs_rm_prev_file, obj, vs.title, "remove");
                                        else
                                            ns.ExecVSPostInstallAction(vs_rm_file, obj, vs.title, "remove");

                                        return result;
                                    }

                                    exe.Rollback = function()
                                    {
                                        return Action.r_ok;
                                    }

                                    exe.ProgressApply = function() {return prg;}

                                    if(dmp && dmp.IsDumper)
                                    {
                                        var a = dmp.AddAction(exe, "Visual Studio 2017 deintegration");
                                        a.Attribute("countable", true);
                                        a.Attribute("name", "Visual Studio 2017 deintegration");
                                        a.Group("Uninstall");
                                    }
                                }

                                if(ns_inst.Installer.IDumper.IsEmpty())
                                {
                                    add_vs_rm_action_to_dmp(ns_inst.Installer.UDumper.PostAction().PreAction(), false);
                                    Log("add_vs_rm_action_to_dmp UDumper.PostAction");
                                }
                                else
                                {
                                    add_vs_rm_action_to_dmp(ns_inst.Installer.IDumper.PostAction().PreAction(), false);
                                    Log("add_vs_rm_action_to_dmp IDumper.PostAction");
                                    if(local_upgrade_required)
                                    {
                                        add_vs_rm_action_to_dmp(ns_inst.Installer.UDumper.PostAction(), true);
                                        Log("add_vs_rm_action_to_dmp IDumper.PreAction");
                                    }
                                }
                            });
                        }
                        else
                            Log("Post action for VS integration has already been added, skipping");
                    }
                }

            });

            return Action.r_ok;
        }

        ns.ComponentsConfiguration.Skip = function()
        {
            return (prod.InstallMode() != prod.install_mode_t.install &&
                   prod.InstallMode() != prod.install_mode_t.modify);
        }

        if (ns.ReinstallComponents)
            ns.ConfigureOptions.AddBefore(ns.ReinstallComponents, ns.ComponentsConfiguration);
        else
            ns.ConfigureOptions.Add(ns.ComponentsConfiguration);
        
        //we need this logic for literally each scenario
        ns.ConfigureOptions.AddBefore(ns.ComponentsConfiguration, ns.RemoveVSIXConfiguration);
        // ########################################################################
        // NEED_VS20XX_INTEGRATION options adjustment --> end
        // ########################################################################
        Log("Scenario::vs_integration: actions generation completed");
        return ns;
    }
}
