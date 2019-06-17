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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};

    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario: add_arch_into_info started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        //########################################################################
        //
        //########################################################################
        ns.IdentifyTheArchitecture = function()
        {
            Log("Action IdentifyTheArchitecture");
      var current_arch = System.ProcessorArch() == System.ProcessorArch.pa_intel64 ? "intel64" : "ia32";
      prod.CustomProperties()("host_arch", current_arch);

            Log("Action IdentifyTheArchitecture done");

            return Action.r_ok;
        }

        if(ns.Initialization)
            ns.Initialization.Add(ns.IdentifyTheArchitecture);

        Log("Scenario: add_arch_into_info done");
    }
}
