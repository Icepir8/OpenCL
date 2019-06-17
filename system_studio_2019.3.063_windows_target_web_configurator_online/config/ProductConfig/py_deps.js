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

    var cmp = null;

    var add_py_deps_install = function(dmp)
    {
        var prg = Progress();
        prg.total = -1;

        var exe = {};

        exe.Apply = function()
        {
            Log("py deps install action: apply");

            if(!cmp)
            {
                Log("cmp isn't defined! Ignore");
                return Action.r_ok;
            }

            var py_install_path = function(redirect_to_wow)
            {
                var reg = Registry("HKLM", "SOFTWARE\\Python\\PythonCore\\2.7\\InstallPath");
                reg.WowRedirect(redirect_to_wow);

                if(reg.Exists())
                {
                    var val = reg.Value();

                    if(val && FileSystem.Exists(FileSystem.MakePath("python.exe", val)))
                    {
                        return val;
                    }
                }

                return "";
            }

            var py_32_installed = py_install_path(true);
            var py_64_installed = py_install_path(false);

            var install_py_deps = function(file, options)
            {
               var cmd = null;

               var py_path = StringList.Format("[$SystemDrive]\\Python27"); //virtualenv must be installed here
	       //The string should look something like "[pythondir]\pip.exe install [module.whl]
               cmd = py_path + "\\Scripts\\pip.exe install \"" + file + "\"" + (options ? options : "");

               if(!cmd)
               {
                   Log("py deps install were not found. Ignore");
                   return Action.r_ok;
               }

               Log("py deps install executing cmd: \"" + cmd + "\"");
               ret = CreateProcess("", cmd, true);
               Log("py deps install cmd exit code : \"" + ret.exitcode + "\"");
               Log("py deps install cmd output: \"" + ret.output + "\"");


            }

            var py_deps_path = FileSystem.MakePath("system_debugger_2019", cmp.InstallDir()); //virtual env resides in the win_dbg installation directory
            install_py_deps(FileSystem.MakePath("virtualenv-15.0.1-py2.py3-none-any.whl", py_deps_path), "");
            py_deps_path += "\\windbg-ext\\iajtagserver\\pydeps"; //the rest whls are stored in [installdir]\windbg-ext\iajtagserver\pydeps

            return Action.r_ok;
        }

        exe.Rollback = function()
        {
            return Action.r_ok;
        }

        exe.ProgressApply = function() {return prg;}

        if(dmp && dmp.IsDumper)
            dmp.AddAction(exe, "Install py deps");
    }

    var add_py_deps_remove = function(dmp)
    {
        var prg = Progress();
        prg.total = -1;

        var exe = {};

        exe.Apply = function()
        {
            Log("py deps uninstall action: apply");

            if(!cmp)
            {
                Log("cmp isn't defined! Ignore");
                return Action.r_ok;
            }

            var py_install_path = function(redirect_to_wow)
            {
                var reg = Registry("HKLM", "SOFTWARE\\Python\\PythonCore\\2.7\\InstallPath");
                reg.WowRedirect(redirect_to_wow);

                if(reg.Exists())
                {
                    var val = reg.Value();

                    if(val && FileSystem.Exists(FileSystem.MakePath("python.exe", val)))
                    {
                        return val;
                    }
                }

                return "";
            }

            var uninstall_py_deps = function(file, options)
            {
               var py_32_installed = py_install_path(true);
               var py_64_installed = py_install_path(false);
               var py_path = StringList.Format("[$SystemDrive]\\Python27");
               var cmd = null;

               cmd = py_path + "\\Scripts\\pip.exe uninstall \"" + file + "\" " + (options ? options : "");

               if(!cmd)
               {
                   Log("py deps install were not found. Ignore");
                   return Action.r_ok;
               }

               Log("py deps install executing cmd: \"" + cmd + "\"");
               ret = CreateProcess("", cmd, true);
               Log("py deps install cmd exit code : \"" + ret.exitcode + "\"");
               Log("py deps install cmd output: \"" + ret.output + "\"");


            }

            var py_deps_path = FileSystem.MakePath("system_debugger_2019", cmp.InstallDir()); //virtual env resides in the win_dbg installation directory
            uninstall_py_deps(FileSystem.MakePath("virtualenv-15.0.1-py2.py3-none-any.whl", py_deps_path), "--yes");
            py_deps_path += "\\windbg-ext\\iajtagserver\\pydeps";

            return Action.r_ok;
        }

        exe.Rollback = function()
        {
            return Action.r_ok;
        }

        exe.ProgressApply = function() {return prg;}

        if(dmp && dmp.IsDumper)
            dmp.AddAction(exe, "Uninstall py deps");
    }

    this.Component = function(components)
    {
        for(var i in components)
        {
          if(i.match(/\bwin_dbg\b/i))
          {
            Log("cmp " + i + " SubscribeOnEnd");
            cmp = components[i]; // don't comment it as it is global variable!

            // on End due to they should work in online installer, but in that case files resolving is done after SubscribeOnBegin -> need to be fixed
            components[i].Configurator().Apply.Install.SubscribeOnEnd(add_py_deps_install);
            components[i].Configurator().Apply.Remove.SubscribeOnEnd(add_py_deps_remove);
          }
        }
    }
}
