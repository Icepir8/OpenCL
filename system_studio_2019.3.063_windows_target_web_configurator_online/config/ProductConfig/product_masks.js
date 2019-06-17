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

    this.Component = function(components)
    {
        ns.Feature = function(features)
        {
            ns.Product = function(product, root)
            {
                Log("Reading product_masks");

                var masks = root.select("//product_mask");

                var product_masks = {};

                for(var i in masks)
                {
                    var node = masks[i];
                    var id = node.single("id").text;
                    Log("  ID = " + id);
                    var name = node.single("name").text;
                    Log("  --> name = " + name);
                    var title = node.single("title").text;
                    Log("  --> title = " + title);
                    var arp_name = node.single("arp_name").text;
                    Log("  --> arp_name = " + arp_name);
                    var description = node.single("description").text;
                    Log("  --> description = " + description);
                    var media_id = node.single("media_id").text;
                    Log("  --> media_id = " + media_id);
                    var welcome_page = node.single("welcome_page").text;
                    Log("  --> welcome_page = " + welcome_page);
                    var billboard = node.single("billboard").text;
                    Log("  --> billboard = " + billboard);
                    var features_expr = node.single("features_expr").text;
                    Log("  --> features_expr = " + features_expr);
                    var cluster_install = node.single("cluster_install").text;
                    Log("  --> cluster_install = " + cluster_install);

                    product_masks[i] = {};
                    product_masks[i].id = id;
                    product_masks[i].name = name;
                    product_masks[i].title = title;
                    product_masks[i].arp_name = arp_name;
                    product_masks[i].description = description;
                    product_masks[i].media_id = media_id;
                    product_masks[i].welcome_page = welcome_page;
                    product_masks[i].billboard = billboard;
                    product_masks[i].features_expr = features_expr;
                    product_masks[i].cluster_install = cluster_install;
                }

                product.CustomObjects().Remove("ProductMasks");
                product.CustomObjects().Add("ProductMasks", product_masks);

                Log("Reading product_masks done");
            }
        }
    }
}
