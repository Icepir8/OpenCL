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
        return "PSXE 2019, Visual Studio C++ Compiler tools prerequisites";
    }

    this.GetVSName = function (vs_version) {
        return StringList.Format("[vs_name]", vs_version);
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

                var compiler_name = "none";

                if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_ARCHSHARED") && ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_ARCHSHARED")) {
                    compiler_name = StringList.Format("[component_name_c_f]")
                }
                else if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_ARCHSHARED")) {
                    compiler_name = StringList.Format("[component_name_c]")
                }
                else if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_ARCHSHARED")) {
                    compiler_name = StringList.Format("[component_name_f]")
                }

                // -------> Warning Section <--------
                
                //show warning in case if VS has not Visual C++ Compiler.
                if (compiler_name != "none") {
                    if (!ns_vs.vs_2015.cpp && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv && 
                        !(ns_vs.vs_2015.shell_isolated && ns_vs.vs_2015.shell_integrated) 
                        )
                        collector.WarningExt(StringList.Format("[no_vs_cpp_compiler_title]", ns.GetVSName("2015"), "2015"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[no_vs2015_cpp_compiler_description_silent]", compiler_name, ns.GetVSName("2015"), ns.GetVSName("2015")) : StringList.Format("[no_vs2015_cpp_compiler_description]", compiler_name, ns.GetVSName("2015"), ns.GetVSName("2015")));

                    if (!ns_vs.vs_2017.cpp && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv
                        )
                        collector.WarningExt(StringList.Format("[no_vs_cpp_compiler_title]", ns.GetVSName("2017"), "2017"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[no_vs2017_cpp_compiler_description_silent]", compiler_name, ns.GetVSName("2017"), ns.GetVSName("2017")) : StringList.Format("[no_vs2017_cpp_compiler_description]", compiler_name, ns.GetVSName("2017"), ns.GetVSName("2017")));
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
