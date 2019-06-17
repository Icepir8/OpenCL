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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "\\..\\"));};

    var ns = this;

    this.Id = function ()
    {
        return "ISS 2019 Upgrade prerequisites";
    }

    //get components object by
    this.ComponentByAlias = function (product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    this.Check = function (collector, product)
    {
        Log("Upgrade Pre-requisites generation begin");

        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        Log("sys_dbg pre-requisites Product name = " + product.Name());

        var tmp_product = product;
        var original_product = product;

        if(product.Id().indexOf("sys_dbg") == -1)
        {
            //incoming product isn't an amplifier_for_systems
            // try to find it in incoming product

            Log("product isn't a sys_dbg");
            product.FilterFeaturesRecursive(function(ftr)
            {
                if(ftr.Type() == "product" && ftr.Id().indexOf("sys_dbg") == 0)
                {
                    tmp_product = ftr;
                    return true;
                }
            });
        }

        product = tmp_product;

        Log("sys_dbg pre-requisites Product name = " + product.Name());


        var ns_inst = Namespace("Root.installer");

        var is_newer_or_older_exists = function(cmp)
        {
           if(cmp)
           {
             var act = cmp.Action();
             if(act == cmp.action_t.install)
             {
               var trgs = cmp.Upgrade().Targets();
               for(var i in trgs)
               {
                   // dal and dal_addon have the same upgrade code therefore to prevent removing dal by dal_addon (and vice versa) this filter was added
                   if(trgs[i].State() != cmp.upgrade_state_t.same)
                       trgs[i].Action(cmp.action_t.remove);
               }

               if(cmp.Upgrade().OlderExists() || cmp.Upgrade().NewerExists())
                   return true;

               return false;
             }
           }
        }

        var sys_dbg = ns.ComponentByAlias(product, "sys_dbg_ia32");
        if(is_newer_or_older_exists(sys_dbg))
        {
               if(sys_dbg.Upgrade().NewerExists())
                   collector.WarningExt(StringList.Format("[sys_dbg_newer_installed_title]"), StringList.Format("[sys_dbg_newer_installed_description]"));

               else if(sys_dbg.Upgrade().OlderExists())
                   collector.WarningExt(StringList.Format("[sys_dbg_older_installed_title]"), StringList.Format("[sys_dbg_older_installed_description]"));
        }

        var sys_dbg_dal = ns.ComponentByAlias(product, "sys_dbg_dal");

        if(is_newer_or_older_exists(sys_dbg_dal))
        {
               if(sys_dbg_dal.Upgrade().NewerExists())
                   collector.WarningExt(StringList.Format("[sys_dbg_dal_newer_installed_title]"), StringList.Format("[sys_dbg_dal_newer_installed_description]"));

               else if(sys_dbg_dal.Upgrade().OlderExists())
                   collector.WarningExt(StringList.Format("[sys_dbg_dal_older_installed_title]"), StringList.Format("[sys_dbg_dal_older_installed_description]"));
        }

        if(product.InstallMode() == product.install_mode_t.install)
        {
            var trgs = product.Upgrade().Targets();
            var installed = false;

            for(var i in trgs)
            {
                trgs[i].Action(product.action_t.remove);
                installed = trgs[i].Object().State() == trgs[i].Object().state_t.installed;
            }
        }
    }
}
