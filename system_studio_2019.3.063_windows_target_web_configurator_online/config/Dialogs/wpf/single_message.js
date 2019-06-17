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
        var ns_wpf = base("wpf.js");
        var ns_nav = load("navigator.js");
        var format = StringList.Format;

        var eula_enable_prev = false;

        var SingleMessage = function()
        {
            var window = ns.Window;
            var _single_message = {
                control: "DockPanel",
                lastFill: true,
                margin: 10,
                children: [
                    {
                        control: "StackPanel",
                        Dock: "top",
                        children: [
                            {
                                control: "TextBlock",
                                wrap: "wrap",
                                fontSize: 14,
                                fontWeight: "bold",
                                margin: {bottom: 10},
                                name: "m_title",
                                text: ""
                            }
                        ]
                    },
                    {
                        control: "FlowDocumentScrollViewer",
                        vscroll: "auto",
                        name: "m_collector"
                    }
                ]
            };

            if(window)
            {
                var control = Wizard.BuildControl(_single_message);
                control.Name = "SingleMessage";
                control.navigator = ns_nav.BackRetryCancel();

                var set_message = function(id, notify, msg){
                    if(typeof msg != "string"){
                        control.js.m_collector.document = msg;
                    }
                    else
                    {
                        var _msg = {
                            control: "FlowDocument",
                            name: "m_document",
                            blocks: [{
                                control: "Paragraph",
                                fontSize: 12,
                                fontWeight: "bold",
                                inlines: [format(msg)]
                            }]
                        };
                        control.js.m_collector.document = Wizard.BuildControl(_msg);
                    }
                };
                Wizard.Subscribe("single_message", "set msg", set_message);
                Wizard.Subscribe("single_message", "set title", function(id, notify, value){if(control.js.m_title){control.js.m_title.text = value;}});

                control.Show = function(){
                    Wizard.Notify("cancel", "enable");
                    if (eula_enable_prev) {
                        Wizard.Notify("prev", "enable");
                    }
                    else{
                        Wizard.Notify("prev", "disable");
                    }
                };

                var dialog = window.Dialog(control);
                var next = dialog.Navigator().Next;
                dialog.Navigator().Next = function(){next();}

                return dialog;
            }

            return _single_message;
        }

        var SingleMessageDlg = SingleMessage();

        this.SingleMessage = function()
        {
            return SingleMessageDlg();
        };

        this.SingleMessage.EnablePrev = function(enable)
        {
            eula_enable_prev = enable;
        };

        this.SingleMessage.SetMessage = function(msg)
        {
            if(msg && typeof msg != "undefined"){
                Wizard.Notify("single_message", "set msg", msg);
            }
        };

        this.SingleMessage.SetTitle = function(title){
            if(title && typeof title == "string"){
                Wizard.Notify("single_message", "set title", title);
            }
        };
    }
}
