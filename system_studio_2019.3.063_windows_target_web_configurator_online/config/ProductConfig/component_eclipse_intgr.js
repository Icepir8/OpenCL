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

            var c = root.single("/component[@alias and @type]");
            if(!c)
            {
                Log("ExInit: Can't get component[@alias and @type] from the XML description for the component id = " + cmp.Name());
                return false;
            }

            var e_intgr = c.single("eclipse_integartion");
            if(!e_intgr)
            {
                return true;
            }

            Log("component " + cmp.Name() + " require eclipse integration");

            var eclipse_intgr = {};
            eclipse_intgr["plugins_location"] = e_intgr.single("plugins_location").text;
            eclipse_intgr["repositories"] = [];
            if(e_intgr.single("plugins_patterns"))
               eclipse_intgr["plugins_patterns"] = e_intgr.single("plugins_patterns").text;

            if(e_intgr.single("plugins_prefs"))
               eclipse_intgr["plugins_prefs"] = e_intgr.single("plugins_prefs").text;

            if(e_intgr.single("plugins_installdir_var"))
               eclipse_intgr["plugins_installdir_var"] = e_intgr.single("plugins_installdir_var").text;

            if(e_intgr.single("plugins_unshift"))
               eclipse_intgr["plugins_unshift"] = e_intgr.single("plugins_unshift").text;

            var reps = e_intgr.single("repositories");
            if(reps)
            {

                var s_reps = reps.select("repository");

                if(s_reps)
                {
                    for(var s in s_reps)
                    {
                        Log("component " + cmp.Name() + " add ecl rep: " + s_reps[s].text);
                        eclipse_intgr["repositories"].push(s_reps[s].text);
                    }
                }
            }
            cmp.CustomObjects().Add("EclipseIntegration", eclipse_intgr);
        }
    }
}
