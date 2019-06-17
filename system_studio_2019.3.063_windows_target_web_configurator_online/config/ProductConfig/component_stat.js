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
  var ns_prop      = base("property.js");
  var ConstP = function(val){return ns_prop.Constant(val);}

  var stat_pick = base("stat_pick.js").Stat_pick;

    this.ExInit = function(root, node)
    {
        return function()
        {
            var cmp = this;

            var component_id = cmp.Info().Property("alias");
            var orig = cmp.Original();
            if(!orig.StatManager)
              orig.StatManager = ConstP(stat_pick.component_manager(component_id));

            cmp.StatManager = orig.StatManager;
            Log("Assign StatManager to "+component_id);
        }
    }
}
