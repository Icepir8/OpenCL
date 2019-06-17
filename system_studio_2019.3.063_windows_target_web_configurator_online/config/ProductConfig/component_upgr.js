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
    this.Component = function(components, node)
    {
        if(components)
        {
            Log("Set upgrade info");
            var i;
            var group;
            for(i in components)
            {
                //Log("Upgrade for component: " + i);
                if(components[i] && components[i].Info().Property("upgrade"))
                {
                    Log("Upgrade for component: " + i + "  by Upgrade code: " + components[i].Info().Property("upgrade"));
                    components[i].Upgrade().MSIUpgradeCode(components[i].Info().Property("upgrade"));
                }

                group = components[i].Info().Property("group");
                if(components[i] && group)
                {
                    Log("Upgrade for component: " + i + "  by group name: " + group);
                    components[i].AddToGroup(group);
                    components[i].Upgrade().Group(group);
                }
            }

            var cmps = node.select("components/component[@alias]");
            if(cmps)
            {
                Log("Set upgrade group");
                for(i in cmps)
                {
                    group = cmps[i].attributes.group;
                    var alias = cmps[i].attributes.alias;
                    if(alias && components[alias])
                    {
                        if(group)
                        {
                            Log("  Component " + alias + " added to group: " + group);
                            components[alias].AddToGroup(group);
                            components[alias].Upgrade().Group(group);
                        }
                    }
                }
            }
        }
    }
}


