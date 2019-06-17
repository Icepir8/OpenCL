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
    var load    = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var dialogs = function(name) {return load("../Dialogs/WPF/" + name);};

    this.Feature = function(ftrs, node)
    {
        if(!ftrs)
            return;

        var nds;
        var i;
        var id;
        
        nds = node.select('feature[@expanded="true" and @id]');
        for(i in nds)
        {
            id = nds[i].attributes.id;
            if(ftrs[id])
                ftrs[id].Expanded(true);
        }


        var handler = function(name)
        {
            return function(iter)
            {
                if(!iter)
                    return false;

                var action = iter.Get();
                var msg;

                switch(action.Group())
                {
                case "Download":
                    msg = StringList.Format("[install_failed_download]", name);
                    break;
                default:
                    msg = StringList.Format("[install_failed_media]", name);
                    break;
                }

                if("ok" == Action.MessageBox({title: "[title]", text: msg, icon: "error", buttons: "okcancel"}))
                    return true;
                else
                {
                    Wizard.Abort();
                    return false;
                }
            };
        }


        nds = node.select("feature[@id and @allow_fail='true']");
        for(i in nds)
        {
            id = nds[i].attributes.id;
            if(ftrs[id])
                if(typeof (WPF) != "undefined")
                {
                    var ns_errhan = dialogs("error_handler.js");
                    ns_errhan.Handler(ftrs[id], true);
                }
                else
                    ftrs[id].ErrorHandler(handler(ftrs[id].Name()));
        }
    }
}


