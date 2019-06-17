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
    this.Actions = function(prod)
    {
        Log("Scenario::system_studio_custom_actions: actions generation started");

        Wizard.OnNotify("Complete/complete_reboot/checkbox", "set visible", false);
        Wizard.OnNotify("Complete/complete_reboot/desc", "set text", "");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        let add_action_to_dumper = function(in_action, in_dumper, action_title) {
            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format(action_title);

            var exe = {};

            exe.Apply = function()
            {
                return in_action();
            }

            exe.Rollback = function()
            {
                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            if(in_dumper && in_dumper.IsDumper)
            {
                var a = in_dumper.AddAction(exe, action_title);
                a.Attribute("countable", true);
                a.Attribute("name", action_title);
            }
        };

        var ns_inst = Namespace("Root.installer");
        if(GroupManager && GroupManager.RemoveGroups)
        {
            ns_inst.Installer.Apply.SubscribeOnEnd(function()
            {
                Log("Removing groups");
                if(prod.InstallMode() != prod.install_mode_t.install)
                    return;

                var dmp = ns_inst.Installer.IDumper.PostAction();
                var remove_groups_action = function()
                {
                    var disable_inheritance_bat = "\"C:\\Intel\\disable-inheritance.bat\"";
                    var ret_val = CreateProcess("", disable_inheritance_bat, true);
                    if(ret_val)
                    {
                        Log("Scenario::system_studio_custom_actions: disable_inheritance_bat execution ret_val.failed = \"" + ret_val.failed + "\"");
                        Log("Scenario::system_studio_custom_actions: disable_inheritance_bat execution ret_val.error = \"" + ret_val.error + "\"");
                        Log("Scenario::system_studio_custom_actions: disable_inheritance_bat exit code : \"" + ret_val.exitcode + "\"");
                        Log("Scenario::system_studio_custom_actions: disable_inheritance_bat output: \"" + ret_val.output + "\"");
                    }
                    else
                    {
                        Log("Scenario::system_studio_custom_actions: disable_inheritance_bat return value somehow doesn't exist");
                    }

                    var remove_groups_from_dir = ["C:\\Intel\\", prod.InstallDir()];
                    for(var i = 0; i < remove_groups_from_dir.length; i++)
                    {
                        if(FileSystem.Exists(remove_groups_from_dir[i]))
                        {
                            if(remove_groups_from_dir[i].charAt(remove_groups_from_dir[i].length - 1) != '\\')
                            {
                                remove_groups_from_dir[i] += '\\';
                            }
                        }
                        else
                        {
                            Log("Scenario::system_studio_custom_actions: '" + remove_groups_from_dir[i] + "' doesn't exist, excluding");
                            remove_groups_from_dir.splice(i, 1);
                        }
                    }
                    var remove_groups = ["Authenticated Users"];
                    Log("Scenario::system_studio_custom_actions: removing " + remove_groups.join(", ") + " from: " + remove_groups_from_dir.join(", "));
                    Log("Scenario::system_studio_custom_actions: RemoveGroups returns: " + GroupManager.RemoveGroups(remove_groups_from_dir, remove_groups));
                    return Action.r_ok;
                };

                add_action_to_dumper(remove_groups_action, dmp, "Configuring Access Control Lists");
            });
        }

        let install_scripts_to_execute = [];
        let remove_scripts_to_execute = [];

        let process_component_scripts = function(cmp) {
            let script_path = "";
            if(cmp.Action() == cmp.action_t.install) {
                script_path = cmp.Info().Property("postinstall_script");
            } else if(cmp.Action() == cmp.action_t.remove) {
                script_path = cmp.Info().Property("preuninstall_script");
            } else {
                return;
            }

            if(!script_path) {
                return;
            }

            let script_order = cmp.Info().Property("script_order");
            let script_hash = {
                "order" : script_order,
                "relative_path" : script_path,
                "install_dir" : cmp.InstallDir()
            };
            if(cmp.Action() == cmp.action_t.install) {
                install_scripts_to_execute.push(script_hash);
            } else {
                remove_scripts_to_execute.push(script_hash);
            }
        };

        let execute_script = function(script_hash) {
            let script_path = script_hash["relative_path"];
            let component_directory = script_hash["install_dir"];
            if(script_path) {
                let postinstall_script_full_path = FileSystem.MakePath(script_path, component_directory);
                var postinstall_command = FileSystem.SpecialFolder.system + "\\cmd.exe /C ";
                postinstall_command += "\"\"" + postinstall_script_full_path + "\"\"";
                Log("postinstall: running: " + postinstall_command + " in " + component_directory);
                let process_ret = CreateProcess("", postinstall_command, true, component_directory, 0);

                if(process_ret) {
                    Log("postinstall: cmd execution failed = \"" + process_ret.failed + "\"");
                    Log("postinstall: cmd execution error = \"" + process_ret.error + "\"");
                    Log("postinstall: cmd exit code : \"" + process_ret.exitcode + "\"");
                    Log("postinstall: cmd output: \"" + process_ret.output + "\"");
                } else {
                    Log("postinstall: process return value is undefined");
                }
            }
        };

        let install_py_deps = function(file_path) {
            if(!FileSystem.Exists(file_path))
            {
                Log("Scenario::install_py_deps: cannot find python module: " + file_path);
            }

            var py_path = StringList.Format("[$SystemDrive]\\Python27"); //virtualenv must be installed here
            var python_exe = FileSystem.MakePath("python.exe", py_path);
            if(!FileSystem.Exists(python_exe))
            {
                Log("Scenario::install_py_deps: cannot find python.exe: " + python_exe);
            }
            cmd = python_exe + " -m pip install \"" + file_path + "\"";
            Log("Scenario::install_py_deps: executing cmd: \"" + cmd + "\"");
            let process_ret = CreateProcess("", cmd, true, py_path, 0);
            if(process_ret) {
                Log("Scenario::install_py_deps: cmd execution failed = \"" + process_ret.failed + "\"");
                Log("Scenario::install_py_deps: cmd execution error = \"" + process_ret.error + "\"");
                Log("Scenario::install_py_deps: cmd exit code : \"" + process_ret.exitcode + "\"");
                Log("Scenario::install_py_deps: cmd output: \"" + process_ret.output + "\"");
            } else {
                Log("Scenario::install_py_deps: process return value is undefined");
            }
        }

        let process_all_scripts_action = function() {
            prod.FilterComponentsRecursive(process_component_scripts);
            let install_sort_predicate = function(item_a, item_b) {
                return Number(item_a["order"]) - Number(item_b["order"]);
            };
            let remove_sort_predicate = function(item_a, item_b) {
                return Number(item_b["order"]) - Number(item_a["order"]);
            };

            let print_execution_order = function(item) {
                Log("script order: " + item["order"] + " script path: " + item["relative_path"]);
            };
            remove_scripts_to_execute.sort(remove_sort_predicate);
            remove_scripts_to_execute.forEach(print_execution_order);
            remove_scripts_to_execute.forEach(execute_script);

            install_scripts_to_execute.sort(install_sort_predicate);
            install_scripts_to_execute.forEach(print_execution_order);
            install_scripts_to_execute.forEach(execute_script);

            //python distribution now has its own virtualenv, no need to install this one anymore
            //var py_deps_path = FileSystem.MakePath("system_debugger_2019\\virtualenv-15.0.1-py2.py3-none-any.whl", prod.InstallDir()); //virtual env resides in the win_dbg installation directory
            //install_py_deps(py_deps_path);
            return Action.r_ok;
        };

        ns_inst.Installer.Apply.SubscribeOnEnd(function() {
            if(prod.InstallMode() != prod.install_mode_t.remove) {
                add_action_to_dumper(process_all_scripts_action, ns_inst.Installer.IDumper.PostAction(), "Processing post-install scripts");
            }
        });

        ns_inst.Installer.Apply.SubscribeOnBegin(function() {
            if(prod.InstallMode() != prod.install_mode_t.install) {
                add_action_to_dumper(process_all_scripts_action, ns_inst.Installer.UDumper.PreAction(), "Processing pre-uninstall scripts");
            }
        });

        Log("Scenario::system_studio_custom_actions: actions generation completed");
        return this;
    }

    this.Scenario = function(acts)
    {
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::system_studio_custom_actions required input parameter acts is undefined ");
            return null;
        }
        Log("Scenario::system_studio_custom_actions: adding action into sequence");

        var unmap_feature_names = function(feature_names_list, mapping_content)
        {
            if(!mapping_content)
            {
                Log("system_studio_custom_actions::unmap_feature_names: failed to get mapping content");
                return null;
            }

            var parsed_mapping = null;
            try
            {
                parsed_mapping = JSON.parse(mapping_content);
            }
            catch(exc)
            {
                Log("system_studio_custom_actions::unmap_feature_names: failed to parse mapping: " + exc.message);
                return null;
            }

            var unmapped_component_names = [];
            for(let feat_index = 0; feat_index < feature_names_list.length; feat_index++)
            {
                let feat_name = feature_names_list[feat_index];
                for(let module_id in parsed_mapping)
                {
                    let module_name = parsed_mapping[module_id];
                    if(feat_name.indexOf(module_name[0]) != -1)
                    {
                        unmapped_component_names.push(module_id);
                        break;
                    }
                }
            }
            return unmapped_component_names;
        };

        var map_config_file = function(config_content, mapping_content)
        {
            if(!config_content || !mapping_content)
            {
                Log("system_studio_custom_actions::map_config_file: failed to get contents");
                return null;
            }

            var parsed_config = null;
            try
            {
                parsed_config = JSON.parse(config_content);
            }
            catch(exc)
            {
                Log("system_studio_custom_actions::map_config_file: failed to parse config: " + exc.message);
                return null;
            }

            if(!parsed_config["selections"])
            {
                Log("system_studio_custom_actions::map_config_file: webconfig file doesn't have 'selections' section");
                return null;
            }

            var parsed_mapping = null;
            try
            {
                parsed_mapping = JSON.parse(mapping_content);
            }
            catch(exc)
            {
                Log("system_studio_custom_actions::map_config_file: failed to parse mapping: " + exc.message);
                return null;
            }

            var mapped_component_names = [];
            for(var module_index in parsed_config["selections"])
            {
                var module_id = parsed_config["selections"][module_index]["moduleId"];
                if(!parsed_mapping[module_id])
                {
                    Log(Log.l_warning, "system_studio_custom_actions::map_config_file: " + module_id + " not found in the mapping");
                }
                else
                {
                    mapped_component_names.push(parsed_mapping[module_id]);
                }
            }
            return mapped_component_names;
        };

        var config_dir = FileSystem.MakePath("/../", Origin.Directory());
        var get_selection_content = function()
        {
            //find selection mapping in configuration directory
            var selection_mapping = FileSystem.FindFiles(config_dir, "selection");
            if(!selection_mapping || selection_mapping.length != 1)
            {
                //there must be exactly one selection mapping file
                Log("Scenario::system_studio_custom_actions: 'selection' file not found");
                return null;
            }
            var mapping_file_path = FileSystem.MakePath(selection_mapping[0], config_dir);
            return FileSystem.ReadFileUTF8(mapping_file_path);
        }

        var parse_config_file = function(config_file_path)
        {
            var mapping_content = acts.ConfigFileDialog.GetSelectionContent();
            if(!mapping_content)
            {
                Log("system_studio_custom_actions::parse_config_file no mapping content");
                return null;
            }
            Log("Scenario::system_studio_custom_actions: parsing " + config_file_path);
            if(!FileSystem.Exists(config_file_path))
            {
                Log("Scenario::system_studio_custom_actions: " + config_file_path + " doesn't exist");
                return null;
            }
            var config_file_content = FileSystem.ReadFileUTF8(config_file_path, true);
            var mapped_component_names = map_config_file(config_file_content, mapping_content);
            if(mapped_component_names && mapped_component_names.length > 0)
            {
                return mapped_component_names;
            }
            return null;
        };

        var copy_file_to_dir = function(src_path, dst_path)
        {
            var dst_dir = FileSystem.Directory(dst_path);
            if(src_path.indexOf(dst_dir) != -1)
            {
                return;
            }

            if(!FileSystem.Exists(src_path))
            {
                return;
            }

            //-1 means that file is not in config directory, need to copy it
            Log("system_studio_custom_actions::copy_file_to_dir: copying " + src_path + " to " + dst_path);
            var file_content = FileSystem.ReadFileUTF8(src_path, true);
            FileSystem.WriteFileUTF8(dst_path, file_content);
        };


        const DEFAULT_JSON_NAME = "intel-sw-tools-config-custom.json";
        const DEFAULT_LICENSE_NAME = "intel-sw-tools-license.lic";
        //search *.json files and internal license in the root directory and the directory above the root
        var search_locations = [FileSystem.MakePath("/../", FileSystem.exe_dir), FileSystem.exe_dir];
        if(acts.Product().InstallMode() == acts.Product().install_mode_t.modify)
        {
            //try to apply cached json if any
            //must be tried in the end, because json from exe directory
            //has higher priority
            search_locations.push(FileSystem.MakePath("..", Cache.CachePluginsDir()));
        }

        var init_mapping = function()
        {
            //get mapping content
            var mapping_content = acts.ConfigFileDialog.GetSelectionContent();
            if(!mapping_content)
            {
                Log("system_studio_custom_actions::init_mapping: no mapping content");
                return false;
            }

            for(let loc_index = 0; loc_index < search_locations.length; loc_index++)
            {
                let search_loc = search_locations[loc_index];
                var web_config_files = FileSystem.FindFiles(search_loc, DEFAULT_JSON_NAME);
                if(!web_config_files || web_config_files.length < 1)
                {
                    //either FindFiles returned null reference
                    //or *.json files don't exist in config folder
                    Log("system_studio_custom_actions::init_mapping: web configurator file not found in " + search_loc);
                    continue;
                }

                for(var index in web_config_files)
                {
                    var config_file_path = FileSystem.MakePath(web_config_files[index], search_loc);
                    if(acts.ConfigFileDialog.IsConfigurationFileValid(config_file_path))
                    {
                        acts.ConfigFileDialog.ApplyConfiguration(config_file_path);
                        return true;
                    }
                }
            }
            return false;
        };

        var search_str_in_list = function(str_list, str_to_find)
        {
            let compare_predicate = function(list_element)
            {
                return (String(str_to_find).indexOf(list_element) != -1);
            };
            return str_list.find(compare_predicate);
        };

        var is_feature_in_the_mapping = function(feature_name, mapping)
        {
            for(var feat_index in mapping)
            {
                var mapped_names_list = mapping[feat_index];
                if(search_str_in_list(mapped_names_list, feature_name))
                {
                    return true;
                }
            }
            return false;
        };

        acts.ConfigFileDialog = Wizard.DialogCollection["config_file_dialog"]("ConfigFileDialog");
        acts.sub_GUI.AddBefore(acts.GettingStartedDialog, acts.ConfigFileDialog);
        var m_mapping_initialized = false;
        var m_selection_content = null;
        acts.ConfigFileDialog.GetSelectionContent = function()
        {
            return m_selection_content;
        };

        acts.ConfigFileDialog.IsMappingInitialized = function()
        {
            return m_mapping_initialized;
        };

        acts.ConfigFileDialog.IsConfigurationFileValid = function(config_file_path)
        {
            var mapped_cmps = parse_config_file(config_file_path);
            if(mapped_cmps && mapped_cmps.length > 0)
            {
                Log("ConfigFileDialog::IsConfigurationFileValid: " + config_file_path + " is valid");
                return true;
            }
            Log("ConfigFileDialog::IsConfigurationFileValid: " + config_file_path + " is invalid");
            return false;
        };

        var activate_with_file = function(lic_file_path)
        {
            if(!acts.ActivationManager)
                acts.LicenseManagerInit();

            let activation_ret = acts.ActivationManager.activate_licfile(lic_file_path);
            if(activation_ret && activation_ret.exit_code)
            {
                if(acts.ConfigurationDialog && acts.ConfigurationDialog.License_Widget)
                {
                    acts.ConfigurationDialog.License_Widget.CB_Skip(function()
                    {
                        return true;
                    });
                }
                return true;
            }
            return false;
        };


        acts.ConfigFileDialog.ApplyConfiguration = function(config_file_path)
        {
            var mapped_features = parse_config_file(config_file_path);
            if(!mapped_features || mapped_features.length < 1)
            {
                Log("ConfigFileDialog::ApplyConfiguration: nothing to apply");
                return;
            }

            //need to merge with json config from cache
            //also, do nothing if cache doesn't have json config
            if(acts.Product().InstallMode() == acts.Product().install_mode_t.modify)
            {
                var cached_config_path = FileSystem.MakePath(DEFAULT_JSON_NAME, Cache.CachePluginsDir() + "/..");
                if(!FileSystem.Exists(cached_config_path))
                {
                    Log("ConfigFileDialog::ApplyConfiguration: cached config doesn't exist -- all components must be visible in that case");
                    return;
                }

                var cached_features = parse_config_file(cached_config_path);
                if(cached_features)
                {
                    for(let index = 0; index < cached_features.length; index++)
                    {
                        let cached_feat_list = cached_features[index];
                        let search_predicate = function(map_ftr)
                        {
                            return String(map_ftr) == String(cached_feat_list);
                        };

                        if(!mapped_features.find(search_predicate))
                        {
                            mapped_features.push(cached_feat_list);
                        }
                    }
                }
            }

            var features_widget = acts.GettingStartedDialog.Features_Widget;
            var product_item = features_widget.Control().js.m_tree.items.Get(0);
            var remove_indexes_list = [];
            var remove_feat_name_list = [];
            for(var index = 0; index < product_item.items.count; index++)
            {
                var feature_visible_name = product_item.items.Get(index).js.m_label.text;
                if(!is_feature_in_the_mapping(feature_visible_name, mapped_features))
                {
                    remove_indexes_list.push(index);
                    remove_feat_name_list.push(feature_visible_name);
                }
            }

            var process_visible_features = function(feature_iter)
            {
                let feature_name = String(feature_iter.Name());
                if(remove_feat_name_list.indexOf(feature_name) != -1)
                {
                    feature_iter.Disabled(true);
                    feature_iter.Visible(false);
                }
            };

            acts.Product().FilterFeaturesRecursive(process_visible_features);

            while(remove_indexes_list.length > 0)
            {
                var remove_index = remove_indexes_list.pop();
                product_item.items.RemoveAt(remove_index);
            }

            var mapping_content = acts.ConfigFileDialog.GetSelectionContent();
            var unmapped_features = unmap_feature_names(mapped_features, mapping_content);
            var serializer =
            {
                "selections" : []
            };

            for(var index = 0; index < unmapped_features.length; index++)
            {
                serializer["selections"].push({"moduleId" : unmapped_features[index]});
            }

            Log("Serialize callback:" + JSON.stringify(serializer));

            let dst_json_path = FileSystem.MakePath(DEFAULT_JSON_NAME, FileSystem.exe_dir);
            FileSystem.WriteFileUTF8(dst_json_path, JSON.stringify(serializer));
            //need to copy that file to the cache
            if(acts.Product().InstallMode() == acts.Product().install_mode_t.install)
            {
                acts.Product().MICL.AddSource(dst_json_path);
            }
            else
            {
                let cached_config_path = FileSystem.MakePath(DEFAULT_JSON_NAME, Cache.CachePluginsDir() + "/..");
                FileSystem.WriteFileUTF8(cached_config_path, JSON.stringify(serializer));
            }

            //try to activate with license inside specified folder if any
            let config_file_dir = FileSystem.Directory(config_file_path);
            var internal_lic_list = FileSystem.FindFiles(config_file_dir, "*.lic");
            if(!internal_lic_list || internal_lic_list.length < 1)
            {
                //no license files inside config file directory
                return;
            }

            for(let license_index = 0; license_index < internal_lic_list.length; license_index++)
            {
                let lic_file = FileSystem.MakePath(internal_lic_list[license_index], config_file_dir);
                if(!FileSystem.Exists(lic_file))
                {
                    continue;
                }

                if(activate_with_file(lic_file))
                {
                    break;
                }
            }
        };
        m_selection_content = get_selection_content();
        m_mapping_initialized = init_mapping();

        //users should not change config after it is selected
        if(acts.Product().InstallMode() == acts.Product().install_mode_t.install)
            acts.GettingStartedDialog.ButtonBack.Disabled(true);

        var silent_config_contains_activation = function(silent_config_path)
        {
            if(!FileSystem.Exists(silent_config_path))
            {
                return false;
            }

            var silent_root = XML.Parse(FileSystem.ReadFileUTF8(silent_config_path, true));
            if(!silent_root)
            {
                return false;
            }

            var property_nodes = silent_root.select("/config/handler/property[@name]");
            if(property_nodes && property_nodes.length)
            {
                const activation_prop_names = ["sn", "license"];
                for(var i in property_nodes)
                {
                    var prop_name = property_nodes[i].attributes.name;
                    var prop_val = property_nodes[i].attributes.value;
                    if(activation_prop_names.indexOf(prop_name) != -1 && prop_val != "")
                    {
                        return true;
                    }
                }
            }
            return false;
        };

        //disable activation widget if successfully activated with the internal license file
        var activate_with_internal_license = function()
        {
            if(acts.Product().InstallMode() != acts.Product().install_mode_t.install)
            {
                return; //do nothing in other modes
            }

            if(GetOpt.Exists("help"))
            {
                return; //do nothing if user only wants to see help screen
            }

            var ns_inst = Namespace("Root.installer");
            if(ns_inst.Installer.Silent())
            {
                if(GetOpt.Exists("sn") || GetOpt.Exists("license"))
                {
                    return;
                }

                if(silent_config_contains_activation(GetOpt.Get("silent")))
                {
                    return;
                }
            }

            let activation_failed = false;
            let internal_license_file_found = false;
            let internal_lic_file = "";
            for(let loc_index = 0; loc_index < search_locations.length; loc_index++)
            {
                let search_loc = search_locations[loc_index];
                internal_lic_file = FileSystem.MakePath(DEFAULT_LICENSE_NAME, search_loc);
                if(!FileSystem.Exists(internal_lic_file))
                {
                    continue; //only when internal license exists
                }

                internal_license_file_found = true;

                if(activate_with_file(internal_lic_file))
                {
                    activation_failed = false;
                    break;
                }
                else
                {
                    Log("system_studio_custom_actions::activate_with_internal_license: failed to activate with " + internal_lic_file);
                    activation_failed = true;
                }
            }

            if(internal_license_file_found)
            {
                if(activation_failed)
                {
                    let msg_title = StringList.Format("[invalid_internal_license_title]");
                    let msg_content = StringList.Format("[invalid_internal_license_message]");
                    if(ns_inst.Installer.Silent())
                    {
                        Log(msg_content);
                        ns_inst.Installer.OutputFile().Append(msg_title + ": " + msg_content);
                    }
                    else if(WPF)
                    {
                        WPF.MessageBox(msg_content, msg_title, "OK");
                    }
                }
                else
                {
                    let dst_license_path = FileSystem.MakePath(DEFAULT_LICENSE_NAME, FileSystem.exe_dir);
                    copy_file_to_dir(internal_lic_file, dst_license_path);
                }
            }
        };

        activate_with_internal_license();

        Log("Scenario::system_studio_custom_actions: adding action into sequence done");
    }
}
