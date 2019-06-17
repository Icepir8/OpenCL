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


    var ns_bld    = base("builder.js");
    var ns_bc =   dialogs("base_container.js");
    var ns_sender = base("event_sender.js");
    var ns_event  = base("event.js");
    var ns_inst   = base("installer.js");
    var ns_prop   = base("property.js");
    var ns_wpf = base("wpf.js");

    var format = StringList.Format;
    var P = function(val){return ns_prop.Property(val);};
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    }

    //################################################################
    //Controls
    //################################################################
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

        Wizard.ControlCollection["OptionalRemovalWidget"] = function()
        {
            Log("Building OptionalRemovalWidget");
            var event_optional_removal_customize = ns_event.FEvent();
            var obj =
            {
                control: "StackPanel", //here go our five elements
                orientation: "vertical", //we will stack widgets vertically one by one
                background: "#00000000", //set alpha-channel to 0 for transparent background
                margin: {left: widget_left, right: widget_left, top: widget_top * 2, bottom: control_top},
                name: "m_optional_removal_widget_container",
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
                                text: format("[optional_removal_title]")
                            },
                            {
                                control: "TextBlock", //hyperlink holder
                                wrap: "wrap",
                                fontSize: medium_font,
                                GridColumn: 1,
                                halign: "right",
                                fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                inlines: //contains inlines
                                [
                                    {
                                        control: "Hyperlink",
                                        uri: "http://software.intel.com",
                                        inlines: [StringList.Format("[optional_removal_customize]")], //link text, actually, just a placeholder
                                        clicked: event_optional_removal_customize, //action on click -- run Optional removal configuration
                                        name: "m_optional_removal_customize_link" // set name to avoid object clean
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
                                text: format("[optional_removal_msg]")
                            }
                        ]
                    }
                ]
            }

            var control = Wizard.BuildControl(obj);
            control.Name = "OptionalRemovalWidget";
            control.Owner = P();
            control.Visible = P(true);
            control.Disabled = P(false);
            control.EventOptionalRemovalCustomize = event_optional_removal_customize;

            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_optional_removal_widget_container;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            control.OnChange = ns_sender.DialogEvent(control);
            control.EventOptionalRemovalCustomize.Connect(control.OnChange.Transmit("NTF_OPTIONAL_REMOVAL_CUSTOMIZE"));

            return control;
        }
    }
}
