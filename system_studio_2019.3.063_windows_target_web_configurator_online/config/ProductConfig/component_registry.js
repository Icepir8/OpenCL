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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory() + "../", name));}
    var base = function(name) {return load("base/" + name);}

    var ns_dumper = base("dumper.js");
    var ns_rdmp   = base("dumper_registry.js");

    this.Component = function(components, root)
    {
        var foreach = function(collection, cb)
        {
            for(var i in collection)
                if(cb(collection[i], i))
                    return true;
            return false;
        }

        if(components && root)
        {
            foreach(root.select("components/component[@alias and registry]"), function(n)
            {
                var alias = n.attributes.alias;
                Log("Registry: " + alias);
                if(alias && components[alias])
                {
                    foreach(n.select("registry[@root and @key]"), function(s)
                    {
                        var registry = {};
                        registry.root  = s.attributes.root;
                        registry.key   = s.attributes.key;
                        registry.name  = s.attributes.name;
                        registry.value = s.attributes.value;
                        registry.type  = s.attributes.type;

                        var component = components[alias];

                        var registry_id = "registry: " + registry.root + " : " + registry.key + " : " + registry.name + " : " + registry.value;
                        var dumper = ns_dumper.Dumper(registry_id);
                        var install = ns_rdmp.CreateAction();
                        var remove  = ns_rdmp.CreateAction();

                        install.IgnoreErrors(true);
                        remove.IgnoreErrors(true);

                        var log = function(msg) {Log(registry_id + ": " + msg);}

                        var config = {Apply : function()
                        {
                            log("Configuration started: updating registry info");
                            registry.value = StringList.Format(registry.value, component.InstallDir());

                            log("root: " + registry.root);
                            log("key: " + registry.key);
                            log("name: " + registry.name);
                            log("value: " + registry.value);
                            log("type: " + registry.type);

                            var value = registry.value;
                            switch(registry.type)
                            {
                            case 'int':
                                value = parseInt(registry.value);
                                break
                            }

                            install.CreateKey(registry.root, registry.key);

                            if(registry.name || registry.value)
                            {
                                install.SetValue(registry.root, registry.key, registry.name, registry.value);
                                remove.DeleteValue(registry.root, registry.key, registry.name);
                            }
                            else
                                remove.DeleteKey(registry.root, registry.key);

                            return Action.r_ok;
                        }};

                        install.Skip = function() {return component.Action() == component.action_t.remove;}
                        remove.Skip = function() {return !install.Skip();}

                        dumper.AddAction(config, registry_id + " configure action");
                        dumper.AddAction(install, registry_id + " create registry action");
                        dumper.AddAction(remove, registry_id + " remove registry action");

                        dumper.hidden = true;

                        component.Dumper().PostAction().AddAction(dumper);

                        return false;
                    });
                }

                return false;
            });
        }
    }
}


