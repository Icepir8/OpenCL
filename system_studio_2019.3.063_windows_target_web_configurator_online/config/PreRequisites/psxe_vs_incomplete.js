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
new function () {
    var load = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "\\..\\")); };
    var base = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "../Base")); };

    var ns = this;

    this.Id = function () {
        return "PSXE 2019, Visual Studio Incomplete installation prerequisites";
    }

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");
        var ns_vs = base("vs_processing.js").GetVSInfo();

        //VS2017
        var vs2017_incomplete = false;
        var vs2017_edition_list = "";

        var ids = VSSetupConfig.GetIds();
        for (var i = 0; i < ids.length; i++) {
            if (!VSSetupConfig.IsComplete(ids[i])) {
                vs2017_incomplete = true;

                var edition = VSSetupConfig.GetProduct(ids[i]);
                var edition_str = "";
                if (edition != null) {
                    if (edition.search("Enterprise") != -1) edition_str = StringList.Format("[vs_edition_enterprise]", "2017");
                    if (edition.search("Professional") != -1) edition_str = StringList.Format("[vs_edition_professional]", "2017");
                    if (edition.search("Community") != -1) edition_str = StringList.Format("[vs_edition_community]", "2017");
                }
                if (edition_str == "") edition_str = VSSetupConfig.GetDisplayName(ids[i]);
                if (edition_str == null) edition_str = "Visual Studio 2017 Unknown Edition"

                if (edition_str != "") {
                    if (vs2017_edition_list != "")
                        vs2017_edition_list = vs2017_edition_list + StringList.Format("[vs_edition_and_delimiter]") + " ";
                    vs2017_edition_list = vs2017_edition_list + edition_str;
                }
            }
        }

        Log("VS2017 installation incoplete stage '" + vs2017_incomplete + "' for editions: " + vs2017_edition_list);

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                /////////////////////////////////////////////////////////// 

                if (vs2017_incomplete == true) {
                    collector.WarningExt(StringList.Format("[vs_incompete_installation_title]", "2017"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[vs_incompete_installation_description_install_silent]", vs2017_edition_list) : StringList.Format("[vs_incompete_installation_description_install]", vs2017_edition_list));
                }

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                /////////////////////////////////////////////////////////// 

                if (vs2017_incomplete == true) {
                    collector.WarningExt(StringList.Format("[vs_incompete_installation_title]", "2017"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[vs_incompete_installation_description_modify_silent]", vs2017_edition_list) : StringList.Format("[vs_incompete_installation_description_modify]", vs2017_edition_list));
                }


                break;
            case product.install_mode_t.repair:
                ///////////////////////////////////////////////////////////
                //Repair mode
                /////////////////////////////////////////////////////////// 

                break;
            case product.install_mode_t.remove:
                ///////////////////////////////////////////////////////////
                //Remove mode
                /////////////////////////////////////////////////////////// 

                break;
        }

        Log(ns.Id() + " 'Second' generated successfully");

        return;
    }
}
