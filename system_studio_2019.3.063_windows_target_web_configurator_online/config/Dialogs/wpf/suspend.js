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

    return {Suspend: function(window, prod)
    {
        if(window && ns_uimode && ns_uimode.Interactive())
        {
            var inst_suspend = function(id, notify, data)
            {
                if(data.length)
                {

                    var _inst_suspend = {
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
                                        //fontWeight: "bold",
                                        margin: {bottom: 10},
                                        text: format("[subtitle_install]")
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
                                        textAlignment: "justify",
                                        // margin: {bottom: 10},
                                        text: data[0]
                                    },
                                ]
                            }
                        ]
                    };

                    var control = Wizard.BuildControl(_inst_suspend);
                    control.Name = "InstSuspend";
                    control.navigator = ns_nav.RetryIgnoreCancel();
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
            Wizard.Subscribe("installation", "suspend", inst_suspend);
        }
    }};
})();
