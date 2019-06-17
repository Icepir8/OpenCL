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

//###############################################################
// This file contains definition for:
//  class Namespace
//###############################################################
this.Namespace = this.Namespace || (function()
{
    var global_namespace = {};

    var create_ns = function(prn, name)
    {
        var names = name.split(".");

        if(names.length)
        {
            var obj = prn;

            while(names.length)
            {
                var nm = names[0];

                if(!obj[nm])
                {
                    var o = new Object;
                    obj[nm] = o;
                    obj = o;
                }
                else
                    obj = obj[nm];
                names.shift();
            }
            return obj;
        }

        return prn;
    }

    var f = function(name, init)
    {
        if(arguments.callee.Defined(name))
            return create_ns(global_namespace, name);
            
        var nns = create_ns(global_namespace, name);
        if(init && nns)
            init.call(nns);
        return nns;
    };

    f.Defined = function(name)
    {
        var names = name.split(".");

        if(names.length)
        {
            var obj = global_namespace;

            while(names.length)
            {
                var nm = names[0];

                if(!obj[nm])
                {
                    return false;
                }
                else
                    obj = obj[nm];
                names.shift();
            }
            return true;
        }

        return true;
    }


    return f;
})();

