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

(function()
{
    return {Values: function(cmp, prod)
    {
        var obj = {};
        if(cmp)
        {
            obj["component.name"]      = cmp.Name();
            obj["component.id"]        = cmp.Id();
            obj["component.version"]   = cmp.Version().Format();
            obj["component.path"]      = cmp.InstallDir();
            obj["component.path.base"] = cmp.InstallDir.Base();
            obj["component.path.own"]  = cmp.InstallDir.Own();
            
            cmp.ConfigurationOptions().Filter(function(name, val){
                obj[ "component.conf." + name ] = val; 
            });
            
        }
        if(prod)
        {
            obj["product.name"]      = prod.Name();
            obj["product.id"]        = prod.Id();
            obj["product.version"]   = prod.Version().Format();
            obj["product.path"]      = prod.InstallDir();
            obj["product.path.base"] = prod.InstallDir.Base();
            obj["product.path.own"]  = prod.InstallDir.Own();

            if(prod.IS)
                obj["product.IS.cache"] = prod.IS.TargetDir();
                
            prod.ConfigurationOptions().Filter(function(name, val){
            
                obj[ "product.conf." + name ] = val; 
            });
        }
 
        return obj;
    }};
})();


