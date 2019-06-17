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
    var ns_sender = base("event_sender.js");
    var ns_inst = Namespace("Root.installer");
    var ns_event = base("event.js");
    var ns_prop = base("property.js");
    var ns_ver = base("version.js");
    var ns_bld = base("builder.js");

    var ns = this;
    var iswin7os = (System.WindowsInfo().major == 6 && System.WindowsInfo().minor == 1); //indicates only windows 7, a.k.a. 6.1 

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };
    
    var P = function(val){return ns_prop.Property(val);}

    var feature_space_available = function() {return null; }
    var feature_space_required = function() {return null; }
    var feature_space_required_32 = function() {return null; }
    var feature_space_required_64 = function() {return null; }
    var feature_select_cb = function() {}
    var feature_initailize = function() {}
    var feature_continue_checkers = {};
    //var feature_refresh = function() {return null; }
    var revisible = false;

    this.BuildControls = function(prod)
    {
        var ns = this;

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();
        
        var event_feature_selected  = ns_event.FEvent();
        var event_arch_32_checked   = ns_event.FEvent();
        var event_arch_32_unchecked = ns_event.FEvent();
        var event_arch_64_checked   = ns_event.FEvent();
        var event_arch_64_unchecked = ns_event.FEvent();

        var _features_widget_template =
        {
            control: "Grid",
            flowDirection: format("[flow_direction]"),
            margin: {top: 5, left: widget_left, right: widget_left, bottom: 3},
            rows: ["auto", "auto", "*", "auto"],//,"auto", "auto", {height:0}],
            name: "m_features_widget",
            bindings: [{key: "3", mod: "alt", clicked: function() {if(this.js.m_check_32.enabled && this.js.m_check_32.visible) this.js.m_check_32.checked = !this.js.m_check_32.checked;}},
                       {key: "6", mod: "alt", clicked: function() {if(this.js.m_check_64.enabled && this.js.m_check_64.visible) this.js.m_check_64.checked = !this.js.m_check_64.checked;}}],
            children: [
                {
                    control: "Grid",
                    GridRow: 1,
                    name: "m_arch",
                    rows: ["auto", "auto"],
                    columns: ["auto", "auto", "auto"],
                    children: [
                        {
                            control: "TextBlock",
                            wrap: "wrap",
                            GridRow: 0,
                            GridColumn: 0,
                            margin: iswin7os?{bottom: 5, top:5}: {bottom:5},
                            name: "m_text_label",
                            text: format("[arch_feature_message]") //one message is enough
                        },
                        {
                            control: "CheckBox",
                            GridRow: 0,
                            GridColumn: 1,
                            flowDirection: "leftToRight",
                            name: "m_check_32",
                            margin: {left: widget_left},
                            valign: "center",
                            checked: true,
                            threeState: false,
                            onChecked: event_arch_32_checked,
                            onUnchecked: event_arch_32_unchecked,
                            content:{
                                control: "Label",
                                wrap: "wrap",
                                name: "m_check_label",
                                padding: iswin7os?{}:{bottom:10},
                                content: format("[arch_intel_32]")
                            }
                        },
                        {
                            control: "CheckBox",
                            GridRow: 0,
                            GridColumn: 2,
                            flowDirection: "leftToRight",
                            name: "m_check_64",
                            margin: {left: 10},
                            valign: "center",
                            checked: true,
                            threeState: false,
                            onChecked: event_arch_64_checked,
                            onUnchecked: event_arch_64_unchecked,
                            content:{
                                control: "Label",
                                wrap: "wrap",
                                name: "m_check_label",
                                padding: iswin7os?{}:{bottom:10},
                                content: format("[arch_intel_64]")
                            }
                        }
                    ]
                },
                {
                    control: "Grid",
                    GridRow: 2,
                    columns: ["*", "auto"],
                    children: [
                    {
                        control: "Border",
                        borderThickness: 0.5,
                        borderBrush: "black",
                        //minWidth: 500,
                        //maxWidth: 330,
                        //width: "auto",
                        halign: "stretch",
                        valign: "stretch",
                        margin: {bottom: 5},
                        GridColumn: 0,
                        child: {
                            control: "Grid",
                            rows: ["auto", "*"],
                            SharedScope: true,
                            children: [
                                {
                                    control: "Border",
                                    GridRow: 0,
                                    borderThickness: {bottom: 1},
                                    borderBrush: "#cccccccc",
                                    margin: {bottom: 2},
                                    child: {
                                        control: "Grid",
                                        columns: ["*", { width: "auto", group: "A" }, { width: "auto", group: "S" }, { width: "auto", group: "S" }, {width: 20}],
                                        background: "#eeeeeeee",
                                        children: [
                                        ]
                                    }
                                },
                                {
                                    control: "TreeView",
                                    GridRow: 1,
                                    borderThickness: 0,
                                    name: "m_tree",
                                    maxHeight: 190,
                                    minHeight: 190, //without this parameter the control shrinks with few elements
                                    valign: "stretch",
                                    HScroll: "disabled",
                                    //VScroll: "visible",
                                    VScroll: "auto",
                                    margin: {top: -2, bottom: 1, right: 1},
                                }
                            ]
                        }
                    },
                    {
                        control: "StackPanel",
                        orientation: "vertical",
                        GridColumn: 1,
                        //margin: {left: 5},
                        children: [
                        {
                            control: "Button",
                            content: StringList.Format("[Default]"),
                            margin: 1,
                            name: "m_button_default",
                        },
                        {
                            control: "Button",
                            content: StringList.Format("[All]"),
                            margin: 1,
                            name: "m_button_all",
                        }]
                    }]
                },
            ]
        };
        
        var desc_hght = 34;
        var desc_maxhght = 1000;
        var show_descriptions = ns_pb.ParseBoolean(prod.Info().Property("show_descriptions"));
        
        var _features_item_template =
        {
            control: "TreeViewItemWide",
            hContentAlign: "stretch",
            header: {
                control: "Grid",
                columns: ["auto", "*"],
                rows: ["*", "*"],
                children: [
                    {
                        control: "CheckBox",
                        flowDirection: "leftToRight",
                        name: "m_check",
                        valign: "center",
                        margin: {right: 5},
                        threeState: true,
                        GridColumn: 0,
                        GridRow: 0,
                        //onChecked: event_feature_selected,
                        //onUnchecked: event_feature_selected
                    },
                    {
                        control: "TextBlock",
                        name: "m_label",
                        margin: {left: 3, right: 3},
                        textAlignment: "left",
                        //wrap: "wrap", //by review
                        wrap: "nowrap", //by review 
                        GridColumn: 1,
                        GridRow: 0,
                    },
                    {
                        control: "TextBlock",
                        wrap: "wrap",
                        //background: "#eeeeeeee", //by review
                        //foreground: "black", //by review
                        foreground: "gray", //by review
                        fontStyle: "italic", //by review
                        margin: {left: 23, right: 3, top: 5, bottom: 5},
                        halign: "stretch",
                        textAlignment: "left",
                        textTrimming: "wordEllipsis",
                        maxHeight: desc_hght,
                        name: "m_desc",
                        visible: false,
                        GridRow: 1,
                        GridColumnSpan: 2,
                        mouseDown: function(){if(this.js.m_desc.actualHeight <= desc_hght) {this.js.m_desc.height = "auto"; this.js.m_desc.maxHeight = desc_maxhght;} else this.js.m_desc.height = desc_hght;},
                    },
                ]
            }
        };
        
        var _tooltip =
        {
              control: "TextBlock",
              wrap: "wrap",
              foreground: "gray", 
              fontStyle: "italic", 
              maxWidth: 300, 
              halign: "stretch",
              textAlignment: "left",
              textTrimming: "wordEllipsis",
              name: "m_desc"
        }

        Wizard.ControlCollection["FeaturesWidget"] = function()
        {
            var wdgt_features = Wizard.BuildControl(_features_widget_template);
            if(iswin7os)
            { 
                wdgt_features.js.m_text_label.fontFamily = "MS UI Gothic";
            }
            wdgt_features.Name = "Features_Widget";
            wdgt_features.Owner = P();
            wdgt_features.EventFeatureSelected = event_feature_selected;
            wdgt_features.EventArch32Checked = event_arch_32_checked;
            wdgt_features.EventArch32Unchecked = event_arch_32_unchecked;
            wdgt_features.EventArch64Checked = event_arch_64_checked;
            wdgt_features.EventArch64Unchecked = event_arch_64_unchecked;
            wdgt_features.Visible = P(true);
            wdgt_features.Visible.Subscribe(function(val)
            {
                var ctrl = wdgt_features.js.m_features_widget;
                ctrl.visible = val;
                ctrl.enabled = val;
            });

            var stat_pick = base("stat_pick.js").Stat_pick;
            var ns_path_check = base("path_checker.js");

            //################################################
            //Feature widget description starts here
            //################################################

            wdgt_features.OnSelected = function(cb)
            {
                Log("OnSelected");
                if(!cb)
                {
                    Log("Feature Selection Dialog: attempt to assign an undefined callback for the selection processing. Ignore.");
                    return;
                }

                feature_select_cb = cb;

                return feature_select_cb;
            }

            wdgt_features.OnAttach = function(dialog_name)
            {
                var create_filter = function()
                {
                    var features;

                    return function(control, command, value)
                    {
                        var foreach = function(collection, func)
                        {
                            for(var i in collection)
                                if(func(collection[i], i))
                                    return true;
                            return false;
                        }

                        if(ns.Product())
                        {
                            if(!features)
                            {
                                features = {};
                                foreach(ns.Product().FeaturesFullSet(), function(f)
                                {
                                    var node = f.GetNode();
                                    features[f.Id()] = {node:node, feature:f, expanded:node.expanded, visible:node.visible};
                                    return false;
                                });
                            }

                            if(command == "OnChanged")
                            {
                                var _filter_ = value.replace(/^\s+/, "").replace(/\s+$/, "");

                                if(_filter_)
                                { // setting _filter_
                                    var regexp = RegExp(_filter_, "i");
                                    foreach(features, function(f)
                                    { // find matched features
                                        if(f.feature.Name().match(regexp) || f.feature.Description().match(regexp) ||
                                        foreach(f.feature.Components(), function(c) {if(c.Name().match(regexp)) return true; return false;}))
                                        {
                                            Log("Feature matched: " + f.feature.Name());
                                            f.matched = true;
                                        }
                                        else
                                            f.matched = false;
                                        return false;
                                    });

                                    foreach(features, function(f)
                                    { // mark matched features as visible & expanded
                                        if(f.matched || foreach(f.feature.FeaturesFullSet(), function(_f, key)
                                        {
                                            if(features[key].matched)
                                                return true;
                                            return false;
                                        }))
                                        {
                                            Log("Feature marked as visible: " + f.feature.Name());
                                            f.node.visible = true;
                                            f.node.expanded = true;
                                        }
                                        else
                                            f.node.visible = false;
                                        return false;
                                    });

                                    foreach(features, function(f)
                                    { // mark child features as visible
                                        if(f.matched)
                                        {
                                            foreach(f.feature.FeaturesFullSet(), function(_f, key)
                                            {
                                                if(features[_f.Id()])
                                                    features[_f.Id()].node.visible = true;
                                                return false;
                                            });
                                        }
                                    });

                                    foreach(features, function(f) {f.node.Refresh(); return false;});
                                }
                                else
                                { // clearing _filter_
                                    foreach(features, function(f)
                                    {
                                        f.node.visible = f.visible;
                                        f.node.expanded = f.expanded;
                                        return false;
                                    });
                                    foreach(features, function(f) {f.node.Refresh(); return false;});
                                }
                            }
                        }
                    }
                }

                var process_notify = function(id, notify, value)
                {
                    var ctl = null;
                    switch(id)
                    {
                        case dialog_name + "/feature/button_default":
                            ctl = wdgt_features.js.m_button_default;
                            break;
                        case dialog_name + "/feature/button_all":
                            ctl = wdgt_features.js.m_button_all;
                            break;
                        case dialog_name + "/feature/arch":
                            ctl = wdgt_features.js.m_arch;
                            break;
                        default:
                            break;
                    }
                    if(ctl)
                    {
                        switch(notify)
                        {
                            case "set text":
                                ctl.content = format(value);
                                break;
                            case "show":
                                ctl.visible = true;
                                break;
                            case "hide":
                                ctl.visible = false;
                                break;
                            case "disable":
                                ctl.enabled = false;
                                break;
                            case "enable":
                                ctl.enabled = true;
                                break;
                            default:
                                break;
                        }
                    }
                };

                var process_subscriptions = function(subscribe_id)
                {
                    var notifications = ["hide", "show", "disable", "enable", "set text"];
                    for(var i in notifications)
                    {
                        Wizard.Subscribe(subscribe_id, notifications[i], process_notify);
                    }
                };
                process_subscriptions(dialog_name + "/feature/button_default");
                process_subscriptions(dialog_name + "/feature/button_all");
                process_subscriptions(dialog_name + "/feature/arch");
                Wizard.Subscribe(dialog_name + "/feature/filter", "OnChanged", create_filter());
                var set_height = function(id, notify, value)
                {
                    wdgt_features.js.m_tree.maxHeight = value;
                    wdgt_features.js.m_tree.minHeight = value;
                }
                
                Wizard.Subscribe(dialog_name + "/feature/tree", "set height", set_height);

                var arch_required = function(id, notify)
                {
                    if(id != dialog_name + "/feature/arch" || notify != "is required")
                        return;

                    Log("Check if architecture pane is required");
                    var prod = ns.Product();

                    var found_arch = false;
                    prod.FilterFeaturesRecursive(function(current_ftr) //filter through all features
                    {
                        //check if at least one of them has defined target platform
                        if(current_ftr.Info && current_ftr.Info().Property("target_platform"))
                            found_arch = true;
                    });

                    prod.FilterComponentsRecursive(function(current_cmp) //filter through all components
                    {
                        //check if at least one of them has defined target platform
                        if(current_cmp.Info && current_cmp.Info().Property("target_platform"))
                            found_arch = true;
                    });

                    Log("Arch selection required: " + found_arch);
                    wdgt_features.js.m_arch.visible = found_arch;
                    return found_arch; //this thing is needed solely for unit tests
                };
                Wizard.Subscribe(dialog_name + "/feature/arch", "is required", arch_required);
            }

            wdgt_features.Default = function()
            {
                var fr_control = wdgt_features;

                var upgrade = function(fea) {return fea.UpgradeState() == fea.upgrade_state_t.upgrade;};
                var installed_permanently = function(fea) {return fea.Permanent() == fea.permanent_t.yes && fea.Disabled() == fea.disabled_t.yes && fea.Disabled.Attributes.Value("Type") == "5";};
                var action_text = function(fea, text) {return filter(fea.FeaturesFullSet(), function(f) {return f.Visible() && f.Info().Property("hidden") != "true";}) ? "" : text;};
                var download = function(fea)
                {
                    return filter(fea.ComponentsFullSet(),
                        function(c)
                        {
                            if(typeof c.Source == "function"){
                                var src = c.Source();
                                if(src !== null){
                                    return c.Source().Filter(function(s){return !s.Resolved();});
                                }
                            }

                            return false;
                        }
                );};

                var refresh_tree = function(check, fea)
                { // set checkbox state depends from feature state/action
                    check.js.m_check.enabled = !(fea.Disabled() || fea.Mandatory());
                    if(installed_permanently(fea))
                    {
                        check.js.m_check.state = "checked";
                    }
                    else if(fea.Action() == fea.action_t.install)
                    {
                        check.js.m_check.state = "checked";
                    }
                    else if(fea.Action() == fea.action_t.remove)
                    {
                        check.js.m_check.state = "unchecked";
                    }
                    else if(!fea.StateConsistent())
                    {
                        check.js.m_check.state = "middle";
                        //check.js.m_action.text = "";
                    }
                    else if(fea.Action() == fea.action_t.mix)
                    {
                        check.js.m_check.state = "middle";
                        //check.js.m_action.text = "";
                    }
                    else if(fea.Action() == fea.action_t.none)
                    {
                        if(fea.State() == fea.state_t.installed)
                        {
                            check.js.m_check.state = "checked";
                        }
                        else
                        {
                            check.js.m_check.state = "unchecked";
                            //check.js.m_action.text = "";
                        }
                    }
                };

                var addfea = function(fea)
                {
                    fea.Visible.Subscribe(function() {revisible = true;});

                    fea.Disabled.Subscribe(function (val)
                    {
                        if(!fea.Visible()) //invisible features don't have any items
                            return;
                        if(fea.ErrorDescription())
                        {
                            item.js.m_desc.text = fea.ErrorDescription();
                        }
                        else return;

                        item.js.m_desc.visible = val;
                    });

                    if(fea.Visible())
                    {
                        var item;

                        if(fea.Info().Property("hidden") == "true")
                        { // process child elements
                            var ch = [];
                            filter(fea.Features().Items(), function(f){ch = ch.concat(addfea(f));});
                            if(filter(ch, function(c) {return c;})){
                                return ch;
                            }

                            return [];
                        }

                        if(!fea.treeitem)
                        {
                            // Log("Building feature: " + fea.Id() + " : " + fname + " : " + fea.Visible() + " : " + format(fea.Name()) + " : " + fea.UpgradeState());
                            
                            tt = Wizard.BuildControl(_tooltip);
                            tt.js.m_desc.text = show_descriptions ? format(fea.Description()) : format(fea.Name());

                            item = Wizard.BuildControl(_features_item_template);
                            item.js.m_label.text = format(fea.Name());
                            item.js.m_label.tooltip = tt;//show_descriptions ? format(fea.Description()) : format(fea.Name());
                            item.js.m_check.autoId = format(fea.Name());
                            //item.js.m_quality.text = format(fea.Info().Property("quality"));

                            var check = item.js.m_check;

                            item.onSelected = function(force)
                            {
                            };

                            var hit_rec = function(feature, install)
                            {
                                if(install == true)
                                {
                                    feature.Action(feature.action_t.install);
                                    var cmps = feature.Components().Items();
                                    for(var i in cmps)
                                        cmps[i].SetAction(feature.action_t.install);

                                    var ftrs = feature.Features().Items();
                                    for(var i in ftrs)
                                        hit_rec(ftrs[i], true);
                                }
                                else
                                    feature.Action(feature.action_t.remove);
                            };
                            
                            var hit = function(feature, install)
                            {
                                hit_rec(feature, install);
                                fea.Root().Refresh();
                                event_feature_selected();
                            };

                            check.clicked = function()
                            {
                                Log("Fea clicked: " + fea.Name() + " : " + fea.Action() + " : " + fea.State() + " : " + fea.StateConsistent());
                                switch(fea.State())
                                {
                                    case fea.state_t.absent:
                                        switch(fea.Action())
                                        {
                                            case fea.action_t.install:
                                            case fea.action_t.mix:
                                                hit(fea, false);
                                                break;
                                            case fea.action_t.remove:
                                            case fea.action_t.none:
                                                hit(fea, true);
                                                break;
                                            // no default
                                        }
                                        break;
                                    case fea.state_t.installed:
                                        switch(fea.Action())
                                        {
                                            case fea.action_t.install:
                                            case fea.action_t.mix:
                                            case fea.action_t.none:
                                                hit(fea, false);
                                                break;
                                            case fea.action_t.remove:
                                                hit(fea, true);
                                                break;
                                            // no default
                                        }
                                        break;
                                    default:
                                        Log("Unknown state: " + fea.State());
                                        break;
                                }
                            };

                            item.expanded = fea.Expanded();

                            if(typeof fea.CustomNode == "function")
                                item = fea.CustomNode(item, ns) || item; // allow customize node

                            fea.treeitem = item;
                            if(fea.GetNode && typeof fea.GetNode == "function"){
                                var node = fea.GetNode();
                                if(node !== null){
                                    node.Refresh = function(){refresh_tree(item, fea);};
                                }
                                else{
                                    Log("Failed to set Node.Refresh() for feature: " + fea.Name());
                                }
                            }
                        }
                        else
                            item = fea.treeitem;

                        return {item: item, feature: fea};
                    }

                    return [];
                };

                var addfeatures = function(parent, items)
                {
                    var elem = [];

                    filter(parent.Features().Items(), function(f) {elem = elem.concat(addfea(f));});
                    elem.sort(function(a, b) {return a && b ? a.feature.Priority() - b.feature.Priority() : 0;});
                    filter(elem, function(e) {if(e) items.Add(e.item);});
                    //filter(elem, function(e) {if(e) Log("Feature sequence: " + e.feature.Id() + " : " + e.feature.Priority());});
                    filter(elem, function(e) {if(e) addfeatures(e.feature, e.item.items);});
                    return;
                };

                var fill_tree = function()
                {
                    var prod = ns.Product();
                    fr_control.js.m_tree.items.Clear();
                    filter(prod.FeaturesFullSet(), function(f)
                    {
                        if(f.treeitem && f.treeitem.parent && f.treeitem.parent.items &&
                           typeof f.treeitem.parent.items.Remove == "function")
                            f.treeitem.parent.items.Remove(f.treeitem);
                    });

                    if(!prod.Visible() || prod.Info().Property("visible") == "false" || prod.Info().Property("hidden") == "true")
                        addfeatures(prod, fr_control.js.m_tree.items);
                    else
                    {
                        var ri = addfea(prod);
                        if(ri)
                        {
                            fr_control.js.m_tree.items.Add(ri.item);
                            addfeatures(prod, ri.item.items);
                        }
                    }

                    if(fr_control.js.m_tree.items.count)
                        fr_control.js.m_tree.items.Get(0).selected = true;
                };

                fill_tree();

                //feature_on_changed();
                var prod = ns.Product();

                prod.Root().Refresh();

                var select_all = function()
                {
                    filter(prod.FeaturesFullSet(), function(f)
                    {
                        f.Action(f.action_t.install);
                    });
                }
                
                var clear_all = function()
                {
                    prod.Action(prod.action_t.remove);
                }

                fr_control.js.m_button_default.clicked = function()
                {
                    Log("Button 'Default' was clicked");
                    select_all();
                    var set_default_fn = prod.DefaultAction;
                    if(set_default_fn)
                    {
                        Log("Setting default component selection");
                        set_default_fn();
                        prod.Root().Refresh();
                        event_feature_selected();
                    }
                }


                fr_control.js.m_button_all.clicked = function()
                {
                    Log("Button 'All' was clicked");
                    if (prod.Action() == prod.action_t.install)
                        clear_all();
                    else
                        select_all();
                    prod.Root().Refresh();
                    event_feature_selected();
                }
                
                prod.Action.Subscribe(function(act)
                {
                    var cpt = (prod.Action() == prod.action_t.install ?  "[Clear]" : "[All]" );
                    wdgt_features.js.m_button_all.content = format(cpt);
                });
            }

            wdgt_features.OnChange = ns_sender.DialogEvent(wdgt_features);
            wdgt_features.EventFeatureSelected.Connect(wdgt_features.OnChange.Transmit("NTF_FEATURE_SELECTED"));
            wdgt_features.EventArch32Checked.Connect(wdgt_features.OnChange.Transmit("NTF_ARCH_32_CHECKED"));
            wdgt_features.EventArch32Unchecked.Connect(wdgt_features.OnChange.Transmit("NTF_ARCH_32_UNCHECKED"));
            wdgt_features.EventArch64Checked.Connect(wdgt_features.OnChange.Transmit("NTF_ARCH_64_CHECKED"));
            wdgt_features.EventArch64Unchecked.Connect(wdgt_features.OnChange.Transmit("NTF_ARCH_64_UNCHECKED"));

            return wdgt_features;
        }
    }
}
