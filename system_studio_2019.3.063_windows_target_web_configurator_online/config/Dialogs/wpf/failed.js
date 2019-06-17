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

    this.Init = function()
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

        var ns_wpf    = base("wpf.js");
        var ns_nav    = load("navigator.js");
        var ns_errhan = load("error_handler.js");
        var stat_pick = base("stat_pick.js").Stat_pick;

        var format = StringList.Format;

        var error_template = "[error_template]";

        var Error = function()
        {
            var _failed = {
                control: "Grid",
                rows: ["auto", "*"],
                margin: widget_left,
                stage: "failed",
                children: [
                    {
                        control: "StackPanel",
                        GridRow: 0,
                        children: [
                            // {
                            //     control: "TextBlock",
                            //     wrap: "wrap",
                            //     fontSize: 22,
                            //     fontWeight: "bold",
                            //     text: format("[title]")
                            // },
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: medium_font,
                                //fontWeight: "bold",
                                margin: {bottom: 10},
                                text: format("[subtitle_error]")
                            }
                        ]
                    },
                    {
                        control: "FlowDocumentScrollViewer",
                        vscroll: "auto",
                        margin: {top: widget_top},
                        GridRow: 1,
                        document: {
                            name: "m_document",
                            blocks: [
                                {
                                    control: "Paragraph",
                                    fontSize: medium_font,
                                    margin: {top: 20, bottom: 10},
                                    fontWeight: "bold",
                                    foreground: "red",
                                    inlines: [format("[failed_header]")]
                                }
                            ]
                        }
                    }
                ]
            };

            var window = ns.Window;
            if(window)
            {
                var failed = Wizard.BuildControl(_failed);
                failed.Name = "Error";
                failed.navigator = ns_nav.Finish(null);

                failed.Show = function()
                {
                    if(ns_errhan.Failed())
                    {
                        failed.js.m_document.blocks.Add(ns_errhan.Container());
                        failed.js.m_document.blocks.Add(Wizard.BuildControl(
                            {
                                control: "Paragraph",
                                fontSize: small_font,
                                margin: {top: widget_top},
                                borderThickness: 0,
                                inlines: [
                                    format("[logs_location]"),
                                    {
                                        control: "Hyperlink",
                                        uri: format(String(Log.GetLogDir())),
                                        inlines: [format(String(Log.GetLogDir()))],
                                        clicked: function(uri) {Execute.URL(uri);},
                                    },
                                ]
                            }
                        ));
                    }

                    failed.js.m_document.blocks.Add(ns_wpf.BuildControl({
                        control: "Paragraph",
                        fontSize: small_font,
                        margin: {top: 5},
                        inlines: [format("[failed_footer]")]
                    }));

                    stat_pick.Property("CompleteCode", "fail");
                    stat_pick.HPSendStat();
                    Log("Sending statistic in case of Error");
                };

                var dialog = window.Dialog(failed);
                return dialog;
            }
            else
                return _failed;
        };
        var ErrorDlg = Error();

        this.Error = function(){
            ErrorDlg();
            return Action.r_error;
        };

        this.Error.Template = function(tmpl)
        {
            if(tmpl)
                error_template = tmpl;
            else
                error_template = "[error_template]";
        };
    };
};
