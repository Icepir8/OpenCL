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
    var base = function(name) {return load("Base/" + name);};

    var ns_ver = base("version.js");

    var java_root = "HKLM";
    var java_jre = "Software\\JavaSoft\\Java Runtime Environment";
    var java_jdk = "Software\\JavaSoft\\Java Development Kit";


    var get_java_info = function(key, subkey)
    {
        if(key && subkey)
        {
            Log("Java detection: processing: " + subkey);
            var j = key.Key(subkey);
            if(j.Exists())
            {
                var home = j.Value("JavaHome");
                var lib = j.Value("RuntimeLib");
                var exe = FileSystem.AbsPath(home, "bin/java.exe");
                var version = subkey;
                Log("  home: " + home);
                Log("  lib: " + lib);
                Log("  exe: " + exe);
                if(FileSystem.Exists(exe))
                {
                    Log("    module exists");
                    var java_info = {};
                    java_info.home = home;
                    java_info.version = ns_ver.Version(version);
                    java_info.exe = exe;
                    java_info.lib = lib;
                    return java_info;
                }
            }
        }

        return undefined;
    }

    var get_java_info_by_path = function(path)
    {
        if(path) //if the path is not defined 'undefined' object will be returned
        {
            Log("Java detection by path processing: " + path);
            //get essential info from the given path
            var home = path;
            var lib = FileSystem.AbsPath(home, "bin/server/jvm.dll");
            var exe = FileSystem.AbsPath(home, "bin/java.exe");
            var version = "1.8";
            Log("  home: " + home);
            Log("  lib: " + lib);
            Log("  exe: " + exe);
            if(FileSystem.Exists(exe)) //if we have exe file on its place, copy this info into object and return it
            {
                Log("    module exists");
                var java_info = {};
                java_info.home = home;
                java_info.version = ns_ver.Version(version);
                java_info.exe = exe;
                java_info.lib = lib;
                return java_info;
            }
        }

        return undefined;
    }

    var enum_java = function(key)
    {
        if(key.Exists())
        {
            var sub = key.Subkeys();
            if(sub && sub.length)
            {
                var res = [];

                for(var i in sub)
                {
                    var info = get_java_info(key, sub[i]);
                    if(info)
                        res.push(info);
                }

                if(res.length)
                {
                    var jre = {};
                    for(var i in res)
                        jre[res[i].version.Str()] = res[i];

                    var min = res[0];
                    var max = res[0];

                    for(var i = 1; i < res.length; i++)
                    {
                        var v = res[i];
                        if(min.version.gt(v.version))
                            min = v;
                        Log("MAX comparing: " + max.version.Format() + " : " + v.version.Format());
                        if(max.version.lt(v.version))
                        {
                            Log("  MAX comparing: update");
                            max = v;
                        }
                    }

                    jre.min = min;
                    jre.max = max;

                    return jre;
                }
            }
        }

        return undefined;
    }

    var enum_java_by_path = function(path)
    {
        if(!path)
        {
            Log("enum_java_by_path: input path is undefined");
            return undefined;
        }
        if(FileSystem.Exists(FileSystem.MakePath("jre", path))) //<eclipse_dir>\jre must exist
        {
            var info = get_java_info_by_path(FileSystem.MakePath("jre", path)); //get info from <eclipse_dir>\jre

            var jre = {};
            if(info && info.version)
                jre[info.version.Str()] = info;
            else //if we haven't get info at this point, something went terribly wrong, so return undefined
                return undefined;

            jre.min = info;
            jre.max = info;

            return jre;
        }

        return undefined;
    }
    
    var info = function()
    {
        Log("Processing JRE32");
        var jre_root = Registry(java_root, java_jre);
        var jre_x32 = enum_java(jre_root);
        jre_root.WowRedirect(false);
        Log("Processing JRE64");
        var jre_x64 = enum_java(jre_root);

        Log("Processing JDK32");
        var jdk_root = Registry(java_root, java_jdk);
        var jdk_x32 = enum_java(jdk_root);
        jdk_root.WowRedirect(false);
        Log("Processing JDK64");
        var jdk_x64 = enum_java(jdk_root);

        if(jre_x32 || jre_x64 || jdk_x32 || jdk_x64)
        {
            var info = {};

            if(jre_x32 || jre_x64)
            {
                info.jre = {};
                info.jre.x32 = jre_x32;
                info.jre.x64 = jre_x64;
            }

            if(jdk_x32 || jdk_x64)
            {
                info.jdk = {};
                info.jdk.x32 = jdk_x32;
                info.jdk.x64 = jdk_x64;
            }

            return info;
        }
    }

    var info_by_path = function(path)
    {
        Log("Processing input path: " + path);
        var jre = enum_java_by_path(path); //get JRE info from the path

        if(jre)
        {
            var info = {};

            info.jre = {};
            info.jre = jre;

            return info;
        }
    }

    this.Info = info;
    this.InfoByPath = info_by_path; //this function will return info object from the given path
}
