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
    var ns = this;
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var dialogs = function(name) {return load("../Dialogs/wpf/" + name);};
    var ns_sender = base("event_sender.js");
    var ns_prop = base("property.js");
    var ns_window = dialogs("window.js");

    var P = function(val){return ns_prop.Property(val);}
    var PConst = function(val){return ns_prop.Constant(val);}

    var button = function(_caption, _disabled, _visible)
    {
        var b = 
        {
            Caption : P(_caption ? _caption : ""),
            Disabled : P(_disabled ? _disabled : false),
            Visible : P(_visible ? _visible : false)
        }

        b.OnChange = ns_sender.DialogEvent(b);
        b.Caption.Subscribe(b.OnChange.Transmit(b.Caption));
        b.Disabled.Subscribe(b.OnChange.Transmit(b.Disabled));
        b.Visible.Subscribe(b.OnChange.Transmit(b.Visible));

        return b;
    }

    this.BuildWidget = function(cfg)
    {
        if (!cfg)
            return;

        var create_member = function(wdg, cfg, name)
        {
            return function()
            {
                //first configurator's function is called 
                var f = cfg[name];
                if(f && typeof(f) === "function")
                    f.apply(this, arguments);
                //then callback
                var cb_p = wdg["CB_" + name];
                var cb = cb_p ? (cb_p.GetRaw ? cb_p.GetRaw() : cb_p()) : null;
                if(cb && typeof(cb) === "function")
                    cb.apply(this, arguments);
            }
        }
        
        var create_false_member = function(wdg, cfg, name)
        {
            return function()
            {
                var f = cfg[name];
                if(f && typeof(f) === "function")
                    if(f.apply(this, arguments))
                        return true;
                var cb_p = wdg["CB_" + name];
                var cb = cb_p ? (cb_p.GetRaw ? cb_p.GetRaw() : cb_p()) : null;
                if(cb && typeof(cb) === "function")
                    return cb.apply(this, arguments);
                
                return false;
            }
        }
        
        var create_true_member = function(wdg, cfg, name)
        {
            return function()
            {
                var f = cfg[name];
                if(f && typeof(f) === "function")
                    if(!f.apply(this, arguments))
                        return false;
                var cb_p = wdg["CB_" + name];
                var cb = cb_p ? (cb_p.GetRaw ? cb_p.GetRaw() : cb_p()) : null;
                if(cb && typeof(cb) === "function")
                    return cb.apply(this, arguments);
                
                return true;
            }
        }
        
        var created = false;
        var a = function(ret_code)
        {
            if (!created) 
            {
                a.Default();
                created = true;
            }
            
            a.Initialize(ret_code);
            return;
        }

        a.Control = PConst(cfg);
        
        var name = cfg.Name ? (typeof(cfg.Name) == "function" ? cfg.Name() : cfg.Name) : "";
        a.Name = P(name);
        if (cfg.Owner)
            cfg.Owner(a);

        a.CB_Default = P(function(){return;});
        a.CB_Initialize = P(function(ret_code){return;});
        a.CB_CanGoNext = P(function(){return true;});
        a.CB_GoNext = P(function(){return true;});
        a.CB_CustomAction = P(function(){return true;});
        a.CB_DisableOnSkip = P(function(){return true;});
        a.CB_Skip = P(function(){return false;});
        a.CB_OnAttach = P(function(){return true;});
        
        a.Default = create_member(a, cfg, "Default");
        a.Initialize = create_member(a, cfg, "Initialize");
        a.CanGoNext = create_true_member(a, cfg, "CanGoNext");
        a.GoNext = create_true_member(a, cfg, "GoNext");
        a.CustomAction = create_true_member(a, cfg, "CustomAction");
        a.DisableOnSkip = create_true_member(a, cfg, "DisableOnSkip");
        a.OnAttach = create_member(a, cfg, "OnAttach");
        
        a.Caption = P("");
        a.Visible = P(true);
        a.Disabled = P(false);
        
        if (cfg.Caption)
            a.Caption.Subscribe(cfg.Caption);
        if (cfg.Visible)
            a.Visible.Subscribe(cfg.Visible);
        if (cfg.Disabled)
            a.Disabled.Subscribe(cfg.Disabled);


        var dependent_widgets = [];
        a.DependentWidgets = function()
        {
            return dependent_widgets;
        }
        a.DependentWidgets.Add = function(widget)
        {
            dependent_widgets.push(widget);
        }
        a.DependentWidgets.Exists = function(widget)
        {
            return (dependent_widgets.indexOf(widget) == -1) ? false : true;
        }
        
        a.DependentWidgets.Clear = function()
        {
            dependent_widgets = [];
        }
        
        a.ButtonNext = button("[Next]", false, true);
        a.ButtonBack = button("[Prev]", false, true);
        a.ButtonCancel = button("[Cancel]", false, true);
        a.ButtonCustom = button("[Custom]", false, false);

        a.Owner = P(); //dialog
        
        a.Skip = function()
        {
            var check_if = function(f)
            {
                if (typeof f == "undefined")
                    return false;
                if (typeof f == "function") 
                    return f()? true : false;
                if (f) 
                    return true;
                
                return false;
            }
            var s = a.CB_Skip.GetRaw();
            if (check_if(s))
            {
                var cb_d = a.CB_DisableOnSkip.GetRaw();
                if (check_if(cb_d))
                {
                    if (!a.Visible())
                        a.Visible(true);
                    if (!a.Disabled())
                        a.Disabled(true);
                }
                else 
                {
                    if (a.Visible())
                        a.Visible(false);
                }
                Log("   widget " + a.Name() + " is skipped");
                return true;
            }

            if (a.Disabled())
                a.Disabled(false);
            if (!a.Visible())
                a.Visible(true);
            Log("   widget " + a.Name() + " is not skipped");
            return false;            

        }

        a.OnChange = ns_sender.DialogEvent(a);
        a.ButtonNext.OnChange(a.OnChange.Transmit());
        a.ButtonBack.OnChange(a.OnChange.Transmit());
        a.ButtonCancel.OnChange(a.OnChange.Transmit());
        a.ButtonCustom.OnChange(a.OnChange.Transmit());
        if (a.Control.GetRaw().OnChange)
            a.Control.GetRaw().OnChange(a.OnChange.Transmit());

        return a;
    }

    this.BuildDialog = function(container)
    {
       if (!container)
           return;

       var filter = function(coll, cb)
       {
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
       };
       
       var filter_enabled = function(coll, cb)
       {
            for(var i in coll)
            {
                if (!coll[i].Visible())
                    continue;
                if (coll[i].Disabled())
                    continue;
                if(cb(coll[i], i))
                    return true;
            }
            return false;
       };

       var all = function(cont, cb)
       {
            for(var key in cont)
            {
                var r1 = cb(cont[key], key);
                if(!r1)
                    return false;
            }
            return true;
       };
       
       var all_enabled = function(cont, cb)
       {
            for(var key in cont)
            {
                if (!cont[key].Visible())
                    continue;
                if (cont[key].Disabled())
                    continue;
                var r1 = cb(cont[key], key);
                if(!r1)
                    return false;
            }
            return true;
       };

       var execute_all = function(cont, cb)
       {
           var r = true;
           for(var key in cont)
           {
               var r1 = cb(cont[key], key);
               r = r && r1;
           }
           return r;
       };
        
       var execute_enabled = function(cont, cb)
       {
           var r = true;
           for(var key in cont)
           {
               if (!cont[key].Visible())
                    continue;
                if (cont[key].Disabled())
                    continue;
               var r1 = cb(cont[key], key);
               r = r && r1;
           }
           return r;
       };
       
       var income_return_code;

       var d = function(ret_code)
       {
           return d.Show(ret_code);
       }

       var widgets = [];
       d.Control = PConst(container);
       if (container.Owner)
           container.Owner(d);
       d.Widgets = function(){return widgets;};
       d.Widgets.Add = function(widget){widgets.push(widget);};
       d.Widgets.Remove = function(widget){var i = widgets.indexOf(widget); if (1 != -1) widgets.splice(i, 1);};
       d.OnChange = ns_sender.DialogEvent(d);
       
       //assigning to the following properties cancels widget processing
       d.CB_CanGoBack = P(); 
       d.CB_GoBack = P();
       d.CB_Cancel = P();
       d.CB_CanGoNext = P();
       d.CB_GoNext = P();
       d.CB_Skip = P(); 
       d.CB_CustomAction = P();
       
       //own callbacks
       d.CB_OwnInitialize = P(function(ret_code){return true;});
       d.CB_OwnGoNext = P(function(){return true;});

       d.ButtonNext = button("[Next]", false, true);
       d.ButtonBack = button("[Prev]", false, true);
       d.ButtonCancel = button("[Cancel]", false, true);
       d.ButtonCustom = button("[Custom]", false, false);

       //must be set after creating a dialog
       d.Name = P("");
       d.Name.Subscribe(function(val){d.Control().Name = val;});
       
       var modal_dialog = null;
       var modal_refresh_on_ok = false;

       var do_refresh = function(sender)
       {
            //refreshing all widgets
            d.Refresh(sender);
            //if not all widgets were refreshed
            //do not generate an event
            return !d.IsRefresh();
       };
       
       d.OnChange.OnTransmit(do_refresh);
       
       d.ButtonNext.OnChange(d.OnChange.Transmit());
       d.ButtonBack.OnChange(d.OnChange.Transmit());
       d.ButtonCancel.OnChange(d.OnChange.Transmit());
       d.ButtonCustom.OnChange(d.OnChange.Transmit());
       if (d.Control.GetRaw().OnChange)
            d.Control.GetRaw().OnChange(d.OnChange.Transmit());
       
       d.Buttons = function()
       {
             //initialize buttons 
             Wizard.Notify("next", "set text", d.ButtonNext.Caption());
             Wizard.Notify("prev", "set text", d.ButtonBack.Caption());
             Wizard.Notify("cancel", "set text", d.ButtonCancel.Caption());
             Wizard.Notify("button4", "set text", d.ButtonCustom.Caption());
             
             Wizard.Notify("next", d.ButtonNext.Visible() ? "show" : "hide");
             Wizard.Notify("prev", d.ButtonBack.Visible() ? "show" : "hide");
             Wizard.Notify("cancel", d.ButtonCancel.Visible() ? "show" : "hide");
             Wizard.Notify("button4", d.ButtonCustom.Visible() ? "show" : "hide");
             
             d.ButtonsProcessor();
       }
       
       d.ButtonsProcessor = P(function()
       {
             //calculate button states
            if (d.ButtonNext.Disabled() || filter_enabled(d.Widgets(), function(fr){return fr.ButtonNext.Disabled(); }))
                Wizard.Notify("next", "disable");
            else 
                Wizard.Notify("next", "enable");

            if (Wizard.FirstDialog.GetRaw() == d
                || d.ButtonBack.Disabled()
                || filter_enabled(d.Widgets(), function(fr){return fr.ButtonBack.Disabled(); }))
                Wizard.Notify("prev", "disable");
            else
                Wizard.Notify("prev", "enable");

            if (d.ButtonCancel.Disabled() || filter_enabled(d.Widgets(), function(fr){return fr.ButtonCancel.Disabled();}))
                Wizard.Notify("cancel", "disable");
            else
                Wizard.Notify("cancel", "enable");
       });

       d.IsRefresh = P(false);
       
       d.Refresh = function(sender)
       {
           if (d.IsRefresh())
           {
               //Log("    Flag IsRefresh had been previously set. Exit");
               return;
           }
           Log(Log.l_debug, "Refreshing " + d.Name() + " started");
           d.IsRefresh(true);
           //
           //calculate widget dependencies
           if (sender && sender.DependentWidgets)
           {
               Log(Log.l_debug, "    The signal from widget " + sender.Name() + " has been received");
               //refresh only dependent widgets
               filter_enabled(sender.DependentWidgets(), function(fr){Log(Log.l_debug, "         refreshing dependent widget " + fr.Name() + ""); fr(income_return_code)});
           }

           if (!modal_dialog)
           {
               Log(Log.l_debug, "    Processing button states"); 
               d.ButtonsProcessor();
           }
           else
           {
               Log(Log.l_debug, "    Processing button was rejected due to modal dialog had been shown"); 
           }
           //           
           d.IsRefresh(false);
           Log(Log.l_debug, "Refreshing " + d.Name() + " finished");
       }
       
       d.ForceSkip = P(false);       
       
       d.Skip = function()
       {
           Log("Processing Skip: " + d.Name() + "");
           var f = d.CB_Skip.GetRaw();
           if (f && typeof f == "function") 
           {
               var r = f();
               if (r)
               {
                  Log("Processing Skip: " + d.Name() + " is skipped");
                  return true;
               }
               else if (d.ForceSkip())
               {
                  Log("Processing Skip: " + d.Name() + " is NOT skipped");
                  return false;
               }
               Log("        dialog callback returned false, request is directed to widgets");
           }
           //Dialog CallBack returned false, request is directed to widgets
           if (execute_all(d.Widgets(), function(fr){return fr.Skip();}))
           {
               Log("Processing Skip: " + d.Name() + " is skipped"); 
               return true;
           }
           Log("Processing Skip: " + d.Name() + " is not skipped"); 
           return false;
       }
       

       var can_go_next = function()
       {
           Log("Processing CanGoNext: " + d.Name() + "");
           var f = d.CB_CanGoNext.GetRaw();
           if (f && typeof f == "function") 
               return f();
           Log("        dialog callback is ommited, request is directed to widgets");
           //Dialog CallBack is ommited, request is directed to widgets
           if (all_enabled(d.Widgets(), function(fr){
               Log("Widget "+fr.Name()+" - CanGoNext");
               return fr.CanGoNext();
           }))
               return true;
           Log("Processing CanGoNext " + d.Name() + " returned false"); 
           return false;
       }

       var can_go_back = function()
       {
           var f = d.CB_CanGoBack.GetRaw();
           if (f && typeof f == "function") 
               return f();

           return true;
       }

       var go_next = function()
       {
           Log("Processing GoNext " + d.Name() + " started");
           var f = d.CB_GoNext.GetRaw();
           if (f && typeof f == "function")
           {
               var r = f();
               Log("Processing GoNext " + d.Name() + " finished, dialog res = " + r);
               return r;
           }
           Log("        dialog callback is ommited, request is directed to own callback & widgets");
           //Dialog CallBack is ommited, request is directed to Own callback and widgets 
           var o = d.CB_OwnGoNext.GetRaw();
           if (o && typeof o == "function")
           {
                var ret = o();
                if (!ret)
                {
                    Log("Processing GoNext " + d.Name() + " finished, own res = " + ret);
                    return ret;
                }
           }
            
           if (all_enabled(d.Widgets(), function(fr){return fr.GoNext(); }))
           {
               Log("Processing GoNext " + d.Name() + " finished with true result");
               return true;
           }
           Log("Processing GoNext " + d.Name() + " finished with false result");
           return false;
       }

       var go_back = function()
       {
           var f = d.CB_GoBack.GetRaw();
           if (f && typeof f == "function")
                f();
       }

       d.GoNext = function()
       {
           if (!can_go_next())
               return false;

           return go_next();
       }

       d.GoBack = function()
       {
           if (!can_go_back())
               return false;
           
           go_back();
           return true;
       }
       
       d.Cancel = function()
       {
           var f = d.CB_Cancel.GetRaw();
           if (typeof f == "function") 
                f();  
           return true;
       }
       
       d.Initialize = function()
       {
           Log("Dialog Initialization " + d.Name() + " started");
           d.IsRefresh(true);
           filter_enabled(d.Widgets(), function(fr){fr(income_return_code);});
           var i = d.CB_OwnInitialize.GetRaw();
           if (i && typeof(i) == "function")
               i(income_return_code);
           d.Buttons();
           d.IsRefresh(false);
           Log("Dialog Initialization " + d.Name() + " finished");
       }
       
       d.InitBeforeShow = function()
       {
           Log("Dialog InitBeforeShow " + d.Name() + " started");
           d.IsRefresh(true);
           filter_enabled(d.Widgets(), function(fr){fr(income_return_code);});
           var i = d.CB_OwnInitialize.GetRaw();
           if (i && typeof(i) == "function")
               i(income_return_code);
           d.IsRefresh(false);
           Log("Dialog InitBeforeShow " + d.Name() + " finished");
       }
       
       d.InitAfterShow = function()
       {
           Log("Dialog InitAfterShow " + d.Name() + " started");
           d.IsRefresh(true);
           d.Buttons();
           d.IsRefresh(false);
           Log("Dialog InitAfterShow " + d.Name() + " finished");
       }
       
       d.CustomAction = function()
       {
           Log("Processing CustomAction: " + d.Name() + "");
           var f = d.CB_CustomAction.GetRaw();
           if (f && typeof f == "function")
                return f();
           Log("        dialog callback is ommited, request is directed to widgets"); 
           if (all_enabled(d.Widgets(), function(fr){return fr.CustomAction(); }))
               return true;
           Log("Processing CustomAction " + d.Name() + " returned false");
           return false;
       }
       
       d.Show = function(ret_code)
       {
           income_return_code = ret_code;
           Log("Show is called. " + d.Name() + " ");
           Wizard.ActiveDialog(d);
           if(d.Control.GetRaw().navigator)
                d.Control.GetRaw().navigator.Show();
           d.Initialize();
           //register active dialog
           if (!Wizard.FirstDialog.GetRaw())
           {
               d.ButtonBack.Disabled(true);
               Wizard.FirstDialog(d);
               Log("Dialog " + d.Name() + " has been registered as a first dialog in sequence");
           }
           //
           
           var ret;
           var ex = false;
           do
           {
                ret = Wizard.ShowDialog(d);
                var dm = modal_dialog;
                if (dm)
                {
                    //1. Check if modal dialog returned something
                    Log("Modal dialog " + dm.Name() + " returned " + ret);
                    var exm;
                    var am = (ret == Action.r_ok ? dm.GoNext : dm.GoBack);
                    if (am && typeof(am) == "function")
                        exm = am(ret);
                    else
                        exm = true;
                    
                    if(exm)
                    {
                        d.HideModal(ret);
                    }
                    
                    //always false
                    ex = false;
                }
                else
                {    
                    //2. This dialog returned something
                    Log("Dialog " + d.Name() + " returned " + ret);
                    var a = (ret == Action.r_ok ? d.GoNext : (ret == Action.r_back ? d.GoBack : (ret == Action.r_cancel ? d.Cancel : d.CustomAction)));
                    if (a && typeof(a) == "function")
                        ex = a(ret);
                    else
                        ex = true;
                }
           }
           while(!ex)

           return ret;
       }
       //modal dialog will be shown as a part of this dialog
       //method is async
       d.ShowModal = function(dm, refresh_on_ok)
       {
           if (!dm)
           {
               Log("Attempt to show modal null dialog");
               return;
           }
           if(dm.Skip())
           {
               Log("Attempt to show modal dialog " + dm.Name() + ", which is skipped");
               return;
           }
           Log("Show modal dialog " + dm.Name());
           modal_refresh_on_ok = refresh_on_ok;
           modal_dialog = dm;
           //register in Wizard
           Wizard.ActiveModalDialog(dm);  
           dm.InitBeforeShow();
           d.Control.GetRaw().ShowModal(dm.Control.GetRaw());
           dm.InitAfterShow();

       }
       
       d.HideModal = function(ret)
       {
           if (!modal_dialog)
           {
               Log("Attempt to hide null modal dialog");
               return;
           }
           var to_init = (modal_refresh_on_ok && ret == Action.r_ok);
           if (to_init)
               d.InitBeforeShow();
           Log("Hide modal dialog " + modal_dialog.Name());
           d.Control.GetRaw().HideModal(modal_dialog.Control.GetRaw());
           //unregister in Wizard
           Wizard.ActiveModalDialog(null);  
           modal_dialog = null;
           modal_refresh_on_ok = false;
           if (to_init)
               d.InitAfterShow();
           else
               d.Refresh(); //make refresh on holder dialog to restore button states because it is not done with restoring previous navigator
       }

       d.AttachWidget = function(widget, arrange_functor)
       {
           if (!widget)
               return;
           /*
           var old = widget.Owner();
           if (old)
           {
               old.DetachWidget(widget);
           }
           */
           widget.Owner(d);
           widget.OnAttach(d.Name());
           widget.OnChange(d.OnChange.Perform);
           d.Widgets.Add(widget);
           
           //making an accessor to the widget through the dialog
           if (!d[widget.Name()])
                d[widget.Name()] = widget;

           if (arrange_functor && typeof(arrange_functor) == "function")
                arrange_functor(d, widget);

           var widget_ctrl = widget.Control();
           Log("Attaching widget " + widget.Name() + " to dialog " + d.Name());
           d.Control().AttachWidget(widget_ctrl);

           return widget;
       }

       d.AddDependency = function(changed_widget, refreshed_widgets)
       {
           if (changed_widget && refreshed_widgets && refreshed_widgets.length)
           {
               for(var df in refreshed_widgets)
               {
                   Log("    " + refreshed_widgets[df].Name() + " has been added as dependent widget on " + changed_widget.Name());
                   changed_widget.DependentWidgets.Add(refreshed_widgets[df]);
               }
           }
       }

       return d;
    }
}
