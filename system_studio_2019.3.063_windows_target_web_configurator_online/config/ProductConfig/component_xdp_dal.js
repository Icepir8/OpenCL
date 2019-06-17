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

    this.ExInit = function(root, node)
    {
        return function()
        {
            var cmp = this;

            cmp_alias = String(cmp.Info().Property("alias")).toLowerCase();

            var cmps_to_process = ["xdp_drvr_ia32", "xdp_drvr_intel64", "sys_dbg_dal"];

            if(cmps_to_process.indexOf(cmp_alias) == -1)
                return true;

            cmp.Log("Special procesiing of the Activation object");

            if(cmp.CustomObjects().Item("Activation"))
                cmp.CustomObjects().Remove("Activation");
            else
            {
                // it is first install or Activation isn't required for this component
                return true;
            }

            var prev_rm = cmp.CustomObjects().Remove;
            cmp.CustomObjects().Remove = function(id)
            {
                if(String(id).toLowerCase() == "activation")
                    return false;

                return prev_rm(id);
            }

            var first_time = 1;
            cmp.CustomObjects().Add.Filter = function(args)
            {
                if(!args.length)
                    return true;

                var id = (args.length == 1) ? args[0].Id() : args[0];

                if(String(id).toLowerCase() == "activation")
                {
                   if(first_time)
                   {
                      first_time = 0;
                      return true;
                   }
                   else
                   {
                      cmp.Log("Adding item activation - activation for this component isn't required. ignore");
                      return false;
                   }
                }

                return true;
            }

            return true;
        }
    }
}
