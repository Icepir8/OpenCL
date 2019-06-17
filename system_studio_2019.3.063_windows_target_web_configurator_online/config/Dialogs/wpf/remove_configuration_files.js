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
        var format = StringList.Format;

        var checked_cb = function() {}

        var header = "";
        var footer = "";
        var checkbox = "[remove_configuration_files]";

        var RemoveConfigurationFiles = function()
        {
            var window = ns.Window;
            var _remove_configuration_files =
            {
                control: "Grid",
                rows: ["auto", "*"],
                margin: 10,
                stage: "options",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            // {
                            //     control: "TextBlock",
                            //     wrap: "wrap",
                            //     fontSize: "22",
                            //     fontWeight: "bold",
                            //     text: format("[title]")
                            // },
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: "14",
                                name: "m_subtitle",
                                fontWeight: "bold",
                                margin: {bottom: 10},
                                text: format("[remove_configuration_files]")
                            }
                        ]
                    },
                    {
                        control: "StackPanel",
                        valign: "center",
                        GridRow: 1,
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                margin: {bottom: 10},
                                name: "m_header",
                            },
                            {
                                control: "CheckBox",
                                flowDirection: "leftToRight",
                                name: "m_check",
                                threeState: false,
                                margin: {right: 10},
                                GridColumn: 0,
                                content:
                                {
                                    control: "TextBlock",
                                    wrap: "wrap",
                                    name: "m_label",
                                }
                            },
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                margin: {top: 10},
                                name: "m_footer",
                            }
                        ]
                    },
                ]
            };

            if(window)
            {
                var control = Wizard.BuildControl(_remove_configuration_files);
                control.Name = "RemoveConfigurations";
                control.navigator = ns_nav.BackNextCancel();
                var dialog = window.Dialog(control);

                Wizard.Subscribe("single_checkbox/box","is checked", function(){return control.js.m_check.checked ? 1 : 0;});
                Wizard.Subscribe("single_checkbox/box", "set text", function(id,notify,value){control.js.m_label.text = format(value);});
                Wizard.Subscribe("single_checkbox/header", "set rtf text", function(id,notify,value){control.js.m_header.text = format(value);});
                Wizard.Subscribe("single_checkbox/footer", "set rtf text", function(id,notify,value){control.js.m_footer.text = format(value);});

                control.Show = function()
                {
                    Wizard.Notify("next", "enable");
                    Wizard.Notify("prev", "enable");
                    Wizard.Notify("cancel", "enable");

                    Wizard.Notify("single_checkbox/header", "set rtf text", header);
                    Wizard.Notify("single_checkbox/footer", "set rtf text", footer);
                    Wizard.Notify("single_checkbox/box", "set text", checkbox);
                }

                return dialog;
            }
            else
                return _remove_configuration_files;
        }

        var RemoveConfigurationFilesDlg = RemoveConfigurationFiles();

        this.RemoveConfigurationFiles = function(){
            return RemoveConfigurationFilesDlg();
        };

        this.RemoveConfigurationFiles.Header = function(text)
        {
            if(arguments.length)
                header = text;
        }

        this.RemoveConfigurationFiles.Footer = function(text)
        {
            if(arguments.length)
                footer = text;
        }

        this.RemoveConfigurationFiles.Checkbox = function(text)
        {
            if(arguments.length)
                checkbox = text;
        }

        this.RemoveConfigurationFiles.IsChecked = function()
        {
            return Wizard.Notify("single_checkbox/box","is checked");
        }
    }
}
