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
    var ns_pb = base("parse_bool.js");

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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

        Log("Scenario::reinstall_processing: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        ns.ReinstallComponents = function()
        {
            Log("action ReinstallComponents");

            if(! (prod.InstallMode() == prod.install_mode_t.modify || prod.InstallMode() == prod.install_mode_t.install))
            {
                Log("for product install mode " + prod.InstallMode() + " components reinstall isn't processed. Ignore");
                return Action.r_ok;
            }

            iterate(prod.ComponentsFullSet(), function(obj)
            {
                if(ns_pb.ParseBoolean(obj.Info().Property("Reinstall")))
                {
                    if(obj.State() == obj.state_t.installed && obj.Action() != obj.action_t.remove && obj.Source() && obj.Source().Resolved())
                    {
                        Log("setting action reinstall for " + obj.Name());
                        obj.Action(obj.action_t.reinstall);
                        if(ns_pb.ParseBoolean(obj.Info().Property("Reinstall-Remove"))){
                            obj.Dumper().PreAction().AddAction(obj.Processor().RemoveAct());
                        }
                    }
                    else
                    {
                        Log("component "  + obj.Name() + "can't be reinstalled due to not installed or going to be removed or source isn't resolved ");
                    }
                }
            });

            return Action.r_ok;
        }

        if(ns.ConfigureOptions)
          ns.ConfigureOptions.Add(ns.ReinstallComponents);
        else
          Log("Scenario::reinstall_processing.js: ns.ConfigureOptions isn't defined -> ignore");

        Log("Scenario::reinstall_processing.js: actions generation completed");
        return ns;
    }
}
