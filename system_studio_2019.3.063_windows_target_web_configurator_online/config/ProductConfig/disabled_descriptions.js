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
    var ns = this;

    this.Component = function(components)
    {
        ns.Feature = function(features, root, product)
        {
            var add_descriptions = function(object, node)
            {
                if(!object)
                {
                    Log(Log.l_warning, "Empty object to add disabled decriptions specified");
                    return;
                }

                if(!node)
                {
                    Log(Log.l_warning, "No disabled descriptions node specified");
                    return;
                }

                var dscr = node.select("*");

                if(dscr && dscr.length)
                {
                    //var dscr_attr = object.CustomObjects().Item("DisabledDescriptions") ? object.CustomObjects().Item("DisabledDescriptions") : {};

                    for(var i in dscr)
                    {
                        var a = dscr[i];

                        var type = parseInt(a.attributes.type, 10);
                        type = !isNaN(type) ? type : object.disabled_type_t[a.attributes.type];

                        if(!type)
                        {
                            Log("Adding disabled description, type " + a.attributes.type + " is unknown, default will be used");
                            type = object.disabled_type_t.default;
                        }

                        // the object disabled_type_description_t should be copied by items due to in other case it is same for all objects
                        var def_disabled_description = object.disabled_type_description_t;

                        object.disabled_type_description_t = {};

                        for(var j in def_disabled_description)
                            object.disabled_type_description_t[j] = def_disabled_description[j];

                        object.disabled_type_description_t[type] = StringList.Format(a.text);
                        //dscr_attr[type] = StringList.Format(a.text);
                        Log("Description entry: type name " + a.attributes.type + " (" + type + ") val = " + type + " message = " + object.disabled_type_description_t.type);
                    }

                    //object.CustomObjects().Remove("DisabledDescriptions");
                    //object.CustomObjects().Add("DisabledDescriptions", dscr_attr);
                }
                else
                  Log("Adding disabled description no sub tags where found");
            }

            var extract_disabled_descriptions = function(node, prod)
            {
               if(!node)
               {
                   Log(Log.l_warning, "No source node specified");
                   return;
               }
               Log("extract_disabled_descriptions begin");
               var descriptions = node.select("//disabled_descriptions");

               for(var i in descriptions)
               {
                   var p = descriptions[i].single("..");
                   if(p)
                   {
                       switch(p.name)
                       {
                       case "component":
                           var alias = p.attributes.alias;
                           if(alias)
                           {
                               if(components[alias])
                                   add_descriptions(components[alias], descriptions[i]);
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
                                   add_descriptions(features[id], descriptions[i]);
                               else
                                   Log(Log.l_warning, "Could not find feature: " + id);
                           }
                           else
                               Log(Log.l_warning, "No id found for feature element");
                           break;
                       case "product":
                           if(prod)
                               add_descriptions(prod, descriptions[i]);
                           else
                               Log(Log.l_warning, "Product object is not created");
                           break;
                       default:
                           Log(Log.l_warning, "Incorrect parent element: " + p.name);
                           break;
                       }
                   }
               }

               Log("extract_disabled_descriptions done");
            }

            extract_disabled_descriptions(root, product);

            product.disabled_type_description_t["10"] = "My description";
        }
    }
}
