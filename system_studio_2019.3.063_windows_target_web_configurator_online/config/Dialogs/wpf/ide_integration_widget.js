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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../../Base"));};
    var format = StringList.Format;
    var ns_pb =  base("parse_bool.js");
    var ns_pr =  base("pendingreboot.js");
    var ns_wpf = base("wpf.js");
    var ns_event  = base("event.js");
    var ns_sender = base("event_sender.js");
    var ns_prop = base("property.js");
    var P = function(val){return ns_prop.Property(val);};

    var ns_bld = base("builder.js");

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

    var vs_data_cb = null;

    this.BuildControls = function()
    {
        var ns = this;
        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var control_top = Wizard.Theme().PixelWidth();
        var medium_font = Wizard.Theme().MediumFont();

        var ww100 = window_width;
        var ww10 = ww100/10;
        var ww5 = ww100/20;
        var ww1 = ww100/100;

        var mode = (ns.Product().InstallMode()==ns.Product().install_mode_t.modify);

        Wizard.ControlCollection["IDEIntegrationWidget"] = function()
        {
            Log(Log.l_debug, "Building IDEIntegrationWidget");
            var event_ide_integration_customize = ns_event.FEvent();
            var obj =
            {
                control: "StackPanel", //here go our five elements
                orientation: "vertical", //we will stack widgets vertically one by one
                //width: window_width - 2*widget_left, //window width (450) minus left margin (45) and right margin (45)
                background: "#00000000", //set alpha-channel to 0 for transparent background
                margin: {left: widget_left, right: widget_left, top: widget_top * 2},
                name: "m_ide_integration_wdgt_container",
                children:
                [
                    {
                        control: "Grid",
                        columns: ["auto", "*"],
                        background: "#00000000", //set alpha-channel to 0 for transparent background
                        children:
                        [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: medium_font,
                                GridColumn: 0,
                                halign: "left",
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                text: format("[ide_integration_caption]"),
                                name: "m_ide_caption"
                            },
                            {
                                control: "TextBlock", //hyperlink holder
                                wrap: "wrap",
                                fontSize: medium_font, //by review
                                GridColumn: 1,
                                halign: "right",
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                inlines: //contains inlines
                                [
                                    {
                                        control: "Hyperlink",
                                        uri: "http://software.intel.com",
                                        inlines: [StringList.Format("[ide_customize]")], //link text, actually, just a placeholder
                                        clicked: event_ide_integration_customize, //action on click -- run IDE integration
                                        name: "m_ide_integration_link" // set name to avoid object clean
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        control: "StackPanel", //here go our 4 elements
                        orientation: "vertical", //we will stack widgets vertically one by one
                        margin: {top: 2*control_top, left: widget_left},
                        children:
                        [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                halign: "left",
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                text: mode? format("[ide_default_text]") : format("[ide_text]"),
                                name: "m_ide_text"
                            }
                        ]
                    }
                ]
            }

            var control = Wizard.BuildControl(obj);
            control.Name = "IDEIntegrationWidget";
            control.Owner = P();
            control.Visible = P(true);
            control.Disabled = P(false);
            control.IdeIntegrationCustomize = event_ide_integration_customize;

            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_ide_integration_wdgt_container;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.OnChange = ns_sender.DialogEvent(control);
            control.IdeIntegrationCustomize.Connect(control.OnChange.Transmit("NTF_IDE_INTEGRATION_CUSTOMIZE"));
            control.OnAttach = function(dialog_name)
            {
                var process_wizard = function(id, notify, value)
                {
                    var ctl = null;
                    switch(id)
                    {
                    case dialog_name + "/ide_integration_caption":
                        ctl = control.js.m_ide_caption;
                        break;
                    case dialog_name + "/ide_integration_text":
                        ctl = control.js.m_ide_text;
                        break;
                    default:
                        break;
                    }
                    if(ctl)
                    {
                        switch(notify)
                        {
                        case "set text":
                            ctl.text = format(value);
                            break;
                        case "show":
                            ctl.visible = true;
                            break;
                        case "hide":
                            ctl.visible = false;
                            break;
                        case "get text":
                            return ctl.text;
                        default:
                            break;
                        }
                    }
                };

                Wizard.Subscribe(dialog_name + "/ide_integration_caption", "set text", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_caption", "get text", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_caption", "show", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_caption", "hide", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_text", "set text", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_text", "get text", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_text", "show", process_wizard);
                Wizard.Subscribe(dialog_name + "/ide_integration_text", "hide", process_wizard);
            }

            return control;
        }
    }
}
