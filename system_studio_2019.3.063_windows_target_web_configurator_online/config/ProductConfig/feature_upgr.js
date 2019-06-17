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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var ns = this;

    this.Id = function() {return "default_action";}

    this.Feature = function(features, root)
    {
        if(root.attributes["feature-upgrade"] != "true")
            return;

        ns.Product = function(prod)
        {
            if(prod.InstallMode() == prod.install_mode_t.install)
                ns.SetDefault = function()
                {
                    Log("Setting feature actions in upgrade mode");
                    prod.CheckForUpgrade();
                    Log("Upgrade state: " + prod.Upgrade().State());
                    if(prod.Upgrade().State() == prod.upgrade_state_t.upgrade)
                    {
                        Log("Upgrade installed features");
                        var filter = function(col, cb)
                        {
                            for(var i in col)
                                if(cb(col[i], i))
                                    return true;
                            return false;
                        }

                        filter(prod.Upgrade().Targets(), function(o)
                        {
                            var obj = o.Object();
                            Log("Processing target: " + obj.Name());
                            if(obj && obj.FeaturesFullSet)
                            {
                                Log("Enumerating features");
                                var oldfeats = obj.FeaturesFullSet();
                                filter(features, function(fea, fid)
                                {
                                    Log("Look for feature: " + fid);
                                    if(oldfeats[fid])
                                        Log("  exists: " + oldfeats[fid].State());
                                    if(oldfeats[fid] && oldfeats[fid].State() == oldfeats[fid].state_t.absent)
                                    {
                                        Log("Unselect feature: " + fid);
                                        fea.Action(fea.action_t.none);
                                    }
                                });
                            }
                        });
                    }
                    return Action.r_ok;
                }
            else
                ns.SetDefault = function() {return Action.r_ok;}

            if(ns.SetDefault)
                prod.ProductPostProcess.Connect(ns.SetDefault);
        }
    }
}



