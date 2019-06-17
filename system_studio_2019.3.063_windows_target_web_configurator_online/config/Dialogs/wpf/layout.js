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

    var ns_wpf  = base("wpf.js");
    var ns_left = load("left.js");
    var ns_top = load("top.js");

    this.Lefted = function()
    {
        var left = ns_left.Left();
        var top_el = ns_top.Top();

        var window_height = Wizard.Theme().WindowHeight();
        var bottom_height = window_height * 8/65;

        var _pane = {
            control: "DockPanel",
            flowDirection: StringList.Format("[flow_direction]"),
            halign: "stretch",
            valign: "stretch",
            lastFill: true,
            children: [
                {
                    control: "StackPanel",
                    Dock: "bottom",
                    children: [
                        {
                            control: "Grid",
                            background: "#ffb4b4b4",
                            height: 1
                        },
                        {
                            control: "Grid",
                            name: "m_bottom",
                            height: bottom_height,
                            //uncomment it when you want gradient background back
                            /*background :
                            {
                                control: "ImageBrush",
                                uri: FileSystem.MakePath(StringList.Format("[bottom_gradient_png]"), Origin.Directory())
                            },*/
                            background: "#ff0070c2",
                            children: [
                                {
                                    control: "Grid",
                                    halign: "stretch",
                                    valign: "center",
                                    //minHeight: 21,
                                    margin: {top: bottom_height/4, bottom: bottom_height/4, right: bottom_height/3},
                                    name: "m_navigator"
                                }
                            ]
                        }
                    ]
                },
                /*{ //we don't need banners anymore
                    control: left,
                    halign: "stretch",
                    valign: "stretch",
                    Dock: "left",
                    name: "m_left"
                },*/
                //need to write stuff on the top of the window though
                {
                    control: top_el,
                    halign: "stretch",
                    valign: "stretch",
                    Dock: "top",
                    name: "m_top"
                },
                {
                    control: "Grid",
                    rows: ["*"],
                    halign: "stretch",
                    valign: "stretch",
                    name: "m_content"
                }
            ]
        };
        var p = null;
        if (Wizard.Theme() && Wizard.Theme().Pane)
            p = Wizard.Theme().Pane();
        else
            p = _pane;
        var pane = Wizard.BuildControl(p);
        pane.Navigator = function() {return pane.js.m_navigator;}
        pane.Content = function() {return pane.js.m_content;}
        pane.Bottom = function() {return pane.js.m_bottom;}
        pane.Top = function() {return pane.js.m_top;}
        //pane.Left = function() {return pane.js.m_left;}

        return pane;
    }
}



