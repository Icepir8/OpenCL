/*
Copyright (C) 2002-2017, Intel Corporation. All rights reserved.
The source code, information and material ("Material") contained herein
is owned by Intel Corporation or its suppliers or licensors, and title
to such Material remains with Intel Corporation or its suppliers or
licensors. The Material contains proprietary information of Intel or its
suppliers and licensors. The Material is protected by worldwide copyright
laws and treaty provisions. No part of the Material may be used, copied,
reproduced, modified, published, uploaded, posted, transmitted, distributed
or disclosed in any way without Intel's prior express written permission.
No license under any patent, copyright or other intellectual property rights
in the Material is granted to or conferred upon you, either expressly, by
implication, inducement, estoppel or otherwise. Any license under such
intellectual property rights must be express and approved by Intel in writing.

Unless otherwise agreed by Intel in writing, you may not remove or alter this
notice or any other notice embedded in Materials by Intel or Intel's suppliers
or licensors in any way.
*/

(function()
{
    var load = function(name) {return required(FileSystem.MakePath("../" + name, Origin.Directory()));};
    var base = function(name) {return load("Base/" + name);};
    
    var quote = function(c, q) {return (c.match(/\s/) ? (q || '"') + c + (q || '"') : c);};

    var ns_prop = base("property.js");
    var ns_inst = Namespace("Root.installer");

    var PForInstall = function(val, attributes)
    {
        if (typeof(ns_prop.CollectorByAnd) == "undefined")
            return ns_prop.Property(val, attributes);

        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        c.Attributes(attributes);
        return c;
    }

    return {Feature: function(features, root)
    {
        var exe_path = FileSystem.MakePath("../is_gpu_supported.exe", Origin.Directory());
        if(FileSystem.Exists(exe_path))
        {
            exe_path = quote(exe_path);
            Log("Command line to execute: " + exe_path);
            var res = CreateProcess("", exe_path, true);
            if(res)
            {
                Log(JSON.stringify(res));
                
                Log("Process exit code: " + res.exitcode);
                Log("Process output: " + res.output);
                if(features.target && (res.exitcode || res.failed))
                {
                    features.target.Disabled(PForInstall(true));
                    features.target.ErrorDescription(StringList.Format("[gpu_not_supported]", features.target.Name()));
                }
                if(features.cpu_rt && (!res.exitcode || res.failed))
                {
                    features.cpu_rt.Disabled(PForInstall(true));
                }
                
                Namespace("Root.is_gpu_supported").exitcode = res.exitcode;
                Namespace("Root.is_gpu_supported").failed = res.failed;
                Namespace("Root.is_gpu_supported").output = res.output;
            }
            else
                Log("No process info returned");
        }           
        else
           Log("File is not found: " + exe_path); 
    }};
})();


