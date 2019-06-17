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
    var ns_bld = base("builder.js");
    var ns_path_check = base("path_checker.js");

    var config_path_checker = function(path){};

    this.BuildControls = function()
    {
        Log(Log.l_debug, "config_file.js::BuildControls start building controls");
        var ns = this;

        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var medium_font = Wizard.Theme().MediumFont();
        var small_font = Wizard.Theme().SmallFont();

        var _config_file_widget_template =
        {
            control: "DockPanel",
            flowDirection: StringList.Format("[flow_direction]"),
            margin: {left: widget_left, right: widget_left, top: 5, bottom: 1},
            name: "m_widget_container",
            children: [
                {
                    control: "Grid",
                    rows: ["auto", "auto", "auto", "auto", "*"],
                    children: [
                        {
                            GridRow: 0,
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: medium_font,
                            text: StringList.Format("[config_file_subtitle]"),
                            name: "m_subtitle"
                        },
                        {
                            GridRow: 1,
                            margin: {top: 5},
                            control: "RichTextBox",
                            readOnly: true,
                            documentEnabled: true,
                            borderThickness: 0,
                            rtfText: StringList.Format("[config_file_description]"),
                            clicked: function(uri) {Execute.URL(uri);},
                            name: "m_description"
                        },
                        {
                            GridRow: 2,
                            margin: {top: 5},
                            control: "Grid",
                            columns: ["auto", "*", "auto"],
                            children: [
                            {
                                GridColumn: 1,
                                control: "TextBox",
                                minHeight: 24,
                                maxHeight: 24,
                                fontSize : small_font,
                                margin: {right: 5},
                                valign: "center",
                                changed: function(path) {config_path_checker(path)},
                                name: "m_config_file_path"
                            },
                            {
                                GridColumn: 2,
                                control: "Button",
                                minHeight: 24,
                                maxHeight: 24,
                                fontSize : medium_font,
                                content: StringList.Format("[destination_button_3dots]"),
                                name: "m_browse",
                                minWidth: 40,
                                maxWidth: 40,
                                margin: { right: 5 },
                                clicked: function()
                                {
                                    var new_path = WPF.OpenFileDialog("", "");
                                    if(new_path)
                                    {
                                        this.js.m_config_file_path.text = new_path;
                                    }
                                }
                            }
                            ]
                        },
                        {
                            GridRow: 3,
                            margin: {top: 5},
                            control: "RichTextBox",
                            readOnly: true,
                            documentEnabled: true,
                            borderThickness: 0,
                            rtfText: StringList.Format("[config_file_footer]"),
                            clicked: function(uri) {Execute.URL(uri);},
                            name: "m_footer"
                        },
                        {
                            GridRow: 4,
                            margin: {top: 5},
                            control: "TextBlock",
                            wrap: "wrap",
                            fontSize: medium_font,
                            text: "",
                            foreground: "red",
                            fontWeight: "bold",
                            name: "m_error_msg"
                        }
                    ]
                }
            ]
        };

        Wizard.ControlCollection["ConfigFileWidget"] = function()
        {
            var wdgt_config_file = Wizard.BuildControl(_config_file_widget_template);
            wdgt_config_file.Name = "Config_File_Widget";
            wdgt_config_file.Visible = P(true);
            wdgt_config_file.Disabled = P(false);

            wdgt_config_file.OnAttach = function(dialog_name)
            {
                Log("OnAttach Config File Widget to dialog " + dialog_name);
                Log("OnAttach Config File Widget to dialog complete");
            }

            return wdgt_config_file;
        }
        Log(Log.l_debug, "getting_started_widget.js::BuildWidgets finish building widgets");
    };

    this.BuildWidgets = function(prod)
    {
        var ns = this;

        var build_config_file_widget = function()
        {
            var config_file_widget = ns_bld.BuildWidget(Wizard.ControlCollection["ConfigFileWidget"]());
            var d_name = function(){return getting_started_widget.Owner.GetRaw().Name();}

            config_file_widget.CB_Initialize(function(ret_code)
            {
                Log("config_file_widget::CB_Initialize entered");
                Log("config_file_widget::CB_Initialize left");
            });

            config_file_widget.CB_Skip(function(ret_code)
            {
                Log("config_file_widget::CB_Skip entered");
                if(!ns.ConfigFileDialog.GetSelectionContent())
                {
                    //there's no point to show this dialog if mapping is missing
                    //because even if a user provides a configuration file there's nothing to map
                    return true;
                }
                if(prod.InstallMode() != prod.install_mode_t.install)
                {
                    return true;
                }
                var mapping_init_done = ns.ConfigFileDialog.IsMappingInitialized();
                Log("config_file_widget::CB_Skip: mapping_init_done: " + mapping_init_done);
                return mapping_init_done;
            });

            config_path_checker = function(path)
            {
                //empty path means do not apply any configuration file
                if(path == "")
                {
                    config_file_widget.Control().js.m_error_msg.text = "";
                    config_file_widget.ButtonNext.Disabled(false);
                    return;
                }

                var config_path = FileSystem.AbsPath(path);
                var pchecker = ns_path_check.PathChecker(config_path);
                pchecker.IsValid();
                if(pchecker.ErrorCode() != pchecker.target_path_error_t.ok)
                {
                    config_file_widget.Control().js.m_error_msg.text = pchecker.ErrorMessage();
                    config_file_widget.ButtonNext.Disabled(true);
                    return;
                }

                if(!FileSystem.Exists(config_path))
                {
                    config_file_widget.Control().js.m_error_msg.text = StringList.Format("[file_not_exist]");
                    config_file_widget.ButtonNext.Disabled(true);
                    return;
                }

                if(FileSystem.IsDirectory(config_path))
                {
                    config_file_widget.Control().js.m_error_msg.text = StringList.Format("[target_path_is_directory]");
                    config_file_widget.ButtonNext.Disabled(true);
                    return;
                }

                if(!ns.ConfigFileDialog.IsConfigurationFileValid(config_path))
                {
                    config_file_widget.Control().js.m_error_msg.text = StringList.Format("[invalid_config_file_message]");

                    config_file_widget.ButtonNext.Disabled(true);
                    return;
                }

                config_file_widget.Control().js.m_error_msg.text = "";
                config_file_widget.ButtonNext.Disabled(false);
            };

            config_file_widget.CB_GoNext(function()
            {
                Log("config_file_widget::CB_GoNext entered");
                var config_path = FileSystem.AbsPath(config_file_widget.Control().js.m_config_file_path.text);
                //only when config file exists
                if(FileSystem.Exists(config_path) && !FileSystem.IsDirectory(config_path))
                {
                    ns.ConfigFileDialog.ApplyConfiguration(config_path);
                }
                return true;
            });

            return config_file_widget;
        }

        //------------------------------------------------------------
        Wizard.WidgetCollection["build_config_file_widget"] = build_config_file_widget;
    };

    this.BuildDialogs = function(prod)
    {
        var ns = this;

        var config_file_dialog = function(name)
        {
            var wdgt_config_file = Wizard.WidgetCollection["build_config_file_widget"]();

            //==========================================================================================
            var dlg = ns_bld.BuildDialog(dialogs("base_container.js").BaseContainer());
            dlg.Name(name);
            dlg.AttachWidget(wdgt_config_file);
            dlg.CB_CustomAction(function() {return true});

            dlg.CB_Skip(function()
            {
                var config_dir = FileSystem.MakePath("/../../", Origin.Directory());
                if(!ns.ConfigFileDialog.GetSelectionContent())
                {
                    return true;
                }
                var mapping_init_done = ns.ConfigFileDialog.IsMappingInitialized();
                Log("config_file_dialog::CB_Skip: mapping_init_done: " + mapping_init_done);
                return mapping_init_done;
            });

            dlg.Config_File_Widget.CB_DisableOnSkip(false);

            return dlg;
        }
        //-----------------------------------------------
        Wizard.DialogCollection["config_file_dialog"] = config_file_dialog;
    };
};
