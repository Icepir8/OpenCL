/*
Copyright 2012 - 2019 Intel Corporation All Rights Reserved.

The source code, information and material ("Material") contained herein is owned by Intel Corporation or its suppliers or licensors,
and title to such Material remains with Intel Corporation or its suppliers or licensors. The Material contains proprietary information of Intel
or its suppliers and licensors. The Material is protected by worldwide copyright laws and treaty provisions. No part of the Material
may be used, copied, reproduced, modified, published, uploaded, posted, transmitted, distributed or disclosed in any way without Intel's
prior express written permission. No license under any patent, copyright or other intellectual property rights in the Material is granted
to or conferred upon you, either expressly, by implication, inducement, estoppel or otherwise. Any license under such intellectual property
rights must be express and approved by Intel in writing.
Unless otherwise agreed by Intel in writing, you may not remove or alter this notice or any other notice embedded in Materials by Intel or
Intel’s suppliers or licensors in any way.
*/
new function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
	var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var ns = this;
	var ns_prop = base("property.js");
	var ns_inst = Namespace("Root.installer");

	var PForInstall = function(val, attributes)
	{
		if (typeof(ns_prop.CollectorByAnd) == "undefined")
			return ns_prop.Property(val, attributes);
			
		var ca = ns_prop.CollectorByAnd();
		ca(ns_inst.Installer.NotDownload);
		ca(val, attributes);
		return ca;
	}

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            scn.Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    this.Id = function()
    {
        return "amplxe_sep_prerequisites";
    }

    this.CheckStage_First = function (collector, product) {
        Log(ns.Id() + " 'First' generation begin");

        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var im = product.InstallMode();
        var sepcpucheck = FileSystem.MakePath("../../plugins/sepcpucheck.dll", Origin.Directory());

        if(FileSystem.Exists(sepcpucheck))
        {
            var sep_supported = CallDll(sepcpucheck, "SEP_CPUCheck");
            Log("execute sep_supported res = " + sep_supported.result + " failed = " + sep_supported.failed);
            if(!sep_supported.failed && !sep_supported.result && (im == product.install_mode_t.install || im == product.install_mode_t.modify))
            {
                Log("Need to disable SEP feature, because CPU is not supported");
                iterate(product.FeaturesFullSet(), function(obj)
                {
                    if(obj.Id().match(/sep/i))
                    {
                        Log("Disabling SEP feature " + obj.Name());
                        obj.Disabled(PForInstall(true));
                    }
                });
            }
        }

        Log(ns.Id() + " 'First' generated successfully");
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

        var im = product.InstallMode();
        var sepcpucheck = FileSystem.MakePath("../../plugins/sepcpucheck.dll", Origin.Directory());

        if(FileSystem.Exists(sepcpucheck))
        {
            var sep_supported = CallDll(sepcpucheck, "SEP_CPUCheck");
            Log("execute sep_supported res = " + sep_supported.result + " failed = " + sep_supported.failed);
            if(!sep_supported.failed && !sep_supported.result && (im == product.install_mode_t.install || im == product.install_mode_t.modify))
            {
                if(im == product.install_mode_t.install)
                    collector.WarningExt(StringList.Format("[sep_intel_not_tested_cpu_title]"), StringList.Format("[sep_intel_not_tested_cpu_description]"));
            }
        }

        Log(ns.Id() + " 'Second' generated successfully");
    }
}
