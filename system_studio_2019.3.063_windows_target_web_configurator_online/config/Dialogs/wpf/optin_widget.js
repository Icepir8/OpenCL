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

        var _optin_widget_template =
        {
            control: "StackPanel", 
            orientation: "vertical", //we will stack widgets vertically one by one
            //width: ww100 - 2*ww10, //window width (500) minus left margin (45) and right margin (45)
            margin: {top: widget_top, left: widget_left, right: widget_left},
            background: "#00000000", //set alpha-channel to 0 for transparent background
            name: "m_optin_widget_container", //it will contain all widgets
            bindings: [
                {
                    control: "KeyBinding",
                    key: "i",
                    mod: "alt",
                    clicked: function() {this.js.m_accept.checked = true;}
                },
                {
                    control: "KeyBinding",
                    key: "o",
                    mod: "alt",
                    clicked: function() {this.js.m_reject.checked = true;}
                }
            ],
            children:
            [
                {
                    control: "Grid",
                    rows: ["auto", "auto", "auto", "auto"],
                    //width: window_width - 90, //window width (500) minus left margin (45) and right margin (45)
                    stage: "options",
                    children: [

                        {
                            control: "Grid",
                            columns: ["auto", "*"],
                            background: "#00000000", //set alpha-channel to 0 for transparent background
                            children:
                            [
                                {
                                    control: "TextBlock",
                                    wrap: "wrap",
                                    fontSize: 14,
                                    GridColumn: 0,
                                    halign: "left",
                                    fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                    text: format("[optin_subheader]")
                                },
                                
                                {
                                    control: "TextBlock", //hyperlink holder
                                    wrap: "wrap",
                                    fontSize: 14,
                                    GridColumn: 1,
                                    halign: "right",
                                    fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                    inlines: //contains inlines
                                    [
                                        {
                                            control: "Hyperlink",
                                            uri: "http://software.intel.com/en-us/articles/software-improvement-program",
                                            inlines: [StringList.Format("[optin_learn_more]")], //link text
                                            clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                            name: "m_hyperlink" // set name to avoid object clean
                                        }
                                    ]
                                }
                                
                            ]
                        },
                        /*
                        {
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: 14,
                            GridColumn: 0,
                            halign: "left",
                            fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                            text: format("[optin_subheader]")
                        },
                        */
                        
                        {
                            control: "RichTextBox",
                            vscroll: "auto",
                            GridColumn: 0,
                            margin:{left : widget_left/2, top: 5*control_top},
                            readOnly: true,
                            documentEnabled: true,
                            rtfText: format("[optin_template]"),
                            name: "optin_richtext",
                            clicked: function(uri) {Execute.URL(uri);},
                        },
                        
                        
                        {
                            control: "StackPanel",
                            margin:{left : widget_left/2},
                            GridRow: 3,
                            //columns: [{maxWidth: (ww100 - ww5)}, {maxWidth: (ww100 - ww10) / 2}],
                            background: "#00000000", //set alpha-channel to 0 for transparent background
                            children:
                            [
                                {
                                    control: "RadioButton",
                                    content: {
                                        control: "Label",
                                        padding: 0,
                                        content: format("[optin_yes]")
                                    },
                                    group: "optin",
                                    margin: {top: 4*control_top},
                                    //GridColumn: 0,
                                    checked: false,
                                    onChecked: function() {Wizard.Notify("ISM agree", "OnClicked");},
                                    name: "m_accept"
                                },
                                {
                                    control: "RadioButton",
                                    content: {
                                        control: "Label",
                                        padding: 0,
                                        content: format("[optin_no]")
                                    },
                                    group: "optin",
                                    margin: {top: 2*control_top},
                                    //GridColumn: 1,
                                    checked: false,
                                    onChecked: function() {Wizard.Notify("ISM degree", "OnClicked");},
                                    name: "m_reject"
                                },
                                /*
                                {
                                    control: "TextBlock", //hyperlink holder
                                    wrap: "wrap",
                                    fontSize: 12,
                                    //GridColumn: 1,
                                    margin: {top: 2*control_top},
                                    halign: "left",
                                    fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                    inlines: //contains inlines
                                    [
                                        {
                                            control: "Hyperlink",
                                            uri: "http://software.intel.com/en-us/articles/software-improvement-program",
                                            inlines: [StringList.Format("[optin_learn_more]")], //link text
                                            clicked: function(uri) {Execute.URL(uri);}, //action on click -- transfer to uri
                                            name: "m_hyperlink" // set name to avoid object clean
                                        }
                                    ]
                                }
                                */
                            ]
                        }
                    ]
                }
            ]
        };

        Wizard.ControlCollection["OptInWidget"] = function()
        {
            var wdgt_opt_in = Wizard.BuildControl(_optin_widget_template);
            wdgt_opt_in.Name = "OptIn_Widget";

            wdgt_opt_in.Owner = P();
            wdgt_opt_in.Visible = P(true);
            wdgt_opt_in.Visible.Subscribe(function(val)
            {
                var ctrl = wdgt_opt_in.js.m_optin_widget_container;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });

            return wdgt_opt_in;
        }
    }
}
