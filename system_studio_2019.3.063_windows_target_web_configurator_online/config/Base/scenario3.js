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
    //###############################################################
    // general functions and objects definition
    //###############################################################
    //var IsNull = function(obj) { return (!obj || typeof(obj) == "undefined") ? true : false;}

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "Scenario::iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    var THash = function()
    {
        var cnt = 0;
        var hkeys = {};
        var h = {};

        var get_key = function(obj)
        {
            return iterate(hkeys, function(_obj, _key)
            {
                if(_obj == obj)
                    return _key;
            });
        }

        var obj = function(k, v)
        {
            if(!k)
                return null;

            var key = get_key(k);

            if(!key)
            {
                if(typeof(v) == "undefined")
                    return null;
                else
                {
                    key = cnt;
                    hkeys[key] = k;
                    h[key] = v;
                    cnt++;
                }
            }

            return h[key];
        }

        //obj.KeyFunc = function(o){ return o.Id(); }

        obj.Iterate = function(cb)
        {
            if(!cb)
                return;

            return iterate(h, function(o, k)
            {
                var r = cb(hkeys[k], o);
                if(r)
                    return r;
            });
        }

        obj.Delete = function(k)
        {
            /*
            var key = iterate(h, function(_obj, _key)
            {
                if(obj.KeyFunc(_obj) == k)
                    return _key;
            });
            */

            var key = get_key(k);

            if(key)
            {
                delete h[key];
                delete hkeys[key];
            }
        }

        return obj;
    }

    //###############################################################
    // Scenario.Create function
    //###############################################################

    this.CreateHead = function(_scenario_name)
    {
        var scn = this.Create(_scenario_name);
        scn.Add(function(back_action)
        {
            if (typeof(back_action) != "undefined")
                return back_action;
            return Action.r_ok;
        });
        return scn;
    }

    this.Create = function(_scenario_name)
    {
        var actions = THash();
        var def_acts = {};
        //actions.KeyFunc = function(obj){ return obj.Action(); }

        var first_act = null;
        var last_added = null; // last added action on Next without condition
        var iterator = null;

        var on_finish = "on_finish";

        var scn = function()
        {
            scn.ScenarioName(_scenario_name);
            return scn.Run();
        }
        scn.Log = log_helper("Scn : ");
        //###############################################################
        // TIterator object
        //###############################################################
        var TIterator = function(_act)
        {
            /*
            if(!_act || !actions(_act))
            {
                scn.Log(Log.l_warning, "Iterator::Construction: try to assign undefined act or actions(act] isn't defined -> Ignore");
                return;
            }
            */
            var tact = _act;

            if(!tact || ((!tact.Type || TAction.Type() != TAction.Type()) && !actions(tact)))
            {
                scn.Log(Log.l_warning, "Iterator::Construction: try to assign undefined act or actions(act) isn't defined -> Ignore");
                return;
            }

            var begin_act = tact;
            var prev_act = scn.Exit;
            var act = null;

            var ret = null;

            var iter = function(initial_ret_code)
            {
                ret = initial_ret_code ? initial_ret_code : Action.r_ok;

                iter.Next();

                while(!iter.End())
                {
                    iter.Execute();
                    iter.Next();
                };

                return ret;
            }

            iter.Execute = function()
            {
                if(!iter.IsNull())
                {
                    //var r = actions(act)();
                    var r = act(ret, prev_act);
                    scn.Log(Log.l_debug, "Iterator::Execute:: action return code = " + r);
                    if(typeof(r) == 'undefined')
                    {
                        scn.Log(Log.l_debug, "Iterator::Execute:: due to action return code is undefined the previous return code " + r + " will be used");
                    }
                    else
                        ret = r;
                }

                return ret;
            }
            /*
            iter.Begin = function(a)
            {
                if(!a || !actions(a))
                {
                    scn.Log(Log.l_warning, "Iterator::Set: try to assign undefined act or actions(act] isn't defined -> Ignore");
                    return;
                }

                act = a;
            }
            */
            iter.Reset = function(){ act = null; }

            iter.CurrentAction = function(a)
            {
                if(a)
                {
                    var nact = a;

                    if(!a.Type || a.Type() != TAction.Type())
                    {
                        nact = actions(a);
                    }

                    prev_act = act;
                    act = nact;
                }

                return act;
            }

            iter.PreviousAction = function(){ return prev_act; }

            iter.End = function(){ return iter.IsNull() || iter.CurrentAction().Action() == scn.Exit; }

            iter.Next = function()
            {
                var new_act = null;
                var found_new_act = false;

                do
                {
                    if(iter.IsNull())
                    {
                        scn.Log(Log.l_debug, "Iterator.Next:: iterator current action is Null -> use begin action");
                        new_act = begin_act;
                    }
                    else if(iter.End())
                    {
                        scn.Log(Log.l_debug, "Iterator.Next:: iterator is Exit -> use previous action");
                        new_act = iter.PreviousAction();
                    }
                    else
                    {
                        new_act = act.GetOn(ret);
                    }

                    if(!new_act)
                    {
                        scn.Log(Log.l_debug, "Iterator::Next: no further action found");
                        var default_act = scn.DefaultOn(ret);
                        if(default_act)
                        {
                            scn.Log(Log.l_debug, "Iterator::Next: executing scenario default action for the ret " + ret);

                            new_act = TIterator(default_act);
                            var new_act_scn = scn.Action(new_act, false, "Default_" + ret + "_processor");
                            scn.Connect(new_act, act, Action.r_back);
                            scn.Connect(new_act, scn.Exit, scn.UnknownRetCode());
                            //iter.CurrentAction(new_act);
                            iter.CurrentAction(new_act_scn);
                        }
                        else
                        {
                            scn.Log(Log.l_debug, "Iterator::Next: set next action with Scenario.Exit");
                            iter.CurrentAction(scn.Exit);
                        }

                        found_new_act = true;
                    }
                    else
                    {
                        if(new_act.Action() == scn.Exit)
                        {
                            scn.Log(Log.l_debug, "Iterator::Next: the next action is Exit");
                            found_new_act = true;
                        }
                        else
                        {
                            //var ta = actions(new_act);
                            //var skpta = (ta && ta.Action().Skip && ta.Action().Skip()) ? true : false;
                            // in case when the following action should be skipped the ret code should be adjusted
                            // due to this following action may not going to have processor for the current ret (for exmple "r_button4" or custom)
                            // therefore if the skip is true and we are not going back then ret is changed to general Action.r_ok - "next"
                            if(new_act.Skip())
                            {
                                found_new_act = false;
                                if(ret != Action.r_back && ret != Action.r_ok)
                                {
                                    scn.Log(Log.l_debug, "Iterator::Next: the next action is going to be skipped and the current ret code (" + ret + ") isn't equal to Action.r_back or Action.r_ok -> it will be changed to Action.r_ok due to next action may not have processing for current ret.");
                                    ret = Action.r_ok;
                                }
                            }
                            else
                                found_new_act = true;
                        }

                        iter.CurrentAction(new_act);
                    }
                }while(!found_new_act);
            }

            //iter.IsNull = function(){return !act || !actions(act);}
            iter.IsNull = function(){return !act}

            return iter;
        }
        //###############################################################
        // TAction object
        //###############################################################
        var TAction = function(i_act, _exe_act, name)
        {
            if(!i_act)
            {
                scn.Log(Log.l_warning, "TAction::Construction: try to assign andefined act)");
                return null;
            }

            var incoming = {};
            var outcoming = {};
            //var id = _id;
            var m_name = typeof(name) != "undefined" ? name : "";
            var m_act = i_act;
            var exe_act = _exe_act ? _exe_act : i_act;

            var a = function(ret_code, prev_act){ return exe_act(ret_code, prev_act); }
            var self = a;
            a.Name = function(){ return m_name;}
            a.Id = function(){ return m_act;}
            a.Action = function(){ return m_act;}
            a.Type = function(){ return TAction.Type();}

            a.Log = log_helper("Action " + a.Name() + ": ");

            a.Skip = function(){ return exe_act.Skip ? exe_act.Skip() : false;}

            var find_connection = function(cont, cb, act, ret)
            {
                if(!cb)
                {
                    a.Log(Log.l_warning, "find_connection:: callback isn't defined -> Ignore.");
                    return;
                }

                var r1 = iterate(cont, function(map, key)
                {
                    if(ret && key != ret)
                        return;

                    var r2 = map.Iterate(function(k, obj)
                    {
                        if(act && obj.act.Id() != act)
                            return;

                        var r3 = cb(obj, key);

                        if(r3)
                            return r3;
                    });

                    if(r2)
                        return r2;
                });

                return r1 ? r1 : null;
            }

            a.FindIncomingConnection = function(cb, act, ret) { return find_connection(incoming, cb, (act && act.Type && act.Type() == TAction.Type()) ? act.Id() : act, ret);}
            a.FindOutcomingConnection = function(cb, act, ret) { return find_connection(outcoming, cb, (act && act.Type && act.Type() == TAction.Type()) ? act.Id() : act, ret);}

            a.Connect = function(_act, ret, condition)
            {
                if(!_act || !ret)
                {
                    a.Log(Log.l_warning, "Connect: action or ret ins't defined (act= " + _act + " ret = " + ret + ")! Ignore.");
                    return false;
                }

                var act = _act;

                if(!_act.Type || _act.Type() != TAction.Type())
                    act = actions(_act);

                if(act == self)
                {
                    a.Log(Log.l_warning, "Connect: try to connect action to itsself! Ignore.");
                    return false;
                }

                if(!outcoming[ret])
                    outcoming[ret] = THash();

                //var tgt_name = actions(act).Name();
                var tgt_name = act.Name();
                var prev_cnt = outcoming[ret](act.Id());
                var TLog= log_helper(a.Log.Prefix() + "Connect to " + tgt_name + ": ");

                if(prev_cnt)
                {
                    TLog(Log.l_warning, "There is another connection to the " + tgt_name + " on ret = " + ret + " with condition = " + prev_cnt.condition + " it will be replaced with newer one" );
                    // if there is another connection to the same act with condition -> it will be removed.
                    a.Disconnect(act, ret);
                }

                //only one default connection can exists therefore all connections with empty conditions should be removed
                if(!condition)
                    a.FindOutcomingConnection(function(obj)
                    {
                        if(!obj.condition)
                        {
                            TLog(Log.l_warning, "There is another default (unconditonal) connection on ret = " + ret + " to the act " + tgt_name + " it will be removed as only one default connection for the certain ret can exists" );
                            a.Disconnect(obj.act);
                        }
                    }, null, ret);

                var obj = {};
                obj.act = act;
                obj.condition = condition;

                TLog("Done on ret = " + ret + " condition = " + (typeof(condition) == "function" ? "function" : condition));

                outcoming[ret](act.Id(), obj);
                /*
                if(!actions(act).Attached(m_act, ret, condition))
                    actions(act).Attach(m_act, ret, condition);
                */
                if(!act.Attached(self, ret, condition))
                    act.Attach(self, ret, condition);

                return true;
            }

            a.Disconnect = function(_act, ret)
            {
                if(!_act)
                    return false;

                var act = _act;

                if(!_act.Type || _act.Type() != TAction.Type())
                    act = actions(_act);

                if(!ret)
                {
                    for(var i in outcoming)
                        a.Disconnect(act, i);

                    return true;
                }

                if(!outcoming[ret])
                {
                    outcoming[ret] = THash();
                    return true;
                }

                //var prev = outcoming[ret](act);
                var prev = outcoming[ret](act.Id());
                if(prev)
                {
                    //a.Log("Disconnect: from " + actions(act).Name() + " on ret = " + ret + " condition = " + prev.condition);
                    a.Log("Disconnect: from " + act.Name() + " on ret = " + ret + " condition = " + prev.condition);
                    //outcoming[ret].Delete(act);
                    outcoming[ret].Delete(act.Id());
                    //actions(act).Detach(m_act, ret);
                    act.Detach(self, ret);
                }

                return true;
            }

            a.Connected = function(act, ret, condition)
            {
                return a.FindOutcomingConnection(function(obj)
                {
                    if(!condition || (condition && obj.condition == condition) )
                        return true;
                }, act, ret);
            }

            a.Attach = function(_act, ret, condition)
            {
                if(!_act)
                {
                    a.Log(Log.l_warning, "Attach: action or ret ins't defined (act= " + _act + " ret = " + ret + ")! Ignore.");
                    return;
                }

                var act = _act;

                if(!_act.Type || _act.Type() != TAction.Type())
                    act= actions(_act);

                if(act == self)
                {
                    a.Log(Log.l_warning, "Attach: try to connect action to itsself! Ignore.");
                    return false;
                }

                if(!incoming[ret])
                    incoming[ret] = THash();

                if(incoming[ret](act.Id()))
                    a.Detach(act, ret);

                var obj = {};
                obj.act = act;
                obj.condition = condition;

                //incoming[ret](act, obj);
                incoming[ret](act.Id(), obj);

                /*
                if(!actions(act).Connected(m_act, ret, condition))
                    actions(act).Connect(m_act, ret, condition);
                */

                if(!act.Connected(self, ret, condition))
                    act.Connect(self, ret, condition);

                return true;
            }

            a.Detach = function(_act, ret)
            {
                if(!_act)
                    return false;

                var act = _act;

                if(!_act.Type || _act.Type() != TAction.Type())
                    act = actions(_act);

                if(!ret)
                {
                    for(var i in incoming)
                        a.Detach(act, i);

                    return true;
                }

                if(!incoming[ret])
                {
                    incoming[ret] = THash();
                    return true;
                }

                if(incoming[ret](act.Id()))
                {
                    incoming[ret].Delete(act.Id());
                    //actions(act).Disconnect(m_act, ret);
                    act.Disconnect(self, ret);
                }

                return true;
            }

            a.Attached = function(act, ret, condition)
            {
                return a.FindIncomingConnection(function(obj)
                {
                    if(!condition || (condition && obj.condition == condition) )
                        return true;
                }, act, ret);
            }

            a.GetOn = function(_ret)
            {
                if(!_ret)
                {
                    a.Log(Log.l_warning, "GetOn: ret ins't defined ! Ignore.");
                    return null;
                }

                var ret = _ret;

                if(!outcoming[ret])
                {
                    a.Log("GetOn: the return code " + ret + " is unknown (i.e. there isn't any connection registered on it for this action).");
                    if(outcoming[scn.UnknownRetCode()])
                    {
                        a.Log("GetOn: there is action for ret = " + scn.UnknownRetCode() + " -> return it.")
                        ret = scn.UnknownRetCode();
                    }
                    else
                        return null;
                }

                var r = null;

                //r = iterate(outcoming[ret], function(obj){ if(obj.condition && obj.condition()) return obj.act; });
                r = outcoming[ret].Iterate(function(key, obj){ if(obj.condition && obj.condition()) return obj.act; });

                if(r)
                    return r;

                //r = iterate(outcoming[ret], function(obj){ if(!obj.condition) return obj.act; });
                r = outcoming[ret].Iterate(function(key, obj){ if(!obj.condition) return obj.act; });

                return r;
            }

            return a;
        }

        TAction.Type = function(){ return "Scn::TAction";}
        //var scenario = function() {return scenario.Run();};
        //###############################################################
        // Object scenario definition
        //###############################################################
        var reg_action = function()
        {
           var acnt = 0;
           return function(a, exe_a, _name)
           {
               actions(a, TAction(a, exe_a, _name ? _name : acnt));
               acnt++;
           }
        }();

        var RegAction = function(_act, execute_once, name)
        {
            if(!_act)
            {
                scn.Log(Log.l_warning, "Action:: requested to add empty action (not defined object). Ignore.");
                return null;
            }

            var act = _act;

            if(_act.Type && _act.Type() == TAction.Type())
            {
                act = _act.Id();
                if(!actions(act))
                    actions(act, _act);
            }
            else if(!actions(act))
            {
                var exe_act = act;
                if(execute_once)
                {
                    if (execute_once == "skip-back")
                    {
                        exe_act = function(ret_code, prev_act)
                        {
                            if (ret_code == Action.r_back)
                                return ret_code;
                            return act(ret_code, prev_act);
                        }
                        exe_act.Skip = function() {act.Skip && act.Skip();}
                    }
                    else if (execute_once == "skip-forward")
                    {
                        exe_act = function(ret_code, prev_act)
                        {
                            if (typeof(ret_code) == "undefined")
                                return Action.r_ok;
                            if (ret_code == Action.r_ok)
                                return ret_code;
                            return act(ret_code, prev_act);
                        }
                        exe_act.Skip = function() {act.Skip && act.Skip();}
                    }
                    else //if (execute_once == "once")
                    {
                        var executed = false;
                        exe_act = function(ret_code, prev_act) {executed = true; return act(ret_code, prev_act);}
                        exe_act.Skip = function() {return executed || (act.Skip && act.Skip());}
                    }
                }

                reg_action(act, exe_act, name);
            }

            return act;
        }
        //###############################################################
        scn.Action = function(_act, execute_once, name){ return actions(RegAction(_act, execute_once, name)); }
        scn.Exists = function(act){ return actions(act);}

        var get_TAction = function(act, execute_once)
        {
            if(!act)
                return null;

            if(!act.Type || act.Type() != TAction.Type())
                return scn.Action(act, execute_once);

            return act;
        }
        //###############################################################
        scn.Exit = "____EXIT"; //function() { return; } // this function is used for definition end of scenario
        //###############################################################
        var scenario_name;
        scn.ScenarioName = function(_scenario_name)
        {
            if (typeof(_scenario_name) != "undefined")
                scenario_name = _scenario_name;

            return scenario_name;
        }
        //###############################################################
        scn.Run = function(initial_ret_code)
        {
            Log("Scenario " + (scenario_name ? scenario_name : "NoName") + " launched");

            if(!iterator)
                iterator = TIterator(first_act);

            var r = iterator(initial_ret_code);
            Log("Scenario " + (scenario_name ? scenario_name : "NoName") + " done with the return code = " + r);

            return r;
        }
        //###############################################################
        scn.UnknownRetCode = function(){ return "unknown";}
        //###############################################################
        //
        //###############################################################
        /*
        scn.FindAction = function(act)
        {
            iterate(actions, function(obj, key)
            {
                if(obj.Id() == act)
                    return key;
            });
        }
        */
        /*
        scn.Delete = function(act)
        {
            if(!scn.Exists(act))
                return true;

            return true;
        }
        */

        scn.Add = function(_act, execute_once)
        {
            var act = get_TAction(_act, execute_once);

            if(!act)
                return;

            if(last_added)
            {
                scn.AddAfter(last_added, act, execute_once);
            }
            else
            {
                first_act = act;
                last_added = act;
            }

            return true;
        }

        scn.AddAfter = function(_host_act, _act, execute_once, condition)
        {
            var host_act = get_TAction(_host_act);
            var act = get_TAction(_act, execute_once);

            if(!host_act || !act)
                return;

            if(host_act == act)
            {
                scn.Log(Log.l_warning, "AddAfter:: host_act is equal to act. Ignore!");
                return;
            }

            //scn.Log("Add action " + actions(act).Name() + " after " + actions(host_act).Name() + " execute_once = \"" + execute_once + "\" condition = " + condition);
            scn.Log(Log.l_debug, "Add action " + act.Name() + " after " + host_act.Name() + " execute_once = \"" + execute_once + "\" condition = " + condition);

            if(!condition) // the action should be added into default branch
            {
                var new_connections = [];
                var c_obj = function(h, t, k, c){ return {host : h, target : t, key : k, condition : c};}
                //var connect = function(obj){ actions(obj.host).Connect(obj.target, obj.key, obj.condition); }
                var connect = function(obj){ obj.host.Connect(obj.target, obj.key, obj.condition); }

                //if(!actions(host_act).FindOutcomingConnection(function(obj, key)
                if(!host_act.FindOutcomingConnection(function(obj, key)
                {
                    if(!obj.condition) // it is default transition
                    {
                        var t_act = obj.act;
                        //actions(host_act).Disconnect(t_act, Action.r_ok);
                        host_act.Disconnect(t_act, Action.r_ok);
                        new_connections.push(c_obj(host_act, act, Action.r_ok));

                        new_connections.push(c_obj(act, t_act, Action.r_ok));

                        //actions(t_act).FindOutcomingConnection(function(obj)
                        t_act.FindOutcomingConnection(function(_obj)
                        {
                            var cond = _obj.condition;
                            //actions(t_act).Disconnect(host_act, Action.r_back);
                            t_act.Disconnect(host_act, Action.r_back);
                            new_connections.push(c_obj(t_act, act, Action.r_back, cond));

                            return true;
                        }, host_act, Action.r_back);

                        return true;
                    }
                }, null, Action.r_ok))
                {
                    //actions(host_act).Connect(act, Action.r_ok);
                    host_act.Connect(act, Action.r_ok);
                }

                iterate(new_connections, function(obj){connect(obj);});

                if(host_act == last_added)
                {
                    var get_last = function(l_act)
                    {
                        //scn.Log("get_last action = " + l_act);
                        //var last = actions(l_act).FindOutcomingConnection(function(obj)
                        var last = l_act.FindOutcomingConnection(function(obj)
                        {
                            if(!obj.condition) // it is default transition
                            {
                                var r = get_last(obj.act);
                                return r ? r : obj.act;
                            }
                        }, null, Action.r_ok);

                        return last ? last : l_act;
                    }

                    last_added = get_last(act);
                }
            }
            else
            {
                // it is separate branch (with condition)
                //actions(host_act).Connect(act, Action.r_ok, condition);
                host_act.Connect(act, Action.r_ok, condition);
            }

            //actions(act).Connect(host_act, Action.r_back);
            act.Connect(host_act, Action.r_back);
        }

        scn.AddBefore = function(_host_act, _act, execute_once, condition)
        {
            var host_act = get_TAction(_host_act);
            var act = get_TAction(_act, execute_once);

            if(!host_act || !act)
                return;

            //scn.Log("Add action " + actions(act).Name() + " before " + actions(host_act).Name() + " execute_once = " + execute_once + " condition = " + condition);
            scn.Log(Log.l_debug, "Add action " + act.Name() + " before " + host_act.Name() + " execute_once = " + execute_once + " condition = " + condition);
            var inc_found = false;

            var new_connections = [];
            var c_obj = function(h, t, k, c){ return {host : h, target : t, key : k, condition : c};}
            //var connect = function(obj){ actions(obj.host).Connect(obj.target, obj.key, obj.condition); }
            var connect = function(obj){ obj.host.Connect(obj.target, obj.key, obj.condition); }

            //actions(host_act).FindIncomingConnection(function(obj, key)
            host_act.FindIncomingConnection(function(obj, key)
            {
                if(key == Action.r_back)
                    return;

                var t_act = obj.act;
                var t_c = obj.condition;

                //actions(t_act).Disconnect(host_act, key);
                t_act.Disconnect(host_act, key);
                new_connections.push(c_obj(t_act, act, key, t_c));

                //actions(host_act).FindOutcomingConnection(function(obj, key)
                host_act.FindOutcomingConnection(function(_obj, _key)
                {
                    var cond = _obj.condition;
                    //actions(host_act).Disconnect(t_act, _key);
                    host_act.Disconnect(t_act, _key);
                    if(_key != Action.r_back)
                        new_connections.push(c_obj(host_act, act, _key, cond));

                    new_connections.push(c_obj(act, t_act, _key, cond));
                }, t_act);
            });

            iterate(new_connections, function(obj){connect(obj);});

            //actions(host_act).Connect(act, Action.r_back); // the default connection on back should be always created for AddBefore
            host_act.Connect(act, Action.r_back); // the default connection on back should be always created for AddBefore
            //actions(act).Connect(host_act, Action.r_ok, condition);
            act.Connect(host_act, Action.r_ok, condition);
        }

        scn.Connect = function(_host_act, _act, ret, condition)
        {
            var host_act = get_TAction(_host_act);
            var act = get_TAction(_act);

            if(!host_act || !act)
                return;

            if(!ret)
            {
                scn.Log(Log.l_warning, "Scenario: requested to add action on not defined ret code. Ignore.");
                return;
            }

            //actions(host_act).Connect(act, ret, condition);
            host_act.Connect(act, ret, condition);

            return true;
        }

        scn.Disconnect = function(_host_act, _act, ret)
        {
            var host_act = get_TAction(_host_act);
            var act = get_TAction(_act);

            if(!host_act || !act)
            {
                scn.Log(Log.l_warning, "Scenario.Disconnect: host_act or act isn't defined (host_act= "+host_act+"act = "+act+")");
                return;
            }

            //actions(host_act).Disconnect(act, ret);
            host_act.Disconnect(act, ret);
        }

        //allows to create condition scenarios
        scn.IIF = function(condition, scn_true, scn_false)
        {
            if(!last_added)
            {
                Log("IIF is skipped: no action in scenario " + (scn.ScenarioName() ? scn.ScenarioName() : "UNNAMED") + " was added");
                return;
            }

            if (!scn_true)
            {
                Log("IIF is skipped: true subscenario is undefined");
                return;
            }
            Log("IIF added to scenario " + (scn.ScenarioName() ? scn.ScenarioName() : "UNNAMED"));
            var condition_res = null;
            var true_condition = function()
            {
                if (typeof(condition) == "undefined")
                {
                    condition_res = true;
                }
                else if (typeof(condition) == "function")
                {
                    condition_res = condition();
                }
                else if (condition)
                {
                    condition_res = true;
                }
                else
                {
                    condition_res = false;
                }
                Log("IIF of "+ (scn.ScenarioName() ? scn.ScenarioName() : "UNNAMED")+" scenario: condition is " + (condition_res ? "true" : "false") + "");
                if (condition_res)
                    Log("SubScenario " + (scn_true.ScenarioName && scn_true.ScenarioName() ? scn_true.ScenarioName() : "UNNAMED") + " is going to be executed");
                else if (scn_false)
                    Log("SubScenario " + (scn_false.ScenarioName && scn_false.ScenarioName() ? scn_false.ScenarioName() : "UNNAMED") + " is going to be executed");
                else
                    Log("Scenario " + (scn.ScenarioName() ? scn.ScenarioName() : "UNNAMED") + " is keeping executing");
                return condition_res;
            }

            var false_condition = function()
            {
                if (condition_res !== null)
                    return !condition_res;

                Log(Log.l_warning, "IIF of "+ scn.ScenarioName()+" scenario: true_condition wasn't called! ");
                return !true_condition();
            }

            var cur_act = last_added;
            scn.Connect(cur_act, scn_true, Action.r_ok, true_condition);
            scn.Connect(scn_true, cur_act, Action.r_back);

            if (scn_false)
            {
                cur_act = last_added;
                scn.Connect(cur_act, scn_false, Action.r_ok, false_condition);
                scn.Connect(scn_false, cur_act, Action.r_back);
            }
        }

        scn.OnCancel = function(f)
        {
            scn.DefaultOn(Action.r_cancel, f);
        }

        scn.OnError = function(f)
        {
            scn.DefaultOn(Action.r_error, f);
        }

        scn.OnFinish = function(f)
        {
            //scn.DefaultOn(on_finish, f);
            scn.DefaultOn(Action.r_ok, f);
        }

        scn.DefaultOn = function(ret, _act, _condition)
        {
            if(!ret || (_condition && !_act))
            {
                scn.Log(Log.l_warning, "DefaultOn:: ret or act isn't defined (ret = " + ret + ", act = " + _act + ", condition = " + _condition+ ")");
                return;
            }

            if(_act)
            {
                var act = get_TAction(_act);

                if(!act)
                    return;
                // By default DefaultAction will retur scn.Exit on all ret codes;
                //scn.Action(act).Connect(scn.Exit, scn.UnknownRetCode());
                act.Connect(scn.Exit, scn.UnknownRetCode());

                if(!def_acts[ret])
                    def_acts[ret] = THash();

                def_acts[ret](act.Id() , { act : act, condition : _condition });
            }
            else
            {
                if(!def_acts[ret])
                    return null;

                var r = def_acts[ret].Iterate(function(k, obj)
                {
                    if(obj.condition && obj.condition())
                        return obj.act;
                });

                if(r)
                    return r;

                return def_acts[ret].Iterate(function(k, obj)
                {
                    if(!obj.condition)
                        return obj.act;
                });
            }
        }

        scn.FindRelation = function(cb, host_act, act, ret)
        {
            if(!cb)
            {
                scn.Log(Log.l_warning, "FindRelation:: callback isn't defined");
                return;
            }

            var iterate_acts_relations = function(_act, _cb)
            {
                var tact = get_TAction(_act);

                if(!tact)
                    return;

                //return actions(_act).FindOutcomingConnection(function(obj)
                return tact.FindOutcomingConnection(function(obj)
                {
                    //var r = _cb(_act, obj.act, ret, obj.condition);
                    var r = _cb(tact, obj.act, ret, obj.condition);
                    if(r)
                        return r;
                }, act, ret);
            }

            if(host_act)
            {
                return iterate_acts_relations(host_act, cb)
            }
            else
            {
                return actions.Iterate(function(key, obj)
                {
                    var r = iterate_acts_relations(key, cb);
                    if(r)
                        return r;
                });
            }
        }

        scn.AllSkipped = function()
        {
            return !actions.Iterate(function(k, act)
            {
                if(!act.Skip || !act.Skip())
                    return true;
            });
        }

        scn.Skip = scn.AllSkipped;

        scn.Reset = function()
        {
            if(!iterator)
                iterator = TIterator(first_act);

            iterator.Reset();
        }

        scn.Clear = function()
        {
            actions = THash();
            def_acts = {};

            first_act = null;
            last_added = null; // last added action on Next without condition
            iterator = null;
        }

        var product = null;

        scn.Product = function(prod)
        {
            if(prod)
                product = prod;
            else
                return product;
        }
        //###############################################################

        RegAction(scn.Exit, false, "Exit"); // registering action scn.Exit to have an ability to connect other actions to it further
        return scn;
    }
}

