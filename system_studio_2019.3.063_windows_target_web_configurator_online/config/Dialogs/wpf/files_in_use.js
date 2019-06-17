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

(function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns_wpf    = base("wpf.js");
    var ns_nav    = load("navigator.js");
    var ns_uimode = load("uimode.js");

    var format = StringList.Format;

    return {FilesInUse: function(window, prod)
    {
        if(window && ns_uimode && ns_uimode.Interactive())
        {
            var files_in_use = function(id, notify, data)
            {
                if(data.length)
                {
                    var items = [];
                    var procs = data.slice(1);
                    var rm_files_in_use = notify == "files in use rm";

                    while(procs.length)
                    {
                        if(procs[1])
                        {
                            var ctl = {
                                control: "ListItem",
                                blocks: [
                                    {
                                        control: "Paragraph",
                                        fontSize: 12,
                                        //foreground: cb(f.feature) ? "black" : "gray",
                                        inlines: [format(procs[1])]
                                    }
                                ]
                            };
                            items.push(ctl);
                        }
                        procs.shift();
                        procs.shift();
                    }

                    var _files_in_use = {
                        control: "DockPanel",
                        lastFill: true,
                        margin: 10,
                        children: [
                            {
                                control: "StackPanel",
                                Dock: "top",
                                children: [
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        fontSize: "14",
                                        fontWeight: "bold",
                                        margin: {bottom: 10},
                                        text: format("[subtitle_files_in_use]")
                                    }
                                ]
                            },
                            {
                                control: "StackPanel",
                                margin: 10,
                                children: [
                                    {
                                        control: "TextBlock",
                                        fontSize: "14",
                                        fontWeight: "bold",
                                        // margin: {bottom: 10},
                                        text: data[0]
                                    },
                                    {
                                        control: "FlowDocumentScrollViewer",
                                        vscroll: "auto",
                                        // margin: {top: 10},
                                        document: {
                                            blocks: [
                                                {
                                                    control: "List",
                                                    items: items
                                                }
                                            ]
                                        }
                                    },
                                    rm_files_in_use ?
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        // fontSize: "14",
                                        // fontWeight: "bold",
                                        // margin: {bottom: 10},
                                        text: format("[file_in_use]")
                                    } : {},
                                ]
                            }
                        ]
                    };

                    var hide_file_in_use = prod ? prod.Info().Property("hide_file_in_use") : false;

                    if(rm_files_in_use && hide_file_in_use && ["ok", "ignore"].indexOf(hide_file_in_use.toLowerCase()) != -1)
                    {
                        Log("FileInUse notification is hidden with return code: " + hide_file_in_use);
                        return hide_file_in_use.toLowerCase();
                    }

                    var control = Wizard.BuildControl(_files_in_use);
                    control.Name = "FilesInUse";
                    control.navigator = rm_files_in_use ? ns_nav.IgnoreOkayCancel() :  ns_nav.RetryIgnoreCancel();
                    var dlg = window.Dialog(control);
                    var s = window.Taskbar.State();
                    window.Taskbar.State("paused");

                    switch(window.Spawn(dlg))
                    {
                        case Action.r_ok:
                            window.Taskbar.State(s);
                            return "ok";
                        case "ignore":
                            window.Taskbar.State(s);
                            return "ignore";
                        case "retry":
                            window.Taskbar.State(s);
                            return "retry";
                        case Action.r_cancel:
                            window.Taskbar.State(s);
                            return "cancel";
                        default:
                            return "cancel";
                    }
                }
            };
            Wizard.Subscribe("installation", "files in use", files_in_use);
            Wizard.Subscribe("installation", "files in use rm", files_in_use);
        }
    }};
})();
