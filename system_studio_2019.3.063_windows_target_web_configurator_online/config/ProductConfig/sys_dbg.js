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
    var ns = this;

    var cmp = null;

    var add_vcredist_install = function(dmp)
    {
        var prg = Progress();
        prg.total = -1;
        //prg.message = StringList.Format("Processing Eclipse integration");

        var exe = {};

        exe.Apply = function()
        {
            Log("vcredist install action: apply");

            if(!cmp)
            {
                Log("cmp isn't defined! Ignore");
                return Action.r_ok;
            }

            var install_vc_redist = function(file, options)
            {
               var cmd = null;

               cmd = file + (options ? options : "");

               if(!cmd)
               {
                   Log("vcredist install vcredist were not found. Ignore");
                   return Action.r_ok;
               }

               Log("vcredist install executing cmd: \"" + cmd + "\"");
               ret = CreateProcess("", cmd, true);
               Log("vcredist install cmd exit code : \"" + ret.exitcode + "\"");
               Log("vcredist install cmd output: \"" + ret.output + "\"");


            }

            cmp.Source().Filter(function(source)
            {
                if(source.File && source.File().match(/vcredist05_x86/i))
                   install_vc_redist(source.File(), " /q /c:\"msiexec /i vcredist.msi REBOOT=ReallySuppress /qn\"");

                if(source.File && source.File().match(/vcredist10_x86/i))
                   install_vc_redist(source.File(), " /q /norestart");

                if(source.File && source.File().match(/vcredist10_KB2467173_x86/i))
                   install_vc_redist(source.File(), " /q /norestart");

                if(source.File && source.File().match(/vcredist12_x86/i))
                   install_vc_redist(source.File(), " /silent /norestart");

            });

            if(System.ProcessorArch() == System.ProcessorArch.pa_intel64)
            {
                cmp.Source().Filter(function(source)
                {
                    if(source.File && source.File().match(/vcredist12_x64/i))
                       install_vc_redist(source.File(), " /silent /norestart");

                    if(source.File && source.File().match(/vcredist15_x64/i))
                       install_vc_redist(source.File(), " /silent /norestart");
                });
            }

            return Action.r_ok;
        }

        exe.Rollback = function()
        {
            return Action.r_ok;
        }

        exe.ProgressApply = function() {return prg;}

        if(dmp && dmp.IsDumper)
            dmp.AddAction(exe, "Install vcredist");
    }

    this.Component = function(components)
    {
        for(var i in components)
        {
          if(i.match(/sys_dbg_ia32/i))
          {
            Log("cmp " + i + " SubscribeOnEnd");
            cmp = components[i]; // don't comment it as it is global variable!

            // on End due to they should work in online installer, but in that case files resolving is done after SubscribeOnBegin -> need to be fixed
            components[i].Configurator().Apply.Install.SubscribeOnEnd(add_vcredist_install);
          }
        }
    }
}
