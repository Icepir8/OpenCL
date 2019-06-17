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
                    Log("Product ism configuration started");

                    var add_reg_info = function(object, node)
                    {
                        if(!object)
                        {
                            Log(Log.l_warning, "Empty object to add ism specified");
                            return;
                        }

                        if(!node)
                        {
                            Log(Log.l_warning, "No ism node specified");
                            return;
                        }

                        var actv = node.select("*");

                        if(actv && actv.length)
                        {
                            StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));
                            // ConfigDir can be used in activation info files paths

                            var ism_attr = {};
                            for(var i in actv)
                            {
                                var a = actv[i];
                                Log("ISM entry: " + a.name + " : " + a.text);
                                if(a.attributes.type == "number")
                                    ism_attr[a.name] = parseInt(a.text);
                                else
                                    ism_attr[a.name] = StringList.Format(a.text);

                                Log("ISM entry after formatting: " + a.name + " : " + ism_attr[a.name]);
                            }

                            object.CustomObjects().Remove("ISM");
                            object.CustomObjects().Add("ISM", ism_attr);
                        }
                    }

                    var extract_ism_info = function(node, ihash)
                    {
                       if(!node)
                       {
                           Log(Log.l_warning, "No source node specified");
                           return;
                       }

                       var ism_records = node.select("//ism");

                       for(var i in ism_records)
                       {
                           var p = ism_records[i].single("..");
                           if(p)
                           {
                               switch(p.name)
                               {
                               case "component":
                                   var alias = p.attributes.alias;
                                   if(alias)
                                   {
                                       if(components[alias])
                                           //add_ism_records(components[alias], ism_records[i]);
                                           ihash(components[alias], ism_records[i]);
                                       else
                                           Log(Log.l_warning, "Could not find component by alias: " + alias);
                                   }
                                   else
                                       Log(Log.l_warning, "No alias found for component element");
                                   break;
                               case "product":
                                   if(prod)
                                       //add_ism_records(prod, ism_records[i]);
                                       ihash(prod, ism_records[i]);
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

                    Log(" Load ism info from product.xml node");
                    extract_ism_info(inode, ahash);
                    Log(" Load ism info from product.xml node done");

                    ahash.Iterate(function(k, v){add_reg_info(k, v);});

                    Log("Product ism configuration done");
              }
           }
        }
    }
}
