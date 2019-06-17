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

    this.ExInit = function(root, node)
    {
        return function()
        {
            var cmp = this;

            Log("detecting cmps for WB");
            var c = root.single("/component[@alias and @type]");
            if(!c)
            {
                Log("ExInit: Can't get component[@alias and @type] from the XML description for the component id = " + cmp.Name());
                return false;
            }

            var intgr = c.single("wb_integration");
            if(!intgr || !intgr.attributes.required || intgr.attributes.required != "1")
            {
                //wb_integration isn't required
                return true;
            }

            Log("component " + cmp.Name() + " requires workbench integration");

            var wb = {};
            wb["required"] = 1;

            var iscript = intgr.single("integrate_script");
            if(iscript)
            {
                Log("component " + cmp.Name() + " add script for wb integration = " + iscript.text);
                wb["integrate_script"] = iscript.text;
            }

            var iparams = intgr.single("integrate_params");
            if(iparams)
            {
                Log("component " + cmp.Name() + " add integrate_params for wb integration = " + iparams.text);
                wb["integrate_params"] = iparams.text;
            }

            var dscript = intgr.single("deintegrate_script");
            if(dscript)
            {
                Log("component " + cmp.Name() + " add script for wb deintegration = " + dscript.text);
                wb["deintegrate_script"] = dscript.text;
            }

            cmp.CustomObjects().Add("WBIntegration", wb);

            cmp.Configurator().Apply.DoInstall.SubscribeOnBegin(function(dmp)
            {
                if(cmp.Action() != cmp.action_t.reinstall)
                    return true;

                Log("Scheduling remove prior to install (because action = reinstall) for component: " + cmp.Name());

                var ract = null;

                if(cmp.Processor() && cmp.Processor().RemoveAct)
                {
                    ract = cmp.Processor().RemoveAct(cmp);
                    if(!ract)
                    {
                        cmp.Log("DoApplyRemove: component can't be removed due to component processor didn't return any action");
                        return false;
                    }
                }
                else
                {
                    cmp.Log("DoApplyRemove: component can't be removed due to component processor isn't defined or it doesn't has method RemoveAct");
                    return false;
                }

                if(dmp && dmp.IsDumper)
                {
                    var uninst = cmp.Dumper().AddAction(ract, "remove " + cmp.Name());
                    uninst.Group("Uninstall");
                }
                else
                {
                    obj.Log("DoInstall: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");
                    return false;
                }

                return true;
            });
        }
    }
}
