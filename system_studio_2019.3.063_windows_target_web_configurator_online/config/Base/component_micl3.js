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

/*
micl - binaries (+ additional low level config files, like cache.xml & micl.js) copied into target system
*/

new function()
{
    //###############################################################
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_installer = load("installer.js");
    var ns_dump      = load("dumper.js");
    var ns_base_cmp  = load("component3.js");
    var ns_d_file    = load("dumper_file.js");
    var ns_cont      = load("container.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");
    var ns_prc       = load("component_processor.js");

    var ns = this;

    function P(val){return ns_prop.Property(val);}
    function ConstP(val){return ns_prop.Constant(val);}
    function FilterNotEmpty(val)
    {
        if(typeof(val) == "undefined" || val === null)
            return false;

        return true;
    }
    //###############################################################
    // Component MICL constructor
    //###############################################################
    //###############################################################
    // Component constructor
    // input hash object has following fields:
    //  Mandatory:
    //      Info
    //  Optional:
    //      Source
    //      Processor
    //      StateManager
    //      ExInit - callback which is called for created component for additional initialization
    //               as ExInit.call(component);
    //###############################################################
    this.Create = function (_in)
    {
        if(!_in)
            return null;

        if(!_in.Info)
            return null;

        var r_info = _in.Info.GetInfo();
        if(!r_info || !r_info.Id || !r_info.Id())
        {
            Log(Log.l_error, "Attempt to create component with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var cmp = ns_installer.Installer.Components[r_info.Id()];

        var args = {};

        for(var i in _in)
            args[i] = _in[i];

        args.Info = r_info;

        if (!cmp)
        {
            cmp = ns.Component(args);

            if(!cmp)
                return null;
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

        cmp.Log = log_helper("Component MICL id = " + cmp.Id() + ": ");

        cmp.Type("micl_component");

        cmp.TargetDir = P(FileSystem.MakePath(cmp.Id(), Cache.CacheDir()));

        cmp.Log(" target folder = " + cmp.TargetDir());

        //###############################################################
        // define StateManager
        //###############################################################
        var st = FileSystem.Exists(cmp.TargetDir()) ? cmp.state_t.installed : cmp.state_t.absent;
        var stmng =
        {
            Refresh : function(){st = FileSystem.Exists(cmp.TargetDir()) ? cmp.state_t.installed : cmp.state_t.absent;},
            State : function(){ return st; }
        };

        cmp.StateManager(stmng);
        //###############################################################
        // Assign Processor
        //###############################################################
        var prc = ns_prc.Processor();

        prc.RemoveAct = function (_cmp)
        {
            prc.Owner().Log("MICL processor: getting RemoveAct - delayed remove of MICL install dir " + prc.Owner().TargetDir());

            var dir = ns_d_file.Directory();
            dir.DelayedRemove(prc.Owner().TargetDir());
            dir.hidden = true;

            return dir;
        }

        prc.InstallAct = function (_cmp)
        {
            prc.Owner().Log("MICL processor: getting InstallAct");

            var dir = ns_d_file.Directory();
            dir.Create(prc.Owner().TargetDir());

            var file = null;

            _cmp.Binaries().Apply(function(f)
            {
                if(FileSystem.IsDirectory(f))
                {
                    dir.Copy(f, prc.Owner().TargetDir());
                    dir.Upgrade(true);
                }
                else
                {
                    file = file ? file : ns_d_file.File();
                    file.Copy(f, prc.Owner().TargetDir());
                    file.Upgrade(true);
                }

                return true;
            });

            var dmp = ns_dump.Dumper("MICL component " + prc.Owner().Id() + "InstallAct dumper");
            dmp.AddAction(dir, "target dir " + prc.Owner().TargetDir() + " configuring");

            if(file)
                dmp.AddAction(file, "copy_core_installer_files");

            //PSET shall remove Users group Write permission from PSET cache folders
            //Note: only in case of Administrative installation
            if(System.IsAdmin())
            {
                var set_ro_access_act = ns_d_file.CreateSetReadOnlyAccessAct([prc.Owner().TargetDir()], ["S-1-5-32-545"]);
                dmp.AddAction(set_ro_access_act, "Configuring Access Control Lists");
            }

            dmp.hidden = true;

            return dmp;
        }

        cmp.Processor(prc);
        //###############################################################
        var orig_ti = cmp.Configurator().TestInstall;
        cmp.Configurator().TestInstall = function(){ return (orig_ti() ? (cmp.Binaries().Number() ? true : false) : false); }

        //###############################################################
        // Define sources container
        //###############################################################
        cmp.Binaries = ConstP(ns_cont.Container());
        cmp.Binaries().Transform = function(args)
        {
            if(args.length > 0)
                return {id : args[0], obj : args[0]};
        }

        cmp.AddSource = function(source, mask)
        {
            if(!mask)
            { // add single entry
                if(source)
                    cmp.Binaries().Add(source);
            }
            else
            { // add entries by mask
                var files = FileSystem.FindFiles(source, mask);
                for(var i in files)
                    cmp.Binaries().Add(FileSystem.MakePath(files[i], source));
            }
        }

        //###############################################################
        // RestorePoint method definition
        //###############################################################
        var orig_rp = cmp.RestorePointBase;

        cmp.RestorePointBase = function (_st)
        {
            var rp = _st ? _st : Storage("*");

            rp("target_dir").value = cmp.TargetDir();

            orig_rp(rp);

            return rp;
        }

        return cmp;
    }
}// namespace MICL component
