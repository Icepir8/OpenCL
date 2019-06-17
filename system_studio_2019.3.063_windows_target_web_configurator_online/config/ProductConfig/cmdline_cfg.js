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

    var filter = function(coll, cb)
    {
        for(var i in coll){
            if(cb(coll[i], i)){
                return true;
            }
        }
        return false;
    };

    this.Component = function(components)
    {
        ns.Feature = function(features)
        {
            ns.Product = function(product)
            {
                product.ProductPostProcess.Connect(function()
                {
                    Log("Configuring default actions");

                    var iterate = function(str, cb)
                    {
                        if(str)
                        {
                            var items = str.split(",");
                            for(var i in items){
                                if(cb(items[i])){
                                    return true;
                                }
                            }
                        }
                        return false;
                    }

                    var iterator = function(collection, cb)
                    {
                        return function(item)
                        {
                            if(item == "all"){
                                for(var i in collection){
                                    if(collection.hasOwnProperty(i)){
                                        cb(collection[i], item);
                                    }
                                }
                            }
                            else if(collection[item]){
                                cb(collection[item], item);
                            }
                            else{
                                Log("There isn't item with alias " + item);
                            }
                        }
                    }

                    var actions = [];

                    var schedule = function(str, cb)
                    {
                        if(str == 'all'){ // execute 'all' string immidiately
                            iterate(str, cb);
                        }
                        else{
                            actions.push(function() {iterate(str, cb);});
                        }
                    };

                    schedule(GetOpt.Get("fnone"), iterator(features, function(i){i.Action(i.action_t.none);}));
                    schedule(GetOpt.Get("finstall"), iterator(features, function(i){i.Action(i.action_t.install);}));
                    schedule(GetOpt.Get("fremove"), iterator(features, function(i){i.Action(i.action_t.remove);}));

                    schedule(GetOpt.Get("cnone"), iterator(components, function(i){i.Action(i.action_t.none);}));
                    schedule(GetOpt.Get("cinstall"), iterator(components, function(i){i.Action(i.action_t.install);}));
                    schedule(GetOpt.Get("cremove"), iterator(components, function(i){i.Action(i.action_t.remove);}));

                    filter(actions, function(f) {f();});

                    /*
                    var scmd = GetOpt.GetRaw(1);
                    if(scmd == "install" || scmd == "modify")
                    {
                        var cmps = GetOpt.Get("components");

                        // if components doesn't contain 'defaults' keyword the we should unselect all components and select only pointed
                        if(cmps && !iterate(cmps, function(nm){ return nm.match(/^default$/i) ? true : false; }))
                            product.Action(product.action_t.remove);

                        iterate(cmps, filter(components, function(i){i.Action(i.action_t.install);}));
                    }
                    */
                    Log("Configuring default actions - Done");
                });
            }
        }
    }
}


