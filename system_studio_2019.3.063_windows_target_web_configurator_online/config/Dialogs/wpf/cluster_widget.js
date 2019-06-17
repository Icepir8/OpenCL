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

    var ns_bld    = base("builder.js");
    var ns_prop   = base("property.js");
    var ns_event  = base("event.js");
    var ns_sender = base("event_sender.js");
    var ns_inst   = base("installer.js");
    var ns_help   = base("helper_sn.js");

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

        Wizard.ControlCollection["ClusterWidget"] = function()
        {
            Log(Log.l_debug, "Building ClusterWidget");
            var event_cl = ns_event.FEvent();
            
            var obj =
            {
                control: "StackPanel", 
                orientation: "vertical", //we will stack widgets vertically one by one
                //width: ww100 - 2*ww10, //window width (500) minus left margin (45) and right margin (45)
                margin: {top: widget_top * 2, left: widget_left, right: widget_left},
                background: "#00000000", //set alpha-channel to 0 for transparent background
                name: "m_cluster_widget_container", //it will contain all widgets
                children:
                [
                    //Adding Grid in order to draw sections in the same place
                    {
                        control: "Grid",
                        background: "#00000000", 
                        children:
                        [
                            //#####################
                            //install
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_cluster_install",
                                visible: true,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        fontSize: 14,
                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                        text: StringList.Format("[left_cluster_configuration]")
                                    },
                                    {
                                        control: "StackPanel", //here go our 4 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*control_top, left: widget_left},
                                        //background: "#00000000", //set alpha-channel to 0 for transparent background
                                        children:
                                        [
                                            //checkbox
                                            {
                                                control: "CheckBox",
                                                flowDirection: "leftToRight",
                                                name: "m_cluster",
                                                threeState: false,
                                                checked: false,
                                                onChecked: event_cl,
                                                onUnchecked: event_cl,
                                                content:
                                                {
                                                    control: "TextBlock",
                                                    wrap: "wrap",
                                                    name: "m_cluster_label",
                                                    text: "[cluster_install_message]"
                                                }
                                            },
 

                                        ]
                                    },
                                ]
                            },
                            /*
                            //##################
                            //modify
                            {
                                control: "StackPanel", 
                                orientation: "vertical", 
                                name: "m_cluster_modify",
                                visible: false,
                                children:
                                [
                                    {
                                        control: "TextBlock",
                                        wrap: "wrap",
                                        fontSize: 14,
                                        fontFamily : FileSystem.MakePath(StringList.Format("[clear_light_font]"), Origin.Directory()),
                                        text: StringList.Format("[left_cluster_configuration]")
                                    },
                                    {
                                        control: "StackPanel", //here go our 4 elements
                                        orientation: "vertical", //we will stack widgets vertically one by one
                                        margin: {top: 2*ww1, left: ww5},
                                        //background: "#00000000", //set alpha-channel to 0 for transparent background
                                        children:
                                        [
                                            {
                                                //checkbox
                                                
                                            },
                                        ]
                                    },
                                ]
                            },
                            */
 
                        ]
                    }
                ]
                        
            };
            
            var control = Wizard.BuildControl(obj);
            control.Name = "Cluster";
            control.Owner = P();
            control.Visible = P(true);
            control.Disabled = P(false);
            control.EventCl = event_cl;
            
            control.Visible.Subscribe(function(val)
            {
                var ctrl = control.js.m_cluster_widget_container;
                ctrl.height = val ? "auto" : 0;
                ctrl.enabled = val;
            });
            
            
            control.OnAttach = function(dialog_name)
            {
                Log(Log.l_debug, "OnAttach Cluster Widget to dialog " + dialog_name);
                Wizard.Subscribe("cluster/install", "is checked", function(id, notify){return control.js.m_cluster.checked});
                Wizard.Subscribe("cluster/install", "set checked", function(id, notify, value){control.js.m_cluster.checked = value;});
                Wizard.Subscribe("cluster/install", "set text", function(id, notify, value){control.js.m_cluster_label.text = value;});
                Log(Log.l_debug, "OnAttach cluster Widget to dialog complete");
            }
           
            control.OnChange = ns_sender.DialogEvent(control);
            control.EventCl.Connect(control.OnChange.Transmit("NTF_CL"));
            
            return control;
        }
    }
}
