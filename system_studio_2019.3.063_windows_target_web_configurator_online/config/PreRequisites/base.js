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

    var ns_pb        =  base("parse_bool.js");

    var ns = this;

    this.Id = function () {
        return "Base prerequisites";
    }

    this.Check = function (collector, product) {
        Log(ns.Id() + " generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");

        //OS detection
        var windows_nt_key = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
        var windows_nt_val = "ProductName";

        var product_options_key = "SYSTEM\\CurrentControlSet\\Control\\ProductOptions";
        var product_options_val = "ProductType";

        var os_name = "";
        if (Registry.Key("HKLM", windows_nt_key).Exists())
            var os_name = Registry.Key("HKLM", windows_nt_key).Value(windows_nt_val);

        var os_type = "";
        if (Registry.Key("HKLM", product_options_key).Exists())
            var os_type = Registry.Key("HKLM", product_options_key).Value(product_options_val);

        var os_info = System.WindowsInfo();
        Log("Operation System Information: Major: " + os_info.major +
                                        ", Minor: " + os_info.minor +
                                        ", Service Pack: " + os_info.sp +
                                        ", OS Name: " + os_name +
                                        ", OS Type: " + os_type +
                                        ", Service Pack Major: " + os_info.sp_major + 
                                        ", Service Pack Minor: " + os_info.sp_minor);
        //

        //sercond instance
        Log("Legacy is running: " + Legacy.IsRunning());
        if (System.SecondInstance() || Legacy.IsRunning())
            collector.Critical("[another_instance]");

        // Check TMP environment variable
        var tmp = System.Environment("TMP");
        Log("TMP folder: " + tmp);
        if(!FileSystem.Exists(tmp) || !FileSystem.IsWritable(tmp))
            collector.FatalExt(StringList.Format("[tmp_missed_title]"), StringList.Format("[tmp_missed_message]"));

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                /////////////////////////////////////////////////////////// 

                // -------> Fatal Section <--------

                //no admin rights
                if (!System.IsAdmin())
                    collector.FatalExt(StringList.Format("[no_admin_privilege_title]"),
                        (ns_inst.Installer.Silent()) ? StringList.Format("[no_admin_privilege_description_install_silent]") : StringList.Format("[no_admin_privilege_description_install]"));

                // arch x86 or intel64 only
                var arch = System.ProcessorArch();
                var arch_s = "";
                if (arch == System.ProcessorArch.pa_x86) arch_s = StringList.Format("[processor_architecture_ia32]");
                if (arch == System.ProcessorArch.pa_intel64) arch_s = StringList.Format("[processor_architecture_intel64]");
                if (arch == System.ProcessorArch.pa_ia64) arch_s = StringList.Format("[processor_architecture_ia64]");
                Log("Processor Architecture: " + arch_s);
                if (arch != System.ProcessorArch.pa_intel64)
                    collector.FatalExt(StringList.Format("[cpu_arch_not_supported_title]", arch_s),
                        (ns_inst.Installer.Silent()) ? StringList.Format("[cpu_arch_not_supported_title_description_silent]") : StringList.Format("[cpu_arch_not_supported_title_description]"));

                //not supported Operation system: OS < Win 7
                if (os_info.major < 6 || (os_info.major == 6 && os_info.minor < 1)) {
                    if (!(os_info.major == 6 && os_info.minor == 0 && os_type != "WinNT" && arch == System.ProcessorArch.pa_x86)) { //skip WinServer 2008 (x86)
                        collector.FatalExt(StringList.Format("[os_not_supported_title]", os_name),
                        (ns_inst.Installer.Silent()) ? StringList.Format("[os_not_supported_description_silent]") : StringList.Format("[os_not_supported_description]"));
                    }
                }

                // -------> Warning Section <--------

                if (!GetOpt.Exists("ignore-cpu"))
                {
                    // Intel processors only
                    var cpu_vendor_key = "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0";
                    var cpu_vendor_val = "VendorIdentifier";
                    var genuine_intel = "";
                    if (Registry.Key("HKLM", cpu_vendor_key).Exists())
                        var genuine_intel = Registry.Key("HKLM", cpu_vendor_key).Value(cpu_vendor_val);

                    if (genuine_intel != "GenuineIntel")
                        collector.WarningExt(StringList.Format("[non_intel_cpu_title]"), StringList.Format("[non_intel_cpu_description]"));
                }

                //not supported Operation system: OS < Win 7
//                if (os_info.major < 6 || (os_info.major == 6 && os_info.minor < 1)) {
//                   if (!(os_info.major == 6 && os_info.minor == 0 && os_type != "WinNT" && arch == System.ProcessorArch.pa_x86)) { //skip WinServer 2008 (x86)
//                        collector.WarningExt(StringList.Format("[os_not_tested_title]", os_name),
//                        (ns_inst.Installer.Silent()) ? StringList.Format("[os_not_tested_description_silent]") : StringList.Format("[os_not_tested_description]"));
//                    }
//                }

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                /////////////////////////////////////////////////////////// 

                // -------> Fatal Section <--------

                if (!System.IsAdmin())
                    collector.FatalExt(StringList.Format("[no_admin_privilege_title]"),
                        (ns_inst.Installer.Silent()) ? StringList.Format("[no_admin_privilege_description_modify_silent]") : StringList.Format("[no_admin_privilege_description_modify]"));


                var disallow_modify_if_no_media = ns_pb.ParseBoolean(product.Info().Property("disallow_modify_if_no_media"));
                if(disallow_modify_if_no_media)
                {
                    var is_comps_sources_resolved = function()
                    {
                        var can_be_modified = true;
                        product.FilterComponentsRecursive(function(cmp)
                        {
                            if(typeof(cmp.Source) != "function" || !cmp.Source())
                            {
                                return;
                            }

                            if(!cmp.Source().Resolved())
                            {
                                Log(Log.l_error, "Source for cmp " + cmp.Name() + " is not resolved");
                                can_be_modified = false;
                                return true;
                            }
                        });
                        return can_be_modified;
                    }

                    //check only if it is offline package            
                    if(FileSystem.Exists(FileSystem.MakePath("offline_installation.ind", Origin.Directory() + "..")))
                    {
                        //at lest one sources is not resolved
                        if (!is_comps_sources_resolved())
                            collector.FatalExt(StringList.Format("[no_sources_title]"), StringList.Format("[no_sources_message]"));
                    }
                }


                break;
            case product.install_mode_t.repair:
                ///////////////////////////////////////////////////////////
                //Repair mode
                /////////////////////////////////////////////////////////// 

                // -------> Fatal Section <--------

                if (!System.IsAdmin())
                    collector.FatalExt(StringList.Format("[no_admin_privilege_title]"),
                        (ns_inst.Installer.Silent()) ? StringList.Format("[no_admin_privilege_description_repair_silent]") : StringList.Format("[no_admin_privilege_description_repair]"));

                break;
            case product.install_mode_t.remove:
                ///////////////////////////////////////////////////////////
                //Remove mode
                /////////////////////////////////////////////////////////// 

                // -------> Fatal Section <--------

                if (!System.IsAdmin())
                    collector.FatalExt(StringList.Format("[no_admin_privilege_title]"),
                        (ns_inst.Installer.Silent()) ? StringList.Format("[no_admin_privilege_description_remove_silent]") : StringList.Format("[no_admin_privilege_description_remove]"));

                break;
        }

        Log(ns.Id() + " generated successfully");

        return;
    }

}
