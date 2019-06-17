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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    var format = StringList.Format;

    var wpf      = base("wpf.js");
    var ns_event = base("event.js");

    var itemwidth = 28;
    var radius0 = 4;
    var radius1 = 5;
    var radius2 = 2;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    }

    var binding = function(key, mod, func)
    {
        var b = WPF.KeyBinding();
        if(key)
            b.key = key;
        if(mod)
            b.modifier = mod;
        b.clicked = func;
        return b;
    };

    var allowed = function(obj) {return obj.enabled && obj.visible;};

    var buttons = function(top_el, btns)
    {
        filter(btns, function(btn)
        {
            var finalcall = null; // pointer to function to called by Name

            if(btn.name && btn.meth)
            {
                var name = btn.name;
                var jsname = "m_" + name; // m_name
                var methname = name.substr(0, 1).toUpperCase() + name.substring(1); // Name

                if(top_el.js && top_el.js[jsname])
                {
                    var obj = top_el.js[jsname];
                    top_el[name] = obj;

                    top_el[methname] = function() // create main entry point function to initiate action
                    {
                        if(finalcall)
                        {
                            if(allowed(obj))
                            {
                                finalcall();
                            }
                            else
                                Log("Button create: button is not allowed, ignore call: " + name);
                        }
                        else
                            Log(Log.l_warning, "Button create: final call method is not defined: " + name);
                    };

                    obj.clicked = function() {Log("Button clicked: " + methname); top_el[methname]();};

                    if(!top_el.Show)
                        top_el.Show = ns_event.FEvent();

                    top_el.Show.Connect(function(window)
                    {
                        finalcall = function() {btn.meth(window);};
                    });

                    if(btn.key)
                    { // set binding
                        if(!top_el.bindings)
                            top_el.bindings = [];
                        top_el.bindings.push(binding(btn.key, btn.mod, function() {Log("Binding clicked: " + methname); top_el[methname]();}));
                    }
                }
                else
                    Log(Log.l_warning, "Button create: source property could not be found: " + jsname);
            }
            else
                Log(Log.l_warning, "Button create: no button name or callback method: " + btn.name + " : " + btn.meth);
        });
    };

    var window_height = Wizard.Theme().WindowHeight();
    var top_height = window_height * 8/65;
    var _top =
    {
        control: "Grid",
        //columns: [{width: 162}],
        rows: [{minHeight: top_height}],
        columns: [{maxWidth: 60, minHeight: top_height}, {minHeight: top_height, maxWidth: 440}],
        background: "#ff0070c2",
        children: [
            {
                control: "TextBlock",
                maxHeight: top_height,
                maxWidth: 60,
                GridColumn: 0,
                margin: {left: 10, top: 10},
                background:
                {
                    control: "ImageBrush",
                    uri: FileSystem.MakePath(StringList.Format("[logo_png]"), Origin.Directory())
                }
            },
            {
                control: "StackPanel",
                orientation: "vertical",
                margin: {left: 10, top: 15},
                GridColumn: 1,
                children:
                [
                    {
                        control: "TextBlock",
                        minHeight: top_height,
                        wrap: "wrap",
                        background: "#00000000",
                        foreground: "#ffffffff",
                        fontWeight: "bold",
                        padding: {right: 20},
                        text: StringList.Format("[title]"),
                        fontSize : 22,
                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_font]"), Origin.Directory()),
                        name: "m_product_title"
                    },
                    /*{
                        control: "TextBlock",
                        maxHeight: 40,
                        fontSize : 18,
                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                        text: StringList.Format("[edition]"),
                        name: "m_product_edition"
                    }*/
                ]
            },
        ]
    };

    this.Top = function()
    {
        var t = null;
        if (Wizard.Theme() && Wizard.Theme().Top)
            t = Wizard.Theme().Top();
        else
            t = _top;
        var top_el = wpf.BuildControl(t);
        var set_title = function (id, notify, title) {if(title) top_el.js.m_product_title.text = title};
        var set_edition = function (id, notify, edition) {if(edition) top_el.js.m_product_edition.text = edition};
        Wizard.Subscribe("top/title", "set text", set_title);
        Wizard.Subscribe("top/edition", "set text", set_edition);

        top_el.closing = function() {return top_el.Cancel();};
        return top_el;
    }
}
