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
    var abspath = FileSystem.AbsPath;
    var format = StringList.Format;

    var load = function(name) {return required(abspath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    var wprogress = "Progress1";
    var defgrp = format("[Install]");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    this.Decorator = function(window, install)
    {
        if(!window || !install)
            return null;

        var ns_dmp = base("dumper.js");
        var ns_errhan = load("error_handler.js");

        var count = 0;

        var groups = {};

        install.OnBegin(function(dmp)
        {
            if(dmp)
            {
                var iter = ns_dmp.Iterator(dmp);
                while(iter.Next())
                { // calculating number of items
                    var item = iter.Item();

                    item.globalNumber = count;
                    count++;

                    if(item.Attribute("countable"))
                    { // building group map
                        var g = item.Group();
                        if(!g)
                            g = defgrp;
                        if(g)
                        {
                            if(!groups[g])
                                groups[g] = {total: 0, done: 0};
                            groups[g].total++;
                        }
                    }
                }

                if(count)
                {
                    window.Taskbar.State("normal");
                }
            }
        });

        install.OnEnd(function() {window.Taskbar.State("none");});

        install.OnApply(function(item, progress)
        {
            Log(Log.l_debug, "OnApply called");

            if(!item)
                return;
            if(item.globalNumber && count && progress == wprogress)
            {
                window.Taskbar.Value(item.globalNumber / count);
                window.Taskbar.State("normal");
            }
        });

        install.OnThreadCompleted(function(progress)
        {
            var prg = Progress();
            prg.total = -2;
            prg.message = format("[PrgCompleted]");
            Wizard.Notify(progress, "connect", prg.id);
        });

        install.OnRollback(function(item, progress)
        {
            if(item.globalNumber && count)
            {
                window.Taskbar.Value(item.globalNumber / count);
                window.Taskbar.State("error");
            }
        });

        install.OnCommit(function(item, progress)
        {
            if(item.globalNumber && count)
            {
                window.Taskbar.Value(item.globalNumber / count);
                window.Taskbar.State("normal");
            }
        });
    }
}
