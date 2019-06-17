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
        return "PSXE 2019, Compiler prerequisites";
    }

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");
        var ns_vs = base("vs_processing.js").GetVSInfo();
        var ns_psxe = load("PreRequisites/Logic/psxe.js");


        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                ///////////////////////////////////////////////////////////

                // -------> Fatal Section <--------

                // -------> Warning Section <--------
                //C++
                if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_IA32") ||
                    ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_ICL_INTEL64")
                    ) {

                    //if no supported: VS, SDK 8.1 / 10.0, VS Express
                    if (!(ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv) &&
                        !(ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) &&
                        !(ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv) &&
                        !(ns_vs.sdk_81.dir) &&
                        !(ns_vs.sdk_100.dir) &&
                        !(ns_vs.vs_2013.vc_expr) &&
                        !(ns_vs.vs_2015.vc_expr) &&
                        !(ns_vs.vs_2017.vc_expr) &&
                        !(ns_vs.vs_2013.wd_expr) &&
                        !(ns_vs.vs_2015.wd_expr) &&
                        !(ns_vs.vs_2017.wd_expr)
                        ) {
                        collector.WarningExt(StringList.Format("[cmp_cpp_not_supported_ms_dev_tools_title]"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[cmp_cpp_not_supported_ms_dev_tools_description_silent]") : StringList.Format("[cmp_cpp_not_supported_ms_dev_tools_description]"));
                    }

                    //if no supported VS, but SDK 8.1 /10.0 or supported Visual C++ Express found
                    if (!(ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv) &&
                        !(ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) &&
                        !(ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv) &&
                        (
                            (ns_vs.sdk_81.dir) ||
                            (ns_vs.sdk_100.dir) ||
                            (ns_vs.vs_2012.vc_expr) ||
                            (ns_vs.vs_2013.vc_expr) ||
                            (ns_vs.vs_2015.vc_expr) ||
                            (ns_vs.vs_2017.vc_expr) ||
                            (ns_vs.vs_2012.wd_expr) ||
                            (ns_vs.vs_2013.wd_expr) ||
                            (ns_vs.vs_2015.wd_expr) ||
                            (ns_vs.vs_2017.wd_expr)
                        )
                        ) {
                        collector.WarningExt(StringList.Format("[cmp_cpp_not_supported_vs_title]"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[cmp_cpp_not_supported_vs_description_silent]") : StringList.Format("[cmp_cpp_not_supported_vs_description]"));
                    }

                    //GTX compiler warning 
                    collector.WarningExt(StringList.Format("[cmp_cpp_gtx_warning_title]"),
                            (ns_inst.Installer.Silent()) ? StringList.Format("[cmp_cpp_gtx_warning_description_silent]") : StringList.Format("[cmp_cpp_gtx_warning_description]"));
                }


                //Fortran
                if (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_IA32") ||
                    ns_psxe.IsComponentExistsAndSelectedByAlias(product, "WW_IFORT_INTEL64")
                    ) {

                    //if no supported: VS, SDK 8.1, 10.0, VS Express, VS shell
                    if (!(ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv) &&
                        !(ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) &&
                        !(ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv) &&
                        !(ns_vs.vs_2013.shell_isolated && ns_vs.vs_2013.shell_integrated) &&
                        !(ns_vs.vs_2015.shell_isolated && ns_vs.vs_2015.shell_integrated) &&
                        !(ns_vs.sdk_81.dir) &&
                        !(ns_vs.sdk_100.dir) &&
                        !(ns_vs.vs_2013.vc_expr) &&
                        !(ns_vs.vs_2015.vc_expr) &&
                        !(ns_vs.vs_2017.vc_expr) &&
                        !(ns_vs.vs_2013.wd_expr) &&
                        !(ns_vs.vs_2015.wd_expr) &&
                        !(ns_vs.vs_2017.wd_expr)
                        ) {
                        if (ns_psxe.ValidateShell2015PreRequisite(product) == ns_psxe.pre_requesites_state_t.disabled) {
                            collector.WarningExt(StringList.Format("[cmp_fortran_not_supported_ms_dev_tools_title]"),
                                (ns_inst.Installer.Silent()) ? StringList.Format("[cmp_fortran_not_supported_ms_dev_tools_description_silent]") : StringList.Format("[cmp_fortran_not_supported_ms_dev_tools_description]"));
                        }
                    }

                    //if no supported VS, SDK 100 , but SDK 8.1 or supported Visual C++ Express found
                    if (!(ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv) &&
                        !(ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) &&
                        !(ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv) &&
                        !(ns_vs.vs_2013.shell_isolated && ns_vs.vs_2013.shell_integrated) &&
                        !(ns_vs.vs_2015.shell_isolated && ns_vs.vs_2015.shell_integrated) &&
                        !(ns_vs.sdk_100.dir) &&
                        (
                            (ns_vs.sdk_81.dir) ||
                            (ns_vs.vs_2012.vc_expr) ||
                            (ns_vs.vs_2013.vc_expr) ||
                            (ns_vs.vs_2015.vc_expr) ||
                            (ns_vs.vs_2017.vc_expr) ||
                            (ns_vs.vs_2012.wd_expr) ||
                            (ns_vs.vs_2013.wd_expr) ||
                            (ns_vs.vs_2015.wd_expr) ||
                            (ns_vs.vs_2017.wd_expr) 
                        )
                        ) {
                        if (ns_psxe.ValidateShell2015PreRequisite(product) == ns_psxe.pre_requesites_state_t.disabled) {
                            collector.WarningExt(StringList.Format("[cmp_fortran_not_supported_vs_title]"),
                                (ns_inst.Installer.Silent()) ? StringList.Format("[cmp_fortran_not_supported_vs_description_silent]") : StringList.Format("[cmp_fortran_not_supported_vs_description]"));
                        }
                    }
                }

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                ///////////////////////////////////////////////////////////

                // -------> Warning Section <--------

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
