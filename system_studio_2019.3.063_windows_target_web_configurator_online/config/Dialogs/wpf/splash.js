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
    var abspath = FileSystem.AbsPath;

    var load = function(name) {return required(abspath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    this.Init = function()
    {
        var ns = this;

        var ns_wpf = base("wpf.js");
        var ns_cfg = load("../../load_xml.js");
        var w = Wizard.Theme().WindowWidth();
        var h = Wizard.Theme().WindowHeight();
        var ph = Wizard.Theme().PixelHeight();

        var _splash =
        {
            control: "Window",
            style: "none",
            resizeMode: "noResize",
            allowsTransparency: true,
            showInTaskbar: true,
            location: "centerScreen",
            width: w,
            height: h,
            closing: function() {Wizard.Cancel(); this.visible = false;},
            background: {
                control: "ImageBrush",
                name: "m_image"
            },
            content: {
                control: "Grid",
                rows: [h - 12*ph, "auto", "*"],
                children: [
                    {
                        control: "TextBlock",
                        GridRow: 1,
                        //valign: "center",
                        flowDirection: StringList.Format("[flow_direction]"),
                        margin: {left: 20, right: 20},
                        name: "m_message"
                    },
                    {
                        control: "ProgressBar",
                        valign: "top",
                        height: 8,
                        GridRow: 2,
                        visible: false,
                        foreground: "#FF006EC1",
                        margin: {top: 2, left: 20, right: 20},
                        name: "m_progress"
                    }
                ]
            }
        };

        this.show_splash_screen = function(_image)
        {
            var image = typeof(_image) == "object" && _image.image ? _image.image : _image;
            var node;
            if(ns_cfg && typeof(ns_cfg.Config) == "function")
                node = ns_cfg.Config().single("/config/splash");

            var splash = Wizard.BuildControl(_splash);
            if(image)
                splash.js.m_image.uri = image;
            else if(node && node.text)
            {
                var splash_file = node.text;
                splash.js.m_image.uri = abspath(Origin.Directory(), splash_file);
            }

            splash.js.m_message.visible = false;
            if(node && node.attributes)
            {
                if(node.attributes["text-color"])
                    splash.js.m_message.foreground = node.attributes["text-color"];
                if(node.attributes["show-text"])
                    splash.js.m_message.visible = node.attributes["show-text"];
            }

            splash.visible = true;

            var total_files = 0;
            var number_of_calls = 0;
            Wizard.Subscribe("splash", "status", function(ctl, act, text) {splash.js.m_progress.value = number_of_calls++; splash.js.m_message.text = text;});
            Wizard.Subscribe("splash", "hide", function() {Log("splash hiding"); splash.visible = false;});
            Wizard.Subscribe("splash", "connect", function(ctl, cmd, id)
            {
                Log("splash connecting: " + id);
                if(id)
                {
                    splash.js.m_progress.Connect(id);
                    splash.js.m_progress.visible = true;
                    splash.js.m_progress.max = total_files;
                    splash.js.m_progress.min = 0;
                    Progress(id).backward = StringList.Format("[flow_direction]") == "rightToLeft" ? true : false;
                }
            });
            Wizard.Subscribe("splash", "disconnect", function(ctl, cmd, id)
            {
                Log("splash disconnecting: " + id);
                splash.js.m_progress.visible = false;
                splash.js.m_progress.Disconnect();
            });
            System.HideStartupProgress();

            var count_files_in_dir = function(dir, mask)
            {
                var files = FileSystem.FindFiles(dir, mask);
                total_files += files.length;
            }
            count_files_in_dir(Origin.Directory(), "*.js");
            count_files_in_dir(FileSystem.AbsPath(Origin.Directory(), "../.."), "*.js");
            count_files_in_dir(FileSystem.AbsPath(Origin.Directory(), "../../Base"), "*.js");
            count_files_in_dir(FileSystem.AbsPath(Origin.Directory(), "../../Media"), "*.xml");
            count_files_in_dir(FileSystem.AbsPath(Origin.Directory(), "../../Prerequisites"), "*.js");
            count_files_in_dir(FileSystem.AbsPath(Origin.Directory(), "../../ProductConfig"), "*.js");

            return splash;
        }

        this.splash_title = function(){};
        this.splash_title_pos = function(){};
        this.splash_status_pos = function(){};
    }
}

