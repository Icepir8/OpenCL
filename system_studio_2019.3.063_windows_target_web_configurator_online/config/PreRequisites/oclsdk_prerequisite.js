/*
Copyright (C) 2002-2014, Intel Corporation. All rights reserved.
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
    
    var ns_inst = Namespace("Root.installer");
    var ns_java  = load("../java.js");
    var ns_ver = base("version.js");
    var ns_prop = base("property.js");

    var PForInstall = function(val, attributes)
    {
        if (typeof(ns_prop.CollectorByAnd) == "undefined")
            return ns_prop.Property(val, attributes);

        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        c.Attributes(attributes);
        return c;
    }

    var ns = this;

    this.Id = function()
    {
        return "opencl_sdk_prerequisite";
    }
    
    var isUpdateInstalled = function (updateId)
    {
        var result = WMI.Query("Select HotFixId From Win32_QuickFixEngineering Where HotFixId='" + updateId + "'");
        if (result && result[0])
        {
            Log("HotFix '" + updateId + "' is installed");
            return true;
        }
        else
        {
            Log("HotFix '" + updateId + "' is NOT installed");
            return false;        
        }
    }; 
    
    var isGPUDriverNotInstalled = function()
    {
        var openclreg = Registry("HKLM", "SOFTWARE\\Intel\\OpenCL");
        var openclreg64 = Registry("HKLM", "SOFTWARE\\Intel\\OpenCL");
        openclreg.WowRedirect(false);
        if(!(openclreg.Exists() && openclreg.Value("cpu_version") ||
            openclreg64.Exists() && openclreg64.Value("cpu_version")))
            return true;
    }

    var isGFXDriverInstalled = function()
    {
        let gfx_ver_reg = Registry("HKLM", "SOFTWARE\\Intel\\GFX");
        gfx_ver_reg.WowRedirect(true);
        if(gfx_ver_reg.Exists() && gfx_ver_reg.Value("Version") != null)
            return true;

        let gfx_reg = Registry("HKLM", "SYSTEM\\CurrentControlSet\\Services\\igfx\\Enum");
        if(gfx_reg.Exists() && gfx_reg.Value("0") != null)
            return true;
    }
    
    var ComponentByAlias = function(product, id)
    {
        return product.FilterComponentsRecursive(function(cmp){if(cmp.Info().Property("alias") == id) return cmp;});
    }

    var FeatureById = function(product, id)
    {
        return product.FilterFeaturesRecursive(function(ftr){ if(ftr.Id() == id) return ftr;});
    }

    this.CheckStage_First = function(collector, product)
    {

    }
    
    this.CheckStage_Second = function(collector, product)
    {
    }
    
    this.Check = function(collector, product)
    {
        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }
       
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Install and modify modes
                ///////////////////////////////////////////////////////////
                // Check for UCRT 
                var os_info = System.WindowsInfo();
                //Operation system: OS < Win 10
                if (os_info.major < 10)
                {
                    //https://support.microsoft.com/en-us/kb/2999226
                    if(!isUpdateInstalled("KB2999226"))
                        collector.CriticalExt(StringList.Format("[update_kb2999226_title]"), StringList.Format("[update_kb2999226_message]"));
                }
                
                //Check for upgrade
                if(product.Upgrade().NewerExists())
                    collector.FatalExt(StringList.Format("[newer_installed_title]"), StringList.Format("[newer_installed_description]"));

                var opencl_cmp_ref = ComponentByAlias(product, "F_OpenCL_PCB");
                if(isGPUDriverNotInstalled() && opencl_cmp_ref &&
                        opencl_cmp_ref.Action() == opencl_cmp_ref.action_t.install)
                        collector.WarningExt(StringList.Format("[no_cpu_runtime_warning_title]"), StringList.Format("[no_cpu_runtime_warning_msg]"));

                if(isGFXDriverInstalled())
                {
                    collector.WarningExt(StringList.Format("[gfx_installed_warning_title]"), StringList.Format("[gfx_installed_warning_msg]"));
                    var opencl_cpu_runtime_ftr = FeatureById(product, "opencl_cpu_runtime_ftr");
                    if(opencl_cpu_runtime_ftr)
                    {
                        opencl_cpu_runtime_ftr.Disabled(PForInstall(true, { "Type" : opencl_cpu_runtime_ftr.disabled_type_t.prerequisite}));
                        opencl_cpu_runtime_ftr.ErrorDescription(StringList.Format("[gfx_installed_warning_msg]"));
                    }
                }

                //check if newer OpenCL runtime installed
                var opencl_runtime_cmp_ref = ComponentByAlias(product, "opencl_cpu_runtime_cmp");
                if(opencl_runtime_cmp_ref && opencl_runtime_cmp_ref.Upgrade().NewerExists())
                {
                    collector.WarningExt(StringList.Format("[newer_runtime_installed_warning_title]"), StringList.Format("[newer_runtime_installed_warning_msg]"));
                    var opencl_cpu_runtime_ftr = FeatureById(product, "opencl_cpu_runtime_ftr");
                    if(opencl_cpu_runtime_ftr)
                    {
                        opencl_cpu_runtime_ftr.Disabled(PForInstall(true));
                        opencl_cpu_runtime_ftr.ErrorDescription(StringList.Format("[newer_runtime_installed_warning_msg]"));
                    }
                }

                break;
            case product.install_mode_t.repair:
                ///////////////////////////////////////////////////////////
                //Repair mode
                break;
            case product.install_mode_t.remove:
                ///////////////////////////////////////////////////////////
                //Remove mode
                ///////////////////////////////////////////////////////////
                break;
        }
    }
}
