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

    var reboot_required = function() {return false;}

    //##################################################################
    // function for processing dependencies for common msis (ipp_common, mkl_common)
    var get_com_dep = function(o)
    {
      var obj = o;
      var cmn_dep = function()
      {
        var act = null;
        var deps = obj.Dependencies().Items();
        for(var i in deps)
        {
            if(!deps[i])
                continue;

            var dep_act = deps[i].Action();
            var dep_st  = deps[i].State();

            if(dep_st == obj.state_t.installed && dep_act == obj.action_t.none)
            {
                dep_act = obj.action_t.install;
            }
            else if(dep_st == obj.state_t.absent && dep_act == obj.action_t.none)
            {
                dep_act = obj.action_t.remove;
            }

            if(!act)
                act = dep_act;

            if(act != dep_act)
            {
                act = obj.action_t.install;
                break;
            }
        }

        if(!act)
            obj.SetAction(obj.action_t.remove);
        else
            obj.SetAction(act);

        return true;
      }

      return cmn_dep;
    }
    //##################################################################

    this.Component = function(components, node)
    {
        Log("Processing simple dependencies");

        var dep_nodes = node.select("//component[@alias and @require_component]");
        for(var i in dep_nodes)
        {
            var cmp = dep_nodes[i];
            var id = cmp.attributes.alias;
            var req = cmp.attributes.require_component;

            Log("adding deps for " + id);
            var req_list = req.split(";")
            for(var j in req_list)
            {
                Log("add dep " + req_list[j] + " for component " + id);
                components[id].Depend(req_list[j], components[req_list[j]]);
            }

            components[id].ProcessDependency = get_com_dep(components[id]);
        }
        Log("Processing simple dependencies finished");
    }
}
