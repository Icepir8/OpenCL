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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var ns_inst = base("installer.js");
    
    var ns = this;
    
    var pr_commit = [];
    
    var getParentProduct = function(val)
    {
        var parent_prod = null;
        if(val.Parent())
        {
            parent_prod = val.Parent();        
            while(parent_prod.Type() != "product")
                parent_prod = parent_prod.Parent();
        }
        
        return parent_prod;
    }
    
    
    ns.GettingUpgradeProducts = function(prod)
    {      
        var entries_processor = function (entry, id, data_id)
        {               
            if (entry.Targets().length)
            {
                var targets = entry.Targets();
                for (var index in targets)
                {
                    if(targets[index].Object().Type() == "product")
                    {
                        Log("target product for upgrade="+ targets[index].Object().Name()); 
                        if(targets[index].Object().Name() && pr_commit.indexOf(targets[index].Object().Name()) == -1)
                            pr_commit.push(targets[index].Object().Name());                            
                    }
                    else if(targets[index].Object().Type() == "feature")
                    {
                        Log("target feature for upgrade="+ targets[index].Object().Name()); 
                        var target_obj_parent = targets[index].Object().Parent();
                        if(target_obj_parent)
                        {
                            var parent_prod = getParentProduct(target_obj_parent);
                            if(parent_prod && pr_commit.indexOf(parent_prod.Name()) == -1)
                            {
                                Log("modified feature is" + parent_prod.Name());
                                pr_commit.push(parent_prod.Name());
                            }                             
                                                      
                        }
                    }
                    //for all types of components
                    else
                    {         
                        Log("target component for upgrade");
                        var target_obj_id = targets[index].Object().Id();
                        //getting clones for original components
                        var m_clones = ns_inst.Installer.Components[target_obj_id].Clones().Order();
                            
                        for(var i = 0, cln; cln = m_clones[i]; i++)
                        {                                 
                            var parent_prod = getParentProduct(cln);
                            if(parent_prod && pr_commit.indexOf(parent_prod.Name()) == -1)
                            {
                                Log("modified product is" + parent_prod.Name());
                                pr_commit.push(parent_prod.Name());
                            }
                        }    
                    }
                        
                }
                        
            }
                                  
        }
        prod.Upgrade().FilterEntires(entries_processor);
        prod.FilterFeaturesRecursive(function(ftr)
        {
            ftr.Upgrade().FilterEntires(entries_processor);
        });

        return pr_commit;
    }
    
    ns.GetCommitDB = function(pr_id)
    {
        var db_name = "micl2020.db3";
        var year = pr_id.match(/\d{4}/);
        if(year < "2018")
            db_name = "micl.db3";

        if(pr_id.match(/\d{4}/) > "2018")
            db_name = "micl2019.db3";
        else
        {
            db_name = "micl" + year + ".db3";
        }
            
        return db_name;

    }
    
}
