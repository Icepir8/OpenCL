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

    var ns_prop      =  base("property.js");

    var P = function(val, attributes){return ns_prop.Property(val, attributes);}
    var PCollector = function(val){return ns_prop.Collector(val);}

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "scenario:base:iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::eclipse_integration_depend_on_components.js: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        var pi = prod.CustomObjects().Item("EclipseIntegration");
        if(pi)
        {
        var PThere_are_cmps_for_eclipse_integration = PCollector(false);
        var f_cmp_is_not_removed = function(cmp)
        {
            var p_cmp_to_be_installed = P(cmp.Action() == cmp.action_t.install || (cmp.Action() == cmp.action_t.none && cmp.State() == cmp.state_t.installed));
            cmp.Action.Subscribe(function()
            {
                p_cmp_to_be_installed(cmp.Action() == cmp.action_t.install || (cmp.Action() == cmp.action_t.none && cmp.State() == cmp.state_t.installed))
                //Log("change prop p_cmp_to_be_installed for " + cmp.Id() + " = " + (p_cmp_to_be_installed() || "null"));
            });
            return p_cmp_to_be_installed;
        }

        iterate(prod.ComponentsFullSet(), function(cmp)
        {
            if(cmp.CustomObjects().Item("EclipseIntegration"))
              PThere_are_cmps_for_eclipse_integration(f_cmp_is_not_removed(cmp));
        });

        var prev_val = {integrate : pi.integrate, location : pi.location};

        PThere_are_cmps_for_eclipse_integration.Subscribe(function(val)
        {
            if(!val)
            {
                //Log("pi.int = " + pi.integrate + " pi.loc = " + pi.location);
                prev_val.integrate = pi.integrate;
                prev_val.location = pi.location;
                pi.integrate = 0;
                pi.location = "";
            }
            else
            {
                //Log("prev_val.int = " + prev_val.integrate + " prev_val.loc = " + prev_val.location);
                pi.integrate = prev_val.integrate;
                pi.location = prev_val.location;
            }
        });
        }

        Log("Scenario::eclipse_integration_depend_on_components: actions generation completed");
        return ns;
    }
}
