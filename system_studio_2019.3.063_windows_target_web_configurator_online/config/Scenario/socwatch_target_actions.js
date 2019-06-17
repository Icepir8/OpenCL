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

new function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var ns_inst = Namespace("Root.installer");

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::socwatch_target_actions: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        ns.ComponentByAlias = function (product, alias)
        {
            return product.FilterComponentsRecursive(function (cmp) { return cmp.Info().Property("alias") == alias ? true : false; });
        }
        var add_socwatch_action = function(dmp, mode, msi_rel_path, msi_product_code)
        {
            var prg = Progress();
            prg.total = -1;
            if(mode == "install")
                prg.message = StringList.Format("Processing Intel(R) SoC Watch target installation");
            else
                prg.message = StringList.Format("Processing Intel(R) SoC Watch target uninstallation");

            var install_dir = cmp_socwatch.InstallDir();
            //compose full path to MSI
            var msi_path = FileSystem.MakePath(msi_rel_path, install_dir);
            var msi_code = msi_product_code;
            var install_params = "INSTALLDIR=\"" + install_dir + "\\SoCWatch\"";
            var remove_params = "REBOOT=ReallySuppress";
            var dunit_msi = null;
            if(mode == "install")
            {
                dunit_msi = DumperAction.MSI(
                    { Path: msi_path,
                      ProductCode: msi_code,
                      Parameters: install_params,
                      RollbackParameters: remove_params,
                      EvaluateSignature: true,
                      Install: true
                    });
            }
            else
            {
                dunit_msi = DumperAction.MSI(
                    {  Path: msi_path,
                       ProductCode: msi_code,
                       Parameters: remove_params,
                       Remove: true });
            }

            var exe = {};

            exe.Apply = function()
            {
                //check that it exists
                if(!FileSystem.Exists(msi_path))
                {
                    Log("SoCWatch target doesn't exist here: " + msi_path + " Skipping.");
                    return Action.r_ok;
                }
                return dunit_msi.Apply();
            }

            exe.Rollback = function()
            {
                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            if(dmp && dmp.IsDumper)
            {
                var a = dmp.AddAction(exe, "SoC Watch target");
                a.Attribute("countable", true);
                a.Attribute("name", "Intel(R) SoC Watch target");
            }
        }

        //get socwatch from component list
        var cmp_socwatch = ns.ComponentByAlias(prod, "STUDIO_SOCWATCH_TARGET_CMP");
        if(cmp_socwatch)
        {
            //add socwatch dumper into the install sequence
            ns_inst.Installer.Apply.SubscribeOnEnd(function()
            {
                if(prod.InstallMode() == prod.install_mode_t.repair) //don't do anything in repair
                    return;

                //get path to target MSI. it is relative from <installdir>
                var socwatch_msi_location = cmp_socwatch.Info().Property("target_msi");
                //get product code
                var socwatch_msi_product_code = cmp_socwatch.Info().Property("target_upgrade_code");
                //get socwatch MSI action
                var socwatch_action = cmp_socwatch.Action();
                if(socwatch_action == cmp_socwatch.action_t.install)
                {
                    //if socwatch is going to be installed, install target too
                    add_socwatch_action(ns_inst.Installer.IDumper.PostAction(), "install", socwatch_msi_location, socwatch_msi_product_code);
                    Log("add_socwatch_install to IDumper.PreAction");
                }
                else if(socwatch_action == cmp_socwatch.action_t.remove)
                {
                    //if socwatch is going to be removed, do the same with target
                    add_socwatch_action(ns_inst.Installer.UDumper.PreAction(), "remove", socwatch_msi_location, socwatch_msi_product_code);
                    Log("add_socwatch_remove UDumper.PreAction");
                }
            });
        }
        else
        {
            Log("Scenario::socwatch_target_actions: socwatch not found");
        }

        Log("Scenario::socwatch_target_actions: actions generation completed");
        return ns;
    }
}
