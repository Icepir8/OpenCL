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
    var ns_proc = base("proc_manager.js");
    this.Actions = function(prod)
    {   
        var ns = this;
        Log("Scenario::task_kill: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined");
            return;
        }
        var filter = function(coll, cb)
        {  
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
        };
        ns.TaskKill = function()
        {
            var check_processes = function()
            {
                var running_processes = [];
                var all_processes = [];
                var list = [];
                var getList = function() 
                {
                    if(!list.length)
                        list = ns_proc.WMIProcessList();
                    return list;
                }
                
                var repl_reg = function(str)
                {
                    return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\\(").replace(/\)/g, "\\\)").replace(/\^/g, "\\\^").replace(/\$/g, "\\\$");
                }
                
                prod.FilterComponentsRecursive(function(cmp)
                {
                    if (cmp.Action() != cmp.action_t.none)
                    {
                        var bp = cmp.CustomObjects().Item("BlockProcesses");
                        if (bp)
                        { 
                            var p_arr = bp.ProcList();
                            //add distinct values
                            for(var i in p_arr)      
                            {         
                                var p = repl_reg(StringList.Format(p_arr[i]));
                                if(all_processes.indexOf(p) == -1)
                                {
                                    all_processes.push(p); 
                                    Log("TaskKill : Block processes - added : " + p);
                                }

                            }
                        }
                    }
                });

                filter(all_processes, function(proc)
                {
                    var running_list = getList();
                    Log("TaskKill :trying add proc " + proc);
                    filter(running_list, function(rp)
                    {
                        var path = rp.ExecutablePath;
                        if(!path)
                            return;
                        
                        if(path.match(RegExp(proc, "i")))
                        {
                            Log("TaskKill :adding running proccess " + path);
                            if(running_processes.indexOf(rp) == -1)
                                running_processes.push(rp);
                        }
                    });
                });
                return running_processes;
            }

            var run_processes = check_processes();
            
            filter(run_processes, function(proc)
            {
               ns_proc.kill_proc(proc);
               Log("kill the process " + proc.Name)
            });

            return Action.r_ok;

        }
    }
    
    this.Scenario = function(acts)
    {
        Log("Scenario::task_kill: scenario generation started");
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::duplicate_action: required input parameter acts is undefined ");
            return null;
        }
        
        acts.ConfigureOptions.Add(acts.TaskKill);            

        Log("Scenario::task_kill: scenario generation completed");
    }
}
