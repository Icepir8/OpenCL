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

        var ns_wpf  = base("wpf.js");
        var format = StringList.Format;

        var Setuptype = function()
        {
            var _setup_type =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: 10,
                stage: "options",
                bindings: [
                    {
                        key: "f",
                        mod: "alt",
                        clicked: function() {if(this.js.m_full.enabled) this.js.m_full.checked = true;}
                    },
                    {
                        key: "u",
                        mod: "alt",
                        clicked: function() {if(this.js.m_custom.enabled) this.js.m_custom.checked = true;}
                    },
                ],
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
                                text: StringList.Format("[subtitle_setuptype]")
                            }
                        ]
                    },
                    {
                        control: "Grid",
                        GridRow: 1,
                        rows: ["*", "*"],
                        margin: 30,
                        children: [
                            { // full install
                                control: "StackPanel",
                                valign: "center",
                                GridRow: 0,
                                children: [
                                    {
                                        control: "RadioButton",
                                        group: "setup_type",
                                        name: "m_full",
                                        onChecked: function() {Wizard.Notify("setuptype", "setuptype_was_changed", "NTF_DEFAULT");},
                                        content: {
                                            control: "Label",
                                            content: format("[DefaultInstall]"),
                                            fontWeight: "bold",
                                            padding: 0
                                        }
                                    },
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        margin: {left: 20},
                                        text: format("[DefaultInstallDscr]")
                                    }
                                ]
                            },
                            { // custom install
                                control: "StackPanel",
                                valign: "center",
                                GridRow: 1,
                                children: [
                                    {
                                        control: "RadioButton",
                                        group: "setup_type",
                                        name: "m_custom",
                                        onChecked: function() {Wizard.Notify("setuptype", "setuptype_was_changed", "NTF_CUSTOM");},
                                        content: {
                                            control: "Label",
                                            content: format("[CustomInstall]"),
                                            fontWeight: "bold",
                                            padding: 0
                                        }
                                    },
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        margin: {left: 20},
                                        text: format("[CustomInstallDscr]")
                                    }
                                ]
                            },
                        ]
                    }
                ]
            };

            var window = ns.Window;

            if(window)
            {
                var control = Wizard.BuildControl(_setup_type);
                control.Name = "SetupType";
                var dialog = window.Dialog(control);
                control.Show = function()
                {
                    ns.Buttons("[Next]", "[Prev]", "[Cancel]");
                    Wizard.Notify("next", "enable");
                    Wizard.Notify("prev", "enable");
                    Wizard.Notify("cancel", "enable");

                    if(ns.Installer().SetupType() == ns.Installer().setup_type_t.setup_default)
                        Wizard.Notify("setuptype/default", "check btn");
                    else
                        Wizard.Notify("setuptype/custom", "check btn");
                }

                Wizard.Subscribe("setuptype/default", "check btn", function() {if(control.js.m_full.enabled) control.js.m_full.checked = true;});
                Wizard.Subscribe("setuptype/custom", "check btn", function() {if(control.js.m_custom.enabled) control.js.m_custom.checked = true;});

                return dialog;
            }
            else
                return _setup_type;
        }

        var SetuptypeDlg = Setuptype();
        this.Setuptype = function(){
            return SetuptypeDlg();
        };

        var SetuptypeChanged = function (id, notify, value)
        {
            if(id != "setuptype" || notify != "setuptype_was_changed")
                return;

            switch(value)
            {
                case "NTF_DEFAULT":
                    ns.Installer().SetupType(ns.Installer().setup_type_t.setup_default);
                    break;
                case "NTF_CUSTOM":
                    ns.Installer().SetupType(ns.Installer().setup_type_t.setup_custom);
                    break;
            }
        }

        Wizard.Subscribe("setuptype", "setuptype_was_changed", SetuptypeChanged);
    }
}
