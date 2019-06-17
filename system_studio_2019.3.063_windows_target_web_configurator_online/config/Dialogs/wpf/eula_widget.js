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
    var ns_inst = Namespace("Root.installer");
    var ns_nav = dialogs("navigator.js");

    var ns_bld = base("builder.js");

    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };
    //==================================================================
    //==================================================================
    this.BuildControls = function()
    {
        var ns = this;

        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var small_font = Wizard.Theme().SmallFont();
        var medium_font = Wizard.Theme().MediumFont();
        

        var _eula_widget_template =
        {
            control: "DockPanel",
            lastFill: true,
            margin: {top: widget_top, left: widget_left, right: widget_left, bottom: 3},
            stage: "license",
            children: [
                {
                    control: "StackPanel",
                    Dock: "top",
                    children: [
                        {
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: medium_font,
                            //fontWeight: "bold",
                            //margin: {bottom: 10},
                            text: format("[subtitle_eula]")
                        }
                    ]
                },
                {
                    control: "Grid",
                    Dock: "bottom",
                    rows: ["*"],
                    columns: ["*", "auto", "auto"],
                    children:[
                        {
                            control: "Button",
                            minHeight: 24,
                            maxHeight: 24,
                            fontSize : medium_font,
                            padding: {left: 10, right: 10, bottom: 2},
                            minWidth: 80,
                            content: format("[Save]"),
                            valign: "center",
                            GridRow: 0,
                            GridColumn: 1,
                            name: "m_save",
                            clicked: function()
                            {
                                WPF.SaveEULADialog(format("[eula_rtf_file]"), format("[eula_filename_tmpl]"));
                            }
                        },
                        {
                            control: "Button",
                            minHeight: 24,
                            maxHeight: 24,
                            fontSize : medium_font,
                            padding: {left: 10, right: 10, bottom: 2},
                            margin: {left: 8},
                            minWidth: 80,
                            content: format("[Print]"),
                            valign: "center",
                            GridRow: 0,
                            GridColumn: 2,
                            name: "m_print",
                            clicked: function()
                            {
                                WPF.PrintEULADialog(format("[eula_rtf_file]"));
                            }
                        }
                    ]
                },
                {
                    control: "RichTextBox",
                    vscroll: "auto",
                    padding: {top: 5},
                    margin: {top: 10, bottom: 10},
                    maxHeight: 380,
                    readOnly: true,
                    documentEnabled: true,
                    rtfText: format("[eula_rtf_file]"),
                    clicked: function(uri) {Execute.URL(uri);},
                    name: "m_text",
                }
            ]
        };

        Wizard.ControlCollection["EULAModalWidget"] = function()
        {
            var wdgt_eula = Wizard.BuildControl(_eula_widget_template);
            wdgt_eula.Name = "EULA_Modal_Widget";

            var set_eula = function(id, notify, text)
            {
                if(text)
                    wdgt_eula.js.m_text.rtfText = text;
            };
            
            Wizard.Subscribe("eula", "set text", set_eula);

            return wdgt_eula;
        }
    };
    //==================================================================
    //==================================================================
    this.BuildWidgets = function()
    {
        var wdgt_eula = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["EULAModalWidget"]());

            w.CB_Default(function()
            {
                w.File(FileSystem.MakePath("../../eula.rtf", Origin.Directory()));
            });
            
            w.File = function(file_path)
            {
                if(file_path)
                {
                    var eula_text = FileSystem.ReadFileUTF8(file_path);
                    Wizard.Notify("eula", "set text", eula_text);
                }
            };
            
            return w;
        }
        //--------------------------------------------------------------
        Wizard.WidgetCollection["wdgt_eula"] = wdgt_eula;
    }
    //==================================================================
    //==================================================================
    this.BuildDialogs = function()
    {
        var ns = this;
        var eula_modal_dialog = function(name)
        {
            var wdgt_eula = Wizard.WidgetCollection["wdgt_eula"]();
            var d = ns_bld.BuildDialog(dialogs("base_container.js").BaseModalOkayContainer());
            d.Name(name);
            d.AttachWidget(wdgt_eula);
            d.ButtonNext.Caption("[Ok]");
            
            return d;
        }
        //--------------------------------------------------------------
        Wizard.DialogCollection["eula_modal_dialog"] = eula_modal_dialog;
        //Create an instance
        ns.EULAModalDialog = Wizard.DialogCollection["eula_modal_dialog"]("EULAModalDialog");
    }
}
