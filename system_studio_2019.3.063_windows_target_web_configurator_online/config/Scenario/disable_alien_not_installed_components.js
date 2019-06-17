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

        Log("Scenario::DisableAllAlienNotInstalledComponents: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        //########################################################################
        //
        //########################################################################
        ns.DisableAllAlienNotInstalledComponents = function()
        {
            Log("action DisableAllAlienNotInstalledComponents");

            var curr_ftrs_list = [];
            prod.FilterFeaturesRecursive(function(ftr)
            {
                curr_ftrs_list.push(ftr);
            });

            var disable_components_for_feature = function(ftr)
            {
                    ftr.Components().Filter(function(cmp)
                    {
                        if(cmp.State() == cmp.state_t.installed)
                            return;

                            cmp.Log("cmp isn't installed and is a part of side product (not the launched one) -> will be disabled");
                            var dis_p = P(cmp.disabled_t.yes);
                            cmp.alien_component_disabler = dis_p;
                            //dis.Attributes.Value("Type", cmp.disabled_type_t.no_sources);
                            //dis_p.Attributes.Value("Type", 97);
                            //dis.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.no_sources]);
                            dis_p.Attributes.Value("Description", StringList.Format("this component isn't a part of the current product therfore it is disabled"));

                            cmp.Disabled(dis_p); //for download-only mode works too
                    });
            }

            curr_ftrs_list.push(prod);

            var installed_products = ns_inst.Installer.Products;

            for(var i in installed_products)
            {
                var p = installed_products[i];
                if(curr_ftrs_list.indexOf(p) == -1)
                {
                    disable_components_for_feature(p);
                    p.FilterFeaturesRecursive(function(ftr)
                    {
                        if(curr_ftrs_list.indexOf(ftr) == -1)
                            disable_components_for_feature(ftr);
                    });
                }
            }

            Log("action DisableAllAlienNotInstalledComponents done");

            return Action.r_ok;
        }

        if(ns.ConfigureCacheProducts)
            ns.ConfigureCacheProducts.Add(ns.DisableAllAlienNotInstalledComponents);
        else
          Log("Scenario::disable_components_without_sources: ns.ConfigureCacheProducts isn't defined -> ignore");


        Log("Scenario::DisableAllAlienNotInstalledComponents: actions generation completed");
        return ns;
    }
}
