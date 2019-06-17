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
            ns.Product = function(product, node, cache)
            {
                if(product && node)
                {
                    Log("Product Common Location configuration started");

                    var comlocs = node.select("//common_location [@lock_install_dir]");
                    if(!comlocs)
                        return;

                    var add_common_location_entry = function(obj, node)
                    {
                        if(!obj.CustomObjects)
                            return;

                        if(!obj.CustomObjects().Item("CommonLocations"))
                        {
                            obj.CustomObjects().Add("CommonLocations", {});
                        }

                        var hash = obj.CustomObjects().Item("CommonLocations");

                        obj.Log("Found Common Location " + node.text + " lock_install_dir = " + node.attributes.lock_install_dir);
                        hash[node.text] = (node.attributes.lock_install_dir == "true") ? 1 : 0;
                    }

                    for(var i in comlocs)
                    {
                        var loc = comlocs[i];
                        var p = loc.single("..");
                        if(p)
                        {
                            switch(p.name)
                            {
                            case "component":
                                var alias = p.attributes.alias;
                                if(alias)
                                {
                                    if(components[alias])
                                        add_common_location_entry(components[alias], loc);
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
                                    if(features[id])
                                        add_common_location_entry(features[id], loc);
                                    else
                                        Log(Log.l_warning, "Could not find feature: " + id);
                                }
                                else
                                    Log(Log.l_warning, "No id found for feature element");
                                break;
                            case "product":
                                if(product)
                                    add_common_location_entry(product, loc);
                                else
                                    Log(Log.l_warning, "Product object is not created");
                                break;
                            default:
                                Log(Log.l_warning, "Incorrect parent element: " + p.name);
                                break;
                            }
                        }
                    }

                   Log("Product Common Location configuration ended");
                }
            }
        }
   }
}
