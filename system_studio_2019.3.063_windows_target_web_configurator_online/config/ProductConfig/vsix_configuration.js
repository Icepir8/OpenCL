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
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };
    
    Namespace("Root.VSIX").packages = new Array();

    var vsix_packages = function(cmp, node)
    {
        var vsix = {};
        if(node.attributes.vsix_guid)
        {
            vsix.guid = node.attributes.vsix_guid;
        }
        else{
            Log(Log.l_warning, "Mandatory vsix_guid attribute is not defined.");
        }
        
        if(node.attributes.vs_version)
        {
            vsix.version = "vs_" + node.attributes.vs_version; //e.g.: vs_2017
        }
        else{
            Log(Log.l_warning, "Mandatory vs_version attribute is not defined.");
        }
        
        if(node.text)
            vsix.file = node.text;
        
        if(node.attributes.action)
        {
            if(["install_remove", 
                "upgrade"].indexOf(node.attributes.action) != -1)
            {
                vsix.action = node.attributes.action;
            }
            else
            {
                Log(Log.l_warning, "Unsupported value for action attribute. Set default action (install_remove).");
                Log(JSON.stringify(node));
                vsix.action = "install_remove";
            }
        }
        else
        {
            Log("Action is not defined. Set default action (install_remove).");
            Log(JSON.stringify(node));
            vsix.action = "install_remove";
        }
        
        if(node.attributes.install_condition)
        {
            vsix.install_condition = node.attributes.install_condition;
        }
        
        if(node.attributes.remove_condition)
        {
            vsix.remove_condition = node.attributes.remove_condition;
        }
        
        vsix.cmp = cmp;
        vsix.cmp_init_state = cmp.State();
        
        var alias = cmp.Info().Property("alias");
        Namespace("Root.VSIX").packages.push(vsix);
    
    }
    
    this.ExInit = function(cmpn, prdn)
    {
        return function()
        {
            var cmp = this;
            var c = cmpn.single("/component[@alias and @type]");
            if(!c)
            {
                Log("ExInit: Can't get component[@alias and @type] from the XML description for the component id = " + cmp.Name());
                return false;
            }
            filter(cmpn.select("/component/vsix_packages/vsix"), function(node) {vsix_packages(cmp, node);});
        }
    }
}
