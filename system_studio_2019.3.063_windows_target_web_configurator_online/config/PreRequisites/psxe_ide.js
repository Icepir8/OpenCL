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
        return "PSXE 2019, ide prerequisites";
    }

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");
        var ns_psxe = load("PreRequisites/Logic/psxe.js")
        var ns_ide_info = load("PreRequisites/Logic/compiler_ide_detect.js").GetIDEInfo();

        var product_name = product.Info().Property("title");

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                /////////////////////////////////////////////////////////// 

                // -------> Warning Section <--------

                //cannot install IDE (no VS at all)
                if ( (ns_psxe.IsComponentExistsByAlias(product, "IDE_COMMON_VS2013") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_COMMON_VS2013") == ns_psxe.pre_requesites_state_t.disabled) &&
                     (ns_psxe.IsComponentExistsByAlias(product, "IDE_COMMON_VS2015") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_COMMON_VS2015") == ns_psxe.pre_requesites_state_t.disabled) &&
                     (ns_psxe.IsComponentExistsByAlias(product, "IDE_COMMON_VS2017") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_COMMON_VS2017") == ns_psxe.pre_requesites_state_t.disabled)
                    )
                    collector.WarningExt(StringList.Format("[cannot_install_ide_title]"), StringList.Format("[cannot_install_ide_description_install]"));

                //old ide will be removed
                //C++
                if ( (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "IDE_C_COMMON_VS2013") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_C_COMMON_VS2013") == ns_psxe.pre_requesites_state_t.enabled) ||
                     (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "IDE_C_COMMON_VS2015") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_C_COMMON_VS2015") == ns_psxe.pre_requesites_state_t.enabled) ||
                     (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "IDE_C_COMMON_VS2017") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_C_COMMON_VS2017") == ns_psxe.pre_requesites_state_t.enabled)
                    ) { 
                    
                    if (ns_ide_info.c_cmp101.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp101_installed_title]"), StringList.Format("[ide_c_cmp101_installed_description]", product_name));
                    if (ns_ide_info.c_cmp110.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp110_installed_title]"), StringList.Format("[ide_c_cmp110_installed_description]", product_name));
                    if (ns_ide_info.c_cmp111.installed && ns_ide_info.c_cmp111.product_id == "PE")
                        collector.WarningExt(StringList.Format("[ide_c_cmp111_installed_title]"), StringList.Format("[ide_c_cmp111_installed_description]", product_name));
                    if (ns_ide_info.c_cmp111.installed && ns_ide_info.c_cmp111.product_id == "PC")
                        collector.WarningExt(StringList.Format("[ide_c_cmp111_pc_installed_title]"), StringList.Format("[ide_c_cmp111_pc_installed_description]", product_name));
                    if (ns_ide_info.c_cmp120.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp120_installed_title]"), StringList.Format("[ide_c_cmp120_installed_description]", product_name));
                    if (ns_ide_info.c_cmp120_pc.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp120_pc_installed_title]"), StringList.Format("[ide_c_cmp120_pc_installed_description]", product_name));
                    if (ns_ide_info.c_cmp121.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp121_installed_title]"), StringList.Format("[ide_c_cmp121_installed_description]", product_name));
                    if (ns_ide_info.c_cmp121_pc.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp121_pc_installed_title]"), StringList.Format("[ide_c_cmp121_pc_installed_description]", product_name));
                    if (ns_ide_info.c_cmp130.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp130_installed_title]"), StringList.Format("[ide_c_cmp130_installed_description]", product_name));
                    if (ns_ide_info.c_cmp140.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp140_installed_title]"), StringList.Format("[ide_c_cmp140_installed_description]", product_name));
                    if (ns_ide_info.c_cmp150.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp150_installed_title]"), StringList.Format("[ide_c_cmp150_installed_description]", product_name));
                    if (ns_ide_info.c_cmp150_inde.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp150_inde_installed_title]"), StringList.Format("[ide_c_cmp150_inde_installed_description]", product_name));
                    if (ns_ide_info.c_cmp150_iss.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp150_iss_installed_title]"), StringList.Format("[ide_c_cmp150_iss_installed_description]", product_name));
                    if (ns_ide_info.c_cmp160.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp160_installed_title]"), StringList.Format("[ide_c_cmp160_installed_description]", product_name));
                    if (ns_ide_info.c_cmp170.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp170_installed_title]"), StringList.Format("[ide_c_cmp170_installed_description]", product_name));
                    if (ns_ide_info.c_cmp180.installed)
                        collector.WarningExt(StringList.Format("[ide_c_cmp180_installed_title]"), StringList.Format("[ide_c_cmp180_installed_description]", product_name));
                }

                //Fortran
                if ( (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "IDE_F_VS2013") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_F_VS2013") == ns_psxe.pre_requesites_state_t.enabled) ||
                     (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "IDE_F_VS2015") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_F_VS2015") == ns_psxe.pre_requesites_state_t.enabled) ||
                     (ns_psxe.IsComponentExistsAndSelectedByAlias(product, "IDE_F_VS2017") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_F_VS2017") == ns_psxe.pre_requesites_state_t.enabled)
                    ) { 
                
                    if (ns_ide_info.f_cmp101.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp101_installed_title]"), StringList.Format("[ide_f_cmp101_installed_description]", product_name));
                    if (ns_ide_info.f_cmp110.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp110_installed_title]"), StringList.Format("[ide_f_cmp110_installed_description]", product_name));
                    if (ns_ide_info.f_cmp111.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp111_installed_title]"), StringList.Format("[ide_f_cmp111_installed_description]", product_name));
                    if (ns_ide_info.f_cmp120.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp120_installed_title]"), StringList.Format("[ide_f_cmp120_installed_description]", product_name));
                    if (ns_ide_info.f_cmp121.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp121_installed_title]"), StringList.Format("[ide_f_cmp121_installed_description]", product_name));
                    if (ns_ide_info.f_cmp130.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp130_installed_title]"), StringList.Format("[ide_f_cmp130_installed_description]", product_name));
                    if (ns_ide_info.f_cmp140.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp140_installed_title]"), StringList.Format("[ide_f_cmp140_installed_description]", product_name));
                    if (ns_ide_info.f_cmp150.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp150_installed_title]"), StringList.Format("[ide_f_cmp150_installed_description]", product_name));
                    if (ns_ide_info.f_cmp160.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp160_installed_title]"), StringList.Format("[ide_f_cmp160_installed_description]", product_name));
                    if (ns_ide_info.f_cmp170.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp170_installed_title]"), StringList.Format("[ide_f_cmp170_installed_description]", product_name));
                    if (ns_ide_info.f_cmp180.installed)
                        collector.WarningExt(StringList.Format("[ide_f_cmp180_installed_title]"), StringList.Format("[ide_f_cmp180_installed_description]", product_name));
                }

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                /////////////////////////////////////////////////////////// 

                // -------> Warning Section <--------

                //cannot install IDE
                if ( (ns_psxe.IsComponentExistsByAlias(product, "IDE_COMMON_VS2013") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_COMMON_VS2013") == ns_psxe.pre_requesites_state_t.disabled) &&
                     (ns_psxe.IsComponentExistsByAlias(product, "IDE_COMMON_VS2015") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_COMMON_VS2015") == ns_psxe.pre_requesites_state_t.disabled) &&
                     (ns_psxe.IsComponentExistsByAlias(product, "IDE_COMMON_VS2017") && ns_psxe.ValidateComponentPreRequisites(product, "IDE_COMMON_VS2017") == ns_psxe.pre_requesites_state_t.disabled)
                    )
                    collector.WarningExt(StringList.Format("[cannot_install_ide_title]"), StringList.Format("[cannot_install_ide_description_modify]"));

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
