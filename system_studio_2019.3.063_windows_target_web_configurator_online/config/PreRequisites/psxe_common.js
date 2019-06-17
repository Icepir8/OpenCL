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
    
	var ns_prop = base("property.js");
	var ns_inst = Namespace("Root.installer");
    var ns = this;

    this.Id = function () {
        return "PSXE 2019, common prerequisites";
    }

	var PForInstall = function(val, attributes)
	{
		if (typeof(ns_prop.CollectorByAnd) == "undefined")
			return ns_prop.Property(val, attributes);
			
		var ca = ns_prop.CollectorByAnd();
		ca(ns_inst.Installer.NotDownload);
                ca(val);
                ca.Attributes(attributes);
		return ca;
	}

	
    //disable components
    this.DisableComponents = function (product) {
        var ns_psxe = load("PreRequisites/Logic/psxe.js")
        var cmps = product.ComponentsFullSet();
        for (var i in cmps) {
            var alias = cmps[i].Info().Property("alias");
            if (typeof (alias) != "undefined" && alias != null) {
                var state = ns_psxe.ValidateComponentPreRequisites(product, alias);
                if (state != ns_psxe.pre_requesites_state_t.ignore) {
                    if (state == ns_psxe.pre_requesites_state_t.enabled)
                        cmps[i].Disabled(PForInstall(false));
                    else if (state == ns_psxe.pre_requesites_state_t.disabled)
                        cmps[i].Disabled(PForInstall(true, { "Type": cmps[i].disabled_type_t.prerequisite }));
                    Log(" Pre-Requisites for component: " + alias + " ; State: " + state);
                }
            }
        }
    }

    this.CheckStage_First = function (collector, product) {
        Log(ns.Id() + " 'First' generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_psxe = load("PreRequisites/Logic/psxe.js")

        var product_name = product.Info().Property("title");

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                ///////////////////////////////////////////////////////////

                //disable components
                ns.DisableComponents(product);

                // -------> Fatal Section <--------

                //unsupporter Processor. Requares P4 with SSE2
                var cpu_check_dll = FileSystem.MakePath("cpu_check.dll", Origin.Directory() + "../../plugins");
                var CPUCheck_Min_P4 = CallDll(cpu_check_dll, "CPUCheck_Min_P4", false);
                Log("execute CPUCheck_Min_P4 res = " + CPUCheck_Min_P4.result + " failed = " + CPUCheck_Min_P4.failed);

                //if (CPUCheck_Min_P4() > 0)
                if (!CPUCheck_Min_P4.failed && CPUCheck_Min_P4.result > 0)
                    collector.FatalExt(StringList.Format("[not_supported_cpu_title]"), StringList.Format("[not_supported_cpu_description]"));

                // -------> Warning Section <--------

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                ///////////////////////////////////////////////////////////

                //disable components
                ns.DisableComponents(product);

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


        Log(ns.Id() + " 'First' generated successfully");

        return;
    }
}
