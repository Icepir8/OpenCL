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

//###########################################################################
// processing component with state = permanent
//###########################################################################

new function () {

    var base = function(name) {return required(FileSystem.AbsPath(Origin.Directory() + "../Base", name));}
    var ns_prop = base("property.js");
    var ns_inst = Namespace("Root.installer");

    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }

    this.Product = function(prod)
    {
        Log("permanent processing started");

        prod.FilterFeaturesRecursive(function(ftr){

            if(ftr.State() == "installed" && ftr.Permanent())
            {
                var child_comps_installed = true;
                var m_components = ftr.Components().Items();
                for (var key in m_components)
                {
                    if(m_components.hasOwnProperty(key))
                    {
                        var cmp = m_components[key];
                        if(cmp.State() == cmp.state_t.installed)
                        {
                            cmp.State.DefaultSet(cmp.state_t.absent);
                            var p = PForInstall(true);
                            p.Attributes.Value("Type", cmp.disabled_type_t.permanent);
                            cmp.Disabled(p);
                        }
                        else{
                            child_comps_installed = false;
                        }
                    }
                }
                if(child_comps_installed){
                    var f = PForInstall(true);
                    f.Attributes.Value("Type", ftr.disabled_type_t.permanent);
                    ftr.Disabled(f);
                }

                Log("state changed to disabled for ftr.Name = " + ftr.Name());
            }
        });
    }
}
