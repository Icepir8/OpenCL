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

        Log("Scenario::disable_components_without_sources: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        if(ns_inst.Installer.OnlineInstaller())
        {
            Log("Scenario::disable_components_without_sources: It is online installer. Nothing action for offline processing is required.");
            return;
        }

        //########################################################################
        //
        //########################################################################
        ns.DisableComponentsWithoutSources = function()
        {
            Log("action DisableComponentsWithoutSources");

            prod.FilterComponentsRecursive(function(cmp)
            {
                if(typeof(cmp.Source) != "function" || !cmp.Source() || cmp.State() == cmp.state_t.installed)
                    return;

                if(!cmp.Source().Resolved())
                {
                    cmp.Log("source isn't resolved -> will be disabled");
                    var dis_p = P(cmp.disabled_t.yes);
                    //dis.Attributes.Value("Type", cmp.disabled_type_t.no_sources);
                    dis_p.Attributes.Value("Type", cmp.disabled_type_t.no_sources);
                    //dis.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.no_sources]);
                    dis_p.Attributes.Value("Description", cmp.disabled_type_description_t[cmp.disabled_type_t.no_sources]);

                    cmp.Disabled(dis_p);
                }
            });

            Log("action DisableComponentsWithoutSources done");

            return Action.r_ok;
        }

        if(ns.Initialization)
            ns.Initialization.Add(ns.DisableComponentsWithoutSources);
        else
          Log("Scenario::disable_components_without_sources: ns.Initialization isn't defined -> ignore");

        //####################################################################
        // define action for preventing components repair in case of absent sources
        //####################################################################
        var PreInstallAllowContinueCheckerForRepairWithoutSources = function()
        {
            Log("PreInstallAllowContinueCheckerForRepairWithoutSources");

            if(prod.InstallMode() == prod.install_mode_t.repair)
            {
                var can_be_repaired = true;
                prod.FilterComponentsRecursive(function(cmp)
                {
                    if(typeof(cmp.Source) != "function" || !cmp.Source())
                        return;

                    if(cmp.State() == cmp.state_t.installed && !cmp.Source().Resolved())
                    {
                        cmp.Log("source isn't resolved -> repair can't be done");
                        can_be_repaired = false;

                        return true;
                    }
                });

                if(!can_be_repaired)
                {
                  Log("PreInstallAllowContinueCheckerForRepairWithoutSources: set message with " + StringList.Format("[no_sources_for_repair]"));
                  if(ns.PreInstallSpace)
                      ns.PreInstallSpace.SetMessage(StringList.Format("[no_sources_for_repair]"));
                }

                Log("PreInstallAllowContinueCheckerForRepairWithoutSources done, return value = " + can_be_repaired);

                return can_be_repaired;
            }

            Log("PreInstallAllowContinueCheckerForRepairWithoutSources done");
        }

        if(ns.PreInstallSpace)
          ns.PreInstallSpace.AllowContinue(PreInstallAllowContinueCheckerForRepairWithoutSources);
        else
          Log("Scenario::disable_components_without_sources: adding preinstall continue checker PreInstallAllowContinueCheckerForRepairWithoutSources failed due to ns.PreInstallSpace isn't defined -> ignore");

        Log("Scenario::disable_components_without_sources: actions generation completed");
        return ns;
    }
}
