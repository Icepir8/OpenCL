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

        Log("Scenario::filter_components_for_offline_package: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        if(!FileSystem.Exists(FileSystem.MakePath("offline.ind", FileSystem.exe_dir)))
        {
            Log("Scenario::filter_components_for_offline_package: the offline indicator " + FileSystem.MakePath("offline.ind", FileSystem.exe_dir) + " not found. Nothing action for offline processing is required.");
            return;
        }
        
        var PRepairMode = P(prod.InstallMode() == prod.install_mode_t.repair);
        PRepairMode.Transform = function(val){return (val == prod.install_mode_t.repair);}
        prod.InstallMode.SubscribeBeforeSet(PRepairMode);
        
        //########################################################################
        //  AddingCommonConfigurationOptions like INSTALLS, INSTALLED_IMAGES_LIST, CURRENT_IMAGE, PSET_INSTALL_MODE, PSET_UI_MODE, BASEINSTALLDIR
        //########################################################################
        ns.FilterByAvailableSource = function()
        {
            Log("action FilterByAvailableSource");
            
            var PForRepair = function(val)
            {
                var c = ns_prop.CollectorByAnd();
                c(PRepairMode);
                c(val);
                return c;
            }

            prod.FilterComponentsRecursive(function(cmp)
            {
                if(typeof(cmp.Source) != "function" || !cmp.Source())
                    return;

                var src = FileSystem.AbsPath(cmp.Source().Root(), cmp.Source().Relative());
                Log("cmp " + cmp.Name() + " --- " + src );

                if(!FileSystem.Exists(src))
                {
                    Log("cmp " + cmp.Name() + " --- " + src +" source isn't resolved");
                    //if component is already installed, but it doesn't have own sources
                    //it should be available for change in modify and remove mode (but not in repair)
                    var dis_p = (cmp.State() == cmp.state_t.installed && prod.LoadMarkers.WasCreatedFromMedia) ? PForRepair(true) : P(true);
                    dis_p.Attributes.Value("Type", cmp.disabled_type_t.no_sources);
                    dis_p.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.no_sources]);
                    cmp.Disabled(dis_p);
                }
            });

            Log("action FilterByAvailableSource done");

            return Action.r_ok;
        }

        if(ns.Initialization)
            ns.Initialization.Add(ns.FilterByAvailableSource);
        else
          Log("Scenario::filter_components_for_offline_package: ns.Initialization isn't defined -> ignore");

        Log("Scenario::filter_components_for_offline_package: actions generation completed");
        return ns;
    }
}
