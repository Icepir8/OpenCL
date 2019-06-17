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


Namespace("Root.Interface.Versioned", function()
{
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));};

    var ns_ver = load("version.js");

    var interfaces = [];

    this.Add = function(name, ver, obj)
    {
        if(name && ver && obj)
        {
            Log("Adding versioned interface: " + name + " : " + ver);
            interfaces.push({name: name, version: ns_ver.Version(ver), object: obj});
        }
        else
            Log(Log.l_warning, "Failed to add new interface: incorrect arguments: " + name + " : " + ver + " : " + obj);
    }

    this.Get = function(name)
    {
        var inter;
        var ver;

        for(var i in interfaces)
        {
            var item = interfaces[i];
            if(item.name == name)
            {
                if(!inter && !ver)
                {
                    Log("  Found interface: version: " + item.version.Str());
                    inter = item.object;
                    ver = item.version;
                }
                else if(inter && ver && ver.lt(item.version))
                {
                    Log("  Found newer interface: version: " + item.version.Str());
                    inter = item.object;
                    ver = item.version;
                }
            }
        }

        if(!inter)
            Log(Log.l_warning, "Failed to get interface: " + name);
        return inter;
    }
})






