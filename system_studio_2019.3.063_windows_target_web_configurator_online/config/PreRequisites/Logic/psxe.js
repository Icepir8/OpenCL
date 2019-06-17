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
    var base = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "../../Base")); };

    var ns = this;

    //get components object by
    this.ComponentByAlias = function (product, alias) {
        return product.FilterComponentsRecursive(function (cmp) { return cmp.Info().Property("alias") == alias ? true : false; });
    }
    //detect that componenet exists (by Alias)
    this.IsComponentExistsByAlias = function (product, alias) {
        return (ns.ComponentByAlias(product, alias) != undefined) ? true : false;
    }
    //detect that componenet exists and selected to installattion or installed (by Alias)
    this.IsComponentExistsAndSelectedByAlias = function (product, alias) {
        var cmp = ns.ComponentByAlias(product, alias);
        if (cmp != undefined) {
            return (cmp.State() == cmp.state_t.installed || cmp.Action() == cmp.action_t.install) ? true : false;
        }
        return false;
    }

    //get feature object by id
    this.FeatureById = function (product, id) {
        return product.FilterFeaturesRecursive(function (ftr) { return ftr.Id() == id ? true : false; });
    }
    //detect that feature exists (by id)
    this.IsFeatureExistsById = function (product, id) {
        return (ns.FeatureById(product, id) != undefined) ? true : false;
    }
    //detect that Feature exists and selected to installattion or installed (by id)
    this.IsFeatureExistsAndSelectedById = function (product, id) {
        var ftr = ns.FeatureById(product, id);
        if (ftr != undefined) {
            return (ftr.State() == ftr.state_t.installed || ftr.Action() == ftr.action_t.install) ? true : false;
        }
        return false;
    }


    this.pre_requesites_state_t = new function () {
        this.enabled = "enabled";
        this.disabled = "disabled";
        this.ignore = "ignore";
    }

    //validate component pre-requesites
    this.ValidateComponentPreRequisites = function (product, component_aliase) {

        var ns_vs = base("vs_processing.js").GetVSInfo();

        var ret = ns.pre_requesites_state_t.ignore;

        //shell
        if (component_aliase.search("SHELL_VS_2015") != -1 ||
            component_aliase.search("VSSHELL_2015") != -1
            ) {
            ret = ns.ValidateShell2015PreRequisite(product);
        }

        //IDE + VS DOC
        if (component_aliase.search("_VS2013") != -1
            ) {
            ret = ns.pre_requesites_state_t.enabled;
            if (!(ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv)) {
                ret = ns.pre_requesites_state_t.disabled;
                ret = ns.FortranValidationVS2013(product);

                //disable for debugger extension because GDB do not support MS Shell 2013
                if (component_aliase.search("GDB_IDE_") != -1) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
            }

            //IDE for android 
            if (component_aliase.search("IDE_VS_ANDROID") != -1
                ) {
                if (!FileSystem.Exists(StringList.Format("[$ProgramFiles]\\MSBuild\\Microsoft.Cpp\\v4.0\\V120\\Platforms\\Android\\vs-android.CppBuild.targets"))) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
            }
        }
        if (component_aliase.search("_VS2015") != -1
            ) {
            ret = ns.pre_requesites_state_t.enabled;
            if (!(ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv)) {
                ret = ns.pre_requesites_state_t.disabled;
                ret = ns.FortranValidationVS2015(product);

                //disable for debugger extension because GDB do not support MS Shell 2015
                if (component_aliase.search("GDB_IDE_") != -1) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
            }

            //IDE for android 
            if (component_aliase.search("IDE_VS_ANDROID") != -1
                ) {
                if (!FileSystem.Exists(StringList.Format("[$ProgramFiles]\\MSBuild\\Microsoft.Cpp\\v4.0\\V140\\Application Type\\Android\\Default.props"))) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
            }
        }
        if (component_aliase.search("_VS2017") != -1
            ) {
            ret = ns.pre_requesites_state_t.enabled;
            if (!(ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv)) {
                ret = ns.pre_requesites_state_t.disabled;
                //ret = ns.FortranValidationVS2017(product);

                //disable for debugger extension because GDB do not support MS Shell 2017
                if (component_aliase.search("GDB_IDE_") != -1) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
            }

            //IDE for android 
            if (component_aliase.search("IDE_VS_ANDROID") != -1
                ) {
                if (ns_vs.vs_2017.cpp_dir) {
                    if (!FileSystem.Exists(ns_vs.vs_2017.cpp_dir + "\\Common7\\IDE\\VC\\VCTargets\\Application Type\\Android\\3.0\\Default.props")) {
                        ret = ns.pre_requesites_state_t.disabled;
                    }
                }
                else 
                    ret = ns.pre_requesites_state_t.disabled;
            }
        }

        //debugger
        if (component_aliase == "GDB_DOCS" ||
            component_aliase == "GDB_LIC" ||
            component_aliase == "GDB_COMMON" ||
            component_aliase == "GDB_PYTHON_INTEL64" ||
            component_aliase == "GDB_SERVER_INTEL64_KNL" ||
            component_aliase == "GDB_COMMON_INTEL64" ||
            component_aliase == "GDB_VARS" ||
            component_aliase == "GDB_SL_AI_INTEL64" ||
            component_aliase == "GDB_SRC" ||
            component_aliase == "GDB_PYTHON_SRC" ||
            component_aliase == "GDB_IDE_INDEP"
            ) {
            ret = ns.pre_requesites_state_t.enabled;
            if (!(ns_vs.vs_2013.cpp_dir && ns_vs.vs_2013.dir && ns_vs.vs_2013.devenv) &&
                !(ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) &&
                !(ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv)
                )
                ret = ns.pre_requesites_state_t.disabled;
        }

        return ret;
    }

    //validate shell 2015 pre-requesite
    this.ValidateShell2015PreRequisite = function (product) {
        var ns_vs = base("vs_processing.js").GetVSInfo();
        var ns_dotnet = base("dot_net_processing.js").GetDotNetInfo();

        var os_info = System.WindowsInfo();

        var ret = ns.pre_requesites_state_t.enabled;
        var im = product.InstallMode();

        if ((ns_vs.vs_2015.shell_isolated && ns_vs.vs_2015.shell_integrated) ||
            (ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) ||
            (ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv)
            ) {
            if (im == product.install_mode_t.modify) {
                //only for modify
                if ((ns_vs.vs_2015.cpp_dir && ns_vs.vs_2015.dir && ns_vs.vs_2015.devenv) ||
                    (ns_vs.vs_2017.cpp_dir && ns_vs.vs_2017.dir && ns_vs.vs_2017.devenv)
                    ) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
                else ret = ns.pre_requesites_state_t.enabled;
            }
            else {
                //only for installation mode
                ret = ns.pre_requesites_state_t.disabled;

                //enable back if shell is installed
                if ((ns_vs.vs_2015.shell_isolated && ns_vs.vs_2015.shell_integrated)) ret = ns.pre_requesites_state_t.enabled;
            }
        }
        else {
            ret = ns.pre_requesites_state_t.enabled;

            //if .net4.0 is not installed
            //if (!ns_dotnet.dot_net_4_x_client.install) ret = ns.pre_requesites_state_t.disabled;
            //if ms sdk 10.0 is not installed
            if (!ns_vs.sdk_100.dir) ret = ns.pre_requesites_state_t.disabled;
            //if incorrect OS version 
            if (os_info.major < 6 || (os_info.major == 6 && os_info.minor <= 1)) {
                if (!(os_info.major == 6 && os_info.minor == 1 && os_info.sp_major >= 1)) {
                    ret = ns.pre_requesites_state_t.disabled;
                }
            }
        }

        if (ret == ns.pre_requesites_state_t.enabled)
            Log("Shell 2015 will be installed");
        else Log("Shell 2015 will NOT be installed");

        return ret;
    }

    //fortran section
    this.FortranValidationVS2013 = function (product) {
        var ns_vs = base("vs_processing.js").GetVSInfo();

        var ret = ns.pre_requesites_state_t.disabled;

        if (ns.IsComponentExistsByAlias(product, "WW_IFORT_IA32") ||
            ns.IsComponentExistsByAlias(product, "WW_IFORT_INTEL64_ARCHSHARED")
            ) {
            if (ns_vs.vs_2013.shell_isolated && ns_vs.vs_2013.shell_integrated) {
                ret = ns.pre_requesites_state_t.enabled;
            }
        }

        return ret;
    }

    this.FortranValidationVS2015 = function (product) {
        var ns_vs = base("vs_processing.js").GetVSInfo();

        var ret = ns.pre_requesites_state_t.disabled;

        if (ns.IsComponentExistsByAlias(product, "WW_IFORT_IA32") ||
            ns.IsComponentExistsByAlias(product, "WW_IFORT_INTEL64_ARCHSHARED")
            ) {
            if (!(ns_vs.vs_2015.shell_isolated && ns_vs.vs_2015.shell_integrated)) {
                ret = ns.pre_requesites_state_t.disabled;
                if (ns.IsComponentExistsByAlias(product, "SHELL_VS_2015") ||
                    ns.IsComponentExistsByAlias(product, "SHELL_VS_2015_JP") ||
                    ns.IsComponentExistsByAlias(product, "VSSHELL_2015_IA32") ||
                    ns.IsComponentExistsByAlias(product, "VSSHELL_2015_INTEL64")
                    ) {
                    if (ns.ValidateShell2015PreRequisite(product) == ns.pre_requesites_state_t.enabled) ret = ns.pre_requesites_state_t.enabled;
                }
            }
            else ret = ns.pre_requesites_state_t.enabled;
        }

        return ret;
    }

}
