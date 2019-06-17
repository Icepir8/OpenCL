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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};

    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            scn.Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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

    this.Scenario = function(acts)
    {
        Log("Scenario::android_customization: scenario generation started");
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::android_customization: required input parameter acts is undefined ");
            return null;
        }

        var ns = acts;
        var scenario = this;

        var prod = scenario.Product();

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }


        Log("Scenario::android_customization: actions generation started");

        if(prod.InstallMode() != prod.install_mode_t.install)
        {
            return;
        }

        //ns.Installer(ns_inst.Installer);
        //ns.Product(prod);

        var checkNDKDir = function(path)
        {
            if(FileSystem.Exists(path))
            {
                var toolchains = FileSystem.AbsPath(path, "toolchains");
                var ndk_build = FileSystem.AbsPath(path, "ndk-build.cmd");
                if(FileSystem.Exists(toolchains) && FileSystem.IsDirectory(toolchains) &&
                    FileSystem.Exists(ndk_build) && !FileSystem.IsDirectory(ndk_build) && !path.match(/ /i))
                    return true;
                else
                    return false;
            }
            return false;
        }

        var checkEclipseDir = function(path)
        {
            Log("Looking for file: " + FileSystem.AbsPath(path, "eclipse.exe") + " : " + FileSystem.Exists(path) + " : " + FileSystem.Exists(FileSystem.AbsPath(path, "eclipse.exe")));
            if(FileSystem.Exists(path) && FileSystem.Exists(FileSystem.AbsPath(path, "eclipse.exe")))
                return true;
            else
                return false;
        }

        var ndk_path = "";
        var eclipse_path = "";

        // detect INDE
        var inde = Registry("HKLM", "Software\\Intel\\INDE\\Framework");
        inde.WowRedirect(false);
        if(inde.Exists() && inde.Value("Location"))
        {
            var loc = inde.Value("Location");
            Log("INDE path detected: " + loc);

            if(inde.Value("NDKINSTALLFOLDER"))
            {
                var ndk_path_value = FileSystem.AbsPath(inde.Value("NDKINSTALLFOLDER"));
                if(checkNDKDir(ndk_path_value))
                {
                    ndk_path = ndk_path_value;
                    Log("NDK path detected: " + ndk_path);
                }
            }

            if(inde.Value("ADTINSTALLFOLDER"))
            {
                var eclipse_path_value = FileSystem.AbsPath(inde.Value("ADTINSTALLFOLDER"), "eclipse");
                if(checkEclipseDir(eclipse_path_value))
                {
                    eclipse_path = eclipse_path_value;
                    Log("Eclipse path detected: " + eclipse_path);
                }
            }
        }

        // check locations in $PATH variable and pre-defined locations, if INDE not found
        if(!ndk_path || !eclipse_path)
        {
            var searchLocations = [ StringList.Format("[$PATH]"),
                                    'C:\\NDK',
                                    'C:\\Eclipse',
                                    'C:\\Program Files\\Eclipse',
                                    'C:\\Program Files (x86)\\Eclipse' ].join(';');
            var path = searchLocations.split(";");
            for (var i in path)
            {
                var path_tmp = path[i];
                if(ndk_path && eclipse_path)
                    break;
                Log("Found path in $PATH: " + path_tmp);
                if(!ndk_path && checkNDKDir(path[i]))
                {
                    ndk_path = path_tmp;
                    Log("NDK path detected: " + path_tmp);
                    continue;
                }
                if(!eclipse_path && checkEclipseDir(path_tmp))
                {
                    eclipse_path = path_tmp;
                    Log("Eclipse path detected: " + path_tmp);
                    continue;
                }
            }
        }

        if(eclipse_path && (ns.EclipseIntegration.Skip && !ns.EclipseIntegration.Skip()))
        {
            //ns.EclipseIntegration.SetChecked(true); // check will be done default_integration_into_own_eclipse
            ns.EclipseIntegration.Set(eclipse_path);

            var ei = prod.CustomObjects().Item("EclipseIntegration");
            ei.integrate = 1;
            ei.location = eclipse_path;
        }

        if(ndk_path)
        {
            var NDKInt = prod.CustomObjects().Item("NDKIntegration");
            if(NDKInt)
            {
                NDKInt.integrate = 1;
                NDKInt.location = ndk_path;
            }
        }
    }
}
