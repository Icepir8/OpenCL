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
    var base = function(name) {return required(FileSystem.AbsPath(Origin.Directory() + "../Base", name));}
    var ns_inst     = Namespace("Root.installer");
    var ns_prop     = base("property.js");

    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }

    this.Actions = function(prod)
    {

        var ns = this;
        var internet_not_available = "internet_not_available";

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        ns.CheckInternetComponents = function()
        {

            Log("call component_check_connection...");

            if (!prod.FilterComponentsRecursive(function (cmp) { return cmp.Info().Property("check_connect") == internet_not_available ? true : false; }))
            {
                Log("Not found components with internet property");
                return Action.r_ok;
            }

            var DisableConnectComponents = function()
            {

                prod.FilterComponentsRecursive(function (cmp) 
                {
                    if (cmp.Info().Property("check_connect") == internet_not_available)
                    {
                        Log("Component  disabled, check_connect = internet_not_available");
                        cmp.Disabled(PForInstall(true));
                    }
                    else
                        Log("internet_available");
                })
            }

            var url = prod.Info().Property("internet_check_URL");
            if(!url)
            {
                Log(Log.l_error, "internet_check_URL is undefined ");
                return Action.r_error;
            }

            var current_check_connect = FileSystem.InternetCheckConnection(url);

            Log("current_check_connect on Machine = " + current_check_connect);

            if (current_check_connect)
            {
                Log(" call DisableConnectComponents...");
                DisableConnectComponents();
            }
        
            return Action.r_ok;
        }

        return ns;
    }

    this.Scenario = function(acts)
    {
        Log("Scenario::act_check_connection: scenario generation started");
        if(!acts)
        {
            Log(Log.l_critical, "Scenario::act_check_connection: required input parameter acts is undefined ");
            return null;
        }
        
        //GUI
        acts.sub_GUI.AddAfter(acts.InternetCheckConnection, acts.CheckInternetComponents);

        //Silent installer
        acts.sub_Silent.AddAfter(acts.SInternetCheckConnection, acts.CheckInternetComponents);

        Log("Scenario::act_check_connection: scenario generation completed");
    }
}
