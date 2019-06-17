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

    var ns_prop      = base("property.js");

    var P = function(val){return ns_prop.Property(val);}

    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::default_components_for_offline: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        if(!FileSystem.Exists(FileSystem.MakePath("offline.ind", FileSystem.exe_dir)))
        {
            Log("Scenario::default_components_for_offline: the offline indicator " + FileSystem.MakePath("offline.ind", FileSystem.exe_dir) + " not found. Nothing action for offline processing is required.");
            return;
        }
        //########################################################################
        //  AddingCommonConfigurationOptions like INSTALLS, INSTALLED_IMAGES_LIST, CURRENT_IMAGE, PSET_INSTALL_MODE, PSET_UI_MODE, BASEINSTALLDIR
        //########################################################################
        ns.SetDefaultComponentsForOfflinePackage = function()
        {
            if (prod.InstallMode() == prod.install_mode_t.install)
                prod.SetAction(prod.action_t.install);
        }

        if(ns.Initialization)
            ns.Initialization.Add(ns.SetDefaultComponentsForOfflinePackage);
        else
          Log("Scenario::default_components_for_offline: ns.Initialization isn't defined -> ignore");

        Log("Scenario::default_components_for_offline: actions generation completed");
        return ns;
    }
}
