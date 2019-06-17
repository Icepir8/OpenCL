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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var inst = load("installer.js").Installer;

    var ns_ver = load("version.js");
    // eclipse arch enum
    ns.eclipse_arch_t = {x32 : "x32", x64 : "x64"};

    var eclipse_list = {};

    eclipse_list.v4_3 = {
                        name : "Kepler",
                        repositories : ["http://download.eclipse.org/releases/kepler/"],
                        java_version : ns_ver.Version("1.6")
                        };

    eclipse_list.v4_4 = {
                        name : "Luna",
                        repositories : ["http://download.eclipse.org/releases/luna/"],
                        java_version : ns_ver.Version("1.7")
                        };

    eclipse_list.v4_5 = {
                        name : "Mars",
                        repositories : ["http://download.eclipse.org/releases/mars/"],
                        java_version : ns_ver.Version("1.7")
                        };

    eclipse_list.v4_6 = {
                        name : "Neon",
                        repositories : ["http://download.eclipse.org/releases/neon/"],
                        java_version : ns_ver.Version("1.8")
                        };

    // just copy proeprties of one object into another
    var bind = function(src, target)
    {
        if(!src || !target)
        {
            Log(Log.l_warning, "base\eclipse.js:bind: src or target isn't defined" );
        }

        for(var key in src)
            target[key] = src[key];
    }

    // identify architecture for provided eclipse
    var get_arch = function(eclipse_path)
    {
        var product_ini = FileSystem.MakePath("eclipse.ini", eclipse_path);

        var info = FileSystem.ReadFileUTF8(product_ini, true);

        if(info && info.match(/org.eclipse.equinox.launcher.win32.win32.x86_64/i))
        {
            return ns.eclipse_arch_t.x64;
        }

        return ns.eclipse_arch_t.x32;
    }

    // identify version of provided eclipse
    var get_version = function(eclipse_path)
    {
        var product_info = FileSystem.MakePath(".eclipseproduct", eclipse_path);
        var info = FileSystem.ReadFileUTF8(product_info, true);

        var arr = info.match(/version=([\d\.\_]+)/i);

        var ver = ns_ver.Version(0);

        if(arr && arr.length > 1)
        {
            Log("Eclipse:get_version:  version: " + arr[1]);
            ver = ns_ver.Version(arr[1]);
        }
        else
        {
            Log("can't detect version for eclipse " + eclipse_path);
        }

        return ver;
    }

    // identify version of required java
    var get_required_java = function(eclipse_path)
    {
        var product_ini = FileSystem.MakePath("eclipse.ini", eclipse_path);

        var info = FileSystem.ReadFileUTF8(product_ini, true);

        var arr = info.match(/requiredJavaVersion=([\d\.\_]+)/i);

        var ver = ns_ver.Version(0);

        if(arr && arr.length > 1)
        {
            Log("Eclipse:get_required_java: required java version: " + arr[1]);
            ver = ns_ver.Version(arr[1]);
        }
        else
        {
            Log("can't detect required version of java for " + eclipse_path);
        }

        return ver;
    }

    // binding of the common properties into eclispe object
    var bind_common_properties = function(obj)
    {
        obj.arch_t = {};
        bind(ns.eclipse_arch_t, obj.arch_t);

        if(!obj.version || obj.version.IsNULL())
            return;

        var list_id = "v" + obj.version.Major() + "_" + obj.version.Minor();

        if(!eclipse_list[list_id])
        {
            Log("can't find eclipse with version " + obj.version.Str() + " in the stored list. Ignore");
            return;
        }

        bind(eclipse_list[list_id], obj);
    }

    //###############################################################
    //class Eclipse
    //###############################################################
    this.EclipseInfo = function(eclipse_path)
    {
        var obj = {};

        if(!eclipse_path)
        {
            Log("No eclipse path provided. Trying installation directory");
            eclipse_path = FileSystem.MakePath("eclipse", inst.InstallDir());
        }

        if(!eclipse_path ||
           !(FileSystem.Exists(FileSystem.MakePath("eclipse.exe", eclipse_path)) &&
             FileSystem.Exists(FileSystem.MakePath(".eclipseproduct", eclipse_path)) &&
             FileSystem.Exists(FileSystem.MakePath("eclipse.ini", eclipse_path))
            )
           )

        {
            Log("Eclipse helper: input parameter eclipse_path is undefined or it is incorrect eclipse path (eclipse.exe and/or .eclipseproduct don't exists)");
            return null;
        }
        Log("EclipseInfo: generating eclipse info");
        obj.path = eclipse_path;
        obj.version = get_version(eclipse_path);
        obj.arch = get_arch(eclipse_path);
        bind_common_properties(obj);

        var rjava = get_required_java(eclipse_path);
        if(rjava && !rjava.IsNULL())
            obj.java_version = rjava;

        Log("getting ecl props done");

        return obj;
    }

    this.PureEclipseInfo = function(eclipse_path, version, arch, java_required)
    {
        var obj = {};

        if(!eclipse_path)
        {
            Log(Log.l_warning, "eclips_info.js:PureEclipseInfo: eclipse_path isn't defined! Return empty obj.");
            return null;
        }

        Log("PureEclipseInfo: generating eclipse info");
        obj.path = eclipse_path;
        obj.version = version ? ns_ver.Version(version) : ns_ver.Version(0);
        obj.arch = arch ? arch : ns.eclipse_arch_t.x32;
        bind_common_properties(obj);

        if(java_required)
            obj.java_version = ns_ver.Version(java_required);

        Log("getting ecl props done");

        return obj;
    }
}
