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

//Namespace("Root.component.arp", function()
new function()
{
    //###############################################################
    //###############################################################
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_installer = load("installer.js");

    var ns_base_cmp  = load("db_info_component.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");

    function P(val){return ns_prop.Property(val);}
    function ConstP(val){return ns_prop.Constant(val);}

    var ns = this;
    //###############################################################
    // Component constructor
    // input hash object has following fields:
    //  Mandatory:
    //      Info
    //  Optional:
    //      Source
    //      Processor
    //      StateManager
    //      ARPId
    //      InstallType -  val from enum install_scope_t
    //      ExInit - callback which is called for created component for additional initialization
    //               as ExInit.call(component);
    //###############################################################
    this.Create = function (_in)
    {
        if(!_in)
        {
            return null;
        }

        if(!_in.Info)
        {
            return null;
        }

        var r_info = _in.Info.GetInfo();
        if(!r_info || !r_info.Id || !r_info.Id())
        {
            Log(Log.l_error, "Attempt to create component with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var cmp = ns_installer.Installer.DBInfo.Components[r_info.Id()];

        var args = {};

        for(var i in _in)
        {
            args[i] = _in[i];
        }

        args.Info = r_info;

        if (!cmp)
        {
            cmp = ns.Component(args);

            if(!cmp)
            {
                return null;
            }
        }

        var cln = cmp.Clone();

        //if(_in.ExInit)
        //    _in.ExInit.call(cln);

        return cln;
    }
    //###############################################################
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    //###############################################################
    var GetStorageChildsExtractor = function(rp)
    {
        var res = {};
        var func = function(name){ return res[name]; }

        if(!rp)
            return func;

        if(typeof(rp.GetChildsAsStringFromPath) != "function")
        {
            func = function(name){ return rp(name).value; }
        }

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            childs_string = String(rp.childs_as_string);
        }

        filter(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                res[arr[0]] = (arr.length > 1) ? arr[1] : null;
        });

        return func;
    }

    //###############################################################
    // function to restore component members from RP
    //###############################################################
    var LoadFromRP = function(cmp, rp)
    {
        cmp.Log("Load From RP");
        //Log(JSON.stringify(rp, null, "  "));
        if(!rp)
        {
            cmp.Log("Restore Point isn't defined;");
            return;
        }

        var childs = GetStorageChildsExtractor(rp);

        cmp.guid = childs("guid");
        cmp.root = childs("root");
        cmp.key  = childs("key");
    }
    //###############################################################
    //
    //###############################################################
    this.Component = function(_in)
    {
        var cmp = ns_base_cmp.Component(_in);

        cmp.Log = log_helper("ComponentARP id = " + cmp.Id() + ": ");

        cmp.Type("arp_component");

        LoadFromRP(cmp, cmp.RestorePointObj());

        //###############################################################
        // define StateManager
        //###############################################################
        var regKey = Registry.Key(cmp.root, cmp.key);
        var st = regKey.Exists() ? cmp.state_t.installed : cmp.state_t.absent;
        var stmng =
        {
            Refresh : function(){ st = regKey.Exists() ? cmp.state_t.installed : cmp.state_t.absent; return cmp;},
            State : function(){ return st; }
        };

        cmp.StateManager(stmng);

        cmp.InstalledProperties = ConstP(ns_prop_set.PropertySet());
        if(regKey.Exists())
        {
            cmp.InstalledProperties().Value("DisplayIcon", regKey.Value("DisplayIcon"));
            cmp.InstalledProperties().Value("DisplayName", regKey.Value("DisplayName"));
            cmp.InstalledProperties().Value("DisplayVersion", regKey.Value("DisplayVersion"));
            cmp.InstalledProperties().Value("EstimatedSize", regKey.Value("EstimatedSize"));
            cmp.InstalledProperties().Value("InstallLocation", regKey.Value("InstallLocation"));
            cmp.InstalledProperties().Value("Language", regKey.Value("Language"));
            cmp.InstalledProperties().Value("Publisher", regKey.Value("Publisher"));
            cmp.InstalledProperties().Value("UninstallString", regKey.Value("UninstallString"));
            cmp.InstalledProperties().Value("Version", regKey.Value("Version"));
            cmp.InstalledProperties().Value("VersionMinor", regKey.Value("VersionMinor"));
            cmp.InstalledProperties().Value("VersionMajor", regKey.Value("VersionMajor"));
            cmp.InstalledProperties().Value("HelpLink", regKey.Value("HelpLink"));
            cmp.InstalledProperties().Value("URLInfoAbout", regKey.Value("URLInfoAbout"));
            cmp.InstalledProperties().Value("URLUpdateInfo", regKey.Value("URLUpdateInfo"));
            cmp.InstalledProperties().Value("InstallSource", regKey.Value("InstallSource"));
            cmp.InstalledProperties().Value("ModifyPath", regKey.Value("ModifyPath"));
        }

        //###############################################################
        // define ARP properties
        //###############################################################
        cmp.Properties = ConstP(ns_prop_set.PropertySet()); // left it to prevent any error in case of someone try to call it
        //###############################################################
        cmp.DisplayName = function()
        {
            return cmp.InstalledProperties().Value("DisplayName");
        }
        cmp.DisplayVersion = function()
        {
            return cmp.InstalledProperties().Value("DisplayVersion");
        }

        cmp.UninstallString = function()
        {
            return cmp.InstalledProperties().Value("UninstallString");
        }
       
        cmp.ModifyPath = function()
        {
            return cmp.InstalledProperties().Value("ModifyPath");
        }

        return cmp;
    }
}