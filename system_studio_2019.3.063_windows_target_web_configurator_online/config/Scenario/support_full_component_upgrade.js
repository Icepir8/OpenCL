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
    var ns_dmp = base("dumper_file.js");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    this.Scenario = function(acts)
    {
        Log("Scenario::android_customization: scenario generation started");
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::android_customization: required input parameter acts is undefined ");
            return null;
        }

        var ns = acts;
        var scenario = this;

        var prod = scenario.Product();

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        //########################################################################
        // Following action schedules symlinks removing for components that are going to be removed
        //########################################################################
        acts.ScheduleSymlinksRemoving = function()
        {
            Log("action ScheduleSymlinksRemoving begin");
            var remove = ns_dmp.Directory();
            var toremove = false;

            //########################################################################
            filter(ns_inst.Installer.Components, function(comp)
            {
                var action = function()
                {
                    if(filter(comp.Clones().Items(), function(c) {return c.Action() == c.action_t.install;}))
                        return comp.action_t.install;
                    else if(filter(comp.Clones().Items(), function(c) {return c.Action() == c.action_t.remove;}))
                        return comp.action_t.remove;
                    else
                        return comp.action_t.none;
                };
                if(action() == comp.action_t.remove)
                {
                    filter(comp.CustomObjects().Item("Symlink") || {}, function(link)
                    {
                        remove.Remove(link);
                        toremove = true;
                    });
                }
            });
            //########################################################################
            if(toremove)
                ns_inst.Installer.UDumper.PostAction().AddAction(remove, "Remove symlinks");

            Log("action ScheduleSymlinksRemoving end");
        }

        if(acts.InstallationAdjustment)
          scenario.AddAfter(acts.InstallationAdjustment, acts.ScheduleSymlinksRemoving, true);
        else
          Log("Scenario::schedule_symlinks_removing: acts.InstallationAdjustment isn't defined -> ignore");

        Log("Scenario::schedule_symlinks_removing: actions generation completed");
        return ns;
    }
}
