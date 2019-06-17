/*
Copyright (C) 2002-2017, Intel Corporation. All rights reserved.
The source code, information and material ("Material") contained herein
is owned by Intel Corporation or its suppliers or licensors, and title
to such Material remains with Intel Corporation or its suppliers or
licensors. The Material contains proprietary information of Intel or its
suppliers and licensors. The Material is protected by worldwide copyright
laws and treaty provisions. No part of the Material may be used, copied,
reproduced, modified, published, uploaded, posted, transmitted, distributed
or disclosed in any way without Intel's prior express written permission.
No license under any patent, copyright or other intellectual property rights
in the Material is granted to or conferred upon you, either expressly, by
implication, inducement, estoppel or otherwise. Any license under such
intellectual property rights must be express and approved by Intel in writing.

Unless otherwise agreed by Intel in writing, you may not remove or alter this
notice or any other notice embedded in Materials by Intel or Intel's suppliers
or licensors in any way.
*/

(function()
{
    var load = function(name) {return required(FileSystem.MakePath("../" + name, Origin.Directory()));};
    var base = function(name) {return load("Base/" + name);};

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var ns_vs = base("vs_processing.js");

    return {Feature: function(features, root)
        {
            var vs = ns_vs.GetVSInfo();
            var ids = [{id: vs.vs_2012, feature: features.vs11},
                    {id: vs.vs_2013, feature: features.vs12},
                    {id: vs.vs_2015, feature: features.vs14},
                    {id: vs.vs_2017, feature: features.vs15}];
            
            var installed = function(vs) {return vs && vs.dir && vs.devenv && !vs.vc_expr;};
            
            filter(ids, function(data)
            {
                var vs = data.id;
                var fea = data.feature;
                if(fea && (!installed(vs) || !vs.cpp))
                {
                    fea.Disabled(true);
                    fea.ErrorDescription(StringList.Format("[image_warning] [will_not_be_installed]", fea.Name(), vs.name));
                }
            });
    
            /*
            if(features.gdb_vsext && !installed(vs.vs_2015))
            {
                features.gdb_vsext.Disabled(true);
                features.gdb_vsext.ErrorDescription(StringList.Format("[image_warning] [will_not_be_installed]", features.gdb_vsext.Name(), vs.vs_2015.name));
            }
            */
    
        },
        Component: function(components, root, prod)
        {
            var vs = ns_vs.GetVSInfo();
            var vsix_prereq = function(cmp, node)
            {
                if(node.text)
                {
                    Log("VSIX prerequisite for " + cmp.Info().Property("alias") + ": " + node.text);
                    var vs_id = cmp.Info().Property("vs");
                    
                    switch(vs_id)
                    {
                        case "vs15":
                        {
                            if(!vs.vs_2017.FilterInstances(node.text))
                            {
                                cmp.Disabled(true);
                            }
                            break;
                        }
                    }
                }
            }
            
            filter(components, function(cmp)
            {
                if(cmp.Original().SourceNode)
                    filter(cmp.Original().SourceNode.select("/component[@type='vsix']/prerequisite"), function(e) {vsix_prereq(cmp, e);});
            });
    
        }
    };
})();
