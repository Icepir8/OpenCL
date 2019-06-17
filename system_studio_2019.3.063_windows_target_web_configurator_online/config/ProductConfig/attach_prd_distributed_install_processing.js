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


/*
 * script attach current product to anpther one and/or attach
 * another product to current as feature. to use script just copy it
 * to ProductConfig folder.
 * processed data:
 * - to attach current product to another one - define "parent" attribute
 *   of product tag by id of target product
 * - to attach another product to current product add root tag:
  <attach>
    <product id="child_product_id"/>
  </attach>
 *
 *
 */

new function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../Base/" + name);};

    var NA = function(v) { return typeof(v) == "undefined" || v === null;}
    var FM = function(v) { return StringList.Format(v);}

    var ns_version   = base("version.js");
    var ns = this;

    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    var detach_cmp_by_alias_and_version = function(prod, alias, version)
    {
        if(!alias)
        {
            Log("detach_cmp_by_alias_and_version: alias isn't defined. Ignore.");
            return;
        }

        Log("looking for the " + alias + " component with version eq or less " + version + " in the attached product " + prod.Id());

        var iver = ns_version.Version(version);

        var cmp = ComponentByAlias(prod, alias);
        if(cmp && (iver.IsNULL() || iver.gt(cmp.Info().Property("ProductVersion")) || iver.eq(cmp.Info().Property("ProductVersion")) ))
        {
            Log("Detaching duplicated component " + cmp.Name() + "/" + cmp.Id() + " from the product " + prod.Name() + "/" + prod.Id());
            cmp.Detach();
        }
    }
    // This script looking for distributed_install component inside the attached products (by alias without version)
    // and remove it from the attached products

    this.Component = function(components, c_root, c_prod)
    {
        ns.Product = function(prod, root)
        {
            var ns_inst = base("installer.js").Installer;

            //var ism = ComponentByAlias(prod, "distributed_install");

            var childs = root.select("attach/product[@id]");
            for(var i in childs)
            {
                var prodnode = childs[i];
                var id = prodnode.attributes.id;

                if(id in ns_inst.Products)
                {
                    var pro = ns_inst.Products[id];

                    if(!pro.start)
                    {
                        detach_cmp_by_alias_and_version(pro, "distributed_install");
                    }
                }
            }
        }
    }
}
