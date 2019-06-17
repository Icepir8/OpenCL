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

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::inspector_configuration_options: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        var inspector = prod.Features().Item("insp");
        if(!inspector)
        {
          Log("Scenario::inspector_configuration_options: there isn't inspector in the package");
          return;
        }

        //########################################################################
        //  AddingCommonConfigurationOptions like INSTALLS, INSTALLED_IMAGES_LIST, CURRENT_IMAGE, PSET_INSTALL_MODE, PSET_UI_MODE, BASEINSTALLDIR
        //########################################################################
        ns.AddingBaseInstalldirForinspector = function()
        {
            Log("action AddingBaseInstalldirForinspector " +  inspector.InstallDir.Base() + "\\");

            inspector.ConfigurationOptions().Value("BASEINSTALLDIR", inspector.InstallDir.Base() + "\\");

            Log("action AddingBaseInstalldirForinspector done");
        }

        if(ns.ConfigureOptions)
          ns.ConfigureOptions.AddAfter(ns.AddingCommonConfigurationOptions, ns.AddingBaseInstalldirForinspector);
        else
          Log("Scenario::inspector_configuration_options: ns.ConfigureOptions isn't defined -> ignore");

        Log("Scenario::inspector_configuration_options: actions generation completed");
        return ns;
    }
}
