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

var log_helper = function(prefix)
{
    var pref = prefix;
    
    var f = function(type_of_mes, mes)
    {
        if(type_of_mes && mes)
            Log(type_of_mes, pref + mes);
        else
            Log(pref + type_of_mes);
    }

    f.Prefix = function(_p)
    {
        if(typeof(_p) == "undefined")
            return pref;
        else
            pref = _p;
    }

    return f;
}

