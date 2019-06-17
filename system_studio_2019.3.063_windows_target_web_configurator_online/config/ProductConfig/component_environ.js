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

(function()
{
    var abspath = FileSystem.AbsPath;

    var load = function(name) {return required(abspath(Origin.Directory(), name));};
    var base = function(name) {return load("../base/" + name);};

    var ns_inst   = base("installer.js");
    var ns_rdmp   = base("dumper_registry.js");
    var ns_cmpval = load("component_values.js");

    var format = StringList.Format;
    var named = StringList.FormatNamed;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var hive = "Environment";

    return {Component: function(components, root, prod)
    {
        var environ = function(cmp, cfg)
        {
            if(cmp && cfg)
            {
                var to_install = function() {return cmp.Action() == cmp.action_t.install || cmp.Action() == cmp.action_t.reinstall;};
                var to_remove = function() {return cmp.Action() == cmp.action_t.remove;};

                var install = ns_rdmp.CreateAction();
                var remove  = ns_rdmp.CreateAction();
                var config = {Apply: function()
                {
                    var data = {
                        system: (cfg.attributes.system || "").match(/true/i) ? true : false,
                        name: cfg.attributes.name,
                        action: cfg.attributes.action,
                        value: named(cfg.attributes.value, ns_cmpval.Values(cmp, prod)),
                        delimiter: cfg.attributes.delimiter || ';',
                        expand: (cfg.attributes.expand || "").match(/false/i) ? false : true,
                        on: cfg.attributes.on || "install"
                    };

                    var keyroot = data.system ? 'HKLM' : 'HKCU';
                    var key = data.system ? "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" : "Environment";

                    Log("Configure environment variables: " + cmp.Name() + "/" + cmp.Id() + ": " + JSON.stringify(data));
                    install.Expand(data.expand);
                    remove.Expand(data.expand);
                    
                    var reg;
                    var val;

                    switch(data.action)
                    {
                    case 'create':
                        reg = Registry(keyroot, key);
                        reg.WowRedirect(false);
                        val = "" + (reg.Value(data.name) || "");
                        if(!val)
                            (data.on == 'install' ? install : remove).SetValue(keyroot, key, data.name, data.value);
                        break;
                    case 'set':
                        (data.on == 'install' ? install : remove).SetValue(keyroot, key, data.name, data.value);
                        if(data.on == 'install')
                            remove.DeleteValue(keyroot, key, data.name);
                        break;
                    case 'remove':
                        (data.on == 'install' ? install : remove).DeleteValue(keyroot, key, data.name);
                        break;
                    case 'append':
                    case 'prepend':
                        reg = Registry(keyroot, key);
                        reg.WowRedirect(false);
                        val = "" + (reg.Value(data.name) || "");
                        var valinst = val.split(data.delimiter);

                        if(cmp.State() != cmp.state_t.installed || !filter(valinst, function(v) {return v == data.value;}))
                        {
                            if(data.action == 'append')
                                valinst.push(data.value);
                            else
                                valinst.unshift(data.value);
                            (data.on == 'install' ? install : remove).SetValue(keyroot, key, data.name, valinst.join(data.delimiter));
                        }
                        break;
                    }

                    if(cmp.Action() == cmp.action_t.install)
                    {
                        var env = cmp.CustomObjects().Item(hive) || {};
                        env[Guid()] = data;
                        cmp.CustomObjects().Remove(hive);
                        cmp.CustomObjects().Add(hive, env);
                    }
                    return Action.r_ok;
                }};

                install.Wow(false);
                remove.Wow(false);

                install.Skip = function() {return !to_install();};
                remove.Skip = function() {return !to_remove();};
                cmp.Dumper().PostAction().AddAction(config, "Configure environment variables: " + cmp.Name() + "/" + cmp.Id());
                cmp.Dumper().PostAction().AddAction(install, "Install environment variables: " + cmp.Name() + "/" + cmp.Id());
                cmp.Dumper().PostAction().AddAction(remove, "Remove environment variables: " + cmp.Name() + "/" + cmp.Id());
            }
        };

        var environ_remove = function(cmp)
        {
            if(cmp)
            {
                var to_remove = function() {return cmp.Action() == cmp.action_t.remove;};

                filter(cmp.CustomObjects().Item(hive) || {}, function(data)
                {
                    var remove  = ns_rdmp.CreateAction();
                    var config = {Apply: function()
                    {
                        var keyroot = data.system ? 'HKLM' : 'HKCU';
                        var key = data.system ? "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" : "Environment";

                        remove.Expand(data.expand);

                        Log("Configure cleaning environment variables: " + cmp.Name() + "/" + cmp.Id() + ": " + JSON.stringify(data));
                        
                        var reg;
                        var val;
                        
                        switch(data.action)
                        {
                        case 'create':
                            reg = Registry(keyroot, key);
                            reg.WowRedirect(false);
                            val = "" + (reg.Value(data.name) || "");
                            if(val == data.value && data.on == 'install')
                                remove.DeleteValue(keyroot, key, data.name);
                            break;                       
                        case 'set':
                            if(data.on == 'install')
                                remove.DeleteValue(keyroot, key, data.name);
                            break;
                        case 'append':
                        case 'prepend':
                            reg = Registry(keyroot, key);
                            reg.WowRedirect(false);
                            val = "" + (reg.Value(data.name) || "");
                            var valrem = val.split(data.delimiter);
                            var i;
                            if(data.action == 'append')
                            {
                                for(i = valrem.length - 1; i >= 0; i--)
                                    if(valrem[i] == data.value)
                                    {
                                        valrem.splice(i, 1);
                                        break;
                                    }
                            }
                            else if(data.action == 'prepend')
                            {
                                for(i = 0; i < valrem.length; i++)
                                {
                                    if(valrem[i] == data.value)
                                    {
                                        valrem.splice(i, 1);
                                        break;
                                    }
                                }
                            }
                            remove.SetValue(keyroot, key, data.name, valrem.join(data.delimiter));
                            break;
                        }
                        return Action.r_ok;
                    }};

                    remove.Wow(false);

                    remove.Skip = function() {return !to_remove();};
                    cmp.Dumper().PostAction().AddAction(config, "Configure environment variables: " + cmp.Name() + "/" + cmp.Id());
                    cmp.Dumper().PostAction().AddAction(remove, "Remove environment variables: " + cmp.Name() + "/" + cmp.Id());
                });
            }
        };

        filter(root.select("/product/components/component[@alias and environment]"), function(n)
        {
            var cmp = components[n.attributes.alias];
            if(cmp)
                filter(n.select("environment[@name]"), function(e) {environ(cmp, e);});
        });

        filter(components, function(cmp)
        {
            if(cmp.Original().SourceNode)
                filter(cmp.Original().SourceNode.select("/component/environment[@name]"), function(e) {environ(cmp, e);});
        });
        prod.ProductPostProcess.Connect(function()
        {
            if(typeof(ns_inst.Installer.Apply.SubscribeOnBegin) == "function")
                ns_inst.Installer.Apply.SubscribeOnBegin(function()
                {
                    filter(components, function(cmp) {environ_remove(cmp);});
                });
        });
    }};
})();


