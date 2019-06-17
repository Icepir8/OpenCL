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

    var IsTrue = function(string)
    {
        switch (String(string).toLowerCase())
        {
            case "true":
            case "1":
            case "yes":
            case "y":
                return true;
            default:
                return false;
        }
    }

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

            var vs_intgr = c.single("vs_integration");
            var vs_restart = c.single("vs_restart");
            if(!vs_intgr && !vs_restart)
            {
                return true;
            }

            if(vs_intgr)
            {
                Log("processing the vs_integration section for component \"" + cmp.Name() + "\"");

                var vs_list = vs_intgr.subnodes("*");

                var obj_vs_intgr = {};

                var integration_required = 0;

                if(vs_list)
                {
                    for(var i in vs_list)
                    {
                        var vs = vs_list[i];

                        if(!vs.name){
                            Log(Log.l_warning, "found child element under <vs_integration> with undefined attribute name -> ignore");
                            continue;
                        }

                        integration_required = 1;

                        if(!obj_vs_intgr[vs.name]){
                            obj_vs_intgr[vs.name] = {};
                        }

                        Log("    required integration into " + vs.name);
                        obj_vs_intgr[vs.name].property = vs.text;
                        obj_vs_intgr[vs.name].default_selected = IsTrue(vs.attributes && vs.attributes.selected) ? 1 : 0;
                        obj_vs_intgr[vs.name].skip_restart = IsTrue(vs.attributes && vs.attributes.skip_restart) ? 1 : 0;
                    }
                }

                if(integration_required){
                    Log("processing the vs_integration section for component " + cmp.Name() + " done, integration is required");
                    cmp.CustomObjects().Add("VSIntegration", obj_vs_intgr);
                }
                else{
                    Log("processing the vs_integration section for component " + cmp.Name() + " done, integration ISN'T required");
                }
            }

            if(vs_restart)
            {
                Log("processing the vs_restart section for component \"" + cmp.Name() + "\"");

                var vs_restart_list = vs_restart.subnodes("*");

                var obj_vs_restart = {};

                var restart_required = 0;

                if(vs_restart_list){
                    for(var r in vs_restart_list)
                    {
                        var vs_obj = vs_restart_list[r];

                        if(!vs_obj.name)
                        {
                            Log(Log.l_warning, "found child element under <vs_restart> with undefined attribute name -> ignore");
                            continue;
                        }

                        restart_required = 1;

                        if(!obj_vs_restart[vs_obj.name]){
                            obj_vs_restart[vs_obj.name] = {};
                        }
                        obj_vs_restart[vs_obj.name].property = vs_obj.text;
                    }
                }

                if(restart_required){
                    Log("processing the vs_restart section for component " + cmp.Name() + " done, vs restart data added");
                    cmp.CustomObjects().Add("VSRestart", obj_vs_restart);
                }
                else{
                    Log("processing the vs_restart section for component " + cmp.Name() + " done, vs restart data ISN'T required");
                }
            }
        }
    }
}
