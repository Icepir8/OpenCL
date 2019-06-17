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
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var base = function(name) {return required(FileSystem.AbsPath(Origin.Directory()+"../Base", name));}
    var ns_prop     = base("property.js");
    var ns_inst     = Namespace("Root.installer");

    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }

    this.Component = function(components, node)
    {
        if(components)
        {
            var cmps = node.select("components/component[@alias and @arch]");
            if(cmps)
            {
                Log("Filtering components");
                var current_arch = System.ProcessorArch() == System.ProcessorArch.pa_intel64 ? "intel64" : "ia32";
                for(var i in cmps)
                {
                    var alias = cmps[i].attributes.alias;
                    var arch  = cmps[i].attributes.arch;
                    if(alias && components[alias])
                    {
                        if(arch)
                        {
                            if(arch != current_arch)
                            {
                                components[alias].Disabled(PForInstall(true));
                                Log("Component " + alias + " disabled, architecture mismatch: " + arch + " (required: " + current_arch + ")");
                            }
                            else
                                Log("Component " + alias + " passed architecture filtering.");
                        }
                    }
                }
            }

            var cmps = node.select("components/component[@alias and @suppress_arp='true']");
            if(cmps)
            {
                Log("Suppressing ARP entry");
                for(var i in cmps)
                {
                    var alias = cmps[i].attributes.alias;
                    if(alias && components[alias])
                    {
                        Log("Suppressing ARP entry for component: " + alias);
                        components[alias].ConfigurationOptions().Add("ARPSYSTEMCOMPONENT", "1");
                    }
                }
            }
        }
    }

    this.Feature = function(features, node)
    {
        var nds = node.select('feature[@arch and @id]');
        var current_arch = System.ProcessorArch() == System.ProcessorArch.pa_intel64 ? "intel64" : "ia32";
        for(var i in nds)
        {
            var id = nds[i].attributes.id;
            var arch = nds[i].attributes.arch;
            if(features[id] && arch && current_arch != arch)
                features[id].Disabled(PForInstall(true));
        }
    }

    this.Product = function(prod, node)
    {
        var feature_is_empty = function(ftr)
        {
            return !filter(ftr.ComponentsFullSet(), function() {return true;});
        }

        filter(prod.FeaturesFullSet(), function(f)
        {
            if(f.Parent() && feature_is_empty(f))
            {
                Log("detaching " + f.Name());
                f.Detach();
            }
        });

        Log("detaching empty features done ");
    }
}
