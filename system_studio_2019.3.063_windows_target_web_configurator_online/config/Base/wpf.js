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
    // map of properties to process as function:
    // function entry - object who owns property,
    // value - property value
    //
    // general usage: map static/global WPF methods
    var property_map = {
        GridRow: function(obj, value) {WPF.SetGridRow(obj, value);},
        GridColumn: function(obj, value) {WPF.SetGridColumn(obj, value);},
        GridRowSpan: function(obj, value) {WPF.SetGridRowSpan(obj, value);},
        GridColumnSpan: function(obj, value) {WPF.SetGridColumnSpan(obj, value);},
        ZIndex: function(obj, value) {WPF.SetZIndex(obj, value);},
        Dock: function(obj, value) {WPF.SetDock(obj, value);},
        SharedScope: function(obj, value) {WPF.SetGridSharedSizeScope(obj, value);},
        CanvasTop: function(obj, value) {WPF.SetCanvasTop(obj, value);},
        CanvasBottom: function(obj, value) {WPF.SetCanvasBottom(obj, value);},
        CanvasLeft: function(obj, value) {WPF.SetCanvasLeft(obj, value);},
        CanvasRight: function(obj, value) {WPF.SetCanvasRight(obj, value);},
        HScroll: function(obj, value) {WPF.SetHorizontalScrollBarVisibility(obj, value);},
        VScroll: function(obj, value) {WPF.SetVerticalScrollBarVisibility(obj, value);},
        ToolTipShowOnDisabled: function(obj, value) {WPF.SetToolTipShowOnDisabled(obj, value);},
    };

    // default control type
    // allows to add elements without control specifications, like:
    // config string:
    // Polyline: {points: "Point"},
    // { control: "Polyline", points: [{x: 0, y: 0}, {x: 10, y: 10}]}
    // here every element in array has default control type: Point
    var def_cmap = {
        Grid: {columns: "ColumnDefinition", rows: "RowDefinition"},
        ColumnDefinition: {self: "width"},
        RowDefinition: {self: "height"},
        Hyperlink: {inlines: "Run"},
        TextBlock: {inlines: "Run"},
        Span: {inlines: "Run"},
        Run: {self: "text"},
        Polyline: {points: "Point"},
        LinearGradientBrush: {start: "Point", end: "Point", stops: "GradientStop"},
        RadialGradientBrush: {center: "Point", origin: "Point", stops: "GradientStop"},
        TabControl: {items: "TabItem"},
        TreeView: {items: "TreeViewItem"},
        TreeViewItem: {items: "TreeViewItem"},
        TreeViewItemWide: {items: "TreeViewItemWide"},
        FlowDocumentScrollViewer: {document: "FlowDocument"},
        FlowDocument: {blocks: "Paragraph"},
        Paragraph: {inlines: "Run"},
        List: {items: "ListItem"},
        ListItem: {blocks: "Paragraph"},
        CheckBox: {content: "TextBlock"},
        Table: {columns: "TableColumn", rowGroups: "TableRowGroup"},
        TableColumn: {self: "width"},
        TableRowGroup: {self: "rows", rows: "TableRow"},
        TableRow: {cells: "TableCell"},
        TableCell: {self: "blocks", blocks: "Paragraph"},

        // special element: map properties for all controls
        All: {keyBindings: "KeyBinding", bindings: "KeyBinding"}
    };

    var dep_pro = {
        margin: "all",
        padding: "all",
        borderThickness: "all"
    };

    var font = StringList.Format("[font_family]");
    font = font == "font_family" ? "Segoe UI" : font;
    
    var def_map = {
        TextBlock: {fontFamily: font},
        Paragraph: {fontFamily: font},
        RadioButton: {fontFamily: font},
        Button: {style: "FlatStyle"},
        TextBox: {style: "FlatStyle"},
        //Button: {fontFamily: font}
    };    

    var default_theme = {};
    default_theme.Name = "Default";
    default_theme.DefaultsMap = function(){ return def_map; };


    // list of controls to re-assign parent control (some WPF controls don't have parent elements)
    var attach_parent = ["KeyBinding"];

    // set of properties processed separately (excluded from general loop)
    var skip_properties = {control: true, name: true};

    var filter = function(c, cb) {for(var i in c) if(cb(c[i], i)) return true;};
    filter(property_map, function(p, n){skip_properties[n] = true;}); // skip remapped properties from processing

    var log = function(l) {/*Log(l);*/}
    var log_object = function(o) {filter(o, function(ob, n) {log("  Property: " + n + " : " + ob);})};
    
    this.BuildControl = function(template, _theme)
    {
        var names = {};

        // entry function to build control, called recursivly
        // obj - object to process
        // default_control - in case if object doesn't include "control"
        //    attribute - this default item should be used
        // current_attr - WPF object to remap properties, like margin. in some cases
        //    WPF property is nested object, for example margin:{top, bottom, left, right}
        // _theme defines installer's look. DefaultsMap returns a defaults_map object
        // DefaultsMap can depend on resolution, dpi, and other parameteres
        var theme = _theme ? _theme : default_theme;
        var defaults_map = theme.DefaultsMap();
        var build_object = function(obj, default_control, current_attr, parent)
        {
            var self = arguments.callee;

            if(obj)
            {
                log(" ");

                var control = obj.control;

                if(!control && default_control)
                    control = default_control;

                if(typeof(obj) != "object")
                {
                    log("Non object type of control: " + typeof(obj));
                    if(control && def_cmap[control] && def_cmap[control].self)
                    {
                        log("   Creating new object with default value: " + def_cmap[control].self);
                        var nob = {};
                        nob[def_cmap[control].self] = obj;
                        obj = nob;
                    }
                }

                log("Control processing: " + control + "(default : " + default_control + ")");

                log_object(obj);

                if(typeof(control) == "function" || typeof(control) == "object" || control in WPF || current_attr)
                { // ok, we have control
                    var ctl;
                    if(control in WPF)
                    {
                        log("Control found: " + control + " type: " + typeof(WPF[control]));
                        var constr = WPF[control];
                        ctl = constr();
                    }
                    else if(typeof(control) == "function")
                        ctl = control(); // callback function to create control
                    else if(typeof(control) == "object")
                        ctl = control; // control os object - use it as-is
                    else
                    {
                        log("Remapping properties");
                        ctl = current_attr;
                    }

                    if(ctl)
                    {
                        if (control in defaults_map)
                        {
                            log("Found " + control + " in defaults_map");
                            for (var key in defaults_map[control])
                            {
                                // Put default property to ctl only if it missed in passed template
                                if (key in ctl && !(key in obj) && defaults_map[control][key])
                                {
                                    ctl[key] = defaults_map[control][key];
                                    log("Assigned default value: " + defaults_map[control][key] + " for property: " + key);
                                }
                            }
                        }
                        for(var i in obj)
                        {
                            log("Processing attribute: " + i + " : " + obj[i] + " type: " + typeof(obj[i]));
                            if(!(i in skip_properties))
                            {
                                var def;
                                if(obj[i] instanceof Array) // list of elements
                                { // here is a trick:
                                    // in case if value of property is array - algorithm checks for
                                    // method Add in corresponding control property, if true - elements
                                    // are processed step-by-step & passed to Add method
                                    log("Found list of objects, looking for enumerator: " + typeof(ctl[i] ? ctl[i].Add : "unknown"));
                                    var add;
                                    
                                    if(ctl[i] && typeof(ctl[i].Add) == "function")
                                        add = ctl[i].Add; // ok, here is enumerator
                                    else
                                    { // process control as array
                                        ctl[i] = [];
                                        add = (function(el) {return function(e) {el.push(e);};})(ctl[i]);
                                    }

                                    def = (def_cmap && def_cmap[control] && def_cmap[control][i]) ? def_cmap[control][i] : null;
                                    if(!def)
                                        def = (def_cmap && def_cmap.All && def_cmap.All[i]) ? def_cmap.All[i] : null;

                                    filter(obj[i], function(o)
                                    {
                                        log("Processing child element for property: " + i);
                                        log("Object construction iteration, looking for enumerator: " + typeof(ctl[i].Add));
                                        add(self(o, def, null, ctl));
                                        log("Done");
                                        log(" ");
                                    });
                                }
                                else if(typeof(obj[i]) == "function")
                                {   // if any property has function type (usually for callbacks)
                                    // then wrap it to closure - on call of function
                                    // "this" object is current WPF element where all objects who has
                                    // "name" attribute collected in js attribute
                                    // example:
                                    // {name: "my_object"}
                                    // ......
                                    // {click = function() {this.js.my_object.title = "title update";}
                                    //
                                    var context = function(cb)
                                    {
                                        ctl.js = names;
                                        return function() {return cb.apply(ctl, arguments);}
                                    }
                                    ctl[i] = context(obj[i]);
                                }
                                else if(obj[i] instanceof Object)
                                { // remap properties from child object to current attribute
                                    // just copy all attributes from child object to created WPF control
                                    log("Complex attribute processing...");
                                    def = (def_cmap && def_cmap[control] && def_cmap[control][i]) ? def_cmap[control][i] : null;
                                    var ch = self(obj[i], def, ctl[i], ctl);
                                    if(ch)
                                        ctl[i] = ch;
                                    log("Done");
                                    log(" ");
                                }
                                else
                                { // value is regular item (string, number)... let's look at table where
                                  // complex values are enumerated
                                    if(dep_pro && i in dep_pro && dep_pro[i] && ctl[i])
                                    { // great, here is mapping: used simplified item... redirect it to property
                                      // specified in dep_pro table
                                        ctl[i][dep_pro[i]] = obj[i];
                                    }
                                    else
                                        ctl[i] = obj[i]; // simple value - just copy it
                                }
                            }
                            else
                            { // some pre-defined property...
                                if(i in property_map)
                                { // ok, found re-mapped property
                                    if(typeof(property_map[i]) == "function")
                                        property_map[i](ctl, obj[i]);
                                }
                            }
                        }

                        if(control)
                        {
                            if(obj.name) // if object has property "name" - save it to special object
                                names[obj.name] = ctl;

                            // check if "parent" value should be attached
                            filter(attach_parent, function(attach_name)
                            {
                                if(attach_name == control)
                                {
                                    log("Attaching parent property");
                                    ctl.parent = parent;
                                    return true; // exit from filter loop
                                }
                            });

                            return ctl;
                        }
                    }
                }
                else
                    log("Control not found");
            }
        }

        var ret = build_object(template);
        // save object where names of objects are stored into "js" property
        if(ret)
            ret.js = names;
        else
        {
            Log(Log.l_warning, "BuildControl: failed to build control. Trace:");
            DumpTrace();
        }
        return ret;
    }
}
