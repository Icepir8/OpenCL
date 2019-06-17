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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns_wpf   = base("wpf.js");
    var ns_event = base("event.js");
    
    var iswin7os = (System.WindowsInfo().major == 6 && System.WindowsInfo().minor == 1 && StringList.Locale() ==1041); //indicates only windows 7 Japanese

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
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

    var allowed = function(obj) {return obj.enabled && obj.visible;};


    var buttons = function(nav, btns)
    {
        var process_button = function(id, action, value)
        {
            var button = !id.match(/m_/i) ? "m_" + id : id;
            if(button in nav.js)
                switch(action)
                {
                    case "enable":
                        nav.js[button].enabled = true;
                        break;
                    case "disable":
                        nav.js[button].enabled = false;
                        break;
                    case "show":
                        nav.js[button].visible = true;
                        break;
                    case "hide":
                        nav.js[button].visible = false;
                        break;
                    case "set text":
                        nav.js[button].content = StringList.Format(value);
                        break;
                }
        };
        var subscribe = function(name)
        {
            if(name)
            {
                Wizard.Subscribe(name, "show", process_button);
                Wizard.Subscribe(name, "hide", process_button);
                Wizard.Subscribe(name, "enable", process_button);
                Wizard.Subscribe(name, "disable", process_button);
                Wizard.Subscribe(name, "set text", process_button);
            }
        };
        filter(btns, function(btn)
        {
            var finalcall = null; // pointer to function to called by Name

            if(btn.name && btn.meth)
            {
                var name = btn.name;
                var jsname = "m_" + name; // m_name
                var methname = name.substr(0, 1).toUpperCase() + name.substring(1); // Name

                if(nav.js && nav.js[jsname])
                {
                    var obj = nav.js[jsname];
                    nav[name] = obj;

                    nav[methname] = function() // create main entry point function to initiate action
                    {
                        if(finalcall)
                        {
                            if(allowed(obj))
                            {
                                finalcall();
                            }
                            else
                                Log("Button create: button is not allowed, ignore call: " + name);
                        }
                        else
                            Log(Log.l_warning, "Button create: final call method is not defined: " + name);
                    };

                    obj.clicked = function() {Log("Button clicked: " + methname); nav[methname]();};

                    if(!nav.Show)
                    {
                        nav.Show = ns_event.FEvent();
                    }

                    subscribe(name);
                    nav.Show.Connect(function(window)
                    {
                        finalcall = function() {btn.meth(window);};
                        subscribe(name);
                    });

                    if(btn.key)
                    { // set binding
                        if(!nav.bindings)
                            nav.bindings = [];
                        nav.bindings.push(binding(btn.key, btn.mod, function() {Log("Binding clicked: " + methname); nav[methname]();}));
                    }
                }
                else
                    Log(Log.l_warning, "Button create: source property could not be found: " + jsname);
            }
            else
                Log(Log.l_warning, "Button create: no button name or callback method: " + btn.name + " : " + btn.meth);
        });
    };

    // ********** Classic navigator: Back/Next/Cancel
    var _back_next_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Prev]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_prev"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Next]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_next"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 3,
                name: "m_cancel"
            }
        ]
    };

    this.BackNextCancel = function()
    {
        var nav = Wizard.BuildControl(_back_next_cancel);
        if(iswin7os)
        { 
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
            nav.js.m_prev.fontFamily = "MS UI Gothic";
            nav.js.m_next.fontFamily = "MS UI Gothic";
        }
        nav.Name = "BackNextCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {if(window.Cancel()) window.Action(Action.r_cancel);}},
            {name: "prev", key: "p", mod: "alt", meth: function(window) {window.Action(Action.r_back);}},
            {name: "next", key: "n", mod: "alt", meth: function(window) {window.Action(Action.r_next);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };

    this.Default = this.BackNextCancel;

    // ********** Navigator: Yes/No
    var _yes_no = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Yes]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_yes"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[No]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_no"
            }
        ]
    };

    this.YesNo = function()
    {
        var nav = Wizard.BuildControl(_yes_no);
        if(iswin7os)
        {
            nav.js.m_yes.fontFamily = "MS UI Gothic";
            nav.js.m_no.fontFamily = "MS UI Gothic";
        }
        nav.Name = "YesNo";

        buttons(nav, [
            {name: "no", key: "esc", meth: function(window) {window.Action("no");}},
            {name: "yes", meth: function(window) {window.Action("yes");}},
        ]);

        return nav;
    };

    // ********** Navigator: Back/Options/Next/Cancel (classic + Options button)
    var _back_options_next_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Prev]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_prev"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Customize]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_button4"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Next]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 3,
                name: "m_next"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 4,
                name: "m_cancel"
            }
        ]
    };

    this.BackOptionsNextCancel = function()
    {
        var nav = Wizard.BuildControl(_back_options_next_cancel);
        if(iswin7os)
        {
            nav.js.m_next.fontFamily = "MS UI Gothic";
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
            nav.js.m_button4.fontFamily = "MS UI Gothic";
            nav.js.m_prev.fontFamily = "MS UI Gothic";
        }
        nav.Name = "BackOptionsNextCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {if(window.Cancel()) window.Action(Action.r_cancel);}},
            {name: "button4", key: "u", mod: "alt", meth: function(window) {window.Action(Action.r_button4);}},
            {name: "prev", key: "p", mod: "alt", meth: function(window) {window.Action(Action.r_back);}},
            {name: "next", key: "n", mod: "alt", meth: function(window) {window.Action(Action.r_next);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };

    
    // ********** Navigator: ReCheck/Back/Next/Cancel (classic + Recheck button)
    var _recheck_back_next_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[ReCheck]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_button4"
            },
            {            
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Prev]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_prev"
            },            
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Next]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 3,
                name: "m_next"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 4,
                name: "m_cancel"
            }
        ]
    };

    this.RecheckBackNextCancel = function()
    {
        var nav = Wizard.BuildControl(_recheck_back_next_cancel);
        if(iswin7os)
        {
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
            nav.js.m_button4.fontFamily = "MS UI Gothic";
            nav.js.m_prev.fontFamily = "MS UI Gothic";
            nav.js.m_next.fontFamily = "MS UI Gothic";
        }
        nav.Name = "RecheckBackNextCancel";

        buttons(nav, [
            {name: "button4", key: "r", mod: "alt", meth: function(window) {window.Action(Action.r_button4);}},
            {name: "cancel", key: "esc", meth: function(window) {if(window.Cancel()) window.Action(Action.r_cancel);}},            
            {name: "prev", key: "p", mod: "alt", meth: function(window) {window.Action(Action.r_back);}},
            {name: "next", key: "n", mod: "alt", meth: function(window) {window.Action(Action.r_next);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };
    
    // ********** Navigator: Back/Retry/Cancel
    var _back_retry_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Prev]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_prev"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Retry]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_next"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 3,
                name: "m_cancel"
            }
        ]
    };

    this.BackRetryCancel = function()
    {
        var nav = Wizard.BuildControl(_back_retry_cancel);
        if(iswin7os)
        {
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
            nav.js.m_prev.fontFamily = "MS UI Gothic";
            nav.js.m_next.fontFamily = "MS UI Gothic";
        }
        nav.Name = "BackRetryCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {if(window.Cancel()) window.Action(Action.r_cancel);}},
            {name: "prev", key: "p", mod: "alt", meth: function(window) {window.Action(Action.r_back);}},
            {name: "next", key: "r", mod: "alt", meth: function(window) {window.Action(Action.r_ok);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };

    // ********** Navigator: Finish
    var _finish = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Finish]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_finish"
            }
        ]
    };

    this.Finish = function(errcode)
    {
        var nav = Wizard.BuildControl(_finish);
        if(iswin7os)
        {
            nav.js.m_finish.fontFamily = "MS UI Gothic";
        }
        nav.Name = "Finish";

        buttons(nav, [
            {name: "finish", key: "esc", meth: function(window) {window.Action(errcode ? errcode : Action.r_ok);}}
        ]);

        nav.closing = function() {nav.Finish();};

        return nav;
    };
    
    
    // ********** Navigator: Reboot, Postpone
    var _reboot_postpone = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                content: StringList.Format("[Postpone]"),
                default: true,
                minWidth: 160,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_postpone"
            },
            {
                control: "FlatButton",
                content: StringList.Format("[Reboot]"),
                minWidth: 160,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_reboot"
            },
        ]
    };

    this.RebootPostpone = function()
    {
        var nav = Wizard.BuildControl(_reboot_postpone);
        if(iswin7os)
        {
            nav.js.m_postpone.fontFamily = "MS UI Gothic";
            nav.js.m_reboot.fontFamily = "MS UI Gothic";
        }
        nav.Name = "RebootPostpone";

        buttons(nav, [
            {name: "reboot", meth: function(window) {window.Action("reboot");}},
            {name: "postpone", key: "esc", meth: function(window) {window.Action(Action.r_ok);}},
        ]);
        
        nav.closing = function() {nav.RebootPostpone();};

        return nav;
    };

    // ********** Navigator: Okay
    var _okay = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ok]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_okay"
            }
        ]
    };

    this.Okay = function(errcode)
    {
        var nav = Wizard.BuildControl(_okay);
        if(iswin7os)
        {
            nav.js.m_okay.fontFamily = "MS UI Gothic";
        }
        nav.Name = "Okay";

        buttons(nav, [
            {name: "okay", key: "o", meth: function(window) {window.Action(errcode ? errcode : Action.r_ok);}}
        ]);

        nav.closing = function() {nav.Okay();};

        return nav;
    };
    
    // ********** Navigator: ModalOkay
    var _modal_okay = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ok]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_next"
            }
        ]
    };

    this.ModalOkay = function(errcode)
    {
        var nav = Wizard.BuildControl(_modal_okay);
        if(iswin7os)
        {
            nav.js.m_next.fontFamily = "MS UI Gothic";
        }
        nav.Name = "ModalOkay";

        buttons(nav, [
            {name: "next", key: "o", meth: function(window) {window.Action(errcode ? errcode : Action.r_ok);}}
        ]);

        nav.closing = function() {nav.ModalOkay();};

        return nav;
    };

    // ********** Navigator: Continue/Cancel
    var _continue_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Continue]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                default: true,
                name: "m_continue"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_cancel"
            }
        ]
    };

    this.ContinueCancel = function()
    {
        var nav = Wizard.BuildControl(_continue_cancel);
        if(iswin7os)
        {
            nav.js.m_continue.fontFamily = "MS UI Gothic";
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
        }
        nav.Name = "ContinueCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {window.Action(Action.r_cancel);}},
            {name: "continue", meth: function(window) {window.Action(Action.r_ok);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };

    // ********** Navigator: Retry/Ignore/Cancel
    var _retry_ignore_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Retry]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_retry"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ignore]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_ignore"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 3,
                name: "m_cancel"
            }
        ]
    };

    this.RetryIgnoreCancel = function()
    {
        var nav = Wizard.BuildControl(_retry_ignore_cancel);
        if(iswin7os)
        {
            nav.js.m_retry.fontFamily = "MS UI Gothic";
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
            nav.js.m_ignore.fontFamily = "MS UI Gothic";
        }
        nav.Name = "RetryIgnoreCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {window.Action(Action.r_cancel);}},
            {name: "ignore", key: "i", mod: "alt", meth: function(window) {window.Action("ignore");}},
            {name: "retry", key: "r", mod: "alt", meth: function(window) {window.Action("retry");}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };

    // ********** Navigator: Ignore/Okay/Cancel
    var _ignore_okay_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ignore]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_ignore"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ok]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_okay"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 3,
                name: "m_cancel"
            }
        ]
    };

    this.IgnoreOkayCancel = function()
    {
        var nav = Wizard.BuildControl(_ignore_okay_cancel);
        if(iswin7os)
        {
            nav.js.m_okay.fontFamily = "MS UI Gothic";
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
            nav.js.m_ignore.fontFamily = "MS UI Gothic";
        }
        nav.Name = "IgnoreOkayCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {window.Action(Action.r_cancel);}},
            {name: "ignore", key: "i", mod: "alt", meth: function(window) {window.Action("ignore");}},
            {name: "okay",   key: "o", mod: "alt", meth: function(window) {window.Action(Action.r_ok);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };

    // ********** Navigator: Okay/Cancel
    var _okay_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ok]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_okay"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_cancel"
            }
        ]
    };

    this.OkayCancel = function()
    {
        var nav = Wizard.BuildControl(_okay_cancel);
        if(iswin7os)
        {
            nav.js.m_okay.fontFamily = "MS UI Gothic";
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
        }
        nav.Name = "OkayCancel";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {window.Action(Action.r_cancel);}},
            {name: "okay",   key: "o", mod: "alt", meth: function(window) {window.Action(Action.r_ok);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };
 
    // ********** Navigator: Modal Okay/Cancel
    var _modal_okay_cancel = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ok]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_next"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Cancel]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_prev"
            }
        ]
    };

    var _modal_back_okay = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Back]"),
                minWidth: 80,
                margin: {left: 3},
                GridColumn: 1,
                name: "m_prev"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Ok]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_next"
            },
            
        ]
    };
 
    this.ModalOkayCancel = function()
    {
        var nav = Wizard.BuildControl(_modal_okay_cancel);
        if(iswin7os)
        {
            nav.js.m_next.fontFamily = "MS UI Gothic";
            nav.js.m_prev.fontFamily = "MS UI Gothic";
        }
        nav.Name = "ModalOkayCancel";

        buttons(nav, [
            {name: "prev", key: "esc", meth: function(window) {window.Action(Action.r_back);}},
            {name: "next",   key: "o", mod: "alt", meth: function(window) {window.Action(Action.r_ok);}}
        ]);

        return nav;
    };

    this.ModalBackOkay = function()
    {
        var nav = Wizard.BuildControl(_modal_back_okay);
        nav.Name = "ModalBackOkay";
        if(iswin7os)
        {
            nav.js.m_next.fontFamily = "MS UI Gothic";
            nav.js.m_prev.fontFamily = "MS UI Gothic";
        }

        buttons(nav, [
            {name: "prev", key: "esc", meth: function(window) {window.Action(Action.r_back);}},
            {name: "next",   key: "o", mod: "alt", meth: function(window) {window.Action(Action.r_ok);}}
        ]);

        return nav;
    };
	
    // ********** Navigator: Re-check/Done
    var _recheck_done = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 80, width: "auto"}, {minWidth: 80, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[ReCheck]"),
                default: true,
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_recheck"
            },
            {
                control: "FlatButton",
                minHeight: 25,
                content: StringList.Format("[Done]"),
                minWidth: 80,
                margin: {left: 3, right: 1},
                GridColumn: 2,
                name: "m_done"
            },
        ]
    };

    this.RecheckDone = function()
    {
        var nav = Wizard.BuildControl(_recheck_done);
        if(iswin7os)
        {
            nav.js.m_recheck.fontFamily = "MS UI Gothic";
            nav.js.m_done.fontFamily = "MS UI Gothic";
        }
        nav.Name = "RecheckDone";

        buttons(nav, [
            {name: "recheck", key: "r", mod: "alt", meth: function(window) {window.Action("recheck");}},
            {name: "done",   key: "d", mod: "alt", meth: function(window) {window.Action(Action.r_next);}}
        ]);

        nav.closing = function() {return window.Action(Action.r_cancel)};
        //nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };
    
        // ********** navigator: Next/Cancel installation
    var _next_cancel_installation = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 120, width: "auto"}, {minWidth: 120, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                content: StringList.Format("[Next]"),
                default: true,
                minWidth: 140,
                margin: {left: 3, right: 1},
                GridColumn: 1,
                name: "m_next"
            },
            {
                control: "FlatButton",
                content: StringList.Format("[CancelInstallation]"),
                minWidth: 140,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_cancel"
            }
        ]
    };

    this.NextCancelInstallation = function()
    {
        var nav = Wizard.BuildControl(_next_cancel_installation);
        if(iswin7os)
        {
            nav.js.m_next.fontFamily = "MS UI Gothic";
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
        }
        nav.Name = "NextCancelInstallation";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {if(window.Cancel()) window.Action(Action.r_cancel);}},
            {name: "next", key: "n", mod: "alt", meth: function(window) {window.Action(Action.r_next);}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };
    
        // ********** navigator: Cancel installation
    var _cancel_installation = {
        control: "Grid",
        name: "m_grid",
        columns: ["*", {minWidth: 120, width: "auto"}, {minWidth: 120, width: "auto"}],
        children: [
            {
                control: "FlatButton",
                content: StringList.Format("[Cancel]"),
                minWidth: 120,
                margin: {left: 3},
                GridColumn: 2,
                name: "m_cancel"
            }
        ]
    };
    
    this.CancelInstallation = function()
    {
        var nav = Wizard.BuildControl(_cancel_installation);
        if(iswin7os)
        {
            nav.js.m_cancel.fontFamily = "MS UI Gothic";
        }
        nav.Name = "CancelInstallation";

        buttons(nav, [
            {name: "cancel", key: "esc", meth: function(window) {if(window.Cancel(true)) window.Action("close");}}
        ]);

        nav.closing = function() {return nav.Cancel();};
        nav.Show.Connect(function(){nav.js.m_cancel.enabled = !Wizard.Canceled();});

        return nav;
    };
    
    
};

