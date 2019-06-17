/*
Copyright (C) 2002-2019, Intel Corporation. All rights reserved.
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

    var ns = this;
    var ns_prop = base("property.js");
    var ns_inst = Namespace("Root.installer");

    this.Id = function()
    {
        return "advi_common_prerequisites";
    }

    this.GetVSName = function (vs_version) {
        return StringList.Format("[vs_name]", vs_version);
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
        var ns_psxe = load("Logic/psxe.js")
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

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");

        var ns_psxe = load("Logic/psxe.js");
        if (!ns_psxe.IsFeatureExistsAndSelectedById(product, "advi_toplevel"))
        {
            Log(ns.Id() + " 'Second' won't be processed due to advi_toplevel is not selected to install");
            return;
        }
        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        Log("advi Product name = " + product.Name());

        var tmp_product = product;
        var original_product = product;

        if(product.Id().indexOf("advi") == -1)
        {
            //incoming product isn't an advi
            // try to find it in incoming product

            Log("product isn't an advi");
            product.FilterFeaturesRecursive(function(ftr)
            {
                if(ftr.Type() == "product" && ftr.Id().indexOf("advi") == 0)
                {
                    tmp_product = ftr;
                    return true;
                }
            });
        }

        product = tmp_product;

        Log("Product name = " + product.Name());

        var im = product.InstallMode();
        var ns_vs = base("vs_processing.js").GetVSInfo();

        var app_is_running = function(image)
        {
            if(!image)
                return false;

            if(!FileSystem.Exists(image))
                return false;

            var p_list = System.ProcessList();
            var running = [];

            image = image.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

            for(var i in p_list)
                {
                var proc = p_list[i];
                if(FileSystem.Exists(proc) && proc.match(image) && running.indexOf(proc) == -1)
                    running.push(proc);
                }

            for(var i in running)
                running[i] = running[i].replace(/\\/g, "\\\\");

            return running;
        }

        var image = StringList.Format("[$ADVISOR_2019_DIR]");
        var running = app_is_running(image);

        var separator = (ns_inst.Installer.Silent()) ? "; " : "\\par\\pard\\li280";
        var description = (ns_inst.Installer.Silent()) ? "[advi_app_running_description_silent]" : "[advi_app_running_description]";

        if(running.length)
            collector.CriticalExt(StringList.Format("[advi_app_running_title]"),
                                  StringList.Format(description,
                                  running.join(separator)));

        if(original_product.InstallMode() == product.install_mode_t.install)
        {
            var installed = false;

            Log("check older or newer");
            product.Upgrade().FilterEntires(function (entry)
            {
                Log("entry.Name() = " + entry.Name() + " targs = " + entry.Targets().length);
                if(entry.Targets().length && entry.Type() != entry.upgrade_type_t.optional)
                {
                    Log("Entry type: " + entry.Name() + " " +  entry.Type());
                    var targets = entry.Targets();
                    for(var i in targets)
                    {
                        Log("target name = " + targets[i].Object().Name() + " type = " + targets[i].Object().Type());
                        targets[i].Action(product.action_t.remove);
                        if(!installed)
                            installed = targets[i].Object().State() == targets[i].Object().state_t.installed;
                    }
                }
            });

            if(installed)
            {
                var toplevel_feature;
                var feature_set = product.FeaturesFullSet();
                for(var key in feature_set)
                {
                    var current_feature = feature_set[key];
                    if (current_feature.Id().match(/advi_toplevel/i))
                    {
                        toplevel_feature = current_feature;
                    }
                }

                if(toplevel_feature && toplevel_feature.Upgrade().OlderExists())
                    collector.WarningExt(StringList.Format("[advi_older_installed_title]"),
                                         StringList.Format("[advi_older_installed_description]"));

                else if(toplevel_feature && toplevel_feature.Upgrade().NewerExists())
                    collector.WarningExt(StringList.Format("[advi_newer_installed_title]"),
                                         StringList.Format("[advi_newer_installed_description]"));
            }
        }

        // Adjust optional removal data
        optional_removal_data = Wizard.OnNotify("optional_removal_dlg/optional_removal_data", "get data");
        Wizard.Notify("optional_removal_dlg/optional_removal_data", "set data", optional_removal_data);


        //by install mode
        switch (im) {
            case product.install_mode_t.install:
            case product.install_mode_t.modify:
                //disable components
                ns.DisableComponents(product);            
                break;
        }

        Log(ns.Id() + " 'Second' generated successfully");
    }
}
