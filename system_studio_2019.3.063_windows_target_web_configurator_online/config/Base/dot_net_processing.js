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
Microsoft .NET Framework  processing.

function GetDotNetInfo returns object where key DotNet identification:
    dot_net_1_1, dot_net_2_0, dot_net_3_0, dot_net_3_5, dot_net_4_x_client, dot_net_4_x_full

*/

new function()
{
    var base_script_dir = Folders.Base();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_vs_processing = load("vs_processing.js");

    var ns = this;

    var dot_net_1_1 = {};
    dot_net_1_1.id = "dot_net_1_1";
    dot_net_1_1.name = "Microsoft .NET Framework 1.1 software";
    dot_net_1_1.data = {};
    dot_net_1_1.data.install = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v1.1.4322", value:"Install", type:"value"};

    var dot_net_2_0 = {};
    dot_net_2_0.id = "dot_net_2_0";
    dot_net_2_0.name = "Microsoft .NET Framework 2.0 software";
    dot_net_2_0.data = {};
    dot_net_2_0.data.install = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v2.0.50727", value:"Install", type:"value"};
    dot_net_2_0.data.version = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v2.0.50727", value:"Version", type:"value"};
    dot_net_2_0.data.sp = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v2.0.50727", value:"SP", type:"value"};

    var dot_net_3_0 = {};
    dot_net_3_0.id = "dot_net_3_0";
    dot_net_3_0.name = "Microsoft .NET Framework 3.0 software";
    dot_net_3_0.data = {};
    dot_net_3_0.data.install = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.0", value:"Install", type:"value"};
    dot_net_3_0.data.version = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.0", value:"Version", type:"value"};
    dot_net_3_0.data.sp = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.0", value:"SP", type:"value"};

    var dot_net_3_5 = {};
    dot_net_3_5.id = "dot_net_3_5";
    dot_net_3_5.name = "Microsoft .NET Framework 3.5 software";
    dot_net_3_5.data = {};
    dot_net_3_5.data.install = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.5", value:"Install", type:"value"};
    dot_net_3_5.data.version = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.5", value:"Version", type:"value"};
    dot_net_3_5.data.sp = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.5", value:"SP", type:"value"};
    dot_net_3_5.data.install_path = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.5", value:"InstallPath", type:"directory"};

    var dot_net_4_x_client = {};
    dot_net_4_x_client.id = "dot_net_4_x_client";
    dot_net_4_x_client.name = "Microsoft .NET Framework 4.x Client software";
    dot_net_4_x_client.data = {};
    dot_net_4_x_client.data.install = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Client", value:"Install", type:"value"};
    dot_net_4_x_client.data.version = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Client", value:"Version", type:"value"};
    dot_net_4_x_client.data.install_path = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Client", value:"InstallPath", type:"directory"};

    var dot_net_4_x_full = {};
    dot_net_4_x_full.id = "dot_net_4_x_full";
    dot_net_4_x_full.name = "Microsoft .NET Framework 4.x Full software";
    dot_net_4_x_full.data = {};
    dot_net_4_x_full.data.install = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full", value:"Install", type:"value"};
    dot_net_4_x_full.data.version = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full", value:"Version", type:"value"};
    dot_net_4_x_full.data.install_path = {key:"SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full", value:"InstallPath", type:"directory"};


    var dotnet = {dot_net_1_1:dot_net_1_1, dot_net_2_0:dot_net_2_0, dot_net_3_0:dot_net_3_0, dot_net_3_5:dot_net_3_5, dot_net_4_x_client:dot_net_4_x_client, dot_net_4_x_full:dot_net_4_x_full};

    ns_vs_processing.Fill(dotnet);

    this.GetDotNetInfo = function(recheck_dot_net)
    {
        if(recheck_dot_net)
            ns_vs_processing.Fill(dotnet);

        return dotnet;
    }
}

