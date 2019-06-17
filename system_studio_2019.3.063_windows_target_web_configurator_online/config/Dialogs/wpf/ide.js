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
    var ns_prop   = base("property.js");
    var ns_nav = dialogs("navigator.js");
    var ns_sender = base("event_sender.js");
    var ns_event = base("event.js");

    var ns_bld = base("builder.js");
    var P = function(val){return ns_prop.Property(val);};

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

        var event_eclipse_dir = ns_event.FEvent();
        var event_eclipse_checked = ns_event.FEvent();
        var event_eclipse_unchecked = ns_event.FEvent();

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();
        var small_font = Wizard.Theme().SmallFont();

        var _eclipse_integration_widget_template =
        {
            control: "Grid",
            rows: ["auto", "*"],
            margin: 10,
            //maxWidth: window_width,
            name: "m_widget_container",
            children: [
                {
                    control: "StackPanel",
                    valign: "center",
                    GridRow: 0,
                    children: [
                        {
                            control: "CheckBox",
                            flowDirection: "leftToRight",
                            name: "m_check",
                            threeState: false,
                            checked: false,
                            margin: {bottom: 10},
                            onChecked: event_eclipse_checked,
                            onUnchecked: event_eclipse_unchecked,
                            content:
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                name: "m_check_label",
                                text: "Integrate into Eclipse*"
                            }
                        },
                        {
                            control: "Grid",
                            columns: ["auto", "*", "auto"],
                            name: "m_integration",
                            children: [
                                {
                                    control: "TextBlock",
                                    name: "m_label",
                                    maxWidth: 120,
                                    valign: "center",
                                    fontWeight: "bold",
                                    wrap: "wrap",
                                    text: "Eclipse* location: ",
                                    GridColumn: 0
                                },
                                {
                                    control: "TextBox",
                                    minHeight: 24,
                                    maxHeight: 24,
                                    fontSize : small_font,
                                    padding: {left: 3, right: 3, top: 1, bottom: 1},
                                    margin: {left: 5, right: 5},
                                    name: "m_path",
                                    valign: "center",
                                    GridColumn: 1,
                                    changed: event_eclipse_dir
                                },
                                {
                                    control: "Button",
                                    minHeight: 24,
                                    maxHeight: 24,
                                    fontSize : medium_font,
                                    padding: {left: 10, right: 10, bottom: 2},
                                    content: format("[destination_button_browse]"),
                                    valign: "center",
                                    GridColumn: 2,
                                    name: "m_browse",
                                    clicked: function()
                                    {
                                        var p = WPF.FolderBrowserDialog(format("[choose_destination]"), this.js.m_path.text);
                                        if(p)
                                            this.js.m_path.text = p;
                                    }
                                }
                            ]
                        },
                    ]
                },
            ]
        };

        Wizard.ControlCollection["EclipseIntegrationWidget"] = function()
        {
            var wdgt_eclipse_integration = Wizard.BuildControl(_eclipse_integration_widget_template);
            wdgt_eclipse_integration.Name = "Eclipse_Integration_Widget";
            wdgt_eclipse_integration.EventEclipseDir = event_eclipse_dir;
            wdgt_eclipse_integration.EventEclipseChecked = event_eclipse_checked;
            wdgt_eclipse_integration.EventEclipseUnchecked = event_eclipse_unchecked;
            wdgt_eclipse_integration.Visible = P(true);
            wdgt_eclipse_integration.Disabled = P(false);
            var original_height = 0;
            wdgt_eclipse_integration.Visible.Subscribe(function()
            {
                if(!wdgt_eclipse_integration.Visible())
                {
                    original_height = wdgt_eclipse_integration.js.m_widget_container.height;
                    wdgt_eclipse_integration.js.m_widget_container.height = 0;
                    wdgt_eclipse_integration.js.m_widget_container.enabled = false;
                }
                else
                {
                    wdgt_eclipse_integration.js.m_widget_container.height = original_height;
                    wdgt_eclipse_integration.js.m_widget_container.enabled = true;
                }
            });
            wdgt_eclipse_integration.Disabled.Subscribe(function()
            {
                if(!wdgt_eclipse_integration.Disabled())
                    wdgt_eclipse_integration.js.m_check.enabled = false;
                else
                    wdgt_eclipse_integration.js.m_check.enabled = true;
            });


            wdgt_eclipse_integration.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach Eclipse Integration Widget to dialog " + dialog_name);

                var process_notify = function(id, notify, value)
                {
                    var ctl = null;
                    switch(id)
                    {
                        case dialog_name + "/eclipse_integration/check_box":
                            ctl = wdgt_eclipse_integration.js.m_check;
                            break;
                        case dialog_name + "/eclipse_integration/edit_box":
                            ctl = wdgt_eclipse_integration.js.m_path;
                            break;
                        case dialog_name + "/eclipse_integration/browse":
                            ctl = wdgt_eclipse_integration.js.m_browse;
                            break;
                        case dialog_name + "/eclipse_integration/label":
                            ctl = wdgt_eclipse_integration.js.m_label;
                            break;
                        default:
                            break;
                    }
                    if(ctl)
                    {
                        switch(notify)
                        {
                            case "set text":
                            case "set rtf text":
                                ctl.text = format(value);
                                break;
                            case "show":
                                ctl.visible = true;
                                break;
                            case "hide":
                                ctl.visible = false;
                                break;
                            case "set text limit":
                                ctl.maxLength = value;
                                break;
                            case "set checked":
                                ctl.checked = value;
                                break;
                            case "disable":
                                ctl.enabled = false;
                                break;
                            case "enable":
                                ctl.enabled = true;
                                break;
                            case "set foreground":
                                ctl.foreground = value;
                                break;
                            case "get text":
                                return ctl.text;
                            default:
                                break;
                        }
                    }
                };

                Wizard.Subscribe(dialog_name + "/eclipse_integration/path", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/path", "show", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/path", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/path", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/path", "set rtf text", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/info", "set rtf text", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/info", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/info", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/label","show", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/label","hide", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/label", "set text", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/label", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/label", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box","show", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "set text", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "set text limit", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "set foreground", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/edit_box", "get text", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/browse","show", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/browse", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/browse", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/browse", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/check_box", "set text", function(id, notify, value){if(value)wdgt_eclipse_integration.js.m_check_label.text = format(value);});
                Wizard.Subscribe(dialog_name + "/eclipse_integration/check_box","set checked", process_notify);
                Wizard.Subscribe(dialog_name + "/eclipse_integration/check_box","is checked", function(){return wdgt_eclipse_integration.js.m_check.checked ? 1 : 0;});

                Log(Log.l_debug, "OnAttach Eclipse Integration Widget to dialog complete");
            }
            wdgt_eclipse_integration.OnChange = ns_sender.DialogEvent(wdgt_eclipse_integration);
            wdgt_eclipse_integration.EventEclipseDir.Connect(wdgt_eclipse_integration.OnChange.Transmit("NTF_ECL_DIR"));
            wdgt_eclipse_integration.EventEclipseChecked.Connect(wdgt_eclipse_integration.OnChange.Transmit("NTF_ECL_CHECKED"));
            wdgt_eclipse_integration.EventEclipseUnchecked.Connect(wdgt_eclipse_integration.OnChange.Transmit("NTF_ECL_UNCHECKED"));

            return wdgt_eclipse_integration;
        }

        var event_ndk_dir = ns_event.FEvent();
        var event_ndk_checked = ns_event.FEvent();
        var event_ndk_unchecked = ns_event.FEvent();
        var _ndk_integration_widget_template =
        {
            control: "Grid",
            rows: ["auto", "*"],
            margin: 10,
            name: "m_widget_container",
            children: [
                {
                    control: "StackPanel",
                    valign: "center",
                    GridRow: 0,
                    children: [
                        {
                            control: "Grid",
                            columns: ["auto", "*"],
                            margin: {top: 10},
                            children:[
                                {
                                    control: "CheckBox",
                                    flowDirection: "leftToRight",
                                    name: "m_check",
                                    valign: "center",
                                    threeState: false,
                                    margin: {right: 5},
                                    GridColumn: 0,
                                    onChecked: event_ndk_checked,
                                    onUnchecked: event_ndk_unchecked,
                                    content:
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        name: "m_check_label",
                                        text: "Integrate into NDK*"
                                    }
                                },
                            ]
                        },
                        {
                            control: "Grid",
                            columns: ["auto", "*", "auto"],
                            name: "m_integration",
                            children: [
                                {
                                    control: "TextBlock",
                                    name: "m_label",
                                    maxWidth: 120,
                                    valign: "center",
                                    fontWeight: "bold",
                                    wrap: "wrap",
                                    text: "Android* NDK location: ",
                                    GridColumn: 0
                                },
                                {
                                    control: "TextBox",
                                    minHeight: 24,
                                    maxHeight: 24,
                                    fontSize : small_font,
                                    padding: {left: 3, right: 3, top: 1, bottom: 1},
                                    margin: {left: 5, right: 5},
                                    name: "m_path",
                                    valign: "center",
                                    GridColumn: 1,
                                    changed: event_ndk_dir
                                },
                                {
                                    control: "Button",
                                    minHeight: 24,
                                    maxHeight: 24,
                                    fontSize : medium_font,
                                    padding: {left: 10, right: 10, bottom: 2},
                                    content: format("[destination_button_browse]"),
                                    valign: "center",
                                    GridColumn: 2,
                                    name: "m_browse",
                                    clicked: function()
                                    {
                                        var p = WPF.FolderBrowserDialog(format("[choose_destination]"), this.js.m_path.text);
                                        if(p)
                                            this.js.m_path.text = p;
                                    }
                                }
                            ]
                        },
                    ]
                },
            ]
        };

        Wizard.ControlCollection["NDKIntegrationWidget"] = function()
        {
            var wdgt_ndk_integration = Wizard.BuildControl(_ndk_integration_widget_template);
            wdgt_ndk_integration.Name = "NDK_Integration_Widget";
            wdgt_ndk_integration.EventNDKDir = event_ndk_dir;
            wdgt_ndk_integration.EventNDKChecked = event_ndk_checked;
            wdgt_ndk_integration.EventNDKUnchecked = event_ndk_unchecked;
            wdgt_ndk_integration.Visible = P(true);
            wdgt_ndk_integration.Disabled = P(false);
            var original_height = 0;
            wdgt_ndk_integration.Visible.Subscribe(function()
            {
                if(!wdgt_ndk_integration.Visible())
                {
                    original_height = wdgt_ndk_integration.js.m_widget_container.height;
                    wdgt_ndk_integration.js.m_widget_container.height = 0;
                    wdgt_ndk_integration.js.m_widget_container.enabled = false;
                }
                else
                {
                    wdgt_ndk_integration.js.m_widget_container.height = original_height;
                    wdgt_ndk_integration.js.m_widget_container.enabled = true;
                }
            });
            wdgt_ndk_integration.Disabled.Subscribe(function()
            {
                if(!wdgt_ndk_integration.Disabled())
                    wdgt_ndk_integration.js.m_check.enabled = false;
                else
                    wdgt_ndk_integration.js.m_check.enabled = true;
            });

            wdgt_ndk_integration.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach NDK Integration Widget to dialog " + dialog_name);
                var process_notify = function(id, notify, value)
                {
                    var ctl = null;
                    switch(id)
                    {
                        case dialog_name + "/ndk_integration/check_box":
                            ctl = wdgt_ndk_integration.js.m_check;
                            break;
                        case dialog_name + "/ndk_integration/edit_box":
                            ctl = wdgt_ndk_integration.js.m_path;
                            break;
                        case dialog_name + "/ndk_integration/browse":
                            ctl = wdgt_ndk_integration.js.m_browse;
                            break;
                        case dialog_name + "/ndk_integration/label":
                            ctl = wdgt_ndk_integration.js.m_label;
                            break;
                        default:
                            break;
                    }
                    if(ctl)
                    {
                        switch(notify)
                        {
                            case "set text":
                            case "set rtf text":
                                ctl.text = format(value);
                                break;
                            case "show":
                                ctl.visible = true;
                                break;
                            case "hide":
                                ctl.visible = false;
                                break;
                            case "enable":
                                ctl.enabled = true;
                                break;
                            case "disable":
                                ctl.enabled = false;
                                break;
                            case "set text limit":
                                ctl.maxLength = value;
                                break;
                            case "set checked":
                                ctl.checked = value;
                                break;
                            case "set foreground":
                                ctl.foreground = value;
                                break;
                            case "get text":
                                return ctl.text;
                            default:
                                break;
                        }
                    }
                };

                Wizard.Subscribe(dialog_name + "/ndk_integration/space", "set rtf text", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/label", "set text", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/label", "show", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/label", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/label", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/label", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box","enable", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box","hide", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box","show", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box", "set text", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box", "set text limit", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box", "set foreground", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/edit_box", "get text", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/browse","enable", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/browse","hide", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/browse","show", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/browse", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/check_box","hide", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/check_box","show", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/check_box","set checked", process_notify);
                Wizard.Subscribe(dialog_name + "/ndk_integration/check_box","is checked", function(){return wdgt_ndk_integration.js.m_check.checked ? 1 : 0;});
                Log(Log.l_debug, "OnAttach NDK Integration Widget to dialog complete");
            }
            wdgt_ndk_integration.OnChange = ns_sender.DialogEvent(wdgt_ndk_integration);
            wdgt_ndk_integration.EventNDKDir.Connect(wdgt_ndk_integration.OnChange.Transmit("NTF_NDK_DIR"));
            wdgt_ndk_integration.EventNDKChecked.Connect(wdgt_ndk_integration.OnChange.Transmit("NTF_NDK_CHECKED"));
            wdgt_ndk_integration.EventNDKUnchecked.Connect(wdgt_ndk_integration.OnChange.Transmit("NTF_NDK_UNCHECKED"));

            /*wdgt_ndk_integration.Default = function()
            {
                wdgt_ndk_integration.SetChecked(false);
                wdgt_ndk_integration.Disable();
            }*/

            return wdgt_ndk_integration;
        }

        var event_wb_dir = ns_event.FEvent();
        var event_wb_checked = ns_event.FEvent();
        var event_wb_unchecked = ns_event.FEvent();
        var _wb_integration_widget_template =
        {
            control: "Grid",
            rows: ["auto", "*"],
            margin: 10,
            name: "m_widget_container",
            children: [
                {
                    control: "StackPanel",
                    valign: "center",
                    GridRow: 0,
                    children: [
                        {
                            control: "CheckBox",
                            flowDirection: "leftToRight",
                            name: "m_check",
                            threeState: false,
                            margin: {bottom: 10},
                            onChecked: event_wb_checked,
                            onUnchecked: event_wb_unchecked,
                            content:
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                name: "m_check_label",
                                text: "Integrate into WB"
                            }
                        },
                        {
                            control: "Grid",
                            columns: ["auto", "*", "auto"],
                            name: "m_integration",
                            children: [
                                {
                                    control: "TextBlock",
                                    name: "m_label",
                                    maxWidth: 120,
                                    valign: "center",
                                    fontWeight: "bold",
                                    wrap: "wrap",
                                    text: "Wind River* Linux Home Location: ",
                                    GridColumn: 0
                                },
                                {
                                    control: "TextBox",
                                    minHeight: 24,
                                    maxHeight: 24,
                                    fontSize : small_font,
                                    padding: {left: 3, right: 3, top: 1, bottom: 1},
                                    margin: {left: 5, right: 5},
                                    name: "m_path",
                                    valign: "center",
                                    GridColumn: 1,
                                    changed: event_wb_dir
                                },
                                {
                                    control: "Button",
                                    minHeight: 24,
                                    maxHeight: 24,
                                    fontSize : medium_font,
                                    padding: {left: 10, right: 10, bottom: 2},
                                    content: format("[destination_button_browse]"),
                                    valign: "center",
                                    GridColumn: 2,
                                    name: "m_browse",
                                    clicked: function()
                                    {
                                        var p = WPF.FolderBrowserDialog(format("[choose_destination]"), this.js.m_path.text);
                                        if(p)
                                            this.js.m_path.text = p;
                                    }
                                }
                            ]
                        },
                    ]
                },
            ]
        };


        Wizard.ControlCollection["WBIntegrationWidget"] = function()
        {
            var wdgt_wb_integration = Wizard.BuildControl(_wb_integration_widget_template);
            wdgt_wb_integration.Name = "WB_Integration_Widget";
            wdgt_wb_integration.Visible = P(true);
            wdgt_wb_integration.Disabled = P(false);
            wdgt_wb_integration.EventWBDir = event_wb_dir;
            wdgt_wb_integration.EventWBChecked = event_wb_checked;
            wdgt_wb_integration.EventWBUnchecked = event_wb_unchecked;
            var original_height = 0;
            wdgt_wb_integration.Visible.Subscribe(function()
            {
                if(!wdgt_wb_integration.Visible())
                {
                    original_height = wdgt_wb_integration.js.m_widget_container.height;
                    wdgt_wb_integration.js.m_widget_container.height = 0;
                    wdgt_wb_integration.js.m_widget_container.enabled = false;
                }
                else
                {
                    wdgt_wb_integration.js.m_widget_container.height = original_height;
                    wdgt_wb_integration.js.m_widget_container.enabled = true;
                }
            });
            wdgt_wb_integration.Disabled.Subscribe(function()
            {
                if(!wdgt_wb_integration.Disabled())
                    wdgt_wb_integration.js.m_check.enabled = false;
                else
                    wdgt_wb_integration.js.m_check.enabled = true;
            });

            wdgt_wb_integration.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach WB Integration Widget to dialog " + dialog_name);
                var process_notify = function(id, notify, value)
                {
                    var ctl = null;
                    switch(id)
                    {
                        case dialog_name + "/wb_integration/check_box":
                            ctl = wdgt_wb_integration.js.m_check;
                            break;
                        case dialog_name + "/wb_integration/edit_box":
                            ctl = wdgt_wb_integration.js.m_path;
                            break;
                        case dialog_name + "/wb_integration/browse":
                            ctl = wdgt_wb_integration.js.m_browse;
                            break;
                        case dialog_name + "/wb_integration/label":
                            ctl = wdgt_wb_integration.js.m_label;
                            break;
                        default:
                            break;
                    }
                    if(ctl)
                    {
                        switch(notify)
                        {
                            case "set text":
                            case "set rtf text":
                                ctl.text = format(value);
                                break;
                            case "show":
                                ctl.visible = true;
                                break;
                            case "hide":
                                ctl.visible = false;
                                break;
                            case "set text limit":
                                ctl.maxLength = value;
                                break;
                            case "set checked":
                                ctl.checked = value;
                                break;
                            case "disable":
                                ctl.enabled = false;
                                break;
                            case "enable":
                                ctl.enabled = true;
                                break;
                            case "set foreground":
                                ctl.foreground = value;
                                break;
                            case "get text":
                                return ctl.text;
                            default:
                                break;
                        }
                    }
                };

                Wizard.Subscribe(dialog_name + "/wb_integration/path", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/path", "show", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/path", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/path", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/path", "set rtf text", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/label","show", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/label","hide", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/label", "set text", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/label", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/label", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box","show", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "set text", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "set text limit", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "set foreground", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/edit_box", "get text", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/browse","show", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/browse", "hide", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/browse", "enable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/browse", "disable", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/check_box", "set text", function(id, notify, value){if(value)wdgt_wb_integration.js.m_check_label.text = format(value);});
                Wizard.Subscribe(dialog_name + "/wb_integration/check_box","set checked", process_notify);
                Wizard.Subscribe(dialog_name + "/wb_integration/check_box","is checked", function(){return wdgt_wb_integration.js.m_check.checked ? 1 : 0;});

                Log(Log.l_debug, "OnAttach WB Integration Widget to dialog complete");
            }

            wdgt_wb_integration.OnChange = ns_sender.DialogEvent(wdgt_wb_integration);
            wdgt_wb_integration.EventWBDir.Connect(wdgt_wb_integration.OnChange.Transmit("NTF_WB_DIR"));
            wdgt_wb_integration.EventWBChecked.Connect(wdgt_wb_integration.OnChange.Transmit("NTF_WB_CHECKED"));
            wdgt_wb_integration.EventWBUnchecked.Connect(wdgt_wb_integration.OnChange.Transmit("NTF_WB_UNCHECKED"));

            return wdgt_wb_integration;
        }

        var _integration_checker_widget_template =
        {
            control: "Grid",
            rows: ["auto", "*"],
            margin: 10,
            maxHeight: 0,
            name: "m_widget_container",
        }

        Wizard.ControlCollection["IntegrationCheckerWidget"] = function()
        {
            var wdgt_integration_checker = Wizard.BuildControl(_integration_checker_widget_template);
            wdgt_integration_checker.Name = "Integration_Checker_Widget";

            return wdgt_integration_checker;
        }
    }

    //################################################################################################
    //################################################################################################
    //################################################################################################
    this.BuildWidgets = function()
    {
        var ns = this;

        var build_eclipse_widget = function()
        {
            var eclipse_widget = ns_bld.BuildWidget(Wizard.ControlCollection["EclipseIntegrationWidget"]());
            var d_name = function(){return eclipse_widget.Owner.GetRaw().Name();}

            var eclipse_dir_current_value= "";

            var path_is_valid = false;

            var eclipse_path_is_valid = function()
            {
                var invalid_path = function(reason)
                {
                    Log("Failed path processing: " + reason);
                    Wizard.Notify(d_name() + "/eclipse_integration/path", "set rtf text", format("[eclipse_incorrect_path]", reason));
                    Wizard.Notify("next", "disable");
                }
                Log("incoming path: " + eclipse_dir_current_value);

                var path = eclipse_dir_current_value;

                path_is_valid = false;
                if(!path)
                {
                    Wizard.Notify(d_name() + "/eclipse_integration/path", "set rtf text", "");
                    Wizard.Notify("next", "disable");
                    return false;
                }
                else if(path.length < 3 || !FileSystem.IsAbsolute(path))
                {
                    invalid_path("Not absolute");
                    return false;
                }

                if(path.match(/[<>?*|]/))
                {
                    invalid_path("Incorrect symbols");
                    return false;
                }

                if(FileSystem.IsNetwork() && path.match(/[:]/))
                {
                    invalid_path("Network path contains ':'");
                    return false;
                }

                if(path.split(":").length > 2)
                {
                    invalid_path("More than one ':'");
                    return false;
                }

                if(!(FileSystem.Exists(FileSystem.MakePath("eclipse.exe", path)) && FileSystem.Exists(FileSystem.MakePath(".eclipseproduct", path))))
                {
                    invalid_path("It is not an Eclipse directory.");
                    return false;
                }

                Wizard.Notify(d_name() + "/eclipse_integration/path", "set rtf text", "");

                Wizard.Notify("next", "enable");
                path_is_valid = true;
                return true;
            }

            eclipse_widget.CB_Initialize(function(ret_code)
            {
                Log("eclipse_widget::CB_Initialize entered");
                if(!eclipse_path_is_valid())
                {
                    eclipse_widget.SetChecked(false);
                    eclipse_widget.Disable();
                }
                else
                    Log("Eclipse path is valid, it seems that Eclipse integration has already been configured");
                Log("eclipse_widget::CB_Initialize left");
            });

            eclipse_widget.Set = function( folder_path )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/edit_box","set text", folder_path);
                eclipse_dir_current_value = folder_path;
                eclipse_path_is_valid();
            }

            eclipse_widget.SetLabel = function( mes )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/label", "set text", mes);
            }

            eclipse_widget.SetHeader = function( mes )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/header","set rtf text", mes);
            }

            eclipse_widget.SetFooter = function( mes )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/footer", "set rtf text", mes);
            }

            eclipse_widget.SetInfo = function( mes )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/info","set text", mes);
            }

            eclipse_widget.SetCheckBoxLabel = function( mes )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/check_box", "set text", mes);
            }

            eclipse_widget.Disable = function( )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/label","disable");
                Wizard.Notify(d_name() + "/eclipse_integration/edit_box", "disable");
                Wizard.Notify(d_name() + "/eclipse_integration/browse", "disable");
                Wizard.Notify(d_name() + "/eclipse_integration/path", "disable");
                Wizard.Notify("next", "enable");
            }

            eclipse_widget.Enable = function( )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/label","enable");
                Wizard.Notify(d_name() + "/eclipse_integration/edit_box","enable");
                Wizard.Notify(d_name() + "/eclipse_integration/browse","enable");
                Wizard.Notify(d_name() + "/eclipse_integration/path", "enable");
                eclipse_path_is_valid();
            }

            eclipse_widget.SetChecked = function( val )
            {
                Wizard.Notify(d_name() + "/eclipse_integration/check_box","set checked", val);
            }

            eclipse_widget.IsChecked = function( )
            {
                return Wizard.Notify(d_name() + "/eclipse_integration/check_box","is checked");
            }

            eclipse_widget.IsPathValid = function()
            {
                return path_is_valid;
            }

            eclipse_widget.TargetPath = function()
            {
                return eclipse_dir_current_value;
            }

            var EclipseChangeProcessor = function (value)
            {
                eclipse_dir_current_value= value;
                if(eclipse_path_is_valid())
                {
                    Wizard.Notify(d_name() + "/eclipse_integration/edit_box", "set foreground", "black");
                    var dlg = eclipse_widget.Owner.GetRaw();
                    var wdgt_eclipse_integration = dlg.Eclipse_Integration_Widget;
                    if(wdgt_eclipse_integration && wdgt_eclipse_integration.OnChange)
                        wdgt_eclipse_integration.OnChange(eclipse_dir_current_value);
                }
                else
                {
                    Wizard.Notify(d_name() + "/eclipse_integration/edit_box", "set foreground", "red");
                }
            }

            var CheckedChangeProcessor = function (value)
            {
                if(value)
                    eclipse_widget.Enable();
                else
                    eclipse_widget.Disable();
            }

            eclipse_widget.OnChange(function(sender, event_id)
            {
                switch(event_id)
                {
                case "NTF_ECL_DIR":
                    var eclipse_dir = Wizard.Notify(d_name() + "/eclipse_integration/edit_box", "get text");
                    EclipseChangeProcessor(eclipse_dir);
                    break;
                case "NTF_ECL_CHECKED":
                    CheckedChangeProcessor(true);
                    break;
                case "NTF_ECL_UNCHECKED":
                    CheckedChangeProcessor(false);
                    break;
                default:
                    return;
                }
            });

            Wizard.Notify("eclipse_integration/edit_box", "set text limit", 260);

            return eclipse_widget;
        }

        var build_ndk_widget = function()
        {
            var ndk_widget = ns_bld.BuildWidget(Wizard.ControlCollection["NDKIntegrationWidget"]());
            var d_name = function(){return ndk_widget.Owner.GetRaw().Name();}
            var ndk_dir_current_value= "";
            var ndk_on_change = function(){};

            var ndk_check_path = function(){};
            var path_is_valid = false;

            var ndk_path_is_valid = function()
            {
                var invalid_path = function(reason)
                {
                    Log("Failed path processing: " + reason);
                    Wizard.Notify(d_name() + "/ndk_integration/space", "set rtf text", format("[ndk_incorrect_path]", reason));
                    Wizard.Notify("next", "disable");
                }
                Log("incoming path: " + ndk_dir_current_value);

                var path = ndk_dir_current_value;

                path_is_valid = false;
                if(!path)
                {
                    Wizard.Notify(d_name() + "/ndk_integration/space", "set rtf text", "");
                    Wizard.Notify("next", "disable");
                    return false;
                }
                else if(path.length < 3 || !FileSystem.IsAbsolute(path))
                {
                    invalid_path("Not absolute");
                    return false;
                }

                if(path.match(/[<>?*|]/))
                {
                    invalid_path("Incorrect symbols");
                    return false;
                }

                if(FileSystem.IsNetwork() && path.match(/[:]/))
                {
                    invalid_path("Network path contains ':'");
                    return false;
                }

                if(path.split(":").length > 2)
                {
                    invalid_path("More than one ':'");
                    return false;
                }

                var res = ndk_check_path(path);
                if(typeof(res) != "undefined" && !res){
                    Wizard.Notify("next", "disable");
                    return false;
                }

                Wizard.Notify(d_name() + "/ndk_integration/space", "set rtf text", "");

                Wizard.Notify("next", "enable");
                path_is_valid = true;
                return true;
            }

            ndk_widget.Set = function( folder_path )
            {
                Wizard.Notify(d_name() + "/ndk_integration/edit_box", "set text", folder_path);
                ndk_dir_current_value= folder_path;
                ndk_path_is_valid();
                ndk_on_change(folder_path);
            }

            ndk_widget.SetLabel = function( mes )
            {
                Wizard.Notify(d_name() + "/ndk_integration/label", "set text", mes);
            }

            ndk_widget.SetHeader = function( mes )
            {
                Wizard.Notify(d_name() + "/ndk_integration/header", "set rtf text", mes);
            }

            ndk_widget.SetFooter = function( mes )
            {
                Wizard.Notify(d_name() + "/ndk_integration/footer", "set rtf text", mes);
            }

            ndk_widget.SetInfo = function( mes )
            {
                Wizard.Notify(d_name() + "/ndk_integration/space", "set rtf text", mes);
            }

            ndk_widget.HideCheckBox = function( mes )
            {
                // check box is used without label but near to it the footer is placed
                Wizard.Notify(d_name() + "/ndk_integration/check_box", "hide");
                Wizard.Notify(d_name() + "/ndk_integration/footer", "hide");
            }

            ndk_widget.SetCheckBoxLabel = function( mes )
            {
                Wizard.Notify(d_name() + "/ndk_integration/check_box", "set text", mes);
                // for the standard NDKIntegration Check box doesn't have own text but instead of it has footer near to it
                ndk_widget.SetFooter( mes );
            }

            ndk_widget.SetChecked = function( val )
            {
                Wizard.Notify(d_name() + "/ndk_integration/check_box","set checked", val);
            }

            ndk_widget.IsChecked = function( )
            {
                return Wizard.Notify(d_name() + "/ndk_integration/check_box","is checked");
            }


            ndk_widget.OnPathCheck = function(cb)
            {
                if(!cb)
                  return;

                ndk_check_path = cb;
            }

            ndk_widget.Subscribe = function(cb)
            {
                if(!cb)
                  return;

                ndk_on_change = cb;
            }

            ndk_widget.TargetPath = function()
            {
                return ndk_dir_current_value;
            }

            /*var on_change = ns_event.FEvent();
            ndk_widget.OnChange = function(cb)
            {
                on_change.Connect(cb);
            }*/

            ndk_widget.IsPathValid = function()
            {
                return path_is_valid;
            }

            var NDKChangeProcessor = function (value)
            {
                ndk_dir_current_value = value;
                if(ndk_path_is_valid())
                {
                    Wizard.Notify(d_name() + "/ndk_integration/edit_box", "set foreground", "black");
                    ndk_on_change(ndk_dir_current_value);
                }
                else
                {
                    Wizard.Notify(d_name() + "/ndk_integration/edit_box", "set foreground", "red");
                }
            }

            var NDKCheckedChangeProcessor = function (value)
            {
                if(value)
                    ndk_widget.Enable();
                else
                    ndk_widget.Disable();
            }

            ndk_widget.Disable = function( )
            {
                Wizard.Notify(d_name() + "/ndk_integration/edit_box", "disable");
                Wizard.Notify(d_name() + "/ndk_integration/browse", "disable");
                Wizard.Notify(d_name() + "/ndk_integration/label", "disable");

                ndk_widget.SetInfo("");
            }

            ndk_widget.Enable = function( )
            {
                Wizard.Notify(d_name() + "/ndk_integration/edit_box", "enable");
                Wizard.Notify(d_name() + "/ndk_integration/browse", "enable");
                Wizard.Notify(d_name() + "/ndk_integration/label", "enable");

                ndk_path_is_valid();
            }

            ndk_widget.OnChange(function(sender, event_id)
            {
                switch(event_id)
                {
                case "NTF_NDK_DIR":
                    var ndk_dir = Wizard.Notify(d_name() + "/ndk_integration/edit_box", "get text");
                    NDKChangeProcessor(ndk_dir);
                    break;
                case "NTF_NDK_CHECKED":
                    NDKCheckedChangeProcessor(true);
                    break;
                case "NTF_NDK_UNCHECKED":
                    NDKCheckedChangeProcessor(false);
                    break;
                default:
                    return;
                }
            });

            ndk_widget.CB_Default(function()
            {
                Wizard.Notify(d_name() + "/ndk_integration/edit_box", "set text limit", 260);
            });
           
            ndk_widget.CB_Initialize(function(ret_code)
            {
                Log("ndk_widget::CB_Initialize entered");
                if(!ndk_path_is_valid())
                {
                    ndk_widget.SetChecked(false);
                    ndk_widget.Disable();
                }
                else
                    Log("NDK path is valid, it seems that NDK integration has already been configured");
                Log("ndk_widget::CB_Initialize left");
            });

            return ndk_widget;
        }

        var build_wb_widget = function()
        {
            var wb_widget = ns_bld.BuildWidget(Wizard.ControlCollection["WBIntegrationWidget"]());
            var d_name = function(){return wb_widget.Owner.GetRaw().Name();}

            var check_box_checked = false;
            var wb_dir_current_value= "";

            var wb_on_change = function(){};

            var wb_check_path = function(){};
            var path_is_valid = false;

            var wb_path_is_valid = function()
            {
                var invalid_path = function(reason)
                {
                    Log("Failed path processing: " + reason);
                    Wizard.Notify(d_name() + "/wb_integration/path", "set rtf text", format("[wb_incorrect_path]", reason));
                }
                Log("incoming path: " + wb_dir_current_value);

                var path = wb_dir_current_value;
                path_is_valid = false;

                if(!path)
                {
                    Wizard.Notify(d_name() + "/wb_integration/path", "set rtf text", "");
                    return false;
                }
                else if(path.length < 3 || !FileSystem.IsAbsolute(path))
                {
                    invalid_path("Not absolute");
                    return false;
                }

                if(path.match(/[<>?*|]/))
                {
                    invalid_path("Incorrect symbols");
                    return false;
                }

                if(FileSystem.IsNetwork() && path.match(/[:]/))
                {
                    invalid_path("Network path contains ':'");
                    return false;
                }

                if(path.split(":").length > 2)
                {
                    invalid_path("More than one ':'");
                    return false;
                }

                var res = wb_check_path(path);
                if(typeof(res) != "undefined" && !res){
                    return false;
                }

                Wizard.Notify(d_name() + "/wb_integration/path", "set rtf text", "");

                path_is_valid = true;
                return true;
            }

            wb_widget.Set = function( folder_path )
            {
                Wizard.Notify(d_name() + "/wb_integration/edit_box", "set text", folder_path);
                wb_dir_current_value= folder_path;
                wb_path_is_valid();
                wb_on_change(folder_path);
            }

            wb_widget.SetLabel = function( mes )
            {
                Wizard.Notify(d_name() + "/wb_integration/label", "set text", mes);
            }

            wb_widget.SetHeader = function( mes )
            {
                Wizard.Notify(d_name() + "/wb_integration/header", "set rtf text", mes);
            }

            wb_widget.SetFooter = function( mes )
            {
                Wizard.Notify(d_name() + "/wb_integration/footer", "set rtf text", mes);
            }

            wb_widget.SetInfo = function( mes )
            {
                Wizard.Notify(d_name() + "/wb_integration/path", "set rtf text", mes);
            }

            wb_widget.SetCheckBoxLabel = function( mes )
            {
                Wizard.Notify(d_name() + "/wb_integration/check_box", "set text", mes);
            }

            wb_widget.SetChecked = function( val )
            {
                Wizard.Notify(d_name() + "/wb_integration/check_box","set checked", val);
            }

            wb_widget.IsChecked = function( )
            {
                return Wizard.Notify(d_name() + "/wb_integration/check_box","is checked");
            }

            wb_widget.OnPathCheck = function(cb)
            {
                if(!cb)
                  return;

                wb_check_path = cb;
            }

            wb_widget.Subscribe = function(cb)
            {
                if(!cb)
                  return;

                wb_on_change = cb;
            }

            wb_widget.TargetPath = function()
            {
                return wb_dir_current_value;
            }

            wb_widget.Disable = function( )
            {
                Wizard.Notify(d_name() + "/wb_integration/label","disable");
                Wizard.Notify(d_name() + "/wb_integration/edit_box", "disable");
                Wizard.Notify(d_name() + "/wb_integration/browse", "disable");
                Wizard.Notify(d_name() + "/wb_integration/path", "disable");
                Wizard.Notify("next", "enable");
            }

            wb_widget.Enable = function( )
            {
                Wizard.Notify(d_name() + "/wb_integration/label","enable");
                Wizard.Notify(d_name() + "/wb_integration/edit_box","enable");
                Wizard.Notify(d_name() + "/wb_integration/browse","enable");
                Wizard.Notify(d_name() + "/wb_integration/path", "enable");
                wb_path_is_valid();
            }

            var WBChangeProcessor = function (value)
            {
                wb_dir_current_value= value;
                if(wb_path_is_valid())
                {
                    Wizard.Notify(d_name() + "/wb_integration/edit_box", "set foreground", "black");
                    if(wb_widget.OnChange)
                        wb_on_change(wb_dir_current_value);
                }
                else
                {
                    Wizard.Notify(d_name() + "/wb_integration/edit_box", "set foreground", "red");
                }
            }

            var WBCheckedChangeProcessor = function (value)
            {
                if(value)
                    wb_widget.Enable();
                else
                    wb_widget.Disable();
            }

            wb_widget.CB_Default(function()
            {
                 Wizard.Notify(d_name() + "/wb_integration/edit_box", "set text limit", 260);
            });
           

            wb_widget.IsPathValid = function()
            {
                return path_is_valid;
            }

            wb_widget.CB_Initialize(function()
            {
                Log("wb_widget::CB_Initialize entered");
                if(!wb_path_is_valid())
                {
                    wb_widget.SetChecked(false);
                    wb_widget.Disable();
                }
                else
                    Log("WB path is valid, it seems that WB integration has already been configured");
                Log("wb_widget::CB_Initialize left");
            });

            wb_widget.OnChange(function(sender, event_id)
            {
                switch(event_id)
                {
                case "NTF_WB_DIR":
                    var wb_dir = Wizard.Notify(d_name() + "/wb_integration/edit_box", "get text");
                    WBChangeProcessor(wb_dir);
                    break;
                case "NTF_WB_CHECKED":
                    WBCheckedChangeProcessor(true);
                    break;
                case "NTF_WB_UNCHECKED":
                    WBCheckedChangeProcessor(false);
                    break;
                default:
                    return;
                }
            });

            return wb_widget;
        }

        var build_vs_widget = function()
        {
            var vs_widget = ns_bld.BuildWidget(Wizard.ControlCollection["VSIntegrationWidget"]());
            var d_name = function(){return vs_widget.Owner.GetRaw().Name();}

            var vs_integration_data = null;
            var vs_integration_original_data;

            vs_widget.Data = function(data)
            {
                if(data)
                {
                    Log(" VSIntegration.Data: Setting VS integration data");
                    for(var k in data)
                    {
                        Log(" title = " + data[k].title);
                    }

                    vs_integration_data = data;
                    VSIntegrationData(data);
                    if(typeof vs_integration_original_data == "undefined"){
                        vs_integration_original_data = JSON.parse(JSON.stringify(data));
                        Log("setting vs_integration_original_data: " + JSON.stringify(vs_integration_original_data));
                    }
                }
                else
                {
                   Log(" VSIntegration.Data: Input data parametr is undefined -> return the current data");

                   return vs_integration_data;
                }
            }

            vs_widget.OriginalData = function(){return vs_integration_original_data;}
            //###############################################################
            var vs_integration_continue_checkers = {};

            //###############################################################
            // function which performs check if the continue is allowed if any callback returns true then continue is allowed
            // by default it returns true (if there are not any callbacks)
            //###############################################################
            var vs_integration_check_continue_is_allowed = function()
            {
                var there_are_checkers = false;
                for(var i in vs_integration_continue_checkers)
                {
                  there_are_checkers = true;

                  if(vs_integration_continue_checkers[i].Skip && vs_integration_continue_checkers[i].Skip())
                    continue;

                  if(vs_integration_continue_checkers[i]())
                    return true;
                }

                return there_are_checkers ? false : true;
            }
            //###############################################################
            // adding callbacks which called to check if continue is allowed or not
            // if any callback returns true then continue is allowed
            // each callback can have method Skip
            // usage:
            // AllowContinue(callback)
            // AllowContinue(callback, id)
            // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
            //###############################################################
            vs_widget.AllowContinue = function()
            {
                var args = arguments;

                var id = null;
                var obj = null;

                if(args.length == 2)
                {
                    obj = args[0];
                    id = args[1];
                }
                else if(args.length == 1)
                {
                    obj = args[0];
                    id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
                }
                else if(args.length > 2)
                {
                    Log("AllowContinue too many arguments for function call (> 2). Ignore.");
                    return;
                }
                else
                {
                    Log("AllowContinue was called without arguments -> need to check that continue is allowed");
                    return vs_integration_check_continue_is_allowed();
                }

                if(!id)
                  id = Guid();

                if(!vs_integration_continue_checkers[id])
                {
                    vs_integration_continue_checkers[id] = obj;
                    Log("AllowContinue: add continue_checker " + id);
                }
            }

            var vs_integration_callback = function(control, command, id)
            {
                Log("VSIntegration: Item " + id + " " + command);

                for(var i in vs_integration_data)
                {
                    if(vs_integration_data[i].id == id)
                    {
                        if(command == "selected")
                            vs_integration_data[i].selected = true; // save states for every id
                        else
                            vs_integration_data[i].selected = false;
                    }
                }
            }

            vs_widget.CB_Default(function()
            {
                Wizard.Subscribe(d_name() + "/vs_integration", "selected", vs_integration_callback);
                Wizard.Subscribe(d_name() + "/vs_integration", "unselected", vs_integration_callback);
            });

            var vs_initialized = false;
            vs_widget.CB_Initialize(function()
            {
                Log("vs_widget::CB_Initialize entered");
                if(!vs_initialized)
                {
                    vs_integration_data = ns.VSIntegration.Data();
                    filter(vs_integration_data, function(vs){Wizard.Notify(d_name() + "/vs_integration", "add item", vs);});
                    vs_initialized = true;
                }
                else
                    Log("vs_integration_data has already been initialized");

                Log("vs_widget::CB_Initialize left");
            });

            vs_widget.ResetInit = function()
            {
                vs_initialized = false;
                Wizard.Notify(d_name() + "/vs_integration", "clear items");
            };

            return vs_widget;
        }

        //----------------------------------------------------------
        Wizard.WidgetCollection["build_eclipse_widget"] = build_eclipse_widget;
        Wizard.WidgetCollection["build_vs_widget"] = build_vs_widget;
        Wizard.WidgetCollection["build_wb_widget"] = build_wb_widget;
        Wizard.WidgetCollection["build_ndk_widget"] = build_ndk_widget;
    }

    //################################################################################################
    //################################################################################################
    //################################################################################################    
    this.BuildDialogs = function()
    {
        var ns = this;

        var ide_dialog = function(name)
        {
            var wdgt_eclipse_integration = Wizard.WidgetCollection["build_eclipse_widget"]();
            var wdgt_vs_integration = Wizard.WidgetCollection["build_vs_widget"]();
            var wdgt_wb_integration = Wizard.WidgetCollection["build_wb_widget"]();
            var wdgt_ndk_integration = Wizard.WidgetCollection["build_ndk_widget"]();

            var dlg = ns_bld.BuildDialog(dialogs("base_container.js").BaseModalContainer());
            dlg.Name(name);
            dlg.AttachWidget(wdgt_eclipse_integration);
            dlg.AttachWidget(wdgt_vs_integration);
            dlg.AttachWidget(wdgt_wb_integration);
            dlg.AttachWidget(wdgt_ndk_integration);

            dlg.Eclipse_Integration_Widget.CB_Skip(function()
            {
                Log("EclipseIntegration CB_Skip entered");
                var skip_integration = ns.EclipseIntegration.Skip ? ns.EclipseIntegration.Skip() : true;
                return skip_integration;
            });

            dlg.VS_Integration_Widget.CB_Skip(function()
            {
                Log("VSIntegration CB_Skip entered");
                var skip_integration = ns.VSIntegration.Skip ? ns.VSIntegration.Skip() : true;
                return skip_integration;
            });

            dlg.NDK_Integration_Widget.CB_Skip(function()
            {
                Log("NDKIntegration CB_Skip entered");
                var skip_integration = ns.NDKIntegration.Skip ? ns.NDKIntegration.Skip() : true;
                return skip_integration;
            });

            dlg.WB_Integration_Widget.CB_Skip(function()
            {
                Log("WBIntegration CB_Skip entered");
                var skip_integration = ns.WBIntegration.Skip ? ns.WBIntegration.Skip() : true;
                return skip_integration;
            });

            dlg.Eclipse_Integration_Widget.CB_DisableOnSkip(false);
            dlg.VS_Integration_Widget.CB_DisableOnSkip(false);
            dlg.NDK_Integration_Widget.CB_DisableOnSkip(false);
            dlg.WB_Integration_Widget.CB_DisableOnSkip(false);

            dlg.Eclipse_Integration_Widget.CB_GoNext(function()
            {
                ns.EclipseIntegration.OnNext(ns.EclipseIntegration.TargetPath());
                return true;
            });

            dlg.NDK_Integration_Widget.CB_GoNext(function()
            {
                ns.NDKIntegration.OnNext(ns.NDKIntegration.TargetPath());
                return true;
            });

            var wdgt_integration_checker = ns_bld.BuildWidget(Wizard.ControlCollection["IntegrationCheckerWidget"]());
            var check_integration_status = function(widget)
            {
                //Check if the eclipse integration is skipped
                var skip_integration = widget.Skip();
                var widget_name = widget.Name();
                Log(widget_name + ".Skip is " + skip_integration);
                if(!skip_integration)
                {
                    Log(widget_name + " integration is not skipped, check if it is enabled");
                    if(widget.IsChecked())
                    {
                        Log(widget_name + " integration is checked, check if the path is valid");
                        if(widget.IsPathValid())
                        {
                            Log(widget_name + " path is valid");
                            return true;
                        }
                        else
                        {
                            Log(widget_name + " path is invalid, disable apply");
                            return false;
                        }
                    }
                    else
                    {
                        Log(widget_name + " integration is not checked, it doesn't impact");
                        return true;
                    }
                }
                else
                {
                    Log(widget_name + " integration is skipped, so it doesn't matter");
                    return true;
                }
                return false; //just in case
            }
            dlg.AttachWidget(wdgt_integration_checker);

            wdgt_integration_checker.CB_Initialize(function()
            {
                Log("Integration Checker CB_Initialize entered");
                var enable_apply = true;
                //Let's start from Eclipse Integration widget
                enable_apply = enable_apply && check_integration_status(dlg.Eclipse_Integration_Widget);
                //Then NDK widget with logical AND
                enable_apply = enable_apply && check_integration_status(dlg.NDK_Integration_Widget);
                //Then WB widget
                enable_apply = enable_apply && check_integration_status(dlg.WB_Integration_Widget);
                //If at least one is false, apply button must be disabled
                dlg.ButtonNext.Disabled(!enable_apply);
            });
            dlg.AddDependency(dlg.Eclipse_Integration_Widget, [wdgt_integration_checker]);
            dlg.AddDependency(dlg.NDK_Integration_Widget, [wdgt_integration_checker]);
            dlg.AddDependency(dlg.WB_Integration_Widget, [wdgt_integration_checker]);

            dlg.Integration_Checker_Widget.CB_Skip(function()
            {
                Log("Integration Checker CB_Skip entered");
                var skip_widget = dlg.Eclipse_Integration_Widget.Skip() && dlg.NDK_Integration_Widget.Skip() &&
                    dlg.WB_Integration_Widget.Skip();
                return skip_widget;
            });

            dlg.ButtonNext.Caption("[Ok]");
            dlg.ButtonBack.Caption("[Back]");
            var init_eclipse_integration_checked = false;
            var init_eclipse_integration_path = "";
            var init_ndk_integration_checked = false;
            var init_ndk_integration_path = "";
            var init_wb_integration_checked = false;
            var init_wb_integration_path = "";
            var init_vs_integration_state = [];
            dlg.CB_OwnInitialize(function(ret_code)
            {
                //need to save initial state of integrations
                if(!dlg.Eclipse_Integration_Widget.Skip())
                {
                    init_eclipse_integration_checked = dlg.Eclipse_Integration_Widget.IsChecked();
                    init_eclipse_integration_path = dlg.Eclipse_Integration_Widget.TargetPath();
                }
                if(!dlg.NDK_Integration_Widget.Skip())
                {
                    init_ndk_integration_checked = dlg.NDK_Integration_Widget.IsChecked();
                    init_ndk_integration_path = dlg.NDK_Integration_Widget.TargetPath();
                }
                if(!dlg.WB_Integration_Widget.Skip())
                {
                    init_wb_integration_checked = dlg.WB_Integration_Widget.IsChecked();
                    init_wb_integration_path = dlg.WB_Integration_Widget.TargetPath();
                }
                if(!dlg.VS_Integration_Widget.Skip())
                {
                    init_vs_integration_state = Wizard.OnNotify(dlg.Name() + "/vs_integration", "get items");
                }
            });

            dlg.CB_GoBack(function()
            {
                //restoring initial state for integration widgets
                if(!dlg.Eclipse_Integration_Widget.Skip())
                {
                    dlg.Eclipse_Integration_Widget.SetChecked(init_eclipse_integration_checked);
                    dlg.Eclipse_Integration_Widget.Set(init_eclipse_integration_path);
                }
                if(!dlg.NDK_Integration_Widget.Skip())
                {
                    dlg.NDK_Integration_Widget.SetChecked(init_ndk_integration_checked);
                    dlg.NDK_Integration_Widget.Set(init_ndk_integration_path);
                }
                if(!dlg.WB_Integration_Widget.Skip())
                {
                    dlg.WB_Integration_Widget.SetChecked(init_wb_integration_checked);
                    dlg.WB_Integration_Widget.Set(init_wb_integration_path);
                }
                if(!dlg.VS_Integration_Widget.Skip())
                {
                    //in that case, we need to update items
                    Wizard.Notify(dlg.Name() + "/vs_integration", "update items", init_vs_integration_state);
                }
            });

            return dlg;
        }
        //--------------------------------------------------------
        Wizard.DialogCollection["ide_dialog"] = ide_dialog;
        //create an instance
        ns.IDEDialog = Wizard.DialogCollection["ide_dialog"]("IDEDialog");
    }
}
