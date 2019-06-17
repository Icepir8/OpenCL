/*
Copyright (C) 2002-2015, Intel Corporation. All rights reserved.
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

    return {Feature: function(features, root)
    {
        var isGPUDriverNotInstalled = function()
        {
            var openclreg = Registry("HKLM", "SOFTWARE\\Intel\\OpenCL");
            var openclreg64 = Registry("HKLM", "SOFTWARE\\Intel\\OpenCL");
            openclreg.WowRedirect(false);
            if(!(openclreg.Exists() && openclreg.Value("cpu_version") ||
                openclreg64.Exists() && openclreg64.Value("cpu_version")))
                return true;
        }
    
        if(features.cpu_rt && !isGPUDriverNotInstalled())
        {
            features.cpu_rt.Disabled(true);
        }

    }};
})();


