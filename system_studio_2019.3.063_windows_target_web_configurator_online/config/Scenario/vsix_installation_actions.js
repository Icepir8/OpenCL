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
    var product_config = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../ProductConfig"));};

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};
    var load_from_config = function(name) {return required(from_config(name));};
    
    var fm = StringList.Format;
    var ns_errhan = dialogs("error_handler.js");
    var ns_vs = base("vs_processing.js");
    var ns_values = product_config("component_values.js");
    var ns_inst = Namespace("Root.installer");
    
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

    var quote = function(str) {return (str || "").match(/\s/) ? '"' + str + '"' : str;};
  
    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::vsix_installation: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }
        
        var vs = ns_vs.GetVSInfo();
        
        var findinstaller = function()
        {
            var installer;
            //firstly let's try to find installer in predefined path 
            const vsix_exe = "\\Microsoft Visual Studio\\Installer\\resources\\app\\ServiceHub\\Services\\Microsoft.VisualStudio.Setup.Service\\VSIXInstaller.exe";
            var vsix_path = FileSystem.MakePath(vsix_exe, FileSystem.SpecialFolder.program_files_x86);
            if(FileSystem.Exists(vsix_path))
                return vsix_path;
            
            var vss = [];
            iterate(vs, function(v) {vss.push(v);});
    
            Log("Looking for VSIXInstaller.exe");
            iterate(vss.reverse(), function(info)
            {
                if(info.dir && FileSystem.Exists(info.dir))
                {
                    var inst = FileSystem.AbsPath(info.dir, "Common7/IDE/VSIXInstaller.exe");
                    Log("Looking for: " + inst);
                    if(FileSystem.Exists(inst))
                    {
                        installer = inst;
                        return true;
                    }
                }
            });
            return installer;
        };

        var vsixinstaller = findinstaller();
        Log("VSIX INSTALLER: " + vsixinstaller);

        const IntegrationSuccessful        = 0;
        const AlreadyInstalledException    = 1001;
        const NotInstalledException        = 1002;
        const NotPendingDeletionException  = 1003;
        const IdentifierConflictException  = 1005;
        const DependencyException          = 1019;
        const DirectoryExistsException     = 1022;
        const FilesInUseException          = 1023;
         
        const InvalidCommandLineException  = 2001;
        const NoApplicableSKUsException    = 2003;
        const BlockingProcessesException   = 2004;
        
        const number_of_retries   = 5;
        const retry_timeout       = 10000;

        //get a name of supported sku
        var get_vs_sku_name = function (product_id)
        {
            if(product_id.indexOf("Enterprise") != -1)
                return "Enterprise";
            if(product_id.indexOf("Professional") != -1)
                return "Pro";
            if(product_id.indexOf("Community") != -1)
                return "Community"
            return;
        }
        
        var set_error = function(err_msg)
        {
            var handler = ns_errhan.Handler(prod, false);
            var error_item = {};
            error_item.Error = function() {return err_msg};
            var iterator = {};
            iterator.Item = function() {return error_item};
            handler(iterator);
            ns.Complete.ErrorOccured(true);
        }
        
        var vsix_register_act = function(reg_obj)
        {
             /*
            var reg_obj = {
                vs_2017: {instance_id: ["vsix_path", ... ], },
                vs_next: {instance_id:[ "vsix_path", ... ],
            }
            */
            Log("=== VSIX register action ===");
            if(typeof(ns.TaskKill) == "function")
                ns.TaskKill();
            
            for(var vs_ver in reg_obj)
            {
                var vse = vs[vs_ver];
                var instid_arr = reg_obj[vs_ver];
                //property contains an array of VS instances in with Complete state
                if(vse.hasOwnProperty("instances")) 
                {
                    for(var id in instid_arr)
                    {
                        var instance = iterate(vse.instances, function(it) { if (it.id == id) return it;} );
                        if(instance)
                        {
                            var sku_name            = get_vs_sku_name(instance.product);
                            var sku_ver             = instance.version;
                            var appid_name          = "Visual Studio";
                            var appid_installpath   = FileSystem.MakePath(instance.product_path, instance.install_path);
                            var reg_vsix_files      = instid_arr[id].map(function(vsix){ return quote(vsix); }).join(" ");
                            
                            var cmd = quote(vsixinstaller) + 
                            " /q" + 
                            " /appidinstallpath:" + quote(appid_installpath) + 
                            " /appidname:" + quote(appid_name) + 
                            " /skuName:" + sku_name + 
                            " /skuVersion:" + sku_ver + 
                            " " + reg_vsix_files;
                            
                            Log("Run VSIXInstaller for " +  vs_ver + ": " + instance.id);
                            var ret = CreateProcess(null, cmd, true, Origin.Directory(), 0);
                            Log(JSON.stringify(ret));
                            
                            if(ret.exitcode != IntegrationSuccessful && ret.exitcode != AlreadyInstalledException)
                            {
                                for(var j = 1; j <= number_of_retries; j++)
                                {
                                    sleep(retry_timeout);
                                    ns.TaskKill();
                                    Log("VSIX register: retrying the command. Attempt: " + j + " out of " + number_of_retries);
                                    ret = CreateProcess(null, cmd, true, Origin.Directory(), 0);
                                    Log(JSON.stringify(ret));
                                    if(ret.exitcode == IntegrationSuccessful || ret.exitcode == AlreadyInstalledException)
                                    {
                                        Log("VSIX register:: Successfull. Breaking the retry loop.");
                                        break;
                                    }
                                }
                                // Failed, handle an error 
                                var err_msg = StringList.Format("[vs_integration_failed]", instance.display_name, instance.display_name, ret.exitcode);
                                set_error(err_msg);
                            }
                        }
                    }
                }
            }
        }
        
        var vsix_unregister_act = function(unreg_obj)
        {
            /*
            var unreg_obj = {
                vs_2017: {instance_id: ["vsix_id", ... ],},
                vs_next: {instance_id:["vsix_id", ... ],},
            }
            */
            Log("=== VSIX unregister action ===");
            
            if(typeof(ns.TaskKill) == "function")
                ns.TaskKill();
            
            
            for(var vs_ver in unreg_obj)
            {
                var vse = vs[vs_ver];
                var instid_arr = unreg_obj[vs_ver];
                if(vse.hasOwnProperty("instances")) 
                {
                    for(var id in instid_arr)
                    {
                        var instance = iterate(vse.instances, function(it) { if (it.id == id) return it;} );
                        if(instance)
                        {
                            var sku_name            = get_vs_sku_name(instance.product);
                            var sku_ver             = instance.version;
                            var appid_name          = "Visual Studio";
                            var appid_installpath   = FileSystem.MakePath(instance.product_path, instance.install_path); 
                            var unreg_vsixid_cmd    = instid_arr[id].join(" /u:");
                            
                            var cmd = quote(vsixinstaller) + 
                            " /q" + 
                            " /appidinstallpath:" + quote(appid_installpath) + 
                            " /appidname:" + quote(appid_name) + 
                            " /skuName:" + sku_name + 
                            " /skuVersion:" + sku_ver + 
                            " /u:" + unreg_vsixid_cmd;
                            
                            Log("Run VSIXInstaller for " +  vs_ver + ": " + instance.id);
                            var ret = CreateProcess(null, cmd, true, Origin.Directory(), 0);
                            Log(JSON.stringify(ret));

                            if(ret.exitcode != IntegrationSuccessful && ret.exitcode != NotInstalledException)
                            {
                                for(var j = 1; j <= number_of_retries; j++)
                                {
                                    sleep(retry_timeout);
                                    ns.TaskKill();
                                    Log("VSIX unregister: retrying the command. Attempt: " + j + " out of " + number_of_retries);
                                    ret = CreateProcess(null, cmd, true, Origin.Directory(), 0);
                                    Log(JSON.stringify(ret));
                                    if(ret.exitcode == IntegrationSuccessful || ret.exitcode == NotInstalledException)
                                    {
                                        Log("VSIX unregister:: Successfull. Breaking the retry loop.");
                                        break;
                                    }
                                }
                                // Failed, handle an error 
                                var err_msg = StringList.Format("[vs_integration_failed]", instance.display_name, instance.display_name, ret.exitcode);
                                set_error(err_msg);
                            }
                        }
                    }
                }
            }
        }
        
        var is_vsix_available = function(entry)
        {
            if(typeof(entry.file) != "undefined" && entry.file.length)
            {
                 if(!FileSystem.Exists(entry.file))
                 {
                    Log(Log.l_warning, "VsixFile is not found: " + entry.file);
                    return false;
                 }
                 else
                 {
                    Log("VsixFile is found:  " + entry.file);
                    return true;
                 }
            }
            else
            {
                Log(Log.l_warning, "Expected parameter VsixFile is not defined for " + entry.guid);
            }
            return false;
        }
        
        var is_vsix_installed = function(instance, entry)
        {
            var vse = vs[entry.version];
            if(typeof(vse) != "undefined")
            {
                var ret = ns_vs.CheckInstalledPackages(instance, entry.guid);
                Log("VsixId " + entry.guid + " is " + (ret ? "" : "NOT") + " installed into " + entry.version + ": " + instance.id);
                return ret;
            }
            Log(Log.l_warning, "Defined VS version for VsixId " + entry.guid + " is not supported: " + entry.version);
            return false;
        }
        
        var condition_for = function (instance, entry, action)
        {
            var context = {};
            context.vs_package        = {};
            context.installed_package = {};
            
            var list_of_objects = function(str)
            {
                var rgxp = /([vs_package|installed_package][a-zA-Z0-9\._]+)/ig;
                return str.match(rgxp);
            }
            
            var create_ns = function(prn, name, value)
            {
                var names = name.split(".");
            
                if(names.length)
                {
                    var obj = prn;
            
                    while(names.length)
                    {
                        var nm = names[0];
                        
                        if(names.length == 1)
                        {
                            obj[nm] = value;
                            break;
                        }
            
                        if(!obj[nm])
                        {
                            var o = new Object;
                            obj[nm] = o;
                            obj = o;
                        }
                        else
                            obj = obj[nm];
                        names.shift();
                    }
                    return obj;
                }
            
                return prn;
            }
            
            var process_element = function(name, key)
            {
                switch(name)
                {
                    case "vs_package":
                       create_ns(context.vs_package, key, ns_vs.CheckInstalledPackages(instance, key));
                       break;
                    case "installed_package":
                       context.installed_package[key] = _cmp.State() == _cmp.state_t.installed;
                       break;
                }
            }            
            
            var expr = "";
            if(action == "install")
            {
                expr = entry.install_condition;
            }
            if(expr == "remove")
            {
                expr = entry.remove_condition;
            }
            Log("Checking " + action + " condition = " + expr);
            if(expr.length == 0)
            {
                Log("Result: true (empty condition).");
                return true;
            }
            
            var objs = list_of_objects(expr);

            iterate(objs, function(elem){ var arr = elem.split("."); process_element(arr[0], elem.substring(arr[0].length + 1));});
            Log("Context:" + JSON.stringify(context));
            var ret = false;
            with(context)
            {
               ret = eval(expr);
            }
            Log("Result: " + ret);
            return ret;
        }
        
        var add_to_install_list = function (instance, entry, list)
        {
            if(!list.hasOwnProperty(entry.version))
            {
               list[entry.version] = [];
            }
            
            var vs_arr = list[entry.version];
            if(!vs_arr.hasOwnProperty(instance.id))
            {
                vs_arr[instance.id] = [];
            }
            
            var reg_arr = vs_arr[instance.id];
            if(reg_arr.indexOf(entry.file) == -1)
                reg_arr.push(entry.file);
        }
        
        var add_to_remove_list = function (instance, entry, list)
        {
            if(!list.hasOwnProperty(entry.version))
            {
                list[entry.version] = [];
            }

            var vs_arr = list[entry.version];
            if(!vs_arr.hasOwnProperty(instance.id))
            {
                vs_arr[instance.id] = [];
            }

            var unreg_arr = vs_arr[instance.id];
            if(unreg_arr.indexOf(entry.guid) == -1)
                unreg_arr.push(entry.guid);
        }
        
        //= Actions =//
        
        ns.VSIXInstallRemoveAction = function()
        {
           Log("VSIXInstallRemoveAction start.");
           var pkgs = Namespace("Root.VSIX").packages;
           var reg_obj = {};
           var unreg_obj = {};
           
           for(var i in pkgs)
           {
               if(pkgs[i].action.toLowerCase() == "install_remove")
               {        
                    var _cmp = pkgs[i].cmp;
                    var initial_state = pkgs[i].cmp_init_state;
                    
                    var installer_values = ns_values.Values(_cmp, prod);
                    pkgs[i].file = StringList.FormatNamed(pkgs[i].file, installer_values).trim();

                    _cmp.StateManager( { State: function()
                        { 
                            if(typeof(_cmp.Processor) == "function" && 
                            typeof(_cmp.Processor().IsInstalled) == "function" &&
                            _cmp.Processor().IsInstalled(true))
                            {
                                return _cmp.state_t.installed; 
                            }
                            else
                            {
                                return _cmp.state_t.absent; 
                            }
                        } 
                    });
                                        
                    Log("VSIX package: id = " + pkgs[i].guid + " file = " + pkgs[i].file);
        
                    Log("Component: " + _cmp.Info().Property("alias") + 
                       " action = " + _cmp.Action() + 
                       " initial_state = " + initial_state + 
                       " current_state = " + _cmp.State());
                    
                    var vse = vs[pkgs[i].version];
                    if(typeof(vse) != "undefined" && vse.hasOwnProperty("instances")) 
                    {
                        for (var id in vse.instances)
                        {
                            var instance = vse.instances[id];
                            var sku_name = get_vs_sku_name(instance.product);
                            if(typeof(sku_name) != "undefined") //if SKU supported
                            {   
                                //install
                                if(_cmp.Action() == _cmp.action_t.install && 
                                   _cmp.State() == _cmp.state_t.installed)
                                {
                                    if(is_vsix_available(pkgs[i]))
                                    {
                                        if(condition_for(instance, pkgs[i], "install"))
                                            add_to_install_list(instance, pkgs[i], reg_obj);
                                        if(is_vsix_installed(instance, pkgs[i]))
                                            add_to_remove_list(instance, pkgs[i], unreg_obj);
                                    }
                                }
                                // remove
                                if(_cmp.Action() == _cmp.action_t.remove &&
                                   _cmp.State() == _cmp.state_t.absent)
                                {
                                    if(is_vsix_installed(instance, pkgs[i]))
                                    {
                                        if(condition_for(instance, pkgs[i], "remove"))
                                        {
                                            add_to_remove_list(instance, pkgs[i], unreg_obj);
                                        }
                                    }
                                }
                                // reinstall & repair
                                if( _cmp.state_t.installed == initial_state &&
                                   (_cmp.Action() == _cmp.action_t.reinstall || _cmp.Action() == _cmp.action_t.repair) && 
                                    _cmp.State() == _cmp.state_t.installed)
                                {
                                    var is_installed = is_vsix_installed(instance, pkgs[i]);
                                    var is_available = is_vsix_available(pkgs[i])
                                    if(is_available && !is_installed && condition_for(instance, pkgs[i], "install"))
                                    {
                                        add_to_install_list(instance, pkgs[i], reg_obj);
                                    }
                                    if(!is_available && is_installed && condition_for(instance, pkgs[i], "remove"))
                                    {
                                        add_to_remove_list(instance, pkgs[i], unreg_obj);
                                    }
                                }
                            }
                            else
                            {
                                Log("Visual Studio instance is not supported by installer: " + instance.product + " " + instances.version);
                            }
                        }
                    }
                    else
                    {
                        Log(Log.l_warning, "Defined VS version for VsixId " + entry.guid + " is not supported: " + entry.version);
                    }
                    Log("====================");
               }
           }
           //Run VSIX installer to remove already installed VSIX extensions.
           vsix_unregister_act(unreg_obj);
           //Run VSIX installer to install VSIX extensions.
           vsix_register_act(reg_obj);
           Log("VSIXInstallRemoveAction end.");
           return Action.r_ok;
        }
        
        ns.VSIXUpgradeAction = function()
        {
            Log("VSIXUpgradeAction");
            var pkgs = Namespace("Root.VSIX").packages;
            var unreg_obj = {};

            for(var i in pkgs)
            {
               if(pkgs[i].action.toLowerCase() == "upgrade")
               {                   
                    var _cmp = pkgs[i].cmp;
                    Log("Component: " + _cmp.Info().Property("alias") +
                        " action = " + _cmp.Action() + 
                        " current_state = " + _cmp.State());
                    
                    Log("VSIX package: id = " + pkgs[i].guid);
                    
                    var vse = vs[pkgs[i].version];
                    if(typeof(vse) != "undefined" && vse.hasOwnProperty("instances")) 
                    {
                        for (var id in vse.instances)
                        {
                            var instance = vse.instances[id];
                            var sku_name = get_vs_sku_name(instance.product);
                            if(typeof(sku_name) != "undefined") //if SKU supported
                            {   
                                if(_cmp.Action() == _cmp.action_t.install)
                                {
                                    if(is_vsix_installed(instance, pkgs[i]) && condition_for(instance, pkgs[i], "remove"))
                                    {
                                        add_to_remove_list(instance, pkgs[i], unreg_obj);
                                    }
                                }
                            }
                            else
                            {
                                Log("Visual Studio instance is not supported by installer: " + instance.product + " " + instances.version);
                            }
                        }
                    }
                    else
                    {
                        Log(Log.l_warning, "Defined VS version for VsixId " + entry.guid + " is not supported: " + entry.version);
                    }
                    Log("====================");
               }
            }
            //Run VSIX installer to remove VSIX extensions.
            vsix_unregister_act(unreg_obj);
            Log("VSIXUpgradeAction end.");
            return Action.r_ok;
        }
        
        ns.VSIXPackagesConfiguration = function()
        {
            Log("VSIXPackagesConfiguration action started.");
            if(typeof(Namespace("Root.VSIX").packages) != "undefined" && Namespace("Root.VSIX").packages.length != 0)
            {
                var prg = Progress();
                prg.message = StringList.Format("Configuring VisualStudio.");
                prg.total = -1;
                
                var up_dmp = ns_inst.Installer.IDumper.PreAction().PostAction().AddAction({
                        Apply: function() 
                        {
                            ns.VSIXUpgradeAction();                        
                            return Action.r_ok;
                        },
                        Rollback: function()
                        {
                            return Action.r_ok;
                        },
                        Commit: function()
                        {
                        },
                        ProgressApply: function() 
                        {
                            return prg;
                        }
                }, "VSIX Upgrade Dumper");
                up_dmp.Attribute("countable", true);
                up_dmp.Attribute("name",  StringList.Format("[vs_removing_extensions]"));
    
                var ir_dmp = ns_inst.Installer.IDumper.PostAction().PreAction().AddAction({
                        Apply: function() 
                        {
                            ns.VSIXInstallRemoveAction();
                            return Action.r_ok;
                        },
                        Rollback: function()
                        {
                            return Action.r_ok;
                        },
                        Commit: function()
                        {
                        },
                        ProgressApply: function() 
                        { 
                            return prg;
                        }
                }, "VSIX InstallRemove Dumper");
                ir_dmp.Attribute("countable", true);
                ir_dmp.Attribute("name", StringList.Format("[vs_installing_extensions]"));
            }
          
        }
       
        ns.ConfigureOptions.Add(ns.VSIXPackagesConfiguration);
        Log("Scenario::vsix_installation: actions generation completed");
        return ns;
    }
}