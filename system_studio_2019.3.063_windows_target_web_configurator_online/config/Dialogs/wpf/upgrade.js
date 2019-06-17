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

        var Upgrade = function()
        {
            var _upgrade =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: 10,
                stage: "options",
                bindings: [
                    {
                        key: "u",
                        mod: "alt",
                        clicked: function() {if(this.js.m_upgrade.enabled) this.js.m_upgrade.checked = true;}
                    },
                    {
                        key: "i",
                        mod: "alt",
                        clicked: function() {if(this.js.m_sxs.enabled) this.js.m_sxs.checked = true;}
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
                                fontSize: "22",
                                fontWeight: "bold",
                                text: StringList.Format("[subtitle_upgrade]")
                            }
                        ]
                    },
                    {
                        control: "Grid",
                        GridRow: 1,
                        rows: ["*", "*"],
                        margin: 30,
                        children: [
                            { // upgrade
                                control: "StackPanel",
                                valign: "center",
                                GridRow: 0,
                                children: [
                                    {
                                        control: "RadioButton",
                                        group: "upgrade_sxs",
                                        name: "m_upgrade",
                                        onChecked: function() {Wizard.Notify("upgrade", "upgrade_was_changed", "NTF_UPGRADE");},
                                        content: {
                                            control: "Label",
                                            content: format("[UpgradeInstall]"),
                                            fontWeight: "bold",
                                            padding: 0
                                        }
                                    },
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        margin: {left: 20},
                                        name: "m_upgrade_description",
                                    }
                                ]
                            },
                            { // sxs
                                control: "StackPanel",
                                valign: "center",
                                GridRow: 1,
                                children: [
                                    {
                                        control: "RadioButton",
                                        group: "upgrade_sxs",
                                        name: "m_sxs",
                                        onChecked: function() {Wizard.Notify("upgrade", "upgrade_was_changed", "NTF_SXS");},
                                        content: {
                                            control: "Label",
                                            content: format("[SXSInstall]"),
                                            fontWeight: "bold",
                                            padding: 0
                                        }
                                    },
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        margin: {left: 20},
                                        name: "m_sxs_description",
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
                var control = Wizard.BuildControl(_upgrade);
                control.Name = "Upgrade";
                var dialog = window.Dialog(control);

                control.Show = function()
                {
                    ns.Buttons("[Next]", "[Prev]", "[Cancel]");
                    Wizard.Notify("next", "enable");
                    Wizard.Notify("prev", "enable");
                    Wizard.Notify("cancel", "enable");

                    if(!control.js.m_upgrade.checked && !control.js.m_sxs.checked)
                        control.js.m_upgrade.checked = true;

                    Wizard.Notify("upgrade/sxs_dscr", "set text", "[SXSInstallDscr]");
                    Wizard.Notify("upgrade/upgrade_dscr", "set text", "[UpgradeInstallDscr]");
                }

                Wizard.Subscribe("upgrade/sxs", "set checked", function(id, notify, value) {if(control.js.m_sxs.enabled) control.js.m_sxs.checked = value;});
                Wizard.Subscribe("upgrade/upgrade", "set checked", function(id, notify, value) {if(control.js.m_upgrade.enabled) control.js.m_upgrade.checked = value;});
                Wizard.Subscribe("upgrade/sxs", "is checked", function(){return control.js.m_upgrade.checked ? 1 : 0;});
                Wizard.Subscribe("upgrade/upgrade", "is checked", function(){return control.js.m_sxs.checked ? 1 : 0;});
                Wizard.Subscribe("upgrade/sxs_dscr", "set text", function(id, notify, value){if(control.js.m_sxs_description)control.js.m_sxs_description.text = format(value);});
                Wizard.Subscribe("upgrade/upgrade_dscr", "set text", function(id, notify, value){if(control.js.m_upgrade_description)control.js.m_upgrade_description.text = format(value);});

                return dialog;
            }
            else
                return _upgrade;
        }

        var UpgradeDlg = Upgrade();
        this.Upgrade = function(){
            return UpgradeDlg();
        };

        var select_cb = function() {}

        var select = function(opt)
        {
            Wizard.Notify("upgrade/upgrade", "set checked", false);
            Wizard.Notify("upgrade/sxs", "set checked", false);

            switch(opt)
            {
            case "upgrade":
                Wizard.Notify("upgrade/upgrade", "set checked", true);
                break;
            case "sxs":
                Wizard.Notify("upgrade/sxs", "set checked", true);
                break;
            default: //case "remove":
                break;
            }
        }

        this.Upgrade.OnChange = function(cb)
        {
            if(!cb)
            {
                Log("Upgrade/SXS Dialog: attempt to assign an undefined callback for the selection processing. Ignore.");
                return;
            }

            select_cb = cb;

            return select_cb;
        }

        this.Upgrade.SelectUpgrade = function(){select("upgrade");}
        this.Upgrade.SelectSXS = function(){select("sxs");}

        this.Upgrade.UpgradeChecked = function(){return Wizard.Notify("upgrade/upgrade", "is checked");}
        this.Upgrade.SXSChecked = function(){return Wizard.Notify("upgrade/sxs", "is checked");}

        var UpgradeChanged = function (id, notify, value)
        {
            if(id != "upgrade" || notify != "upgrade_was_changed")
                return;

            switch(value)
            {
                case "NTF_UPGRADE":
                    select_cb("upgrade");
                    break;
                case "NTF_SXS":
                    select_cb("sxs");
                    break;
            }
        }

        Wizard.Subscribe("upgrade", "upgrade_was_changed", UpgradeChanged);
    }
}
