/*
Copyright (C) 2002-2019, Intel Corporation. All rights reserved.
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
notice or any other notice embedded in Materials by Intel or Intel’s suppliers
or licensors in any way.
*/

new function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var ns = this;

    this.Id = function()
    {
        return "amplxe_vs_integration_prerequisites";
    }

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");
        var ns_psxe = load("Logic/psxe.js");

        if (!ns_psxe.IsFeatureExistsAndSelectedById(product, "amplxe_toplevel"))
        {
            Log(ns.Id() + " 'Second' won't be processed due to amplxe_toplevel is not selected to install");
            return;
        }

        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");
        var ns_psxe = load("Logic/psxe.js");

        var vs2012 = (ns_psxe.ComponentByAlias(product, "amplxe_vs2012-integration"));
        var vs2013 = (ns_psxe.ComponentByAlias(product, "amplxe_vs2013-integration"));
        var vs2015 = (ns_psxe.ComponentByAlias(product, "amplxe_vs2015-integration"));
        var vs2017 = (ns_psxe.ComponentByAlias(product, "amplxe_vs2017-integration"));

        var vs2012Exists = (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "amplxe_vs2012-integration"));
        var vs2013Exists = (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "amplxe_vs2013-integration"));
        var vs2015Exists = (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "amplxe_vs2015-integration"));
        var vs2017Exists = (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "amplxe_vs2017-integration"));

        description = (ns_inst.Installer.Silent()) ? "[amplxe_older_integrated_into_vs_description_silent]" : "[amplxe_older_integrated_into_vs_description]";

        // Check for Inspector
        if (!WI.ClientsInstalledComponent("{FA2451B0-C22F-4E33-80AE-F67A29EE7E02}"))
        {
            description = (ns_inst.Installer.Silent()) ? "[amplxe_older_integrated_into_vs_description_silent_tcar_custom]" : "[amplxe_older_integrated_into_vs_description_tcar_custom]";
        }

        if((vs2012Exists || vs2013Exists || vs2015Exists || vs2017Exists) && product.InstallMode() == product.install_mode_t.install)
        {
            if( vs2012Exists && (vs2012.Upgrade().OlderExists() || vs2012.Upgrade().NewerExists())
                ||
                vs2013Exists && (vs2013.Upgrade().OlderExists() || vs2013.Upgrade().NewerExists())
                ||
                vs2015Exists && (vs2015.Upgrade().OlderExists() || vs2015.Upgrade().NewerExists())
                ||
                vs2017Exists && (vs2017.Upgrade().OlderExists() || vs2017.Upgrade().NewerExists()) )
                collector.WarningExt(StringList.Format("[amplxe_older_integrated_into_vs_title]"), StringList.Format(description));
        }

        Log(ns.Id() + " 'Second' generated successfully");
    }
}
