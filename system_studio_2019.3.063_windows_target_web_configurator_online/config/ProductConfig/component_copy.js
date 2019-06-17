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
    var base = function(name) {return load("../Base/" + name);};

    var ns_db   = base("component_db.js");
    var ns_file = base("dumper_file.js");
    var ns_inst = base("installer.js");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    return {Loader: function()
    {
        return {type: "copy", loader: function(data, node, root)
        {
            Log("Creating DB stuff for Copy component");
            var component = ns_db.Create(data);
            if(component)
            {
                if(typeof(ns_inst.Installer.Apply.SubscribeOnBegin) == "function")
                {
                    ns_inst.Installer.Apply.SubscribeOnBegin(function()
                    {
                        var dir_install = ns_file.Directory();
                        var dir_remove = ns_file.Directory();
                        var install = ns_file.File();
                        var remove = ns_file.File();

                        var iskip = function() {return !(component.Action() == component.action_t.install ||
                            component.Action() == component.action_t.reinstall ||
                            component.Action() == component.action_t.repair);};

                        var rskip = function() {return component.Action() != component.action_t.remove;};

                        dir_install.Skip = iskip;
                        install.Skip = iskip;
                        dir_remove.Skip = rskip;
                        remove.Skip = rskip;

                        dir_install.Create(component.InstallDir());
                        dir_remove.Remove(component.InstallDir(), true);

                        filter(component.Source().Serialize(), function(src)
                        {
                            install.Copy(src.File(), component.InstallDir());
                            remove.Remove(abspath(component.InstallDir(), FileSystem.FileName(src.File())));
                        });

                        component.Dumper().PreAction().AddAction(remove, "Remove file(s) of component: " + component.Name() + "/" + component.Id());
                        component.Dumper().PreAction().AddAction(dir_remove, "Remove directory of component: " + component.Name() + "/" + component.Id());
                        component.Dumper().PostAction().AddAction(dir_install, "Create directory of component: " + component.Name() + "/" + component.Id());
                        component.Dumper().PostAction().AddAction(install, "Copy file(s) of component: " + component.Name() + "/" + component.Id());
                    });
                }
            }

            return component;
        }};
    }};
})();


