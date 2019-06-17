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
            Log("Adding special auxiliary size for Product");

            if(product.aux_size)
            {
                Log("Adding special auxiliary size for Product was already done");
                return;
            }

            var orig_size_f = product.get_size;

            product.aux_size = function()
            {
                return 419430400;
            }

            product.get_size = function()
            {
                var size = orig_size_f();

                if(size)
                {
                    size += product.aux_size();
                }

                return size;
            }
        }
    }
}
