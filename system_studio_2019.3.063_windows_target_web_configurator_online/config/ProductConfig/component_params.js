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
    var abspath = FileSystem.AbsPath;
    var load = function(name) {return required(abspath(Origin.Directory(), name));};

    this.Component = function(components, node, prod)
    {
        var filter = function(coll, cb)
        {
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
        };
        
        var proc_install_params = function(cmp, e)
        {
            if(cmp && e) 
            {
                cmp.InstallConfigurationOptions().Add(e.text);
            }
        }

       var proc_remove_params = function(cmp, e)
        {
            if(cmp && e) 
            {
                cmp.RemoveConfigurationOptions().Add(e.text);
            }
        }
 
    
        filter(components, function(cmp)
        {
            if(cmp.Original().SourceNode)
                filter(cmp.Original().SourceNode.select("/component/property[@name='remove_params']"), function(e) {proc_remove_params(cmp, e);});
        });
 
        filter(components, function(cmp)
        {
            if(cmp.Original().SourceNode)
                filter(cmp.Original().SourceNode.select("/component/property[@name='install_params']"), function(e) {proc_install_params(cmp, e);});
        });
    }
}
