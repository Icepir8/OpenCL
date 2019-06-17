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

new function ()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns_proc = load("component_processor.js");

    var db_only = function() {return GetOpt.Exists("db-processor");};

    var format = StringList.Format;

    
    //###################################################################################
    // CER processor
    //###################################################################################
    this.ProcessorCer = function()
    {
        Log("call ProcessorCer");
        if(db_only())
            return ns_proc.ProcessorDB();

        var crt_proc = ns_proc.Processor();
        var self = crt_proc;
 
        var util = "\\certutil ";

        if(System.IsAdmin())
        {
            Log(Log.l_warning, "Admin privileges");
        }
        else
        {
            Log(Log.l_warning, "User privileges.NoAdmin.");
            util = "\\certutil -user ";
        }

        var remove = function()
        {
            Log("ProcessorCer: getting Rollback...");
            if(crt_proc.IsInstalled())
            {
                Log("Start Rollback: component_cer is installed");
                if(crt_proc.Owner() && crt_proc.Owner().Info())
                {
                    var info = crt_proc.Owner().Info();

                    safecall(function() {CreateProcess(null, FileSystem.SpecialFolder.system + util + " -delstore " + info.Property("StoreName") + " " + info.Property("CertId")); },
                        function(){Log(Log.l_warning, "Exception handled calling vs command line");});

                }
            }

            else 
            {
                Log("Rollback: component_cer is not installed. Skip.");
                return Action.r_error;
            }
            
            return Action.r_ok;
        };

        var installed;
        crt_proc.IsInstalled = function()
        {
            if(typeof(installed) == "undefined")
            {
                installed = false;
                var info = crt_proc.Owner().Info();

                var ret = CreateProcess("", FileSystem.SpecialFolder.system + util + " -store " + info.Property("StoreName") + " " + info.Property("CertId"), true);

                if(ret.exitcode == 0)
                {
                    Log(" Cer Component " + crt_proc.Owner().Source().File() + " is installed");
                    installed = true;
                }

                else 
                    Log(" Cer Component " + crt_proc.Owner().Source().File() + "  is not installed");
            }
            return installed;
        }

        crt_proc.InstallAct = function()
        {
            Log("ProcessorCer: getting InstallAct");
            var prg = Progress();
            prg.total = -1;
            prg.message = format("[installing]", crt_proc.Owner().Info().Name());

            var info = crt_proc.Owner().Info();
            var cer = {};

            cer.Apply = function()
            {
                Log("Install Apply Cer file: ");

                var crt = crt_proc.Owner().Source().File();
                Log("Installing Cer component: "+ crt_proc.Owner().Source().File());

                var res = CreateProcess(null, FileSystem.SpecialFolder.system + util + " -addstore " + info.Property("StoreName") + " " + "\"" + crt + "\"", true);
           
                Log("   res.output = " + res.output);
                Log("   res.exitcode = " + res.exitcode);
                Log("   res.failed = " + res.failed);
                Log("   res.error = " + res.error);

                var ignore_errors = false;
                
                if(crt_proc.Owner() && crt_proc.Owner().Info())
                {
                    if(info.Property("InstallIgnoreErrors"))
                        ignore_errors = (info.Property("InstallIgnoreErrors") == "true");
                    else if(info.Property("IgnoreErrors"))
                        ignore_errors = (info.Property("IgnoreErrors") == "true");
                                            
                }

                if(!ignore_errors && res.failed)
                {
                    var err = {message: format("[crt_failed]"), details: []};
                    err.details.push(format("[crt_failed_name]", String(FileSystem.FileName(crt_proc.Owner().Source().File())).replace(/\\/g, "\\\\")));
                    if(res.failed)
                        err.details.push(format("[crt_failed_to_start]"));

                    if(res.exitcode)
                        err.details.push(format("[crt_failed_result]", res.exitcode));

                    if(res.error)
                        err.details.push(res.error);

                    GlobalErrors.Add(err.message);
                    for(var i in err.details)
                        GlobalErrors.Add(err.details[i]);

                    cer.Rollback();
                    cer.Error = function() {return err;}
                    return Action.r_error;
                }
  
                return Action.r_ok;
            }

            cer.Rollback = remove;

            cer.ProgressApply = function() {return prg;}

            return cer;
        }

        crt_proc.RepairAct = crt_proc.InstallAct;

        crt_proc.RemoveAct = function()
        {
            Log("ProcessorCer: getting RemoveAct");
            var prg = Progress();
            prg.total = -1;
            prg.message = format("[removing]", crt_proc.Owner().Info().Name());

            var info = crt_proc.Owner().Info();
            var cer = {};

            cer.Apply = function()
            {
                Log("Deleting CRT component..." + crt_proc.Owner().Source().File());
 
                var res = CreateProcess(null, FileSystem.SpecialFolder.system + util + " -delstore " + info.Property("StoreName") + " " + info.Property("CertId"), true);
                    
                Log("   res.output = " + res.output);
                Log("   res.exitcode = " + res.exitcode);
                Log("   res.failed = " + res.failed);
                Log("   res.error = " + res.error);

                var ignore_errors = false;

                if(crt_proc.Owner() && crt_proc.Owner().Info())
                {
                    info = crt_proc.Owner().Info();
                    if(info.Property("RemoveIgnoreErrors"))
                        ignore_errors = (info.Property("RemoveIgnoreErrors") == "true");
                    else if(info.Property("IgnoreErrors"))
                        ignore_errors = (info.Property("IgnoreErrors") == "true");
                    else
                        ignore_errors = false;

                }
               
                if(!ignore_errors && res.failed)
                {
                    GlobalErrors.Add(format("[crt_failed]"));
                    GlobalErrors.Add(format("[crt_failed_name]"));

                    if(res.failed)
                        GlobalErrors.Add(format("[crt_failed_to_start]"));

                    if(res.exitcode)
                        GlobalErrors.Add(format("[crt_failed_result]", res.exitcode));

                    return Action.r_error;
                }

                return Action.r_ok;
            }

            cer.ProgressApply = function() {return prg;}

            return cer;
        }

        return crt_proc;
    }
}
