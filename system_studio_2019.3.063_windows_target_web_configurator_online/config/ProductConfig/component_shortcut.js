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

    var ns_dumper = base("dumper.js");
    var ns_fdmp   = base("dumper_file.js");
    var ns_values = load("component_values.js");

    var format = StringList.Format;

    var filter = function(collection, cb)
    {
        for(var i in collection)
            if(cb(collection[i], i))
                return true;
        return false;
    };

    return {Component: function(components, root, prod)
    {
        var shortcut_create = function(component, s)
        {
            var shortcut = {};
            shortcut.target           = s.attributes.target;
            shortcut.path             = s.attributes.path;
            shortcut.arguments        = s.attributes.arguments;
            shortcut.description      = format(s.attributes.description);
            shortcut.hotkey           = parseInt(s.attributes.hotkey);
            shortcut.iconPath         = s.attributes.iconPath;
            shortcut.iconIndex        = parseInt(s.attributes.iconIndex);
            shortcut.showcmd          = s.attributes.showcmd;
            shortcut.workingDirectory = s.attributes.workingDirectory;

            var named = (s.attributes.named || "").match(/true/i);

            var shortcut_id = "shortcut: " + component.Name() + "/" + component.Id() + " : " + shortcut.target;
            var dumper = ns_dumper.Dumper(shortcut_id);
            var install = ns_fdmp.File();
            var remove  = ns_fdmp.File();
            var remove_dir = ns_fdmp.Directory();

            install.IgnoreErrors(true);
            remove.IgnoreErrors(true);
            remove_dir.IgnoreErrors(true);

            var log = function(msg) {Log(shortcut_id + ": " + msg);};

            var config = {Apply : function()
            {
                log("Configuration started: updating shortcut info");

                var data = named ?  ns_values.Values(component, prod) : component.InstallDir();
                var fmt = named ? StringList.FormatNamed : format;

                shortcut.target = FileSystem.MakePath(fmt(shortcut.target, data));
                shortcut.path = named ? fmt(shortcut.path, data) : abspath(component.InstallDir(), shortcut.path);
                shortcut.arguments = fmt(shortcut.arguments, data);
                shortcut.iconPath = fmt(shortcut.iconPath, data);
                shortcut.workingDirectory = fmt(shortcut.workingDirectory, data);

                log("target: " + shortcut.target);
                log("path: " + shortcut.path);
                log("arguments: " + shortcut.arguments);
                log("icon path: " + shortcut.iconPath);
                log("working directory: " + shortcut.workingDirectory);

                install.Create(shortcut.target);
                remove.Remove(shortcut.target);

                var parent = FileSystem.Parent(shortcut.target);
                var i = 0;
                while(parent && FileSystem.Exists(parent) && i < 1)
                {
                    remove_dir.Remove(parent, true);
                    parent = FileSystem.Parent(parent);
                    i++;
                }

                return Action.r_ok;
            }};

            var create = {Apply : function()
            {
                var sc = Shortcut();

                for(var i in shortcut)
                    sc[i] = shortcut[i];
                sc.Save(shortcut.target);

                return Action.r_ok;
            }};

            var exists = function() {return !s.attributes["path-exists"] || ((s.attributes["path-exists"] || "").match(/true/i) && FileSystem.Exists(abspath(shortcut.path)));};

            install.Skip = function() {return !exists() || !(component.Action() == component.action_t.install ||
                component.Action() == component.action_t.reinstall ||
                component.Action() == component.action_t.repair);};
            create.Skip = install.Skip;
            remove.Skip = function() {return component.Action() != component.action_t.remove;};
            remove_dir.Skip = remove.Skip;

            dumper.AddAction(config, shortcut_id + " config action");
            dumper.AddAction(install, shortcut_id + " create (fake) file action");
            dumper.AddAction(create, shortcut_id + " create shortcut action");
            dumper.AddAction(remove, shortcut_id + " remove shortcut action");
            dumper.AddAction(remove_dir, shortcut_id + " remove directory action");

            dumper.hidden = true;

            component.Dumper().PostAction().AddAction(dumper);
        };

        if(components && root)
        {
            filter(root.select("components/component[@alias and shortcut]"), function(n)
            {
                Log("Shortcut: " + n.attributes.alias);
                var alias = n.attributes.alias;
                if(alias && components[alias])
                    filter(n.select("shortcut[@target and @path]"), function(s) {shortcut_create(components[alias], s);});
            });

            filter(components, function(component, alias)
            {
                Log("Shortcut: " + alias);
                if(component.Original().SourceNode)
                    filter(component.Original().SourceNode.select("/component/shortcut[@target and @path]"), function(s) {shortcut_create(component, s);});
            });
        }
    }};
})();


