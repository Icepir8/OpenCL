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
    var create_theme = function()
    {
        var tm = {};
        tm.Name = "Flat";

        Log("Screen resolution: " + System.ScreenWidth() + " X " + System.ScreenHeight());
        var high_dpi = System.ScreenWidth() > 800 ? true : false; 
        
        if (GetOpt.Exists("low-dpi"))
            high_dpi = false;
        if (GetOpt.Exists("high-dpi"))
            high_dpi = true;
        

        tm.SmallFont = function()
        {
            return high_dpi ? 12 : 10;
        }

        tm.MediumFont = function()
        {
            return high_dpi ? 14 : 12;
        }

        tm.LargeFont = function()
        {
            return high_dpi ? 16 : 14;
        }
        
        tm.ExtraLargeFont = function()
        {
            return high_dpi ? 36 : 32;
        }

        tm.WindowHeight = function()
        {
            return high_dpi ? 650 : 546;
        }

        tm.WindowWidth = function()
        {
            return high_dpi ? 500 : 420;
        }
        
        tm.PixelHeight = function()
        {
            return tm.WindowHeight()/100;
        }
        
        tm.PixelWidth = function()
        {
            return tm.WindowWidth()/100;
        }
        
        tm.WidgetLeftMargin = function()
        {
            return tm.PixelWidth() * 4;
        }
        
        tm.WidgetTopMargin = function()
        {
            return tm.PixelHeight() * 2;
        }


        tm.DefaultsMap = function()
        {
            var font = FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory());
            font = "Segoe UI";
            
            var def_map = {
                //labels
                //for content
                Label: {fontFamily: font, fontSize: tm.SmallFont(), wrap: "wrap", padding: {bottom:10}, foreground: "black"},
                //for text
                TextBlock: {fontFamily: font, fontSize: tm.SmallFont(), wrap: "wrap", foreground: "black"},
                //for rtf text
                RichTextBox: {vscroll: "auto",  background: "white", foreground: "black", readOnly: true, documentEnabled: true,},
                
                Paragraph: {fontFamily: font},
                RadioButton: {fontFamily: font, fontSize: tm.SmallFont()},
                CheckBox: {flowDirection: "leftToRight", valign: "center", threeState: false,},
                Button: 
                {
                  style: "FlatStyle", 
                  fontFamily: font, 
                  padding: {left: 10, top: 2, right: 10, bottom: 2},
                  fontSize: tm.MediumFont(),
                  valign: "center",
                  width: "auto",
                  minWidth: high_dpi ? 80 : 60,
                },
                TextBox: {style: "FlatStyle", fontSize: tm.SmallFont(), wrap: "wrap", padding: {left: 3, right: 3, top: 1, bottom: 1},},
                //containers
                StackPanel: {orientation: "vertical", background: "#00000000",},
                DocPanel: {background: "#00000000",},
                Grid: {background: "#00000000"}, 
                TreeView: {background: "white"},
                TreeViewItem: {hContentAlign: "stretch",},
                TreeViewItemWide: {hContentAlign: "stretch",},
                Hyperlink: {style: "FlatStyle", },
            };

            return  def_map;   
        }

        tm.Window = function()
        {
            var window = {
                control: "Window",
                name: "m_window",
                style: "none",
                visible: false,
                background: "#ffffffff",
                width: tm.WindowWidth(),
                height: tm.WindowHeight(),
                minWidth: tm.WindowWidth(),
                minHeight: tm.WindowHeight(),
                //control: "Border",
                borderThickness: 1,
                //borderBrush: "#ff0070c2",
                borderBrush: "#ffe2e3ea",
                location: "centerScreen",
                resizeMode: GetOpt.Exists("main-window-can-resize") ? "canResize" : "canMinimize",
                flowDirection: StringList.Format("[flow_direction]"),
                content:
                {
                    control: "Grid",
                    visible: true,
                    name: "m_window_grid",
                    children: [
                        {
                            control: "ProgressBar",
                            height: 10,
                            min: 0,
                            max: 30,
                            visible: false,
                            GridRow: 0,
                            GridColumn: 0,
                            foreground: "#FF006EC1",
                            vallign: "center",
                            margin: {left: 40, right: 40},
                            name: "m_spin_progress"
                        },
                    ]
                }
            };
            
            return window;
        }
        
        tm.Top = function()
        {
            var window_height = tm.WindowHeight();
            var window_width = tm.WindowWidth();
            var top_height = window_height * 8/65;
            var top =
            {
                control: "Grid",
                rows: [{minHeight: top_height}],
                columns: [{maxWidth: 30, minHeight: top_height}, {minHeight: top_height, maxWidth: window_width - 30}],
                background: "#ff0070c2",
                //background: "#ff01214c", //dark
                children: [
                    {
                        control: "TextBlock",
                        maxHeight: top_height,
                        maxWidth: 30,
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
                                //fontWeight: "bold", //first review
                                valign: "center",
                                padding: {right: 20},
                                text: StringList.Format("[title]"),
                                fontSize : 22,
                                name: "m_product_title"
                            },
                        ]
                    },
                ]
            };
            
            return top;
        }
        
        tm.Pane = function()
        {
            var ns_top = load("top.js");
            var top_el = ns_top.Top();
            var window_height = tm.WindowHeight();
            var window_width = tm.WindowWidth();
            var bottom_height = window_height * 8/65;

            var pane = {
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
                                background: "#ff0070c2", //blue
                                //background: "#ff01214c", //dark
                                children: [
                                    {
                                        control: "Grid",
                                        halign: "stretch",
                                        valign: "center",
                                        margin: {top: bottom_height/4, bottom: bottom_height/4, right: bottom_height/3},
                                        name: "m_navigator"
                                    }
                                ]
                            }
                        ]
                    },
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
            
            return pane;
        }
        //
        return tm;
    }
    
    
    this.Theme = function()
    {
        return create_theme();
    }

}
