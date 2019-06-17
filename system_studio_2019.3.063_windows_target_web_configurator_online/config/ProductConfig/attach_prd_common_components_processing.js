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

    var ns = this;

    var ComponentById = function(product, id)
    {
        if(!id)
            return null;

        return product.FilterComponentsRecursive(function (cmp){return cmp.Id() == id ? true : false; });
    }
    // This script looking for duplicated components inside the attached products ( the components which are defined on bundle level)
    // and remove it from the attached products
    this.Component = function(components, c_root, c_prod)
    {
        ns.Product = function(prod, root)
        {
            var ns_inst = base("installer.js").Installer;

            var childs = root.select("attach/product[@id]");
            for(var i in childs)
            {
                var prodnode = childs[i];
                var id = prodnode.attributes.id;
                var config = prodnode.attributes.config;

                if(id in ns_inst.Products)
                {
                    var pro = ns_inst.Products[id];

                    if(!pro.start)
                    {
                        Log(" looking for the duplicated components in the attached product: " + id);

                        for(var j in components)
                        {
                            if(!components[j])
                                continue;

                            var cmp = ComponentById(pro, components[j].Id());
                            if(cmp)
                            {
                                prod.Log("Detaching duplicated component " + cmp.Name() + "/" + cmp.Id() + " from the product " + pro.Name() + "/" + pro.Id());
                                cmp.Detach();
                            }
                        }

                    }
                }
            }
        }
    }
}
