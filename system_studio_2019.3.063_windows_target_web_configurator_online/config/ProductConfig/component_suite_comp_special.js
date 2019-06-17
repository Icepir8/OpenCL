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
    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    this.Product = function(prod, node)
    {
         if(!prod)
             return;

         var sc = ComponentByAlias(prod, "studio_common_comp");
         var sp = ComponentByAlias(prod, "studio_common_prof");

         if(sc && sp)
         {
            sp.Action.Subscribe(function(act)
            {
                Log("receive signal from " + sp.Name() + " act = " + act);

                if(act == sp.action_t.install || (act != sp.action_t.remove && sp.State() == sp.state_t.installed))
                    sc.Action(sc.action_t.remove);
                //var val = (act == sender.action_t.install || act == sender.action_t.mix || (act != sender.action_t.remove && sender.State() == sender.state_t.installed)) ? 1 : 0;
            });
             //sc.Original().Action(sc.action_t.remove);

             var orig_set_act = sc.SetAction;

             sc.SetAction = function(act)
             {
                if((act == sc.action_t.reinstall || act == sc.action_t.install || (act == sc.action_t.none && sc.State() == sc.state_t.installed)) &&
                   (sp.Action() == sp.action_t.install || (sp.Action() != sp.action_t.remove && sp.State() == sp.state_t.installed))
                 )
                {
                    Log("can't assign action " + act + " for suite_comp_specific, because sp.Action/State = " + sp.Action() + "/" + sp.State());
                    return false;
                }
                else return orig_set_act(act);
             }

             if(sp.Action() == sp.action_t.install || (sp.Action() != sp.action_t.remove && sp.State() == sp.state_t.installed))
             {
                sc.Action(sc.action_t.remove);
             }

             Log("setting special processing for suite_comp_specific component done");
         }
    }
}
