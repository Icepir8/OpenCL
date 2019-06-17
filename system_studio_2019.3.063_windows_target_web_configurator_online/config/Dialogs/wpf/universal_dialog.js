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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns_bld    = base("builder.js");
    var ns_bc     = dialogs("base_container.js");
    
    this.BuildDialogs = function(prod)
    {
        var ns = this;
        
        var universal_dialog = function(name, container)
        {        
            var dlg = ns_bld.BuildDialog(container ? container : ns_bc.BaseContainer());
            dlg.Name(name);
            return dlg;
        }
        
        //###################################################################################
        Wizard.DialogCollection["universal_dialog"] = universal_dialog;
    }
}
