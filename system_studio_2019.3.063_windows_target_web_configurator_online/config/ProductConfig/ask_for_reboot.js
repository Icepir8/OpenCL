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
    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};
    var ns = this;

    this.Component = function(components, c_node)
    {
        ns.Feature = function(features, f_node)
        {
            ns.Product = function(prod, p_node, cache)
            {
                if(p_node)
                {
                    Log("Product ask_for_reboot configuration started");

                    if(!p_node)
                    {
                        Log(Log.l_warning, "No source node specified");
                        return;
                    }

                    var records = p_node.select("//ask_for_reboot");

                    for(var i in records)
                    {
                        var p = records[i].single("..");
                        if(p)
                        {
                            switch(p.name)
                            {
                            case "component":
                                var alias = p.attributes.alias;
                                if(alias)
                                {
                                    if(components[alias] && records[i].attributes.trigger)
                                        components[alias].Info().Property("ask_for_reboot", records[i].attributes.trigger);
                                    else
                                        Log(Log.l_warning, "Could not find component by alias: " + alias);
                                }
                                else
                                    Log(Log.l_warning, "No alias found for component element");
                                break;
                            case "feature":
                                var id = p.attributes.id;
                                if(id)
                                {
                                    if(features[id] && records[i].attributes.trigger)
                                    {
                                        features[id].Info().Property("ask_for_reboot", records[i].attributes.trigger);
                                    }
                                    else
                                        Log(Log.l_warning, "Could not find feature: " + id);
                                }
                                else
                                    Log(Log.l_warning, "No id found for feature element");
                                break;
                            case "product":
                                if(prod && records[i].attributes.trigger)
                                     prod.Info().Property("ask_for_reboot", records[i].attributes.trigger);
                                else
                                    Log(Log.l_warning, "Product object is not created");
                                break;
                            default:
                                Log(Log.l_warning, "Incorrect parent element: " + p.name);
                                break;
                            }
                        }
                    }

                    Log("Product ask_for_reboot configuration done");
                }
           }
        }
    }
}
