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
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();

        var ww100 = window_width;
        var ww10 = ww100/10;
        var ww5 = ww100/20;
        var ww1 = ww100/100;

        var _optional_removal =
        {
            control: "Grid",
            flowDirection: format("[flow_direction]"),
            margin: {left: widget_left, right: widget_left, top: widget_top},
            rows: ["auto", "auto", "*", "auto"],
            stage: "options",
            name: "m_optional_removal_modal_wdgt_container",
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
                            fontFamily : FileSystem.MakePath(format("[clear_light_font]"), Origin.Directory()),
                            margin: {top: 10},
                            text: format("[optional_removal_title]")
                        }
                    ]
                },
                {
                    control: "TextBlock",
                    wrap: "wrapWithOverflow",
                    minHeight: 33,
                    GridRow: 1,
                    inlines: [
                        {
                            control: "Run",
                            name: "m_description_header"
                        }
                    ]
                },
                {
                    control: "TextBlock",
                    wrap: "wrapWithOverflow",
                    minHeight: 33,
                    GridRow: 3,
                    inlines: [
                        {
                            control: "Run",
                            name: "m_description_footer"
                        }
                    ]
                },
                {
                    control: "Border",
                    borderThickness: 1,
                    borderBrush: "black",
                    margin: {top: 10},
                    GridRow: 2,
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
                                        columns: [40, { width: "auto", group: "A" }, "*"],
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
                                                    text: format("[products]")
                                                }
                                            },
                                            {
                                                control: "Border",
                                                GridColumn: 2,
                                                child: {
                                                    control: "TextBlock",
                                                    margin: {left: 3, right: 5},
                                                    halign: "left",
                                                    text: format("[description]")
                                                }
                                            },
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

        var _item =
        {
            control: "TreeViewItemWide",
            hContentAlign: "stretch",
            header: {
                control: "Grid",
                columns: [16, { width: "auto", group: "A" }, "*"],
                children: [
                    {
                        control: "CheckBox",
                        flowDirection: "leftToRight",
                        name: "m_check",
                        threeState: false,
                        checked: "false",
                        // margin: {right: 5},
                        GridColumn: 0,
                    },
                    {
                        control: "TextBlock",
                        name: "m_item_label",
                        wrap: "wrap",
                        margin: {left: 5, right: 5},
                        fontSize: 12,
                        GridColumn: 1,
                    },
                    {
                        control: "TextBlock",
                        name: "m_item_description",
                        margin: {left: 5, right: 5},
                        wrap: "wrap",
                        fontSize: 12,
                        GridColumn: 2,
                    }
                ]
            }
        };

        Wizard.ControlCollection["OptionalRemovalModalWidget"] = function()
        {
            Log(Log.l_debug, "Building OptionalRemovalModalWidget");
            var optional_removal_data = [];
            var control = Wizard.BuildControl(_optional_removal);
            control.Name = "OptionalRemovalModalWidget";
            control.Owner = P();
            control.Visible = P(true);
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_optional_removal_modal_wdgt_container;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });

            control.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach OptionalRemovalModalWidget to dialog " + dialog_name);
                var add_optional_removal_item = function(product)
                {
                    var item = Wizard.BuildControl(_item);
                    item.js.m_item_label.text = format(product.title);
                    item.js.m_item_description.text = format(product.description);
                    item.js.m_check.checked = product.selected;
                    item.js.m_check.enabled = true;

                    control.js.m_tree.items.Add(item);
                    item.id = product.id;
                    optional_removal_data.push(item);
                };

                var get_data = function()
                {
                    Log("OptionalRemovalModalWidget.get_data: Getting dialog data");
                    var data = [];                    
                    for(var i in optional_removal_data)
                    {
                        var item = optional_removal_data[i];
                        var item_info = {
                                selected : item.js.m_check.checked,
                                title : item.js.m_item_label.text,
                                id: item.id
                        };
                        data.push(item_info);
                        Log("OptionalRemovalModalWidget.get_data: " + item_info.id + " selected=" + item_info.selected);
                    }
                    return data;
                };

                var set_data = function(id, notify, data) 
                {
                    Log("OptionalRemovalModalWidget.set_data: Setting dialog data = " + data);
                    control.js.m_tree.items.Clear();
                    optional_removal_data = [];                   
                    filter(data, add_optional_removal_item);                
                };

                var optional_removal_callback = function(control, command, id)
                {
                    Log("OptionalRemovalModalWidget: Item " + id + " " + command);

                    for(var i in optional_removal_data)
                    {
                        if(optional_removal_data[i].id == id)
                        {
                            if(command == "selected")
                                optional_removal_data[i].selected = true; // save states for every id
                            else
                                optional_removal_data[i].selected = false;
                        }
                    }
                }
                var entries_processor = function (entry, id)
                {
                    Log("TL - entry id = " + id);
                    Log("TL - entry type = " + entry.Type());
                    Log("TL - entry length = " + entry.Targets().length);
                    if (entry.Type() == entry.upgrade_type_t.optional && entry.Targets().length)
                    {
                        var intel_product = "";
                        var intel_product_version = "";
                        var targets = entry.Targets();

                        var target_id = targets[0].Object().Id();
                        var installed_product = WI.Product(target_id);
                        var query = installed_product.Query("SELECT * FROM Property WHERE Property = 'INTEL_PRODUCT_NAME' or Property = 'INTEL_PRODUCT_VERSION'");
                        if(query && query.length)
                        {
                            for (var i in query)
                            {
                                switch(query[i].Property)
                                {
                                case "INTEL_PRODUCT_NAME":
                                    intel_product = query[i].Value;
                                    break;
                                case "INTEL_PRODUCT_VERSION":
                                    intel_product_version = query[i].Value;
                                    break;
                                }
                            }
                        }

                        var data_obj = {
                            title: entry.Name(),
                            description: StringList.Format("[version]: "  + intel_product_version),
                            disabled: false,
                            selected: false,
                            id: id,
                            label: id + "_label",
                        };
                        add_optional_removal_item(data_obj);
                    }
                }
                var prod = ns.Product();
                if (prod.InstallMode() == prod.install_mode_t.install || prod.InstallMode() == prod.install_mode_t.modify)
                {
                    prod.Upgrade().FilterEntires(entries_processor);
                    prod.FilterFeaturesRecursive(function(ftr)
                    {
                        ftr.Upgrade().FilterEntires(entries_processor);
                    });
                }

                Wizard.Subscribe("optional_removal_dlg/optional_removal_data", "set data", set_data);
                Wizard.Subscribe("optional_removal_dlg/optional_removal_data", "get data", get_data);
                Wizard.Subscribe("optional_removal_dlg/header_richedit", "set rtf text", function(id,notify,value){control.js.m_description_header.text = format(value).replace(/\\par/gi, "\n").replace(/\\tab/gi, "    ");});
                Wizard.Subscribe("optional_removal_dlg/footer_richedit", "set rtf text", function(id,notify,value){control.js.m_description_footer.text = format(value).replace(/\\par/gi, "\n").replace(/\\tab/gi, "    ");});
            }

            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            return control;
        }
    }

    //################################################################
    //widgets
    //################################################################
    this.BuildWidgets = function(prod)
    {
        var ns = this;
        var wdgt_optional_removal_modal = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["OptionalRemovalModalWidget"]());
            return w;
        }    
        
        Wizard.WidgetCollection["OptionalRemovalModalWidget"] = wdgt_optional_removal_modal;
    }

    //################################################################
    //dialogs
    //################################################################
    this.BuildDialogs = function()
    {
        var ns = this;
        //dialog class
        var optional_removal_modal_dialog = function(name)
        {
            var d = ns_bld.BuildDialog(ns_bc.BaseModalOkayContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["OptionalRemovalModalWidget"]());
            d.ButtonNext.Caption("[Ok]");
            return d;
        }
        //register class
        Wizard.DialogCollection["optional_removal_modal_dialog"] = optional_removal_modal_dialog;
        //create an instance
        ns.OptionalRemovalModalDialog = optional_removal_modal_dialog("OptionalRemovalModalDialog");
    }
}
