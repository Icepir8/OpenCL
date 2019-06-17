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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns_installer = load("installer.js");
    var ns_base_cmp  = load("component3.js");
    var ns_prc       = load("component_processor_exe.js");
    var ns_ver       = load("version.js");

    var ns = this;
    //###############################################################
    // ComponentEXE constructor
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

        // check if installed another version of component
        if(cln.State() == cln.state_t.absent) // assuming that only one instance of component installed
        {
            var proc = cln.Processor();
            if(proc && proc.ActualVersion)
            {
                var actual = proc.ActualVersion();
                if(actual)
                { // ok, creating one more component
                    Log("Found another version of component: " + actual);
                    var info = r_info.Copy();
                    info.Property("id", Guid());
                    info.Property("version", actual);
                    args.Info = info;
                    delete args.Processor;
                    var dup = ns.Component(args);

                    var grp = "AutoUpgradeExeGrp_" + Guid();
                    dup.AddToGroup(grp);
                    cln.Upgrade().Group(grp);
                }
            }
        }

        return cln;
    }
    //###############################################################
    //
    //###############################################################
    this.Component = function(_in)
    {
        Log("Creating exe component");
        if(!_in.Processor)
            _in.Processor = ns_prc.ProcessorExe();

        var cmp = ns_base_cmp.Component(_in);

        cmp.Log = log_helper("ComponentEXE id = " + cmp.Id() + ": ");

        cmp.Type("exe_component");

        return cmp;
    }
} // ComponentEXE
