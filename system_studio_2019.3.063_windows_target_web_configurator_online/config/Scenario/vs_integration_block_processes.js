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

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::vs_integration_block_processes: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }
        
        var ns_vs = base("vs_processing.js").GetVSInfo();
        
        var get_vs_instances_paths = function(vs_id)
        {
            var paths = [];
            if(ns_vs.hasOwnProperty(vs_id))
            {
                if(typeof(VSSetupConfig) != "undefined")
                {
                    var ids = VSSetupConfig.GetIds();
                    for(var i = 0; i < ids.length; i++)
                    {
                        var version = VSSetupConfig.GetInstallationVersion(ids[i]);
                        if(version.indexOf(ns_vs[vs_id].ver) == 0)
                        {
                            var path = VSSetupConfig.GetInstallationPath(ids[i]);
                            if(path)
                                paths.push(path);
                            else
                                Log(Log.l_warning, "Visual Studio path is not defined for instance: " + ids[i]);
                        }
                    }
                }
            }
            else
            {
                Log(Log.l_warning, "VS id is not supported: " + vs_id);
            }
            return paths;
        }
        
        var get_dir_general = function(Id)
        {
            var vs = ns_vs[Id];     
            if(vs)
                return vs.dir;
            return "";
        }

        ns.ComponentCustomResolver = function()
        {
            prod.FilterComponentsRecursive(function(cmp)
            {
                var bp = cmp.CustomObjects().Item("BlockProcesses");
                if (bp)
                {
                    bp.AssignCustomResolver(get_dir_general);
                    bp.AssignCustomResolver(get_vs_instances_paths, "vs_2017");
                }
            });
            
            return Action.r_ok;
        }
    }
    
    this.Scenario = function(acts)
    {
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::Scenario required input parameter acts is undefined ");
            return null;
        }
        Log("Scenario::vs_integration_block_processes: adding action into sequence");
       
        acts.Initialization.Add(acts.ComponentCustomResolver);       


        Log("Scenario::vs_integration_block_processes: adding action into sequence done");
    }
}
