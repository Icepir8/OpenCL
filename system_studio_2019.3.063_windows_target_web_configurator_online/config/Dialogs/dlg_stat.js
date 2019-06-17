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

    this.Init = function()
    {
        var ns = this;

        var old_DialogHeader = ns.DialogHeader;
        ns.DialogHeader = function(dialog, header, subheader)
        {
          if (arguments.length > 1)
             old_DialogHeader(dialog, header, subheader);
          else
          {
            var stat_pick = base("stat_pick.js").Stat_pick;
            stat_pick.add_visited_dialog(dialog);
            Log("visited dialog = " + dialog);
            old_DialogHeader(dialog, header, subheader);
          }
        }
    }
}
