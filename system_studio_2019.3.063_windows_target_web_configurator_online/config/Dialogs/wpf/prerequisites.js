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
    var ns_pb =   base("parse_bool.js");
    var ns_pr =   base("pendingreboot.js");
    var ns_wpf =  base("wpf.js");
    var ns_inst = base("Installer.js");
    var ns_prop = base("property.js");

    var ns_bld =  base("builder.js");
    var ns_bc =   dialogs("base_container.js");
    var P = function(val){return ns_prop.Property(val);}



    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

    //==========================================================================================
    //==========================================================================================
    //==========================================================================================         
    this.BuildControls = function()
    {
        var ns = this;
        var window_width = Wizard.Theme().WindowWidth();
        var window_height = Wizard.Theme().WindowHeight();
        var widget_left = Wizard.Theme().WidgetLeftMargin();
        var widget_top = Wizard.Theme().WidgetTopMargin();
        var pixel_width = Wizard.Theme().PixelWidth();
        var pixel_height = Wizard.Theme().PixelHeight();
        var medium_font = Wizard.Theme().MediumFont();

        var _prerequisites_widget_template =
        {
            control: "StackPanel",
            margin: { top: widget_top, bottom: widget_top, right: widget_left, left: widget_left },
            children: [
                {
                    control: "StackPanel",
                    children: [
                        {
                            control: "TextBlock",
                            fontSize: medium_font,
                            margin: {bottom: 10},
                            text: format("[subtitle_prerequisites]"),
                            visible : false, //by review
                        },
                        {
                            control: "TextBlock",
                            margin: {bottom: 10},
                            fontSize: medium_font, //by review
                            text: format("[prerequisites_only_warning]"),
                            name: "m_header",
                        }
                    ]
                },
                {
                    control: "Border",
                    //borderThickness: 1,
                    //borderBrush: "black",
                    child: 
                    {
                        control: "ScrollViewer",
                        VScroll: "auto",
                        maxHeight: window_height - 300,
                        content: 
                        {
                            control: "StackPanel",
                            name: "m_stack",
                            orientation: "vertical",
                            margin: 0,
                            children: [
                            //
                            ],
                        },
                    },
                },
            ]
        };
        
        
        var g_fatal = 
        {
                    control: "Grid",
                    columns: [{width: 30}, "auto"],
                    clicked: function(uri){Execute.URL(uri);},
                    fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                    name: "m_container",
                    //valign: "top",
                    children:
                    [
                        {
                            control: "Image",
                            uri: FileSystem.MakePath(StringList.Format("[fatal_png]"), Origin.Directory()),
                            stretch: "none",
                            name: "m_image",
                            valign: "top",
                            halign: "center",
                            minWidth: 16,
                            GridColumn: 0,
                        },
                        {
                            control: "RichTextBox",
                            GridColumn: 1,
                            minWidth: window_width - 66 - 2 * widget_left ,
                            clicked: function(uri){Execute.URL(uri);},
                            fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                            name: "m_text",
                            borderThickness: 0,
                            documentEnabled: true,
                        },
                       
                       
                    ]
        };
        
        var g_warning = 
        {
                    control: "Grid",
                    columns: [{width: 30}, "auto"],
                    clicked: function(uri){Execute.URL(uri);},
                    fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                    name: "m_container",
                    //valign: "top",
                    children:
                    [
                        {
                            control: "Image",
                            uri: FileSystem.MakePath(StringList.Format("[warning_png]"), Origin.Directory()),
                            stretch: "none",
                            name: "m_image",
                            valign: "top",
                            halign: "center",
                            minWidth: 16,
                            GridColumn: 0,
                        },
                        {
                            control: "RichTextBox",
                            GridColumn: 1,
                            minWidth: window_width - 66 - 2 * widget_left ,
                            clicked: function(uri){Execute.URL(uri);},
                            fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                            name: "m_text",
                            borderThickness: 0,
                            documentEnabled: true,
                        },
                       
                       
                    ]
        };
        
        

        Wizard.ControlCollection["PrerequisitesWidget"] = function()
        {
            var prereq = Wizard.BuildControl(_prerequisites_widget_template);
            prereq.Name = "Prerequisites_Widget";
            prereq.Owner = P();
            
            
            var add_fatal = function(id, notify, msg)
            {
                    if(typeof msg == "string")
                    {
                        var p_fatal = Wizard.BuildControl(g_fatal);
                        p_fatal.js.m_text.rtfText = format(msg);
                        prereq.js.m_stack.children.Add(p_fatal);
                    }
            };
            
            var add_warning = function(id, notify, msg)
            {
                    if(typeof msg == "string")
                    {
                        var p_warning = Wizard.BuildControl(g_warning);
                        p_warning.js.m_text.rtfText = format(msg);
                        prereq.js.m_stack.children.Add(p_warning);
                    }
            };

            
            var set_header = function(id, notify, msg)
            {
                    if(typeof msg == "string")
                    {
                        prereq.js.m_header.text = format(msg);
                    }
            };
            
            var clear = function(id, notify, msg)
            {
                   prereq.js.m_stack.children.Clear();
            };
            
        
            prereq.OnAttach = function(dialog_name)
            {
                Wizard.Subscribe(dialog_name + "/prerequisite_text", "add fatal", add_fatal);
                Wizard.Subscribe(dialog_name + "/prerequisite_text", "add warning", add_warning);
                Wizard.Subscribe(dialog_name + "/prerequisite_text", "clear", clear);
                Wizard.Subscribe(dialog_name + "/header", "set text", set_header);
            }

           
            return prereq;
        }

    }

    //==========================================================================================
    //==========================================================================================
    //==========================================================================================    
    this.BuildWidgets = function(prod)
    {
        var ns = this;
        //==========================================================================================
        var prerequisites_widget = function()
        {
            var class_ctrl = Wizard.ControlCollection["PrerequisitesWidget"];
            var p_w = ns_bld.BuildWidget(class_ctrl());
            var prereq_template = "[prereq_template]";  
            var fp = ns.FillPrerequisites;   

            var were_critical_and_warnings = false;
            var were_critical = false;
            var were_only_warnings = false;
                    
            p_w.CB_Skip(function()
            {
                Log("   Calling Skip - prerequisites widget");
                if (fp.Skip())
                {
                    Log("   prerequisites widget is skipped due to FillPrerequisites is skipped");
                    return true;
                }
                var prereq_fatal = fp.FatalArray();
                var prereq_critical = fp.CriticalArray();
                var prereq_warning = fp.WarningArray();
                var prereq_info = fp.InfoArray();
                return prereq_fatal.length || prereq_critical.length || prereq_warning.length || prereq_info.length ? false : true;
            });
            
            p_w.CB_Initialize(function()
            {
                Log("   Calling Initialize - prerequisites widget");
                var prereq_fatal = fp.FatalArray();
                var prereq_critical = fp.CriticalArray();
                var prereq_warning = fp.WarningArray();
                var prereq_info = fp.InfoArray();
                
                var dialog_name = p_w.Owner.GetRaw().Name();
                
                Wizard.Notify(dialog_name + "/prerequisite_text", "clear");

                var message = "";
                if(prereq_fatal.length)
                {
                    for(var f in prereq_fatal){
                        message += prereq_fatal[f];
                        Wizard.Notify(dialog_name + "/prerequisite_text", "add fatal", StringList.Format(prereq_template, prereq_fatal[f]));
                    }
                }
                else
                {
                    for(var c in prereq_critical){
                        Wizard.Notify(dialog_name + "/prerequisite_text", "add fatal", StringList.Format(prereq_template, prereq_critical[c]));
                    }
                    for(var w in prereq_warning){
                        Wizard.Notify(dialog_name + "/prerequisite_text", "add warning", StringList.Format(prereq_template, prereq_warning[w]));
                    }
                    for(var i in prereq_info){
                        //assume info prerequisite as a warning without abitity to resolve and recheck 
                        Wizard.Notify(dialog_name + "/prerequisite_text", "add warning", StringList.Format(prereq_template, prereq_info[i]));
                    }
                }
                
                if (prereq_fatal.length && ns_inst.Installer.OnlineInstaller())
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_fatal]");
                else if (prereq_fatal.length)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_fatal_offline]");
                else if (prereq_critical.length && prereq_warning.length)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_blocking] [prerequisites_warning]");
                else if (prereq_critical.length)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_blocking]");
                else if (prereq_warning.length && were_critical)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_blocking_resolved]");
                else if (prereq_warning.length)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_only_warning]");
                else if (were_critical_and_warnings)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_all_resolved]");
                else if (were_critical)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_blocking_resolved]");
                else if (were_only_warnings)
                    Wizard.Notify(dialog_name + "/header", "set text", "[prerequisites_only_warning_resolved]");
                
                //Wizard.Notify(dialog_name + "/prerequisite_text", "set visible", (prereq_fatal.length || prereq_critical.length || prereq_warning.length));

                p_w.ButtonNext.Disabled(prereq_fatal.length || prereq_critical.length);
                //and there goes prerequisites' texts logging
                for(var index in prereq_fatal)
                    Log("prereq_fatal[" + index + "]: " + StringList.Format(prereq_template, prereq_fatal[index]));

                for(var index in prereq_critical)
                    Log("prereq_critical[" + index + "]: " + StringList.Format(prereq_template, prereq_critical[index]));

                for(var index in prereq_warning)
                    Log("prereq_warning[" + index + "]: " + StringList.Format(prereq_template, prereq_warning[index]));

                for(var index in prereq_info)
                    Log("prereq_info[" + index + "]: " + StringList.Format(prereq_template, prereq_info[index]));
            });
            
            p_w.File = function(file)
            {
                var path = FileSystem.MakePath(file, Origin.Directory());
                if(FileSystem.Exists(path))
                {
                    prereq_template = FileSystem.ReadFileUTF8(path);
                }
                else{
                    Log(Log.l_error, "failed to load file: " + path + " (no prereq template available)");
                }
            }

            p_w.Template = function(tmpl)
            {
                prereq_template = tmpl;
            }
            
            p_w.ReCheck = function()
            {
                var recheck = function()
                {
                    var prereq_critical = fp.CriticalArray();
                    var prereq_warning = fp.WarningArray();
                    var prereq_info = fp.InfoArray();
                    were_critical_and_warnings = prereq_critical.length > 0 && prereq_warning.length > 0; 
                    were_critical = prereq_critical.length > 0;
                    were_only_warnings = prereq_warning.length > 0;
                    fp();
                    Log("Prerequisites have been rechecked"); 
                    var rechk = prereq_critical.length > 0 || prereq_warning.length > 0 ;
                    Log("Is recheck required: " + rechk);
                    if(p_w.Owner.GetRaw().ButtonCustom)
                        p_w.Owner.GetRaw().ButtonCustom.Visible(rechk);              
                }
                recheck();
            };
            
            return p_w;
        }
        
        //----------------------------------------------------
        Wizard.WidgetCollection["prerequisites_widget"] = prerequisites_widget;
        
    };
 
        
    //==========================================================================================
    //==========================================================================================
    //========================================================================================== 
    this.BuildDialogs = function(prod)
    {
        var ns = this;    
        //-------------------------------------      
        var prerequistes_dialog = function(name)
        {
            var dlg = ns_bld.BuildDialog(ns_bc.BaseContainer());
            dlg.Name(name);
            dlg.AttachWidget(Wizard.WidgetCollection["prerequisites_widget"]());
            
            dlg.CB_OwnInitialize(function()
            {
                var fp = ns.FillPrerequisites;
                dlg.ButtonCustom.Caption("[ReCheck]");
                var disable_prerequisites_recheck = ns_pb.ParseBoolean(prod.Info().Property("disable_prerequisites_recheck"));
                
                var prereq_critical = fp.CriticalArray();
                var prereq_warning = fp.WarningArray();
                var prereq_info = fp.InfoArray();
                var recheck = prereq_critical.length > 0 || prereq_warning.length > 0 ;
                Log("Is disabled: " + disable_prerequisites_recheck);
                Log("Is recheck required: " + recheck);
                dlg.ButtonCustom.Visible(!disable_prerequisites_recheck && recheck);
                
            });
            
            dlg.CB_CustomAction(function()
            {
                dlg.Prerequisites_Widget.ReCheck();
                dlg.Initialize();
                return false; //to stay on the dialog
            });        
            
            return dlg;
        }

        //------------------------------------- 
        var fatal_dialog = function(name)
        {
            var cont = (ns_inst.Installer.OnlineInstaller() ? ns_bc.BaseFatalOnline() : ns_bc.BaseFatalOffline());
            var dlg = ns_bld.BuildDialog(cont);
            dlg.Name(name);
            dlg.AttachWidget(Wizard.WidgetCollection["prerequisites_widget"]());
            
            var was_shown = false;
            
            dlg.CB_OwnInitialize(function()
            {
                was_shown = true;

                if (ns_inst.Installer.OnlineInstaller())
                    dlg.ButtonCancel.Caption("[Cancel Installation]");
                else
                    dlg.ButtonCancel.Caption("[Cancel]");
                dlg.ButtonBack.Visible(false);
                dlg.ButtonNext.Visible(ns_inst.Installer.OnlineInstaller());
            });
            
            dlg.ButtonsProcessor(function()
            {
                // empty, no response to widgets requestes
            });
            
            dlg.CB_GoNext(function()
            {
                if (!ns_inst.Installer.InstallationDenied())
                    ns_inst.Installer.InstallationDenied(true);
                if (!ns_inst.Installer.DownloadOnly())
                    ns_inst.Installer.DownloadOnly(true);
                Log("Mode has been changed to DownloadOnly");
                return true;
            });
            
            //own skip
            dlg.ForceSkip(true);
            dlg.CB_Skip(function()
            {
                //in order to show the dialog when moving back
                if (was_shown)
                {
                    Log("   fatal prerequisites dialog is NOT skipped because it was shown")
                    return false;
                }
                
                if (ns_inst.Installer.DownloadOnly())
                {
                    Log("   fatal prerequisites dialog is skipped due to download-only mode");
                    return true;
                }
                var fp = ns.FillPrerequisites;
                var prereq_fatal = fp.FatalArray();
                if (!prereq_fatal.length)
                {
                    Log("   fatal prerequisites dialog is skipped, no fatals were found");
                    return true;
                }
                return false;
            });
            
            return dlg;
        }

        //==========================================================================================
        Wizard.DialogCollection["prerequistes_dialog"] = prerequistes_dialog;
        Wizard.DialogCollection["fatal_dialog"] = fatal_dialog;
      

    }
}
