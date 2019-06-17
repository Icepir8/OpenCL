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

(function()
{
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns_wpf   = base("wpf.js");
    var ns_navi  = load("navigator.js");
    var ns_queue = base("queue.js");
    var ns_uimod = load("uimode.js");
    var stat_pick = base("stat_pick.js").Stat_pick;

    var window_width = Wizard.Theme().WindowWidth();
    var window_height = Wizard.Theme().WindowHeight();

    var ns_cancel = load("cancel.js");

    var abspath = FileSystem.AbsPath;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var _window = {
        control: "Window",
        name: "m_window",
        style: "none",
        visible: false,
        // title: StringList.Format("[title]"),
        background: "#ffffffff",
        width: window_width,
        height: window_height,
        minWidth: window_width,
        minHeight: window_height,
        location: "centerScreen",
        resizeMode: GetOpt.Exists("main-window-can-resize") ? "canResize" : "canMinimize",
        flowDirection: StringList.Format("[flow_direction]"),
        content:
        {
            control: "Grid",
            visible: true,
            name: "m_window_grid",
            children: [
                {
                    control: "Canvas",
                    GridRow: 0,
                    GridColumn: 0,
                    visible: false,
                    name: "m_canvas_spin",
                    halign: "center",
                    valign: "center",
                },
                {
                    control: "ProgressBar",
                    height: 10,
                    min: 0,
                    max: 30,
                    visible: false,
                    GridRow: 0,
                    GridColumn: 0,
                    foreground: "#FF006EC1",
                    vallign: "center",
                    margin: {left: 40, right: 40},
                    name: "m_spin_progress"
                },
            ]
        }
        //closing: function() {event.Set();}
    };

    // var icopath = abspath(Origin.Directory(), "../Icons/micl.ico");
    // if(FileSystem.Exists(icopath))
    //     _window.icon = {control: "Image", uri: icopath};

    return {Window: function(layout)
    {
        var queue = ns_queue.Queue();
        var wnd = null;
        if (Wizard.Theme() && Wizard.Theme().Window)
            wnd = Wizard.Theme().Window();
        else
            wnd = _window;
        var window = Wizard.BuildControl(wnd);

        Wizard.Subscribe("title", "set text", function(id, notify, value){if(value)window.title = StringList.Format(value);});
        Wizard.Subscribe("title", "set big icon", function(id, notify, value){if(FileSystem.Exists(value))window.icon = ns_wpf.BuildControl({control: "Image", uri: value});});
        Wizard.Subscribe("title", "set small icon", function(id, notify, value){if(FileSystem.Exists(value))window.icon = ns_wpf.BuildControl({control: "Image", uri: value});});

        window.js.m_window_grid.children.Add(layout);
        WPF.SetGridRow(layout, 0);
        WPF.SetGridColumn(layout, 0);
        WPF.SetZIndex(layout, 0);

        WPF.SetZIndex(window.js.m_spin_progress, 1);
        
        Wizard.Subscribe("wizard", "busy_start", function(){window.js.m_spin_progress.visible = true; window.js.m_spin_progress.value = 0; window.js.m_spin_progress.indeterminate = true; layout.enabled = false;});
        Wizard.Subscribe("wizard", "busy_stop", function(){window.js.m_spin_progress.visible = false; window.js.m_spin_progress.indeterminate = false; layout.enabled = true;});

        var buzy_counter = 0;
        
        Wizard.BusyStart = function()
        {
            if (buzy_counter)
            {
                Log("Wizard.BusyStart counter will be increased: " + buzy_counter);
                buzy_counter++;
                return;
            }
            
            Log("Wizard.BusyStart called");
            Wizard.Notify("wizard", "busy_start");
            buzy_counter++;
        }

        Wizard.BusyStop = function()
        {
            if (buzy_counter)
                buzy_counter--;
            
            if(buzy_counter)
            {
                Log("Wizard.BusyStart counter was decreased: " + buzy_counter);
                return;
            }
            Log("Wizard.BusyStop called");
            Wizard.Notify("wizard", "busy_stop");
        }
        
        var stage;
        if(layout.Left && typeof(layout.Left) == "function" &&
           layout.Left().Activate && typeof(layout.Left().Activate) == "function")
            stage = function(s) {layout.Left().Activate(s);};
        else
            stage = function() {};

        var wnd = function() {};

        wnd.Window = function() {return window;};
        wnd.Layout = function() {return layout;};

        wnd.Action = function(act) {queue.Push(act);};
        wnd.Wait = function() {return queue.Pop();};
        wnd.Framed = function() {return false;};

        var spawner = function(holder)
        {
            wnd.Spawn = function(dialog)
            {
                var act_func = wnd.Action;
                var framed = wnd.Framed;
                wnd.Framed = function() {return true;};
                var action = null;
                var frame = WPF.DispatcherFrame();

                wnd.Action = function(a) {action = a; frame.continue = false;};
                dialog();
                frame.Run();

                wnd.Action = act_func;
                holder();
                wnd.Framed = framed; // restore Framed flag after holder call finished
                return action;
            };

            //if we don't need user's click on this spawn dlg then we shouldn't run frame
            wnd.SpawnWithoutClick = function(dialog)
            {
                var act_func = wnd.Action;
                var framed = wnd.Framed;
                wnd.Framed = function() {return true;};
                var action = null;
                var frame = WPF.DispatcherFrame();

                wnd.Action = function(a) {action = a; frame.continue = false;};
                dialog();

                wnd.Action = act_func;
                holder();
                if(!action) // user can cancel installation at all therefore need to check
                    action = Action.r_ok;

                Log("SpawnWithoutClick: action = " + action);
                wnd.Framed = framed; // restore Framed flag after holder call finished
                return action;
            };
        };

        var hider = function(holder)
        {
            if(wnd.HidePrevious)
                wnd.HidePrevious();

            wnd.HidePrevious = holder;
        };

        spawner(function() {}); // define empty dialog

        wnd.Dialog = function(content, async)
        { // build dialog method
            if(content)
            {
                var navigator = content.navigator ? content.navigator : ns_navi.Default();
                Log(Log.l_debug, "Incoming content " + (content.Name ?  content.Name : "NoName") + " async = " + (async ? true :false)) ;
                Log(Log.l_debug, "Incoming navigator " + (navigator.Name ?  navigator.Name : "NoName"));
                
                var uimode = ns_uimod.ui_mode_t.full; // by default display dialog only in full mode

                var dialog = function(direction)
                {
                    Log(Log.l_debug, "Dialog starting...");

                    // TODO add support of passive mode
                    // if(ns_uimod.Below(uimode))
                    // { // if UI mode level is less than minimal allowed level
                    //     //Log("UI mode level: " + ns_uimod.Level() + ", required minimal: " + ns_uimod.Level(uimode) + ". Disable dialog");
                    //     return Action.r_ok;
                    // }

                    var self = arguments.callee;
                    spawner(function() {self.apply(this, arguments);});
                    hider(function()
                    {// schedule notification on hide window
                        if(content.Hide)
                            content.Hide(wnd);
                        if(navigator && navigator.Hide)
                            navigator.Hide(wnd);
                    });

                    window.keyBindings.Clear();
                    window.closing = function() {}; // clean closing method
                    queue.Clear();
                    if(layout.Navigator && navigator)
                    {
                        Log(Log.l_debug, "Adding navigator " + (navigator.Name ?  navigator.Name : "NoName"));
                        layout.Navigator().children.Clear();
                        layout.Navigator().children.Add(navigator);
                        if(navigator.bindings)
                            filter(navigator.bindings, function(bind) {window.keyBindings.Add(bind);});
                        window.closing = function()
                        {
                            Log(Log.l_debug, "Navigator.closing calling... " + (navigator.Name ? navigator.Name : "NoName"));
                            if(navigator.closing)
                                navigator.closing();
                        };

                        if(navigator.Show)
                        {
                            Log(Log.l_debug, "Navigator.Show calling... " + (navigator.Name ? navigator.Name : "NoName"));
                            navigator.Show(wnd);
                        }
                    }

                    if(content.Name)
                    {
                        var dlg_name = typeof(content.Name) == "function" ? content.Name() : content.Name;
                        Log("visited dialog: " + dlg_name);
                        stat_pick.add_visited_dialog(dlg_name);
                    }
                    else
                    {
                        Log("visited dialog: dialog_name_not_defined");
                        stat_pick.add_visited_dialog("dialog_name_not_defined");
                    }

                    if(content.Show)
                    {
                        Log(Log.l_debug, "Content.Show calling... " + (content.Name ? content.Name : "NoName"));
                        var _res = content.Show(wnd);
                        if(typeof(_res) != "undefined") // in case if some value returned then
                            return _res;                // just exit from function
                    }

                    if(layout.Content)
                    {
                        layout.Content().children.Clear();
                        layout.Content().children.Add(content);
                        if(content.bindings)
                            filter(content.bindings, function(bind) {window.keyBindings.Add(bind);});
                    }

                    if(!window.visible)
                        window.visible = true;

                    if(!window.active)
                        window.Activate();

                    if(content.stage)
                        stage(content.stage);

                    queue.Clear();
                    var res;
                    // in async mode - just display dialog & continue
                    // if Framed mode - special GUI dispatcher used, continue too
                    if(async || wnd.Framed())
                    {
                        Log("async calling");
                        res = direction;
                    }
                    else
                    {
                        Log("sync calling. Before wait");
                        res = wnd.Wait();
                        Log("sync calling. After wait");
                        // clean bindings & queue
                        window.keyBindings.Clear();
                        window.closing = function() {}; // clean closing method
                        // code below is commented - do not clear window on exit
                        //if(layout.Content)
                        //    layout.Content().children.Clear();
                        queue.Clear();
                        hider(function(){});
                    }
                    Log(Log.l_debug, "Closing dialog");

                    return res;
                };

                dialog.First = function(f)
                {
                    if(navigator)
                    {
                        if(navigator.back && navigator.back.enabled)
                        {
                            if(f)
                                navigator.back.enabled = false;
                            else
                                navigator.back.enabled = true;
                        }
                    }
                };

                if(!content.js)
                    content.js = {};
                content.js.m_navigator = navigator;

                dialog.Visual = function() {return true;};
                dialog.Content = function() {return content;};
                dialog.Navigator = function(nav)
                {
                    if(nav)
                        navigator = nav;
                    else
                        return navigator;
                };
                dialog.UIMode = function(mod) {uimode = mod || uimode;};
                ns_uimod.Attach(dialog);

                return dialog;
            }
        };

        var cancel = ns_cancel.AskCancel(wnd);

        wnd.Cancel = function(silent)
        {
            if (silent)
                return true;
            else
                return cancel() === "Yes";
        };

        var binding = function(key, mod, func)
        {
            var b = WPF.KeyBinding();
            if(key)
                b.key = key;
            if(mod)
                b.modifier = mod;
            b.clicked = func;
            return b;
        };

        wnd.Bindings = function(lst)
        {
            var b = [];
            filter(lst, function(bt)
            {
                b.push(binding(bt.key, bt.mod, bt.clicked));
            });

            return b;
        };

        wnd.Taskbar = {
            State: function(state)
            {
                if(arguments.length)
                    window.taskbar.state = state;
                else
                    return window.taskbar.state;
            },
            Value: function(value)
            {
                if(arguments.length)
                    window.taskbar.value = value;
                else
                    return window.taskbar.value;
            }
        };

        return wnd;
    }};
})();
