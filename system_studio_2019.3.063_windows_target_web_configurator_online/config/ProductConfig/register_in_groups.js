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

    var filter = function(coll, cb)
    {
        for(var i in coll){
            if(cb(coll[i], i)){
                return true;
            }
        }
        return false;
    };

    ns.Product = function(product, root)
    {
        if(!root)
          return;

        var att = root.attributes["add_to_groups"];
        if(!att)
          return;

        Log("Adding product to groups " + att);

        var groups =  att.split(";");

        for(var i in groups)
        {
            product.AddToGroup(groups[i]);
        }
        Log("Adding product to groups");
    }

    ns.DBInfoProduct = function(prd, prd_db)
    {
        Log("register in groups: ns.DBInfoProduct");
        if(typeof(prd.Info().Property("add_to_groups")) !== "undefined")
        {
            filter(String(prd.Info().Property("add_to_groups")).split(";"), function(group_name)
            {
                prd.AddToGroup(group_name);
            });
        }

        if(typeof(prd.Info().Property("group")) !== "undefined" && prd.Info().Property("group"))
            prd.AddToGroup(prd.Info().Property("group"));
    }
}
