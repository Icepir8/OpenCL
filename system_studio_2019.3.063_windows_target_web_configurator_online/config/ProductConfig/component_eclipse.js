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

    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir + "/../base"));};

    var ns_d_file    = load("dumper_file.js");

    var add_left_eclipse_files_remove = function(cmp)
    {
        return function(dmp)
        {
            var dir = ns_d_file.Directory();
            var eclipse_sub_folder = cmp.Info().Property("EclipseSubFolder") ? cmp.Info().Property("EclipseSubFolder") : "eclipse";
            dir.Remove(FileSystem.MakePath(eclipse_sub_folder, cmp.InstallDir()), 0);
            dir.hidden = true;
            dir.IgnoreErrors(1);
            Log("Schedule directory " + FileSystem.MakePath(eclipse_sub_folder, cmp.InstallDir()) + " to remove");
            if(dmp && dmp.IsDumper)
                   dmp.AddAction(dir, "Remove eclipse files left from previous install");
        }
    }

    this.Component = function(components)
    {
        for(var i in components)
        {
          if(String(i).toLowerCase() == "eclipse")
          {
            Log("cmp " + i + " SubscribeOnEnd");
            cmp = components[i]; // don't comment it as it is global variable!

            // on Begin due to removing eclipse files left from previous install should be done before installation
            components[i].Configurator().Apply.Install.SubscribeOnBegin(add_left_eclipse_files_remove(cmp));
            // on End due to removing eclipse files left from this install should be done before after main unit removing
            components[i].Configurator().Apply.Remove.SubscribeOnEnd(add_left_eclipse_files_remove(cmp));
          }
        }
    }
}
