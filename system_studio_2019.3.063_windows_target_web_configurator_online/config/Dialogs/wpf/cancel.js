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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns = this;

    var ns_wpf = base("wpf.js");
    var ns_nav = load("navigator.js");
    var format = StringList.Format;

    this.AskCancel = function(window)
    {
        var _cancel = {
            control: "DockPanel",
            lastFill: true,
            margin: 10,
            children: [
                {
                    control: "StackPanel",
                    Dock: "top",
                    children: [
                        // {
                        //     control: "TextBlock",
                        //     wrap: "wrap",
                        //     fontSize: 22,
                        //     fontWeight: "bold",
                        //     text: format("[title]")
                        // },
                        {
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: 14,
                            fontWeight: "bold", // do not use bold for now
                            margin: {bottom: 10},
                            text: format("[cancel confirmation title]")
                        }
                    ]
                },
                {
                    control: "TextBlock",
                    wrap: "wrap",
                    halign: "center",
                    valign: "center",
                    fontSize: 22,
                    fontWeight: "bold",
                    borderThickness: 0,
                    text: format("[cancel confirmation message]")
                }
            ]
        };

        if(window)
        {
            /*var cancel = Wizard.BuildControl(_cancel);
            cancel.Name = "Cancel";
            cancel.navigator = ns_nav.YesNo();
            var dialog = window.Dialog(cancel);
            return dialog;*/
            var cancel = function()
            {
                return WPF.MessageBox(format("[cancel confirmation message]"), format("[cancel confirmation title]"), "YesNo");
            }
            return cancel;
        }
        else
            return _cancel;
    };
}
