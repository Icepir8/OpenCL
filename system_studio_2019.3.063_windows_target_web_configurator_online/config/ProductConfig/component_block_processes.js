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
    
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    this.ExInit = function(root, node)
    {
        return function()
        {
            var cmp = this;

            var c = root.single("/component[@alias and @type]");
            if(!c)
            {
                Log("ExInit: Can't get component[@alias and @type] from the XML description for the component id = " + cmp.Name());
                return false;
            }

            var block_p = c.single("block_processes");

            if(!block_p)
            {
                return true;
            }

            if(block_p)
            {
                Log("processing the block_processes section for component \"" + cmp.Name() + "\"");

                var block_list = block_p.subnodes("*");
                
                 /*
                  <block_processes>
                    <name>notepad.exe</name>
                    <name>notepad++.exe</name>
                    <path>[@ProgramFiles]\Zip\executable\</path>
                    <path>[@ProgramFiles]\Zip\plugins\</path>
                    <custom>vs_2015</custom>
                    <custom>vs_2017</custom>
                  </block_processes>
                */
                
                if (!block_list)
                {
                    Log(Log.l_warning, " block_processes section is empty, cmp \"" + cmp.Name() + "\"");
                    return true;
                }

                var obj_block = {};
 
                var name_arr = [];
                var path_arr = [];
                var custom_arr = [];
                for(var i in block_list)
                {
                    var rec = block_list[i];
                    
                    switch (rec.name)
                    {
                        case "name" :
                            Log("rec.name : " + rec.text);
                            name_arr.push(rec.text);
                            break;
                        case "path" :
                            Log("rec.path : " + rec.text);
                            path_arr.push(rec.text);
                            break;
                        case "custom" :
                            Log("rec.custom : " + rec.text);
                            custom_arr.push(rec.text);
                            break;
                    }
                }
                obj_block.name_arr = name_arr;
                obj_block.path_arr = path_arr;
                obj_block.custom_arr = custom_arr;
                
                var custom_resolver_gen = null;
                var custom_resolvers = {};
                var proc_list = [];
                var resolved = false;

                //a function for resolving custom block processes
                obj_block.AssignCustomResolver = function(cb, Id)
                {
                    if(!Id) 
                        custom_resolver_gen = cb; //general resolver. Id wasn't passed
                    else
                        custom_resolvers[Id] = cb; //individual resolver for the specific Id
                }
                obj_block.Resolved = function(){return resolved;};     
                //a list of patterns for searching running processes    
                obj_block.ProcList = function(){if(!obj_block.Resolved()) obj_block.Resolve(); return proc_list;};    //resolve once
                obj_block.Resolve = function()
                {
                    var proc = [];
                    //add proc name & path patterns
                    filter(obj_block.name_arr, function(el){proc.push(el);}); 
                    filter(obj_block.path_arr, function(el){proc.push(el);});
                    filter(obj_block.custom_arr, function(el)
                    {
                        //choose a resolver
                        var cr = function(el)
                        {
                            if(custom_resolvers[el]) 
                                return custom_resolvers[el](el); 
                            if(custom_resolver_gen) 
                                return custom_resolver_gen(el); 
                        };
                        
                        var res = cr(el);
                        if (res)
                        {
                            //resolver might return an object, array, or simply a string
                            if (typeof res == "object")
                            {
                                filter(res, function(p){proc.push(p);});
                            }
                            else
                            {
                                proc.push(res);
                            }
                        }
                    });
                    resolved = true;
                    //the list of patterns 
                    proc_list = proc;
                    return proc;
                }

                Log("processing the block_processes section for component " + cmp.Name() + " done");
                cmp.CustomObjects().Remove("BlockProcesses");
                cmp.CustomObjects().Add("BlockProcesses", obj_block);
            }
        }
    }
}
