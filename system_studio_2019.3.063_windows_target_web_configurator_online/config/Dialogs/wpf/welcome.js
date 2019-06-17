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

    this.Init = function()
    {
        var ns = this;
        var ns_wpf = base("wpf.js");
        var ns_nav = load("navigator.js");
        var welcome_template = "[welcome_template]";

        var Welcome = function()
        {
            var window = ns.Window;
            var _welcome =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: 10,
                stage: "welcome",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: "14",
                                fontWeight: "bold",
                                margin: {bottom: 10},
                                text: StringList.Format("[subtitle_welcome]")
                            }
                        ]
                    },
                    {
                        control: "RichTextBox",
                        margin: {top: 10},
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        name: "m_text",
                        GridRow: 1
                    },
                ]
            };

            if(window)
            {
                var control = Wizard.BuildControl(_welcome);
                control.Name = "Welcome";
                control.navigator = GetOpt.Exists("help") ? ns_nav.Finish() : ns_nav.BackNextCancel();
                var dialog = window.Dialog(control);

                var set_rtf = function(id, notify, text){
                    if(text)
                        control.js.m_text.rtfText = text;
                };
                Wizard.Subscribe("welcome", "set rtf text", set_rtf);

                control.Show = function()
                {
                    ns.Welcome.Buttons();
                }

                return dialog;
            }
            else
                return _welcome;
        }

        var WelcomeDlg = Welcome();

        this.Welcome = function()
        {
            ns.StageSuite("suite_install");
            Wizard.Notify("welcome", "set rtf text", welcome_template);
            var r = WelcomeDlg();
            return r;
        }

        this.Welcome.Template = function(text)
        {
            if(text)
                welcome_template = text;
            else
                welcome_template = "[welcome_template]";
        }

        this.Welcome.Buttons = function()
        {
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Notify("next", "enable");
            Wizard.Notify("prev", "disable");
            Wizard.Notify("cancel", "enable");
        }
    }
}
