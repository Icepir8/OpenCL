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

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();

        var _vs_integration_widget_template =
        {
            control: "Grid",
            flowDirection: format("[flow_direction]"),
            margin: {top: widget_top, left: widget_left, right: widget_left, bottom: 3},
            //maxWidth: window_width - 90,
            rows: ["auto", "*", "auto"],
            name: "m_widget_container",
            children: [
                {
                    control: "StackPanel",
                    GridRow: 0,
                    children: [
                        {
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: medium_font,
                            name: "m_subtitle",
                            //fontWeight: "bold",
                            margin: {bottom: 10},
                            text: format("[subtitle_vsintegration]")
                        }
                    ]
                },
                {
                    control: "Border",
                    borderThickness: 1,
                    borderBrush: "black",
                    margin: {top: 10},
                    minHeight: 100,
                    GridRow: 1,
                    child: {
                        control: "ScrollViewer",
                        VScroll: "auto",
                        content: {
                            control: "StackPanel",
                            SharedScope: true,
                            children: [
                                {
                                    control: "Border",
                                    borderThickness: {bottom: 1},
                                    borderBrush: "#cccccccc",
                                    margin: {bottom: 2},
                                    child: {
                                        control: "Grid",
                                        //columns: [40, { width: "auto", group: "A" }, "*"],
                                        columns: [40, { width: "auto", group: "A" }],
                                        background: "#eeeeeeee",
                                        children: [
                                            {
                                                control: "Border",
                                                borderThickness: {right: 1},
                                                margin: {left: 5, right: 3},
                                                borderBrush: "#dddddddd",
                                                GridColumn: 0,
                                                GridColumnSpan: 2,
                                                child: {
                                                    control: "TextBlock",
                                                    margin: {left: 3, right: 5},
                                                    halign: "left",
                                                    text: format("[options_list]")
                                                }
                                            },
                                            /*{
                                                control: "Border",
                                                GridColumn: 2,
                                                child: {
                                                    control: "TextBlock",
                                                    margin: {left: 3, right: 5},
                                                    halign: "left",
                                                    text: format("[description]")
                                                }
                                            },*/
                                        ]
                                    }
                                },
                                {
                                    control: "TreeView",
                                    borderThickness: 0,
                                    name: "m_tree",
                                    HScroll: "disabled",
                                    VScroll: "disabled",
                                    margin: {bottom: 5},
                                    GridRow: 1,
                                }
                            ]
                        }
                    }
                }
            ]
        };

        var _vs_integration_item_template =
        {
            control: "TreeViewItemWide",
            hContentAlign: "stretch",
            header: {
                control: "Grid",
                columns: [16, { width: "auto", group: "A" }, "*", {width: "auto"}],
                children: [
                    {
                        control: "CheckBox",
                        flowDirection: "leftToRight",
                        name: "m_check",
                        threeState: false,
                        // margin: {right: 5},
                        GridColumn: 0,
                    },
                    {
                        control: "TextBlock",
                        name: "m_item_label",
                        wrap: "wrap",
                        margin: {left: 5, right: 5},
                        GridColumn: 1,
                    },
                    {
                        control: "TextBlock",
                        name: "m_item_not_installed",
                        wrap: "wrap",
                        margin: {left: 5, right: 5},
                        GridColumn: 4,
                        text: "",
                    },
                ]
            }
        };

        Wizard.ControlCollection["VSIntegrationWidget"] = function()
        {
            var wdgt_vs_integration = Wizard.BuildControl(_vs_integration_widget_template);
            wdgt_vs_integration.Name = "VS_Integration_Widget";

            wdgt_vs_integration.Visible = P(true);
            wdgt_vs_integration.Disabled = P(false);
            var original_height = 0;
            wdgt_vs_integration.Visible.Subscribe(function()
            {
                if(!wdgt_vs_integration.Visible())
                {
                    original_height = wdgt_vs_integration.js.m_widget_container.height;
                    wdgt_vs_integration.js.m_widget_container.height = 0;
                    wdgt_vs_integration.js.m_widget_container.enabled = false;
                }
                else
                {
                    wdgt_vs_integration.js.m_widget_container.height = original_height;
                    wdgt_vs_integration.js.m_widget_container.enabled = true;
                }
            });

            wdgt_vs_integration.Disabled.Subscribe(function()
            {
                if(!wdgt_vs_integration.Disabled())
                {
                    wdgt_vs_integration.js.m_tree.enabled = false;
                }
                else
                    wdgt_vs_integration.js.m_tree.enabled = true;
            });
            var vs_integration_items_list = []; //backup plan in case items.Get(...) doesn't work

            wdgt_vs_integration.OnAttach = function(dialog_name)
            {
                var add_vs = function(id, notify, vs)
                {
                    if(id == dialog_name + "/vs_integration" && notify == "add item")
                    {
                        var _item = _vs_integration_item_template;
                        var item = Wizard.BuildControl(_item);
                        item.js.m_item_label.text = format(vs.title);
                        item.js.m_check.state = vs.selected ? "checked" : "unchecked";
                        item.js.m_check.enabled = vs.disabled ? false : true;

                        if(vs.disabled)
                        {
                            if(vs.incomplete) //give a hint why it was disabled
                                item.js.m_item_not_installed.text = format("[vs_install_not_complete]");
                            else
                                item.js.m_item_not_installed.text = format("[vs_not_installed]");
                        }

                        var check = item.js.m_check;
                        check.onChecked = function(){Wizard.Notify(dialog_name + "/vs_integration", "selected", vs.id);};
                        check.onUnchecked = function(){Wizard.Notify(dialog_name + "/vs_integration", "unselected", vs.id);};

                        wdgt_vs_integration.js.m_tree.items.Add(item);
                        vs_integration_items_list.push(item);
                    }

                    if(id == dialog_name + "/vs_integration" && notify == "clear items")
                    {
                        wdgt_vs_integration.js.m_tree.items.Clear();
                        vs_integration_items_list = [];
                    }
                    if(id == dialog_name + "/vs_integration" && notify == "get items")
                    {
                        //so far 'get items' is only called from configuration.js
                        //message for VS integration is composed there
                        //thus integration info list is needed
                        //it consists of objects with state and title of VS items
                        items_list = []
                        for(var index = 0; index < wdgt_vs_integration.js.m_tree.items.count; index++)
                        {
                            var vs_item = wdgt_vs_integration.js.m_tree.items.Get(index);
                            if(!vs_item)
                                vs_item = vs_integration_items_list[index];

                            var item_info = {
                                disabled : !vs_item.js.m_check.enabled,
                                selected : vs_item.js.m_check.checked,
                                title : vs_item.js.m_item_label.text
                            };
                            items_list.push(item_info);
                        }
                        return items_list;
                    }

                    if(id == dialog_name + "/vs_integration" && notify == "update items")
                    {
                        if(!vs)
                            return;

                        for(var index in vs) //go through all array
                        {
                            vs_item = vs[index]; //this is going to be the current state
                            //then iterate through all WPF objects
                            for(var i = 0; i < wdgt_vs_integration.js.m_tree.items.count; i++)
                            {
                                var wpf_vs_item = wdgt_vs_integration.js.m_tree.items.Get(i);
                                if(!wpf_vs_item)
                                    wpf_vs_item = vs_integration_items_list[i];

                                //if titles match, update the item and break the loop
                                if(wpf_vs_item.js.m_item_label.text == vs_item.title)
                                {
                                    wpf_vs_item.js.m_check.enabled = !vs_item.disabled;
                                    wpf_vs_item.js.m_check.checked = vs_item.selected;
                                    break;
                                }
                            }
                        }
                    }
                };
                Wizard.Subscribe(dialog_name + "/vs_integration", "add item", add_vs);
                Wizard.Subscribe(dialog_name + "/vs_integration", "clear items", add_vs);
                Wizard.Subscribe(dialog_name + "/vs_integration", "get items", add_vs);
                Wizard.Subscribe(dialog_name + "/vs_integration", "update items", add_vs);
            }

            Log("Adding vs integration items into vs_integration widget");
            return wdgt_vs_integration;
        }
    }

}
