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
    var ns_bld    = base("builder.js");
    var ns_prop   = base("property.js");
    var ns_event  = base("event.js");
    var ns_sender = base("event_sender.js");

    var ns_bc =   dialogs("base_container.js");

    var P = function(val){return ns_prop.Property(val);};
    
    var filter = function(coll, cb)
    {
         for(var i in coll)
             if(cb(coll[i], i))
                 return true;
         return false;
    };

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
        
        widget_left = widget_left/2; //enough

        
        Wizard.ControlCollection["OfflineSN"] = function()
        {
            var obj =
            { // evaluate
                control: "StackPanel",
                valign: "center",
                name: "m_evaluate_panel",
                margin: {left: widget_left, right: widget_left, top: widget_top},
                children: 
                [
                    {
                        control: "TextBlock",
                        margin:{top: pixel_height*5},
                        text: format("[offline_sn_header]"),
                    },
                    {
                        control: "TextBlock",
                        margin:{top: pixel_height*5},
                        text: format("[offline_sn_body]"),
                    },
                    {
                        control: "RichTextBox",
                        vscroll: "auto",
                        readOnly: true,
                        borderThickness: 0,
                        documentEnabled: true,
                        clicked: function(uri) {Execute.URL(uri);},
                        margin: {top: pixel_height*5},
                        name: "m_offline_sn_url",
                    },
                ]
            }
            var control = Wizard.BuildControl(obj);
            control.Name = "OfflineSN";
            
            control.OnAttach = function(dialog_name)
            {
                Log("OnAttach License Widget to dialog " + dialog_name);
                Wizard.Subscribe("offline_sn", "set text", function(id, notify, value)
                {
                    if(control.js.m_offline_sn_url)
                    {
                        control.js.m_offline_sn_url.rtfText = StringList.Format("[description_format]", value);
                    }
                });                
            }
            
            //for external subscribers
            control.OnChange = ns_sender.DialogEvent(control);
            return control;
            
        };
    }
    
    //################################################################
    //widgets
    //################################################################
    this.BuildWidgets = function()
    {
        var wdgt_offline_sn = function()
        {
            var w = ns_bld.BuildWidget(Wizard.ControlCollection["OfflineSN"]());
            return w;
        }
        Wizard.WidgetCollection["wdgt_offline_sn"] = wdgt_offline_sn;
    }    

    //################################################################
    //dialogs
    //################################################################
    this.BuildDialogs = function()        
    {
        var ns = this;
        var modal_offline_sn = function(name)
        {
            var d = ns_bld.BuildDialog(ns_bc.BaseModalOkayContainer());
            d.Name(name);
            d.AttachWidget(Wizard.WidgetCollection["wdgt_offline_sn"]());
            d.ButtonNext.Caption("[Close]");
            
            return d;
        }

        //########################################################
        Wizard.DialogCollection["modal_offline_sn"] = modal_offline_sn;
        //create an instance
        ns.ModalOfflineSN = Wizard.DialogCollection["modal_offline_sn"]("ModalOfflineSN");

    }
}
