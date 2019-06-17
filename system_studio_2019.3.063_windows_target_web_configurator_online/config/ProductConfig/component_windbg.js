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
    var rm_pyc = function(pyc_dir)
    {
        var pyc_files = FileSystem.FindFilesRecursive(pyc_dir, "*.pyc");

        Log("pyc files remove in folder " + pyc_dir);
        for(var i in pyc_files)
            FileSystem.Delete(FileSystem.AbsPath(pyc_dir, pyc_files[i]));
        Log("pyc files remove in folder " + pyc_dir + " done");
    }

    var get_windbg_pyc_rm_action = function(cmp, pyc_sub_dir)
    {
        return function(dmp)
        {
            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format("Removing *.pyc files");

            var exe = {};

            exe.Apply = function()
            {
                var pyc_dir = FileSystem.AbsPath(cmp.InstallDir(), pyc_sub_dir);
                rm_pyc(pyc_dir);
                return Action.r_ok;
            }

            exe.Rollback = function(){ return Action.r_ok; }

            exe.ProgressApply = function() {return prg;}

            if(dmp && dmp.IsDumper)
                dmp.AddAction(exe, "Remove PYC");
        }
    }

    var get_windbg_pyc_install_action = function(cmp, pyc_sub_dir)
    {
        return function(dmp)
        {
            var prg = Progress();
            prg.total = -1;
            prg.message = StringList.Format("Removing *.pyc files");

            var exe = {};

            exe.Apply = function(){ return Action.r_ok; }

            exe.Rollback = function()
            {
                var pyc_dir = FileSystem.AbsPath(cmp.InstallDir(), pyc_sub_dir);
                rm_pyc(pyc_dir);

                return Action.r_ok;
            }

            exe.ProgressApply = function() {return prg;}

            if(dmp && dmp.IsDumper)
                dmp.AddAction(exe, "Remove PYC in case of rollback");
        }
    }

    this.Component = function(components)
    {
        for(var i in components)
        {
          if(i.match(/win_dbg/i))
          {
            Log("cmp " + i + " Apply.Install.SubscribeOnEnd");
            components[i].Configurator().Apply.Install.SubscribeOnEnd(get_windbg_pyc_install_action(components[i], "system_debugger_2019\\windbg-ext\\iajtagserver\\pyitpkd\\wdbghandler"));

            Log("cmp " + i + " Apply.Remove.SubscribeOnBegin");
            components[i].Configurator().Apply.Remove.SubscribeOnBegin(get_windbg_pyc_rm_action(components[i], "system_debugger_2019\\windbg-ext\\iajtagserver\\pyitpkd\\wdbghandler"));
          }
        }
    }
}
