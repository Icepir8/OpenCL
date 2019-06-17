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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var fm = StringList.Format;
    var ns_vs = base("vs_processing.js").GetVSInfo();
    var ns_inst = Namespace("Root.installer");

    var filter = function(coll, cb)
    {
        for(var i in coll){
            if(cb(coll[i], i)){
                return true;
            }
        }
        return false;
    };

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "scenario:vs_integration:iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            if(cont.hasOwnProperty(key))
            {
                var r1 = cb(cont[key], key);
                if(r1){
                    return r1;
                }
            }
        }

        return null;
    }

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::vs_restart: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return ns;
        }

        // ########################################################################
        // SKIP_RESTART_VS20XX options adjustment --> start
        // ########################################################################
        var add_vs_restart_to_dumper = function(vs, dmp)
        {
            var prg = Progress();
            prg.total = -1;
            prg.message = fm("[vs_restart_progress_message]", vs.name);

            var exe = {};

            exe.Apply = function()
            {
                if(vs && vs.devenv && FileSystem.Exists(vs.devenv))
                {
                    var ret = CreateProcess("", vs.devenv + " /setup", true);

                    Log("Restart of " + vs.name + " cmd execution ret.failed = " + ret.failed);
                    Log("Restart of " + vs.name + " cmd execution ret.error = " + ret.error);
                    Log("Restart of " + vs.name + " cmd execution ret.exitcode : " + ret.exitcode);
                    Log("Restart of " + vs.name + " cmd execution ret.output: " + ret.output);
                }

                return Action.r_ok;
            }

            exe.Rollback = function()
            {
                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            if(dmp && dmp.IsDumper)
            {
                var a = dmp.AddAction(exe, fm("Restart of " + vs.name));
                a.Attribute("countable", true);
                a.Attribute("name", fm("Restart of " + vs.name));
            }
        }

        ns.RestartVSConfiguration = function()
        {
            Log("action RestartVSConfiguration begin");

            if(prod.InstallMode() == prod.install_mode_t.repair){
                Log("action RestartVSConfiguration not needed in repair mode");
                return Action.r_ok;
            }

            var cmps = [];
            prod.FilterComponentsRecursive(function(obj)
            {
                if(obj.Action() != obj.action_t.none)
                {
                    if(obj.CustomObjects().Item("VSRestart") || obj.CustomObjects().Item("VSIntegration"))
                    {
                        cmps.push(obj);
                        Log("Found component for vs integration/restart: " + obj.Name() + ", with action: " + obj.Action());
                    }
                }
            });

            var vs_for_restart = {};
            var vs_integration_data = ns.VSIntegration.Data ? ns.VSIntegration.Data() : null;
            var vs_integration_original_data = ns.VSIntegration.OriginalData ? ns.VSIntegration.OriginalData() : null;

            var get_vs_data_selected = function(data, id)
            {
                if(!data || !id){
                    return null;
                }

                for(var i in data)
                {
                    if(data.hasOwnProperty(i)){
                        if(data[i].id == id){
                            return data[i].selected;
                        }
                    }
                }

                return null;
            }

            var merge_hash_keys = function(a, b)
            {
                var merged = {};
                filter([a, b], function(obj){
                    for(var i in obj){
                        if(obj.hasOwnProperty(i)){
                            merged[i] = i;
                        }
                    }
                });

                return merged;
            }

            iterate(cmps, function(cmp)
            {
                var vs_restart_hash = cmp.CustomObjects().Item("VSRestart") ? cmp.CustomObjects().Item("VSRestart") : {};
                var vs_integration_hash = cmp.CustomObjects().Item("VSIntegration") ? cmp.CustomObjects().Item("VSIntegration") : {};

                var vsi = merge_hash_keys(vs_restart_hash, vs_integration_hash);

                for(var i in vsi)
                {
                    if(vsi.hasOwnProperty(i))
                    {
                        var vs = ns_vs[i];
                        if(!(vs && vs.devenv && FileSystem.Exists(vs.devenv)) || vs_integration_hash[i] && vs_integration_hash[i].skip_restart){
                            continue;
                        }

                        if(prod.InstallMode() == prod.install_mode_t.modify && cmp.Action() != cmp.action_t.remove && cmp.CustomObjects().Item("VSIntegration") && cmp.CustomObjects().Item("VSIntegration")[i])
                        {
                            var current_selected = get_vs_data_selected(vs_integration_data, i);
                            var original_selected = get_vs_data_selected(vs_integration_original_data, i);
                            if(current_selected !== null && original_selected !== null && (current_selected == original_selected || current_selected == false)){
                                continue;
                            }
                        }

                        vs_for_restart[vs.id] = vs;
                        if(cmp.Action() != cmp.action_t.remove){
                            cmp.InstallConfigurationOptions().Add("SKIP_RESTART_" + vs.id.toUpperCase().replace(/_/, ""), "1");
                        }
                        else{
                            cmp.RemoveConfigurationOptions().Add("SKIP_RESTART_" + vs.id.toUpperCase().replace(/_/, ""), "1");
                        }
                        Log("Found component which requires restart of VS, component name: " + cmp.Name() + ", VS name: " + vs.name);
                    }
                }
            });

            for(var vs in vs_for_restart)
            {
                if(vs_for_restart.hasOwnProperty(vs))
                {
                    add_vs_restart_to_dumper(vs_for_restart[vs], ns_inst.Installer.IDumper.PostAction());
                }
            }

            Log("action RestartVSConfiguration end");
            return Action.r_ok;
        }

        if(ns.ConfigureOptions){
            ns.ConfigureOptions.Add(ns.RestartVSConfiguration);
        }
        else{
            Log("Scenario::common_configuration_options: ns.ConfigureOptions isn't defined -> ignore");
        }

        Log("Scenario::vs_restart: actions generation completed");
        // ########################################################################
        // SKIP_RESTART_VS20XX options adjustment --> end
        // ########################################################################
        return ns;
    }
}
