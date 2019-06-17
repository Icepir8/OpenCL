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
    var load = function(name) {return required(FileSystem.MakePath("../" + name, Origin.Directory()));};
    var base = function(name) {return load("Base/" + name);};

    var ns_db = base("component_db.js");
    var ns_vs = base("vs_processing.js");

    var abspath = FileSystem.AbsPath;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var quote = function(str) {return (str || "").match(/\s/) ? '"' + str + '"' : str;};

    var vsixinstaller;

    var findinstaller = function()
    {
        var vs_info = ns_vs.GetVSInfo();
        //try to find installer in the predefined path
        const vsix_exe = "\\Microsoft Visual Studio\\Installer\\resources\\app\\ServiceHub\\Services\\Microsoft.VisualStudio.Setup.Service\\VSIXInstaller.exe";
        var vsix_path = FileSystem.MakePath(vsix_exe, FileSystem.SpecialFolder.program_files_x86);
        if(FileSystem.Exists(vsix_path))
        {
            Log("component_vsix::findinstaller returns: " + vsix_path);
            return vsix_path;
        }

        var vss = [];
        filter(vs_info, function(v) {vss.push(v);});

        Log("Looking for VSIXInstaller.exe");
        filter(vss.reverse(), function(info)
        {
            if(info.dir && FileSystem.Exists(info.dir))
            {
                var inst = abspath(info.dir, "Common7/IDE/VSIXInstaller.exe");
                Log("Looking for: " + inst);
                if(FileSystem.Exists(inst))
                {
                    vsixinstaller = inst;
                    return true;
                }
            }
        });
        return vsixinstaller;
    };

    return {Loader: function()
    {
        return {type: "vsix", loader: function(data, node, root)
        {
            vsixinstaller = vsixinstaller || findinstaller();

            Log("Creating DB stuff for VSIX component");
            var component = ns_db.Create(data);
            if(component)
            {
                var register = function()
                {
                    var cmd = quote(vsixinstaller) + " /q" + (System.IsAdmin() ? " /a " : " ") + quote(component.Source().File());
                    Log("Register VSIX addon: " + cmd);
                    var res = CreateProcess(null, cmd, true);
                    Log("status: " + JSON.stringify(res));
                    return Action.r_ok;
                };
                var unregister;
                if(!component.Info().Property("vsixId"))
                {
                    Log(Log.l_warning, "component: " + component.Name() + "/" + component.Id() + ": vsixId property is not defined. uninstallation impossible");
                    unregister = function() {return Action.r_ok;};
                }
                else
                {
                    unregister = function()
                    {
                        var cmd = quote(vsixinstaller) + " /q" + (System.IsAdmin() ? " /a " : " ") + "/u:" + quote(component.Info().Property("vsixId"));
                        Log("Unregister VSIX addon: " + cmd);
                        var res = CreateProcess(null, cmd, true);
                        Log("status: " + JSON.stringify(res));
                        return Action.r_ok;
                    };
                }

                component.Dumper().PostAction().AddAction({Apply: register, Rollback: unregister, Skip: function() {return component.Action() != component.action_t.install;}}, "Register VSIX: " + component.Name());
                component.Dumper().PostAction().AddAction({Apply: unregister, Rollback: register, Skip: function() {return component.Action() != component.action_t.remove;}}, "Unregister VSIX: " + component.Name());
            }

            return component;
        }};
    }};
})();


