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

    var ns_base_cmp  = load("component3.js");
    var ns_registry  = load("dumper_registry.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");
    var ns_prc       = load("component_processor.js");

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

        var cmp = ns_installer.Installer.Components[r_info.Id()];

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
    //
    //###############################################################
    this.Component = function(_in)
    {
        var cmp = ns_base_cmp.Component(_in);

        cmp.Log = log_helper("ComponentARP id = " + cmp.Id() + ": ");

        cmp.Type("arp_component");

        var guid = _in.ARPId ? _in.ARPId : cmp.Id();

        var install_type = cmp.install_scope_t.per_machine;

        if(cmp.BelongToEnum(_in.InstallType, cmp.install_scope_t))
        {
            install_type = _in.InstallType;
        }
        else
        {
            if(System.IsAdmin())
            {
                install_type = cmp.install_scope_t.per_machine;
            }
            else
            {
                install_type = cmp.install_scope_t.per_user;
            }
        }

        var root  = (install_type == cmp.install_scope_t.per_user) ? "HKCU" : "HKLM";
        var key   = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\" + guid;

        cmp.CreateArp = P(true);
        cmp.CreateArp.Transform = function(v){ return (v ? true : false); };
        //###############################################################
        // define StateManager
        //###############################################################
        var st = Registry.Key(root, key).Exists() ? cmp.state_t.installed : cmp.state_t.absent;
        var stmng =
        {
            Refresh : function(){ st = Registry.Key(root, key).Exists() ? cmp.state_t.installed : cmp.state_t.absent; return cmp;},
            State : function(){ return st; }
        };

        cmp.StateManager(stmng);

        cmp.InstalledProperties = ConstP(ns_prop_set.PropertySet());
        if (Registry.Key(root, key).Exists())
        {
            cmp.InstalledProperties().Value("DisplayIcon", Registry.Key(root, key).Value("DisplayIcon"));
            cmp.InstalledProperties().Value("DisplayName", Registry.Key(root, key).Value("DisplayName"));
            cmp.InstalledProperties().Value("DisplayVersion", Registry.Key(root, key).Value("DisplayVersion"));
            cmp.InstalledProperties().Value("EstimatedSize", Registry.Key(root, key).Value("EstimatedSize"));
            cmp.InstalledProperties().Value("InstallLocation", Registry.Key(root, key).Value("InstallLocation"));
            cmp.InstalledProperties().Value("Language", Registry.Key(root, key).Value("Language"));
            cmp.InstalledProperties().Value("Publisher", Registry.Key(root, key).Value("Publisher"));
            cmp.InstalledProperties().Value("UninstallString", Registry.Key(root, key).Value("UninstallString"));
            cmp.InstalledProperties().Value("Version", Registry.Key(root, key).Value("Version"));
            cmp.InstalledProperties().Value("VersionMinor", Registry.Key(root, key).Value("VersionMinor"));
            cmp.InstalledProperties().Value("VersionMajor", Registry.Key(root, key).Value("VersionMajor"));
            cmp.InstalledProperties().Value("HelpLink", Registry.Key(root, key).Value("HelpLink"));
            cmp.InstalledProperties().Value("URLInfoAbout", Registry.Key(root, key).Value("URLInfoAbout"));
            cmp.InstalledProperties().Value("URLUpdateInfo", Registry.Key(root, key).Value("URLUpdateInfo"));
            cmp.InstalledProperties().Value("InstallSource", Registry.Key(root, key).Value("InstallSource"));
            cmp.InstalledProperties().Value("ModifyPath", Registry.Key(root, key).Value("ModifyPath"));
        }
        
        //###############################################################
        // define ARP properties
        //###############################################################
        cmp.Properties = ConstP(ns_prop_set.PropertySet());

        cmp.Properties().Value("DisplayIcon", "");
        cmp.Properties().Value("DisplayName", "");
        cmp.Properties().Value("DisplayVersion", "");
        cmp.Properties().Value("EstimatedSize", 0);
        cmp.Properties().Value("InstallLocation", "");
        cmp.Properties().Value("Language", 1033);
        cmp.Properties().Value("Publisher", "");
        cmp.Properties().Value("UninstallString", "");
        cmp.Properties().Value("Version", 0);
        cmp.Properties().Value("VersionMinor", 0);
        cmp.Properties().Value("VersionMajor", 0);
        cmp.Properties().Value("HelpLink", "");
        cmp.Properties().Value("URLInfoAbout","");
        cmp.Properties().Value("URLUpdateInfo","");
        cmp.Properties().Value("InstallSource", FileSystem.exe_dir);
        cmp.Properties().Value("ModifyPath", "");

        //###############################################################
        cmp.DisplayName = function()
        {
            if(arguments.length > 0)
            {
                cmp.Properties().Value("DisplayName", arguments[0]);
            }

            return cmp.Properties().Value("DisplayName");
        }
        cmp.DisplayVersion = function()
        {
            if(arguments.length > 0)
            {
                cmp.Properties().Value("DisplayVersion", arguments[0]);
            }

            return cmp.Properties().Value("DisplayVersion");
        }

        cmp.UninstallString = function()
        {
            if(arguments.length > 0)
            {
                cmp.Properties().Value("UninstallString", arguments[0]);
            }

            return cmp.Properties().Value("UninstallString");
        }

        cmp.ModifyPath = function()
        {
            if(arguments.length > 0)
            {
                cmp.Properties().Value("ModifyPath", arguments[0]);
            }

            return cmp.Properties().Value("ModifyPath");
        }

        cmp.InstallDir.Subscribe(function(dir){ cmp.Properties().Value("InstallLocation", cmp.InstallDir()); });

        //###############################################################
        // Assign Processor
        //###############################################################
        var prc = ns_prc.Processor();

        prc.RemoveAct = function (_cmp)
        {
            prc.Owner().Log("ARP processor: getting RemoveAct");

            var reg = ns_registry.CreateAction();
            reg.DeleteKey(root, key);
            reg.hidden = true;

            return reg;
        }

        prc.InstallAct = function (_cmp)
        {
            prc.Owner().Log("ARP processor: getting InstallAct");

            var reg = ns_registry.CreateAction();
            reg.CreateKey(root, key);
            reg.hidden = true;

            prc.Owner().Properties().Filter(function(p, v)
            {
                reg.SetValue(root, key, p, v);
                return false;
            });

            return reg;
        }

        cmp.Processor(prc);
        //###############################################################
        var orig_ti = cmp.Configurator.TestInstall
        cmp.Configurator.TestInstall = function(){ return (orig_ti() ? cmp.CreateArp() : false); }

        //###############################################################
        // RestorePoint method definition
        //###############################################################
        var orig_rp = cmp.RestorePoint;
        cmp.RestorePoint = function (_st)
        {
            var rp = _st ? _st : Storage("*");

            rp("guid").value = guid;
            rp("root").value = root;
            rp("key").value = key;

            orig_rp(rp);

            return rp;
        }

        return cmp;
    }
    /*
    //###############################################################
    // RestorePoint method definition
    //###############################################################
    this.ComponentARP.prototype.RestorePoint = function (st)
    {
        var rp = st ? st : Storage("*");

        rp("guid").value = this.guid;
        rp("root").value = this.root;
        rp("key").value = this.key;

        ns.ComponentARP.superclass.RestorePoint.call(this, rp);

        return rp;
    }
    */
}// namespace Root.component.arp

