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
        return "PSXE 2019, Visual Studio architecture Target prerequisites";
    }

    this.GetVSName = function (vs_version) {
        return StringList.Format("[vs_name]", vs_version);
    }

    this.PrintVSTargetStatus = function (vs) {
        Log(" " + vs.name + " , x86 = " + vs.TargetArch.x86());
        Log(" " + vs.name + " , amd64 = " + vs.TargetArch.amd64());
        Log(" " + vs.name + " , ia64 = " + vs.TargetArch.ia64());
        Log(" " + vs.name + " , x86_amd64 = " + vs.TargetArch.x86_amd64());
        Log(" " + vs.name + " , x86_ia64 = " + vs.TargetArch.x86_ia64());
    }

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");
        var ns_vs = base("vs_processing.js").GetVSInfo();
        var ns_psxe = load("PreRequisites/Logic/psxe.js")

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                /////////////////////////////////////////////////////////// 

                ns.PrintVSTargetStatus(ns_vs.vs_2013);
                ns.PrintVSTargetStatus(ns_vs.vs_2015);

                var description = (ns_inst.Installer.Silent()) ? "[no_vs_target_amd64_description_silent]" : "[no_vs_target_amd64_description]";

                // -------> Warning Section <--------
                //show warning in case if VS has not correct Target Arch installed.
                if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_INTEL64") && ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_INTEL64")) {
                    //both C++ and Fortran are avaliable in package

                    //intel64 cpp & fortran
                    if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_INTEL64") && ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_INTEL64")) {
                        if (!ns_vs.vs_2013.TargetArch.amd64() && ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv)
                            collector.WarningExt(StringList.Format("[no_vs_target_amd64_title]", ns.GetVSName("2013")), StringList.Format(description, StringList.Format("[component_name_c_f_intel64]"), ns.GetVSName("2013")));
                        if (!ns_vs.vs_2015.TargetArch.amd64() && ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv)
                            collector.WarningExt(StringList.Format("[no_vs_target_amd64_title]", ns.GetVSName("2015")), StringList.Format(description, StringList.Format("[component_name_c_f_intel64]"), ns.GetVSName("2015")));
                    }
                }
                else {
                    //only one of C++ or Fortran is avaliable in package

                    //intel64 cpp
                    if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_INTEL64")) {
                        if (!ns_vs.vs_2013.TargetArch.amd64() && ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv)
                            collector.WarningExt(StringList.Format("[no_vs_target_amd64_title]", ns.GetVSName("2013")), StringList.Format(description, StringList.Format("[component_name_c_intel64]"), ns.GetVSName("2013")));
                        if (!ns_vs.vs_2015.TargetArch.amd64() && ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv)
                            collector.WarningExt(StringList.Format("[no_vs_target_amd64_title]", ns.GetVSName("2015")), StringList.Format(description, StringList.Format("[component_name_c_intel64]"), ns.GetVSName("2015")));
                    }
                    //intel64 fortran
                    if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_INTEL64")) {
                        if (!ns_vs.vs_2013.TargetArch.amd64() && ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv)
                            collector.WarningExt(StringList.Format("[no_vs_target_amd64_title]", ns.GetVSName("2013")), StringList.Format(description, StringList.Format("[component_name_f_intel64]"), ns.GetVSName("2013")));
                        if (!ns_vs.vs_2015.TargetArch.amd64() && ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv)
                            collector.WarningExt(StringList.Format("[no_vs_target_amd64_title]", ns.GetVSName("2015")), StringList.Format(description, StringList.Format("[component_name_f_intel64]"), ns.GetVSName("2015")));
                    }
                }

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                /////////////////////////////////////////////////////////// 

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
