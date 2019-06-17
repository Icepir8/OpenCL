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

    //###############################################################
    // scenario adjustment
    //###############################################################
    this.Scenario = function(acts)
    {
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::Scenario required input parameter acts is undefined ");
            return null;
        }
        Log("Scenario::eclipse_integration: adding action into sequence");
        var scenario = this;
        var prod = scenario.Product();

        if(GetOpt.Exists("download-only") || GetOpt.Exists("download-list") || GetOpt.Exists("help") || GetOpt.Exists("?"))
            return;

        Log("Scenario::eclipse_integration: add after eclipse");

        //Silent installer
        acts.sub_SInstaller.AddAfter(acts.SWelcome, acts.EclipseIntegration);

        //GUI
        acts.sub_Install.AddBefore(acts.ConfigurationDialog, acts.EclipseIntegration, "skip-back");
        acts.sub_Maintenance.AddBefore(acts.ConfigurationDialog, acts.EclipseIntegration, "skip-back");
        //patching
        acts.Initialization.Add(acts.EclipsePatchFile);

        Log("Scenario::eclipse_integration: adding action into sequence done");
    }
}
