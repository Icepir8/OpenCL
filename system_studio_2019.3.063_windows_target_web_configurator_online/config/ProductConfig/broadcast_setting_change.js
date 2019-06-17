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
    var ns = this;

    var ns_inst = Namespace("Root.installer");

    this.Component = function(components)
    {
        ns.Feature = function(features)
        {
            ns.Product = function(product, root)
            {

                Log("Configuring broadcast_setting_change actions");

                var env_changed = root.single("/product/BroadcastEnvironmentChange");
                var set_changed = root.single("/product/BroadcastSettingChange");

                ns_inst.Installer.IDumper.AddAction({
                    Apply: function() { return Action.r_ok;},
                    Commit: function()
                    {
                        if(env_changed)
                        {
                            Log("BroadcastEnvironmentChange");
                            System.BroadcastEnvironmentChange();
                        }
                        if(set_changed)
                        {
                            Log("BroadcastSettingChange");
                            System.BroadcastSettingChange();
                        }
                    }
                }, "Broadcast setting change on commit");

                Log("Configuring broadcast_setting_change - Done");

            }
        }
    }
}
