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

    var from_config = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + ".."));};
    
    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");
    var ns_java = from_config("java.js");
    var ns_ecl_inf = base("eclipse_info.js");
    var ns_ver     = base("version.js");
    
    var ecl_int_timeout = 15 * 60 * 1000;
    
    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "scenario:base:iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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

    //###############################################################
    // scenario adjustment
    //###############################################################
    this.Scenario = function(acts)
    {
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::Scenario required input parameter acts is undefined");
            return null;
        }

        Log("Scenario::check_ipc_reg_actions: adding action into sequence");
        var scenario = this;
        Log("Scenario::check_ipc_reg_actions: add after install");
        var online_install =  acts.sub_Installer;
        var online_mntnc = acts.sub_Maintenance;
        online_install.AddAfter(acts.Install, acts.CheckExiIPCRegistration);
        online_mntnc.AddAfter(acts.Install, acts.CheckExiIPCRegistration);
        Log("Scenario::check_ipc_reg_actions: adding action into sequence done");
    }

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::check_ipc_reg_actions: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        ns.ComponentByAlias = function(product, alias)
        {
            return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
        }

        var check_exdiIPC_registration = function()
        {
            var reg_file = Registry("HKCR", "AppID\\{B1FC304E-1DD7-4E3D-AE85-FEC9673D5734}");
            reg_file.WowRedirect(false);
            if(reg_file.Exists())
            {
                Log("exdiipc.dll was registered");
            }
            else
            {
                Log("exdiipc.dll was not registered");
                GlobalErrors.Add("[exdiipc_dll_was_not_registered]");
            }
        }

        ns.CheckExiIPCRegistration = function()
        {
            Log("Checking ExiIPC.dll registration");
            var install_mode = prod.InstallMode();
            var win_dbg_cmp = ns.ComponentByAlias(prod, "win_dbg");
            if(win_dbg_cmp && win_dbg_cmp.Action() == win_dbg_cmp.action_t.install && install_mode != prod.install_mode_t.remove)
            {
                check_exdiIPC_registration();
            }
        }

        Log("Scenario::check_ipc_reg_actions: actions generation completed");
        return ns;
    }
}

