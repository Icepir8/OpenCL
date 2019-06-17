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
    var client_id   = "{B0FA4037-325D-4813-AE31-E231317E9905}";
    var instance_id = "{E1A7F3D0-FE89-4AFE-985A-B232C45A3700}";

    var base = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), "../base/" + name));}

    var ns_version   = base("version.js");
    var ns_component = base("component3.js");
    var ns_info      = base("component_info.js");
    var ns_processor = base("component_processor_msi.js");
    var ns_prop      = base("property.js");

    var P = function(val){return ns_prop.Property(val);}


    var ns = this;

    var ism_post = function() {}

    this.Id = function() {return "ism";}

    this.Component = function(components, c_root)
    {
        Log("ISM processing script");

        if(components.ism)
        {
            ns.Product = function(prod, root)
            {
                Log("ISM processing started");

                var ism = components.ism;
                if(ism.State() == ism.state_t.absent)
                {
                    var instances = WI.ClientsInstalledComponent(instance_id);
                    if(instances && instances.length)
                    {
                        Log("  Found installed instance of ISM");
                        var inst = instances[0];
                        if(components.ism.Id() != inst.Id)
                        {
                            Log("  Detected instance is not equal to product provided ISM");
                            Log("    Detected: " + inst.Id + " : " + inst.Version);
                            Log("    Product : " + ism.Id() + " : " + ism.Version().Str());
                            
                            var info;
                            var proc;

                            var inst_version = ns_version.Version(inst.Version);
                            if(inst_version.gt(ism.Version()))
                            {
                                Log("  Installed version of ISM is newer of product based");
                                Log("  Adding installed ISM to product structure for processing");

                                info = ns_info.ComponentInfo();
                                info.AddInfo(ns_info.InfoWI(inst.Id));
                                ism = ns_component.Create({Info: info});
                                if(ism)
                                {
                                    // to prevent situations when repair can't be done
                                    // due to newer installed ism (not from current package) doesn't have sources
                                    // need to add "SkipForRepairIfSourceAbsent" into Info

                                    if(typeof(ism.Source) != "function" || !ism.Source() || !ism.Source().Resolved())
                                    {
                                        ism.Log("source isn't resolved -> ism should be disabled for repairing");
                                        var dis_p = P(ism.disabled_t.no);
                                        prod.InstallMode.Subscribe(function(val) { ism.Log("disabling ism"); val == prod.install_mode_t.repair ? dis_p(ism.disabled_t.yes) : dis_p(ism.disabled_t.no);});
                                        dis_p.Attributes.Value("Type", 97);
                                        dis_p.Attributes.Value("Description", StringList.Format("[image_warning] No available sources found"));

                                        ism.Disabled(dis_p);
                                    }

                                    proc = ns_processor.ProcessorMSI();
                                    ism.Processor(proc);
                                    ism.State(ism.state_t.installed);
                                    if(typeof(ism.Original) == "function")
                                        ism.Original().State(ism.state_t.installed);
                                    prod.Components().Add(ism);
                                    components.ism.Disabled(true);
                                }
                                else
                                {
                                    Log("  Failed to create Component object instance for installed ISM");
                                    ism = components.ism;
                                }
                            }
                            else if(inst_version.lt(ism.Version()))
                            {
                                Log("  Installed version of ISM is older of product based");
                                Log("  Disabling manual removing of older ISM due to auto-upgrade");

                                info = ns_info.ComponentInfo();
                                info.AddInfo(ns_info.InfoWI(inst.Id));
                                var ism_old = ns_component.Create({Info: info});
                                if(ism_old)
                                {
                                    proc = ns_processor.ProcessorMSI();

                                    var act = {Apply : function() {return Action.r_ok;}};
                                    proc.RemoveAct = function() {return act;};

                                    ism_old.Processor(proc);
                                }
                                else
                                    Log("  Failed to create Component object instance for installed ISM");
                            }
                        }
                    }
                }
                else
                    Log("  Product ISM component installed. Disable detections");

                if(ism)
                {
                    Log("  TestRemove redirect configuring for ISM component");

                    var TestRemove = ism.Configurator().TestRemove;
                    ism.Configurator().TestRemove = function()
                    {
                        Log("Check for active clients of ISM");
                        if(ism.State() == ism.state_t.installed)
                        {
                            var clients = WI.ClientsInstalledComponent(client_id);
                            var current_components = prod.ComponentsFullSet();

                            Log("  Look for components");

                            for(var i in clients)
                            {
                                Log("  Component: " + clients[i].Id);
                                var c = current_components[clients[i].Id];

                                if(!c || c.Action() != c.action_t.remove)
                                    return false;
                            }
                            return TestRemove.apply(this, arguments);
                        }

                        return false;
                    }
                }
            }
        }
    }

    this.SetIsmWriter = function(val)
    {
        Log("ISM OptIn writer: value will be stored: " + val);
        ism_post = function()
        {
            Log("Saving optin value: " + val);
            if(Ism.OptInAvailable())
                Ism.OptInSetAccepted(val);
            else
                Log("OptIn is not available");

            return Action.r_ok;
        }
    }

    this.SaveData = function() {ism_post();}
}



