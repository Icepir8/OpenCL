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

    //var cmp = null;

    //var base_script_dir = Origin.Directory();
    //var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir + "/../base"));};
    var filter = function(coll, cb) {for(var i in coll) if(cb(coll[i], i)) return coll[i]; return null;}

    //var ns_d_file    = load("dumper_file.js");

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

    this.Component = function(components)
    {
        var cmp_by_alias = function(alias)
        {
            var reg = new RegExp(alias, "i");
            return filter(components, function(obj, key){ if( key.match(reg)) return true;});
        }

        var del = function(alias_list)
        {
            if(!alias_list)
                return;

            Log("python_processing: delete components " + alias_list);

            filter(String(alias_list).split(";"), function(alias)
            {
                var reg = new RegExp(alias, "i");

                for(var i in components)
                {
                    if(i.match(reg))
                    {
                        delete components[i];
                    }
                }
            });
        }

        var py_path = py_64_installed ? py_64_installed : (py_32_installed || StringList.Format("[$SystemDrive]\\Python27"));

        /*if(!py_32_installed || py_64_installed)
        {
            // x64 py has major priority
            del("py_main_ia32;py_dot_net_ia32;py_readline_ia32");

            if(py_64_installed)
                del("py_main_x64");
        }
        else // means only py_32_installed
        {
            del("py_main_x64;py_dot_net_x64;py_readline_x64");
            del("py_main_ia32");
        }*/

        filter(String("py_dot_net_ia32;py_readline_ia32;py_dot_net_x64;py_readline_x64").split(";"), function(i)
        {
            var cmp = cmp_by_alias(i);
            if(!cmp)
                return;

            Log("cmp " + i + " SubscribeOnBegin");

            cmp.Configurator().Apply.Install.SubscribeOnBegin(function(){cmp.ConfigurationOptions().Value("TARGETDIR", "C:\\Python27");});
        });

        filter(String("py_main_x64;py_main_ia32").split(";"), function(i)
        {
            var cmp = cmp_by_alias(i);
            if(!cmp)
                return;

            Log("cmp " + i + " SubscribeOnBegin");
            //set installlevel property for python msi to obtain necessary Path variable modification (instead of doing it manually somewhere) 
            cmp.Configurator().Apply.Install.SubscribeOnBegin(function(){cmp.ConfigurationOptions().Add("INSTALLLEVEL", "2");});
        });
    }
}
