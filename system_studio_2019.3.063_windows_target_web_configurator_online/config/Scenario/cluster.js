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

var fm = StringList.Format;

var ns_inst = Namespace("Root.installer");

var parseBoolean = function(string)
{
    if(typeof(string) == "undefined")
        return false;
    switch (String(string).toLowerCase())
    {
        case "false":
        case "0":
        case "no":
        case "n":
        case "":
            return false;
        default:
            return true;
    }
}

var isNull = function(string)
{
    if(typeof(string) == "undefined")
        return "undefined";
    if(string == null)
        return "null";
    return string;
}

var cluster_detected = false;

this.Actions = function(prod)
{
    if(!prod)
    {
        Log(Log.l_critical, "Actions::Actions required input parameter prod is undefined ");
        return;
    }
    if(!parseBoolean(prod.Info().Property("has_cluster_install")))
    {
        Log("Actions: has_cluster_install property is not set");
        return;
    }

    var ns = this;
    var cluster_progress = Progress();
    cluster_progress.total = -1;
    cluster_progress.message = StringList.Format("Cluster processing.");
    var installed_on_cluster = false;

    Log("Scenario::cluster_install: actions generation started");

    ns.get_optin = function()
    {
        var data_send_opt = "no";
        if(Ism)
        {
            if(Ism.OptInAvailable() && Ism.OptInIsAccepted() || Wizard.Notify("ISM agree","is checked") ||
            GetOpt.Get("intel_sw_improvement_program_consent") == "yes")
            {
                Log("cluster_install: optin accepted.");
                data_send_opt = "yes";
            }
            else
            {
                Log("cluster_install: optin declined.");
                data_send_opt = "no";
            }
        }
        return data_send_opt;
    }

    ns.get_aliases = function(pred)
    {
        var comps = prod.ComponentsFullSet();
        var i, components_list = "";

        for(i in comps)
        {
            if(pred(comps[i]))
                components_list += comps[i].Info().Property("alias") + ",";
        }
        if(components_list.length > 0)
            components_list = components_list.substring(0, components_list.length-1);
        return components_list;
    }

    ns.get_install_aliases = function()
    {
        return ns.get_aliases(function(comp){ return (comp.Action() == comp.action_t.install); });
    }

    ns.get_modify_aliases = function()
    {
        return ns.get_aliases(function(comp){ return (comp.Action() == comp.action_t.install ||
            (comp.Action() == comp.action_t.none && comp.State() == comp.state_t.installed));});
    }

    ns.get_activation_opts = function()
    {
        //since we don't have evaluation, we don't have cmd option
        return " ";
    }

    ns.get_activation_files = function()
    {
        if(!ns.ActivationManager)
            return "";
        return ns.ActivationManager.Manager.file;
    }

    ns.process_command_result = function(res)
    {
        Log("cluster_install: exit code: " + res.exitcode);
        if(res.exitcode != 0)
            Log(res.output);
        return res.exitcode;
    }

    ns.install_on_cluster = function()
    {
        Log("cluster_install: start cluster installation.");
        var cmd_line = " install --output=\\\"%TEMP%\\distributed_install.log\\\" --eula=accept --no-progress --force-certificate --update=always --components=\\\"" +
        ns.get_install_aliases() + "\\\"  --intel_sw_improvement_program_consent=\\\"" + ns.get_optin() + "\\\" " + ns.get_activation_opts() +
        " --installdir=\\\"" + prod.InstallDir.Base() + " \\\" ";
        cluster_progress.message = StringList.Format("Installing product on cluster nodes.");
        Wizard.Notify("Progress1", "connect", cluster_progress.id);
        var res = CreateProcess(null, Origin.Directory() + "..\\Cluster\\cluster_install.exe install \"" + ns.get_activation_files() +
            "\" \"" + FileSystem.AbsPath(Origin.Directory() + "..\\..\\") + "\" \"" + cmd_line + "\"", true);
        if (ns.process_command_result(res))
            GlobalErrors.Add(StringList.Format("[cluster_install_failed]"));
    }

    ns.modify_on_cluster = function()
    {
        Log("cluster_install: start cluster modify.");
        cluster_progress.message = StringList.Format("Modifying product on cluster nodes.");
        Wizard.Notify("Progress1", "connect", cluster_progress.id);
        var cmd_line = " modify --output=\\\"%TEMP%\\distributed_modify.log\\\" --eula=accept --no-progress --force-certificate --components=\\\"" +
        ns.get_modify_aliases() + "\\\"  --intel_sw_improvement_program_consent=\\\"" + ns.get_optin() + "\\\" " + ns.get_activation_opts() +
        " --installdir=\\\"" + prod.InstallDir.Base() + " \\\" ";
        var res = CreateProcess(null, Origin.Directory() + "..\\Cluster\\cluster_install.exe install \"" + ns.get_activation_files() +
            "\" \"" + FileSystem.AbsPath(Origin.Directory() + "..\\..\\") + "\" \"" + cmd_line + "\"", true);
        if (ns.process_command_result(res))
            GlobalErrors.Add(StringList.Format("[cluster_modify_failed]"));
    }

    ns.repair_on_cluster = function()
    {
        Log("cluster_install: start cluster repair.");
        cluster_progress.message = StringList.Format("Repairing product on cluster nodes.");
        Wizard.Notify("Progress1", "connect", cluster_progress.id);
        var cmd_line = " repair --output=\\\"%TEMP%\\distributed_repair.log\\\" ";
        var res = CreateProcess(null, Origin.Directory() + "..\\Cluster\\cluster_install.exe repair \"" +
            FileSystem.AbsPath(Origin.Directory() + "..\\..\\") + "\" \"" + cmd_line + "\"", true);
        if (ns.process_command_result(res))
            GlobalErrors.Add(StringList.Format("[cluster_repair_failed]"));
    }

    ns.uninstall_on_cluster = function()
    {
        Log("cluster_install: start cluster uninstall.");
        cluster_progress.message = StringList.Format("Removing product from cluster nodes.");
        Wizard.Notify("Progress1", "connect", cluster_progress.id);
        var cmd_line = prod.UninstallExe() + " remove --output=\\\"%TEMP%\\distributed_remove.log\\\" " + prod.UninstallParams();
        var res = CreateProcess(null, Origin.Directory() + "..\\Cluster\\cluster_install.exe remove \"" + cmd_line + "\"", true);
        ns.process_command_result(res);
    }

    ns.ClusterAction = {};

    ns.cluster_install_allowed = function()
    {
        if (ns_inst.Installer.Silent())
            return (!parseBoolean(prod.Info().Property("cluster_install")) ||
            !cluster_detected);
            
        return (!parseBoolean(prod.Info().Property("cluster_install")) || !ns.ConfigurationDialog.Cluster.IsClusterInstallSelected() ||
            !cluster_detected);
    }

    ns.ClusterAction.Apply = function()
    {
        var cmd_line = "";
        switch(prod.InstallMode())
        {
            case prod.install_mode_t.install:
                if(ns.cluster_install_allowed())
                    break;
                ns.install_on_cluster();
                installed_on_cluster = true;
                break;
            case prod.install_mode_t.modify:
                if(ns.cluster_install_allowed())
                    break;
                ns.modify_on_cluster();
                break;
            case prod.install_mode_t.repair:
                ns.repair_on_cluster();
                break;
            case prod.install_mode_t.remove:
                ns.uninstall_on_cluster();
                break;
        }
        return Action.r_ok;
    }

    ns.ClusterAction.ProgressApply = function() { return cluster_progress; }

    ns.ClusterAction.Rollback = function()
    {
        var cmd_line = "";
        Log("cluster_install: rollback invoked.");
        if(installed_on_cluster)
        {
            Log("cluster_install: run rollback uninstall.");
            ns.uninstall_on_cluster();
        }
        else
            Log("cluster_install: product is not installed on cluster, skip rollback.");

        return Action.r_ok;
    }
}

this.Scenario = function(acts)
{
    if(!acts)
    {
        Log(Log.l_critical, "Scenario::Scenario required input parameter acts is undefined ");
        return null;
    }

    var scenario = this;
    var prod = scenario.Product();

    if(!parseBoolean(prod.Info().Property("has_cluster_install")))
    {
        Log("Scenario: has_cluster_install property is not set");
        return null;
    }
    Log("cluster_install: cluster scenario");

    cluster_detected = acts.ConfigurationDialog.Cluster.IsClusterDetected();

    if(cluster_detected)
    {
        Log("cluster_install: cluster detected");
        //the script must be reviewered
        //a part of it must be moved in Init 

        ns_inst.Installer.IDumper.PostAction().AddAction(acts.ClusterAction);
    }
}
}
