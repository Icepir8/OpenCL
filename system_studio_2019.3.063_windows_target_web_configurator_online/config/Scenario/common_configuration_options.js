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

    var IsNull = function(val)
    {
        if(typeof(val) != "undefined" && val != null)
           return false;

        return true;
    }

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::common_configuration_options: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        //########################################################################
        //  AddingCommonConfigurationOptions like INSTALLS, INSTALLED_IMAGES_LIST, CURRENT_IMAGE, PSET_INSTALL_MODE, PSET_UI_MODE, BASEINSTALLDIR
        //########################################################################
        ns.AddingCommonConfigurationOptions = function()
        {
            Log("action AddingCommonConfigurationOptions");
            prod.ConfigurationOptions().Value("BASEINSTALLDIR", prod.InstallDir.Base());
            prod.ConfigurationOptions().Value("PSET_UPGRADE_MODE", (IsNull(prod.CustomProperties().Value("install_in_upgrade")) || prod.CustomProperties().Value("install_in_upgrade") == "1") ? "UPGRADE" : "SXS");
            prod.ConfigurationOptions().Value("PSET_INSTALL_MODE", prod.InstallMode());
            prod.ConfigurationOptions().Value("PSET_UI_MODE", ns_inst.Installer.Silent() ? "Silent" : "Full");
            prod.ConfigurationOptions().Value("INSTALLED_IMAGES_LIST", ";" + prod.ImagesList().join(';') + ";"); //; is required at the beggining and end to meet the conditiosn in msi
            prod.ConfigurationOptions().Value("CURRENT_IMAGE", prod.Image());

            var installs = [];
            prod.FilterComponentsRecursive(function(cmp)
            {
              if( cmp.Info().Property("alias")
                  && ( cmp.Action() == cmp.action_t.install
                       ||
                       (cmp.State() == cmp.state_t.installed && cmp.Action() != cmp.action_t.remove)
                     )
                )
              {
                installs.push(cmp.Info().Property("alias"));
              }

              if( cmp.Info().Property("alias") &&
                  (cmp.State() == cmp.state_t.installed && cmp.Action() != cmp.action_t.remove) &&
                  cmp.Info().Property("Reinstall") == "1"
                )
              {
                    cmp.ConfigurationOptions().Value("ADDLOCAL", "ALL");
              }

            });

            prod.ConfigurationOptions().Value("INSTALLS", installs.length ? ("," + installs.join(',') + ",") : "");
            Log("action AddingCommonConfigurationOptions done");
        }

        if(ns.ConfigureOptions)
          ns.ConfigureOptions.Add(ns.AddingCommonConfigurationOptions);
        else
          Log("Scenario::common_configuration_options: ns.ConfigureOptions isn't defined -> ignore");

        Log("Scenario::common_configuration_options: actions generation completed");
        return ns;
    }
}
