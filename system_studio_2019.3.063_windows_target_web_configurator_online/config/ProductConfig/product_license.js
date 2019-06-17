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
    var pconfig_base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "/Base"));};

    var ns_icfg = pconfig_base("image_config.js");

    var image_config = ns_icfg.ProductImageConfig();

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "Scenario::iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    var THash = function()
    {
        var cnt = 0;
        var hkeys = {};
        var h = {};

        var get_key = function(obj)
        {
            return iterate(hkeys, function(_obj, _key)
            {
                if(_obj == obj)
                    return _key;
            });
        }

        var obj = function(k, v)
        {
            if(!k)
                return null;

            var key = get_key(k);

            if(!key)
            {
                if(typeof(v) == "undefined")
                    return null;
                else
                {
                    key = cnt;
                    hkeys[key] = k;
                    h[key] = v;
                    cnt++;
                }
            }
            else
            {
                if(typeof(v) != "undefined")
                    h[key] = v;
            }

            return h[key];
        }

        //obj.KeyFunc = function(o){ return o.Id(); }

        obj.Iterate = function(cb)
        {
            if(!cb)
                return;

            return iterate(h, function(o, k)
            {
                var r = cb(hkeys[k], o);
                if(r)
                    return r;
            });
        }

        obj.Delete = function(k)
        {
            /*
            var key = iterate(h, function(_obj, _key)
            {
                if(obj.KeyFunc(_obj) == k)
                    return _key;
            });
            */

            var key = get_key(k);

            if(key)
            {
                delete h[key];
                delete hkeys[key];
            }
        }

        return obj;
    }

    var ns = this;

    this.Component = function(components, c_node)
    {
        ns.Feature = function(features, f_node)
        {
            ns.Product = function(prod, inode, cache)
            {
                if(inode)
                {
                    Log("Product licensing configuration started");

                    var add_activation = function(object, node)
                    {
                        if(!object)
                        {
                            Log(Log.l_warning, "Empty object to add activation specified");
                            return;
                        }

                        if(!node)
                        {
                            Log(Log.l_warning, "No activation node specified");
                            return;
                        }

                        var actv = node.select("*");

                        if(actv && actv.length)
                        {
                            StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));
                            // ConfigDir can be used in activation info files paths

                            var actv_attr = {};
                            for(var i in actv)
                            {
                                var a = actv[i];
                                Log("Activation entry: " + a.name + " : " + a.text);
                                if(a.attributes && a.attributes.type == "number")
                                    actv_attr[a.name] = parseInt(a.text);
                                else
                                    actv_attr[a.name] = StringList.Format(a.text);

                                Log("Activation entry after formatting: " + a.name + " : " + actv_attr[a.name]);
                            }

                            object.CustomObjects().Remove("Activation");
                            object.CustomObjects().Add("Activation", actv_attr);
                        }
                    }

                    var extract_activations = function(node, ihash)
                    {
                       if(!node)
                       {
                           Log(Log.l_warning, "No source node specified");
                           return;
                       }

                       var activation = node.select("//activation");

                       for(var i in activation)
                       {
                           var p = activation[i].single("..");
                           if(p)
                           {
                               switch(p.name)
                               {
                               case "component":
                                   var alias = p.attributes.alias;
                                   if(alias)
                                   {
                                       if(components[alias])
                                           //add_activation(components[alias], activation[i]);
                                           ihash(components[alias], activation[i]);
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
                                           ihash(features[id], activation[i]);
                                       else
                                           Log(Log.l_warning, "Could not find feature: " + id);
                                   }
                                   else
                                       Log(Log.l_warning, "No id found for feature element");
                                   break;
                               case "product":
                                   if(prod)
                                       //add_activation(prod, activation[i]);
                                       ihash(prod, activation[i]);
                                   else
                                       Log(Log.l_warning, "Product object is not created");
                                   break;
                               default:
                                   Log(Log.l_warning, "Incorrect parent element: " + p.name);
                                   break;
                               }
                           }
                       }
                    }

                    var ahash = THash();

                    var image_node = null;

                    if(!prod.LoadMarkers)
                        prod.LoadMarkers = {};

                    if(!cache)
                    {
                        prod.LoadMarkers.WasLoadedFromMedia = true;
                    }

                    /*
                    if(image_config.CanBeUsed(prod) && image_config.Node().select("//activation"))
                    {
                      Log("image config can be used");
                      image_node = image_config.Node();
                    }
                    else if(prod.CustomObjects().Item("Activation"))
                    {
                      Log("image config can NOT be used, due to Activation is already defined - the default one will not be used");
                      return;
                    }
                    */

                    if(cache && prod.LoadMarkers.WasLoadedFromMedia)
                    {
                       Log("Product was already loaded from Media, Activation info will not be loaded  from cache");
                       return;
                    }

                    if(image_config.Exists() && image_config.Node().select("//activation"))
                    {
                      Log("image config " + image_config.File() + " will be used for activation loading");
                      image_node = image_config.Node();
                    }

                    // adding micl_fnp.dll for MICL source as it is required for reading TS
                    //prod.MICL.AddSource(FileSystem.exe_dir, "micl_fnp.dll");

                    // activations from main config are extracted first
                    // after that activations from image config (if exists) will replace the same one from the main config.

                    Log(" Load activation from product.xml node");
                    extract_activations(inode, ahash);
                    Log(" Load activation from product.xml node done");
                    Log(" Load activation from config node");
                    extract_activations(image_node, ahash);
                    Log(" Load activation from config node done");

                    ahash.Iterate(function(k, v){add_activation(k, v);});

                    var prod_actv = prod.CustomObjects().Item("Activation");

                    var weak_copy = function(source, target)
                    {
                        for(var i in source)
                            if(typeof(target[i]) == "undefined")
                                target[i] = source[i];
                    }

                    ahash.Iterate(function(k){weak_copy(prod_actv, k.CustomObjects().Item("Activation"));});

                    Log("Product licensing configuration end");
                }
            }
        }
    }
}
