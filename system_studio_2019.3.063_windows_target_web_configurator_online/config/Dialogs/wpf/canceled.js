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
        var medium_font = Wizard.Theme().MediumFont();
        
        var ns_wpf = base("wpf.js");
        var ns_nav = load("navigator.js");
        var stat_pick = base("stat_pick.js").Stat_pick;

        var format = StringList.Format;
        var cancel_template = "[cancel_template]";

        var Cancel = function()
        {
            var _canceled = {
                control: "DockPanel",
                lastFill: true,
                margin: widget_left,
                stage: "canceled",
                children: [
                    {
                        control: "StackPanel",
                        Dock: "top",
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
                                text: format("[subtitle_cancel]")
                            }
                        ]
                    },
                    {
                        control: "RichTextBox",
                        Dock: "top",
                        margin: {top: widget_top},
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        name: "m_canceled_text",
                    }
                ]
            };

            var window = ns.Window;
            if(window)
            {
                var canceled = Wizard.BuildControl(_canceled);
                canceled.Name = "Cancelled";
                canceled.navigator = ns_nav.Finish(null);
                canceled.Show = function()
                {
                    if(canceled.js.m_canceled_text && cancel_template){
                        canceled.js.m_canceled_text.rtfText = format(cancel_template);
                    }
                };
                return window.Dialog(canceled);
            }
            else
                return _canceled;
        };

        //do not show cancelled dialog when install or download wasn't launched
        var install_happened = false;
        var set_install = function(id, notify, value)
        {
            if(id === "canceled" && notify === "set install")
                install_happened = value;
        };
        Wizard.Subscribe("canceled", "set install", set_install);
        var CancelDlg = Cancel();
        this.Cancel = function(){
            ALog(Log.l_debug, "Sending statistics in case of cancel");
            stat_pick.Property("CompleteCode", "cancel");
            stat_pick.HPSendStat();
            if(install_happened) //show dialog only if install happened
                CancelDlg();
            return Action.r_cancel;
        };

        this.Cancel.Template = function(tmpl)
        {
            if(tmpl)
                cancel_template = tmpl;
            else
                cancel_template = "[cancel_template]";
        };
    };
};

