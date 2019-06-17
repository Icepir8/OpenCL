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
    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "product_default::iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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

    this.Product = function(product, node)
    {
        if(product && node)
        {
            Log("Product configuration started");

            var group = node.attributes.group;
            var msi_upgrade_code = node.attributes.msi_upgrade_code;
            var install_dir_base = node.attributes.installdir_base;
            var install_dir_own  = node.attributes.installdir_own;
            var required         = node.attributes.required;

            Log("install_dir_base = " + install_dir_base);
            Log("product state = " + product.GetState());

            if(group)
            {
                product.AddToGroup(group);
                product.Upgrade().Group(group);
            }

            if(msi_upgrade_code)
            {
                product.Upgrade().MSIUpgradeCode(msi_upgrade_code);
            }
            
            if(product.InstallMode() == product.install_mode_t.install && install_dir_base)
            {
                Log("Product configuration: installdir_base = " + install_dir_base);
                product.InstallDir.Base(StringList.Format(install_dir_base));
                if(install_dir_own)
                    product.InstallDir.Own(install_dir_own);
            }
            
            if(node.attributes.expanded == "true")
                product.Expanded(true);

            if(required == "true")
                product.Mandatory(true);

            if(node.attributes.permanent == "true")
                product.Permanent(product.permanent_t.yes);

            var arp = node.select("arp/*");
            if(arp && arp.length)
            {
                for(var i in arp)
                {
                    var a = arp[i];
                    Log("ARP entry: " + a.name + " : " + a.text);
                    if(a.attributes && a.attributes.type == "number")
                        product.ARP.Properties().Value(a.name, parseInt(a.text));
                    else
                        product.ARP.Properties().Value(a.name, a.text);
                }
            }

            if(!node.attributes.url)
                product.Offline(true);
        }
    }

    this.Feature = function(features, node)
    {
        var required = node.select("feature[@id and @required]");
        var i;
        var id;
        if(required && required.length)
        {
            Log("Found mandatory feature tag");
            for(i in required)
            {
                id = required[i].attributes.id;
                var req = required[i].attributes.required
                if(req == "true" && features[id])
                {
                    Log("Found mandatory feature " + id);
                    features[id].Mandatory(true);
                }
            }
        }

        iterate(node.select("feature[@id and @permanent='true']"), function(n)
        {
            id = n.attributes.id;
            var ftr = features[id];
            if(n.attributes.permanent == "true" && features[id])
               ftr.Permanent(ftr.permanent_t.yes);

        });

        var idir = node.select("feature[@id and @installdir_own]");
        if(idir && idir.length)
        {
            Log("Found feature with own installdir");
            for(i in idir)
            {
                id = idir[i].attributes.id;
                var od = StringList.Format(idir[i].attributes.installdir_own);
                if(features[id])
                {
                    Log("Set own installdir " + od + " for ftr " + id);
                    features[id].InstallDir.Own(od);
                }
            }
        }

        var idir_base = node.select("feature[@id and @installdir_base]");
        if (idir_base && idir_base.length)
        {
            Log("Found feature with base installdir");
            for (i in idir_base)
            {
                id = idir_base[i].attributes.id;
                Log("base installdir = " + idir_base[i].attributes.installdir_base);
                var base_dir = StringList.Format(idir_base[i].attributes.installdir_base);
                if (features[id])
                {
                    Log("Set base installdir " + base_dir + " for ftr " + id);
                    features[id].InstallDir.Base(base_dir);
                    Log("Due to feature has separate base installdir, it will be locked");
                    features[id].InstallDir.Lock();
                }
            }
        }

        var hidden = node.select("feature[@id and @visible='false']");
        if(hidden && hidden.length)
        {
            ALog(Log.l_debug, "Found hidden feature tag");
            for(i in hidden)
            {
                id = hidden[i].attributes.id;
                if(features[id])
                {
                    ALog(Log.l_debug, "Found hidden feature with ID: " + id);
                    features[id].Visible(false);
                }
            }
        }
    }

    this.Component = function(components, node)
    {
        var cmps = node.select("components/component[@alias]");
        var i;
        var cmp;
        var alias;
        for(i in cmps)
        {
            var cmp_node = cmps[i];
            alias = cmp_node.attributes.alias;
            cmp = components[alias];
            if(cmp)
            {
                var iparam = cmp_node.attributes.install_params;
                var rparam = cmp_node.attributes.remove_params;

                if(iparam && components[alias].InstallConfigurationOptions)
                    components[alias].InstallConfigurationOptions().Add(iparam);
                if(rparam && components[alias].RemoveConfigurationOptions)
                    components[alias].RemoveConfigurationOptions().Add(rparam);

                //################################################
                //setting order for components
                var ord = cmp_node.attributes.order;
                if(ord)
                    cmp.Order(parseInt(ord));
            }
        }

        iterate(node.select("components/component[@alias and @permanent='true']"), function(n)
        {
            var a = n.attributes.alias;
            var c = components[a];
            if(n.attributes.permanent == "true" && c)
               c.Permanent(c.permanent_t.yes);

        });

        var icmp = node.select("components/component[@alias and @installdir_own]");
        if(icmp && icmp.length)
        {
            Log("Found component with own installdir");
            for(i in icmp)
            {
                alias = icmp[i].attributes.alias;
                var od = StringList.Format(icmp[i].attributes.installdir_own);
                cmp = components[alias];
                if(cmp)
                {
                    Log("Set own installdir " + od + " for cmp " + alias);
                    components[alias].InstallDir.Own(od);
                }
            }
        }

        var icmp_base = node.select("components/component[@alias and @installdir_base]");
        if (icmp_base && icmp_base.length)
        {
            Log("Found component with base installdir");
            for (i in icmp_base)
            {
                alias = icmp_base[i].attributes.alias;
                Log("base installdir = " + icmp_base[i].attributes.installdir_base);
                var base_dir = StringList.Format(icmp_base[i].attributes.installdir_base);
                cmp = components[alias];
                if(cmp)
                {
                    Log("Set base installdir " + base_dir + " for cmp " + alias);
                    cmp.InstallDir.Base(base_dir);
                    Log("Due to component has separate base installdir, it will be locked");
                    cmp.InstallDir.Lock();
                }
            }
        }

    }
}
