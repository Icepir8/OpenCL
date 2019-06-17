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

    var ns_ver = base("version.js");
    var ns_prop = base("property.js");
    var ns_inst = Namespace("Root.installer");

    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }

    var disable_obj = function(obj)
    {
        var p = PForInstall(true);
        p.Attributes.Value("Type", obj.disabled_type_t.prerequisite);
        obj.Disabled(p);
    }

    this.Id = function() {return "OSFilter";}

    this.Component = function(components, node)
    {
        if(components)
        {
            Log("Disabling components by os-version black list");

            var cmps = node.select("components/component[@alias and (@os-min or @os-max)]");

            var osinfo = System.WindowsInfo();
            var osver = ns_ver.Version([osinfo.major, osinfo.minor]);
            Log("Windows version: " + osver.Format());

            for(var i in cmps)
            {
                if(cmps.hasOwnProperty(i))
                {
                    var alias = cmps[i].attributes.alias;
                    var osmin = cmps[i].attributes["os-min"];
                    var osmax = cmps[i].attributes["os-max"];

                    Log("Component: " + alias + " defined os-version limits: " + osmin + " => " + osmax);

                    if(alias && components[alias])
                    {
                        var cmp = components[alias];
                        if(osmin && osver.lt(osmin))
                        {
                            disable_obj(cmp);
                            Log("Component " + alias + " added to blacklist, os version mismatch: " + osver.Format() + " (required: >=" + osmin + ")");
                        }
                        else if(osmax && osver.gt(osmax))
                        {
                            disable_obj(cmp);
                            Log("Component " + alias + " added to blacklist, os version mismatch: " + osver.Format() + " (required: <=" + osmax + ")");
                        }
                    }
                }
            }
        }
    }

    this.Feature = function(features, node)
    {
        var nds = node.select('feature[@id and (@os-min or @os-max)]');
        var osinfo = System.WindowsInfo();
        var osver = ns_ver.Version([osinfo.major, osinfo.minor]);

        Log("Windows version: " + osver.Format());

        for(var i in nds)
        {
            if(nds.hasOwnProperty(i))
            {
                var id = nds[i].attributes.id;
                var osmin = nds[i].attributes["os-min"];
                var osmax = nds[i].attributes["os-max"];

                if(osmin && osver.lt(osmin))
                {
                    disable_obj(features[id]);
                    Log("Feature " + id + " added to blacklist, os version mismatch: " + osver.Format() + " (required: >=" + osmin + ")");
                }
                else if(osmax && osver.gt(osmax))
                {
                    disable_obj(features[id]);
                    Log("Feature " + id + " added to blacklist, os version mismatch: " + osver.Format() + " (required: <=" + osmax + ")");
                }
            }
        }
    }
}
