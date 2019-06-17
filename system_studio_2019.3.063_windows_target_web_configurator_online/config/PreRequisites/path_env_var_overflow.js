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
        return "Path env. var. overflow prerequisites";
    }

    var PATH_ENV_VAR_SPACE_NEED = 350;
    var PATH_ENV_VAR_MAX_SIZE_8K = 8191;
    var PATH_ENV_VAR_MAX_SIZE_4K = 4095;
    var PATH_ENV_VAR_MAX_SIZE_2K = 2047;

    var PATH_ENV_VAR_CMP_IA32 = "\\common files\\intel\\shared libraries\\redist\\ia32_win\\compiler;";
    var PATH_ENV_VAR_CMP_INTEL64 = "\\common files\\intel\\shared libraries\\redist\\intel64_win\\compiler;";
    var PATH_ENV_VAR_MPIRT_IA32 = "\\common files\\intel\\shared libraries\\redist\\ia32_win\\mpirt;";
    var PATH_ENV_VAR_MPIRT_INTEL64 = "\\common files\\intel\\shared libraries\\redist\\intel64_win\\mpirt;";
    var PATH_ENV_VAR_SIZE_PREFIX = 30;


    this.Check = function (collector, product) {
        Log(ns.Id() + " generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");

        //estimate PATH size
        var status = 0;
        var path_env_var = System.Environment("PATH");
        var path_size = path_env_var.length;
        var path_max_allowed = PATH_ENV_VAR_MAX_SIZE_8K;
        var path_space_need = 0; //PATH_ENV_VAR_SPACE_NEED;
        var path_env_var = path_env_var.toLowerCase();
        var size_to_cleanup = 0;

        Log("PATH env var: " + path_env_var);
        Log("PATH env var size: " + path_size);

        if (path_env_var.indexOf(PATH_ENV_VAR_CMP_IA32) == -1) path_space_need += PATH_ENV_VAR_SIZE_PREFIX + PATH_ENV_VAR_CMP_IA32.length;
        if (path_env_var.indexOf(PATH_ENV_VAR_CMP_INTEL64) == -1) path_space_need += PATH_ENV_VAR_SIZE_PREFIX + PATH_ENV_VAR_CMP_INTEL64.length;
        if (path_env_var.indexOf(PATH_ENV_VAR_MPIRT_IA32) == -1) path_space_need += PATH_ENV_VAR_SIZE_PREFIX + PATH_ENV_VAR_MPIRT_IA32.length;
        if (path_env_var.indexOf(PATH_ENV_VAR_MPIRT_INTEL64) == -1) path_space_need += PATH_ENV_VAR_SIZE_PREFIX + PATH_ENV_VAR_MPIRT_INTEL64.length;

        Log("PATH env var free space requared: " + path_space_need);

        var os_info = System.WindowsInfo();

        if (path_space_need > 0) {
            if (os_info.major < 6 || (os_info.major == 6 && os_info.minor < 1)) // less Win 7
            {
                //< win 7  (Win XP)
                path_max_allowed = PATH_ENV_VAR_MAX_SIZE_2K;
                if (path_size >= path_max_allowed) {
                    //show path overflow message
                    size_to_cleanup = (path_size - path_max_allowed) + path_space_need;
                    status = 10;
                }
                else if ((path_max_allowed - path_size) < path_space_need) {
                    //show path is closed to overflow message
                    size_to_cleanup = path_space_need - (path_max_allowed - path_size);
                    status = 11;
                }
            }
            else {
                // >= win 7
                path_max_allowed = PATH_ENV_VAR_MAX_SIZE_4K;
                if (path_size >= path_max_allowed) {
                    //show path overflow message
                    size_to_cleanup = (path_size - path_max_allowed) + path_space_need;
                    status = 20;
                }
                else if ((path_max_allowed - path_size) < path_space_need) {
                    //show path is closed to overflow message
                    size_to_cleanup = path_space_need - (path_max_allowed - path_size);
                    status = 21;
                }
            }
        }

        Log("PATH env var, size to cleanup : " + size_to_cleanup);
        Log("PATH env var, status : " + status);

        //make pre-requesites 

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                /////////////////////////////////////////////////////////// 

                // -------> Fatal Section <--------

                //PATH en var overflow
                switch (status) {
                    case 10: //Win XP - overflow
                        collector.FatalExt(StringList.Format("[path_is_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_full_win_xp_description_install_silent]" : "[path_is_full_win_xp_description_install]", size_to_cleanup));
                        break;
                    case 11: //Win XP - about overflow
                        collector.FatalExt(StringList.Format("[path_is_about_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_about_full_win_xp_description_install_silent]" : "[path_is_about_full_win_xp_description_install]", size_to_cleanup));
                        break;
                    case 20: //Win 7 - overflow
                        collector.FatalExt(StringList.Format("[path_is_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_full_win_7_description_install_silent]" : "[path_is_full_win_7_description_install]", size_to_cleanup));
                        break;
                    case 21: //Win 7 - about overflow
                        collector.FatalExt(StringList.Format("[path_is_about_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_about_full_win_7_description_install_silent]" : "[path_is_about_full_win_7_description_install]", size_to_cleanup));
                        break;
                }

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                /////////////////////////////////////////////////////////// 

                // -------> Fatal Section <--------

                //PATH en var overflow
                switch (status) {
                    case 10: //Win XP - overflow
                        collector.FatalExt(StringList.Format("[path_is_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_full_win_xp_description_modify_silent]" : "[path_is_full_win_xp_description_modify]", size_to_cleanup));
                        break;
                    case 11: //Win XP - about overflow
                        collector.FatalExt(StringList.Format("[path_is_about_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_about_full_win_xp_description_modify_silent]" : "[path_is_about_full_win_xp_description_modify]", size_to_cleanup));
                        break;
                    case 20: //Win 7 - overflow
                        collector.FatalExt(StringList.Format("[path_is_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_full_win_7_description_modify_silent]" : "[path_is_full_win_7_description_modify]", size_to_cleanup));
                        break;
                    case 21: //Win 7 - about overflow
                        collector.FatalExt(StringList.Format("[path_is_about_full_title]"), StringList.Format((ns_inst.Installer.Silent()) ? "[path_is_about_full_win_7_description_modify_silent]" : "[path_is_about_full_win_7_description_modify]", size_to_cleanup));
                        break;
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
        
        Log(ns.Id() + " generated successfully");

        return;
    }
}
