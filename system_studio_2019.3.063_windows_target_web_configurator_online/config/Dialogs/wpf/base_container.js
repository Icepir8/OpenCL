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
    var dialogs = function(name) {return load("./" + name);};
    var ns_wpf = base("wpf.js");
    var ns_win_dlg = dialogs("win_dialog.js");
    var ns_nav = dialogs("navigator.js");
    var ns_prop = base("property.js");
    var ns = this;

    var P = function(val){return ns_prop.Property(val);}
    // var window_width = Wizard.Theme().WindowWidth();
    var current_window = ns_win_dlg.Window(); //get current window -- needed for navigator change
    var layout = current_window.Layout();
    var window_height = Wizard.Theme().WindowHeight();

    var prev_nav = null; //this will hold the previous navigator
    var prev_bind = null; //and this is for previous bindings

    var start_modal = function(holder_dialog, input_dialog)
    {
        var control = holder_dialog; //need controls of the input dialog
        control.js.m_modal_container.children.Clear();
        control.js.m_modal_container.children.Add(input_dialog);

        var content_init_height = control.js.m_modal_container_scrollviewer.height;
        var content_dest_height = control.js.m_dlg_widget_container_scrollviewer.height;

        control.js.m_modal_container_scrollviewer.height = content_dest_height; //otherwise, control may be opened or closed partially
        control.js.m_dlg_widget_container_scrollviewer.height = content_init_height; //otherwise, control may be opened or closed partially
        //define navigator
        if(prev_nav) //if we have previous, we must restore it
        {
            control.navigator = prev_nav;
            control.bindings = prev_bind;
            //restore previous bindings
            control.keyBindings.Clear();
            for(var index in prev_bind)
            {
                control.keyBindings.Add(prev_bind[index]);
            }
            layout.Navigator().children.Clear(); //clear current
            layout.Navigator().children.Add(prev_nav); //restore previous
            prev_nav.Show(current_window);
            prev_nav = null; //set back to null
            prev_bind = null;
        }
        else
        {
            //here we have a bit tricky structure
            //previous navigator is in fact a grid (child[0])
            prev_nav = control.navigator;//layout.Navigator().children.Get(0); //if we get just layout.Navigator(), we will lose all children after clear
            prev_bind = control.bindings;
            layout.Navigator().children.Clear(); //and we cannot omit clear, otherwise we'll have troubles with navigation
            //need to provide a way to customize modal dialog buttons
            var navigator = null; //holder for buttons
            if(input_dialog.custom_navigator) //if input_dialog has custom navigator
            {
                navigator = input_dialog.custom_navigator; //use it
                Log("   ... using custom navigator " + (navigator.Name ? navigator.Name : "NoName"));
                control.navigator = navigator;
            }
            else if(input_dialog.navigator) //if input_dialog has its own navigator
            {
                navigator = input_dialog.navigator; //use it
                Log("   ... using native navigator " + (navigator.Name ? navigator.Name : "NoName"));
                control.navigator = navigator;
            }
            else //if doesn't have
            {
                navigator = ns_nav.ModalOkayCancel();
                Log("   ... using new regular modal navigator " + (navigator.Name ? navigator.Name : "NoName"));
                control.navigator = navigator;
            }
            control.bindings = input_dialog.bindings;
            control.keyBindings.Clear();

            layout.Navigator().children.Add(navigator);
            for(var index in input_dialog.bindings)
            {
                var bind = input_dialog.bindings[index];
                control.keyBindings.Add(bind);
            }
            navigator.Show(current_window);
        }
    };

    var scroll_viewer_height = window_height - layout.js.m_bottom.height * 2 - 15;
    var _abstract_dlg =
    {
        control: "Grid",
        name: "m_dlg_docker",
        halign: "stretch",
        valign: "stretch",
        margin: {right: 10, left: 10},
        rows: ["auto", "auto"],
        lastFill: true,
        children:
        [
            {
                control: "ScrollViewer",
                GridRow: 0,
                VScroll: "auto",
                maxHeight: scroll_viewer_height,
                name: "m_dlg_widget_container_scrollviewer", //it will contain all widgets
                content:
                {
                    control: "StackPanel", //stack panel because it will be easy to place widgets there
                    orientation: "vertical", //we will stack widgets vertically one by one
                    background: "#00000000", //set alpha-channel to 0 for transparent background
                    name: "m_dlg_widget_container", //it will contain all widgets
                    children: [] //empty so far (can be omitted?)
                },
            },
            {
                control: "ScrollViewer",
                GridRow: 1,
                VScroll: "auto",
                maxHeight: scroll_viewer_height,
                name: "m_modal_container_scrollviewer", //it will contain all widgets
                height: 0, //must be invisible, so set height to zero
                content:
                {
                    control: "StackPanel", //stack panel because it will be easy to place widgets there
                    orientation: "vertical", //we will stack widgets vertically one by one
                    background: "#00000000", //set alpha-channel to 0 for transparent background
                    name: "m_modal_container", //it will contain modal window
                    children: [] //empty so far
                }
            }
        ]
    };


    this.BaseContainer = function()
    {
        var bc = Wizard.BuildControl(_abstract_dlg);
        bc.bindings = [];
        bc.AttachWidget = function(widget_ctrl)
        {
            var ns_aw = this;
            Log(Log.l_debug, "Adding widget " + widget_ctrl.Name + " to dialog");
            ns_aw.js.m_dlg_widget_container.children.Add(widget_ctrl);
            for(var index in widget_ctrl.bindings)
            {
                var current_binding = widget_ctrl.bindings[index];
                bc.bindings.push(current_binding);
            }
        }

        bc.DetachWidget = function(widget_ctrl)
        {
            var ns_dw = this;
            Log("Remove widget " + widget_ctrl.Name + " from dialog");
            var widget_container_children = ns_dw.js.m_dlg_widget_container.children;
            for(var i = 0; i < widget_container_children.count; i++)
            {
                var current_child = widget_container_children.Get(i);
                if(current_child == widget_ctrl)
                {
                    widget_container_children.RemoveAt(i);
                    break;
                }
            }
        }

        bc.OnChange = function()
        {
        }

        bc.ShowModal = function(dlg)
        {
            start_modal(this, dlg);
        }

        bc.HideModal = function(dlg)
        {
            start_modal(this, dlg);
        }

        bc.Owner = P();

        //Set a default navigator
        //this provides an ability to handle dialog buttons via Wizard
        bc.navigator = ns_nav.RecheckBackNextCancel();

        return bc;
    }

    this.BaseDlgContainer = function()
    {
        var bc = ns.BaseContainer();
        bc.navigator = ns_nav.RecheckBackNextCancel();

        return bc;
    }

    this.BaseModalContainer = function()
    {
        var bc = ns.BaseContainer();
        bc.navigator = ns_nav.ModalBackOkay();

        return bc;
    }


    this.BaseModalOkayContainer = function()
    {
        var bc = ns.BaseContainer();
        bc.navigator = ns_nav.ModalOkay();

        return bc;
    }

    this.BaseFatalOffline = function()
    {
        var bc = ns.BaseContainer();
        bc.navigator = ns_nav.CancelInstallation();

        return bc;
    }
    
    this.BaseFatalOnline = function()
    {
        var bc = ns.BaseContainer();
        bc.navigator = ns_nav.NextCancelInstallation();

        return bc;
    }

}
