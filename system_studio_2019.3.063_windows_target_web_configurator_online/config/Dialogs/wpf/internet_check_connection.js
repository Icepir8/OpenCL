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
        var format = StringList.Format;
        var internet_check_connection_url = null;

        this.InternetCheckConnection = function()
        {
            var check_url = function(url)
            {
                if (!url){
                    return Action.r_ok;
                }

                if (FileSystem.InternetCheckConnection(url)){
                    return Action.r_ok;
                }

                var ret = Action.r_ok;
                var repeater_pass = false;

                while (ret == Action.r_ok) //sign of retrying
                {
                    if (repeater_pass)
                        Wizard.BusyStart();
                    var res = FileSystem.InternetCheckConnection(url);					
                    if (repeater_pass)
                        Wizard.BusyStop();
                    repeater_pass = true;
                    if(res)
                    {
                        return Action.r_ok;
                    }
                   
                    ns.StageSuite("suite_install");

                    var _msg = {
                        control: "FlowDocument",
                        name: "m_document",
                        fontSize: 14,
                        blocks: [
                            {
                                control: "Paragraph",
                                inlines: [
                                    format("[internet_check_connection_could_not_connect_to_irc] "),
                                    {
                                        control: "Hyperlink",
                                        name: "m_irc",
                                        uri: String(url).replace(/\\/g, "\\\\"),
                                        inlines: [String(url).replace(/\\/g, "\\\\")],
                                        clicked: function(uri) {Execute.URL(uri);},
                                    },
                                ]
                            },
                            {
                                control: "Paragraph",
                                inlines: [
                                    format("[internet_check_connection_please_check] "),
                                    {
                                        control: "Hyperlink",
                                        name: "m_proxy",
                                        uri: String(url).replace(/\\/g, "\\\\"),
                                        inlines: [format("[system_proxy_settings]" )],
                                        clicked: function() {System.ConnectionDialog();},
                                    },
                                    format(" [internet_check_connection_try_again]"),
                                ]
                            },
                        ]
                    };

                    var msg = Wizard.BuildControl(_msg);

                    ns.Buttons("[Retry]", "[Prev]", "[Cancel]");

                    ns.SingleMessage.EnablePrev(false);
                    ns.SingleMessage.SetTitle(format("[subtitle_internet_check_connection]"));
                    ns.SingleMessage.SetMessage(msg);
                    ret = ns.SingleMessage();
                }
                return ret;
            }

            var ret = check_url(internet_check_connection_url);
            return ret;
        }

        this.InternetCheckConnection.URL = function(url)
        {
            if (typeof url != "undefined"){
                internet_check_connection_url = url;
            }

            return internet_check_connection_url;
        }
    }
}
