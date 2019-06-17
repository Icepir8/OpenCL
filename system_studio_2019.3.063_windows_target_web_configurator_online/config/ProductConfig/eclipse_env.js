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
    var base = function(name) {return load("../Base/" + name);};
    var ns_inst = base("installer.js").Installer;

    var cmp = null;
    var g_product = null;

    var patch_eclipse_env = function(dmp)
    {
        var prg = Progress();
        prg.total = -1;

        var exe = {};

        exe.Apply = function()
        {
            Log("patch eclipse env action: apply");

            if(!cmp)
            {
                Log("cmp isn't defined! Ignore");
                return Action.r_ok;
            }

            var env_install_path = function(ecl_cmp)
            {
                return FileSystem.MakePath("iss_env.bat", ecl_cmp.InstallDir());
            }

            var setup_install_path = function(ecl_cmp)
            {
                return FileSystem.MakePath("setup.bat", ecl_cmp.InstallDir());
            }

            var env_path = env_install_path(cmp);
            var env_content = FileSystem.ReadFileUTF8(env_path);
            env_content = String(env_content).replace(/set ISS_ROOT/g, "set ISS_WIN_WIN=1\r\nset ISS_ROOT");
            FileSystem.WriteFileUTF8(env_path, env_content);

            var setup_path = setup_install_path(cmp);
            var setup_content = FileSystem.ReadFileUTF8(setup_path);

            var prd = null;
            prd = g_product;
            if(prd != null)
            {
                var launch_str = prd.UninstallString();
                setup_content = String(setup_content).replace(/^install.exe/gm, launch_str);
                FileSystem.WriteFileUTF8(setup_path, setup_content);
            }

            return Action.r_ok;
        }

        exe.Rollback = function()
        {
            return Action.r_ok;
        }

        exe.ProgressApply = function() {return prg;}

        if(dmp && dmp.IsDumper)
            dmp.AddAction(exe, "Patch eclipse env");
    }

    this.Component = function(components)
    {
        for(var i in components)
        {
          if(i.match(/\beclipse\b/i))
          {
            Log("update env " + i + " SubscribeOnEnd");
            cmp = components[i]; // don't comment it as it is global variable!

            // on End due to they should work in online installer, but in that case files resolving is done after SubscribeOnBegin -> need to be fixed
            components[i].Configurator().Apply.Install.SubscribeOnEnd(patch_eclipse_env);
          }
        }
    }
    this.Product = function(prod)
    {
        Log("eclipse_env: fetching product");
        g_product = prod; //will be used inside the subscription
    }
}
