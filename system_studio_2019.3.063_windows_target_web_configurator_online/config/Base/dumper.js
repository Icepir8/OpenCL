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

//###############################################################
// This file contains definition for:
//  class Dumper
//###############################################################
new function()
{
    var ns = this;

    var DLog = GetOpt.Exists("dumper-log") ? function(msg1, msg2) {Log(msg1, msg2);} : function() {};

    var DAction = function(obj, nm)
    {
        if(obj)
        {
            var name = nm ? nm : Guid();
            var holder = obj;
            var group = "";
            var attributes = {};

            var action = {};
            action.Apply = function()
            {
                return safecall(function(){return holder.Apply ? holder.Apply() : Action.r_ok;},
                                function(){Log(Log.l_error, "Exception handled calling Apply method of " + name); return Action.r_error;});
            }

            action.Rollback = function()
            {
                return safecall(function(){return holder.Rollback ? holder.Rollback() : Action.r_ok;},
                                function(){Log(Log.l_error, "Exception handled calling Rollback method of " + name); return Action.r_ok;});
            }

            action.Commit = function()
            {
                return safecall(function(){return holder.Commit ? holder.Commit() : Action.r_ok;},
                                function(){Log(Log.l_error, "Exception handled calling Commit method of " + name); return Action.r_ok;});
            }

            action.Error = function()
            {
                return safecall(function(){return holder.Error ? holder.Error() : null;},
                                function(){Log(Log.l_error, "Exception handled calling Error method of " + name); return null;});
            }

            action.ProgressApply = function() {return holder.ProgressApply ? holder.ProgressApply() : null;}
            action.ProgressRollback = function() {return holder.ProgressRollback ? holder.ProgressRollback() : null;}
            action.ProgressCommit = function() {return holder.ProgressCommit ? holder.ProgressCommit() : null;}

            if(holder.Async)
            {
                action.Async = holder.Async;
                action.Complete = function(cb) {holder.complete = cb;} // allow to subscribe on async action complete
            }

            action.Skip = function()
            {
                return safecall(function(){return holder.Skip ? holder.Skip() : false;},
                                function(){Log(Log.l_error, "Exception handled calling Skip method of " + name + ". Action skipped"); return true;});
            }

            action.Group = function(grp)
            {
                if(arguments.length)
                    group = grp;
                else
                    return group;
            }

            action.Attribute = function(_name, _val)
            {
                if(arguments.length)
                {
                    if(arguments.length > 1)
                        attributes[_name] = _val;
                    else
                        return attributes[_name];
                }

                return null;
            }

            action.Attributes = function() {return attributes;}

            action.Holder = function() {return holder;}

            action.Name = function() {return name;}

            return action;
        }

        return null;
    }

    this.Dumper = function(nm, owner)
    {
        //###############################################################
        // Dumper class
        //###############################################################
        var dumper = {};

        dumper.IsDumper = true;

        var actions = [];

        var pre_act_dmp = null;
        var post_act_dmp = null;

        var m_id = Guid();
        var m_name = nm ? nm : m_id;
        var m_owner = owner;
        var dumper_group = "";

        //###############################################################
        dumper.Id = function(){return m_id;}
        //###############################################################
        dumper.Name = function(val)
        {
            if(val)
                m_name = val;

            return m_name;
        }
        //###############################################################

        var check_loop = GetOpt.Exists("dumper-check-loop");
        dumper.Owner = function(val)
        {
            if(val)
                m_owner = val;

            return m_owner;
        }
        //###############################################################
        dumper.AddAction = function(_act, _nm)
        {
            if(!_act)
            {
                DLog(DLog.l_warning, "an attempt to add undefined DAction!");
                return;
            }
            if(!_act.IsDumper)
            {
                var a = DAction(_act, _nm);
                actions.push(a);
                DLog("Add action: " + dumper.Name() + " <= " + a.Name());
                return a;
            }
            else
            {
                actions.push(_act);
                DLog("Add dumper: " + dumper.Name() + " <= " + _act.Name());
                if(check_loop)
                {
                    dumper.CheckDeadLoop({});
                }
                return _act;
            }
        }

        dumper.Elements = function()
        {
            var el = dumper.Serialize();

            var elem = {};

            var index = 0;
            var reset = true;
            var reverse = false;

            elem.Reset = function() {index = 0; reset = true;}
            elem.Reverse = function(r) {if(arguments.length) {reverse = r; elem.Reset();} else return reverse;}

            elem.Next = function()
            {
                if(!el.length)
                    return false;
                else if(el.length && index >= el.length - 1 && !reset)
                {
                    DLog("  actions number: " + el.length);
                    DLog("  index: " + index);
                    DLog("  reset: " + reset);
                    index = el.length;
                    return false;
                }
                else
                {
                    if(reset)
                    {
                        reset = false;
                        index = 0;
                        return true;
                    }
                    else
                    {
                        index++;
                        return true;
                    }
                }
            }

            elem.Get = function()
            {
                DLog("  actions number: " + el.length);
                DLog("  index: " + index);
                DLog("  reset: " + reset);
                if(index >= el.length || !el.length || reset)
                    return null;
                if(!reverse)
                    return el[index];
                else
                    return el[el.length - index - 1];
            }

            return elem;
        }

        dumper.Serialize = function(deep)
        {
            var v = [];
            if(!deep)
            {
                if(pre_act_dmp && pre_act_dmp.IsDumper)
                    v = [pre_act_dmp];
                else
                    v = [];

                if(actions)
                    v = v.concat(actions);

                if(post_act_dmp && post_act_dmp.IsDumper)
                    v.push(post_act_dmp);

                return v;
            }
            else
            { // return all actions (not dumpers) including all child elements
                if(pre_act_dmp && pre_act_dmp.IsDumper)
                    v = pre_act_dmp.Serialize(deep);
                else
                    v = [];

                if(actions)
                {
                    for(var i in actions)
                        if(actions[i].IsDumper)
                            v = v.concat(actions[i].Serialize(deep));
                        else
                            v.push(actions[i]);
                }

                if(post_act_dmp && post_act_dmp.IsDumper)
                    v = v.concat(post_act_dmp.Serialize(deep));

                return v;
            }
        }

        dumper.IsEmpty = function() {return dumper.Serialize(true).length == 0;}

        dumper.PreAction = function()
        {
            if(!pre_act_dmp)
                pre_act_dmp = ns.Dumper("Pre Action Dumper" + m_name);

            return pre_act_dmp;
        }

        dumper.PostAction = function()
        {
            if(!post_act_dmp)
                post_act_dmp = ns.Dumper("Post Action Dumper" + m_name);

            return post_act_dmp;
        }

        dumper.Group = function(grp)
        {
            if (!arguments.length)
                return dumper_group;

            dumper_group = grp;
            for(var i in actions)
                actions[i].Group(grp);
            if(pre_act_dmp && pre_act_dmp.IsDumper)
                pre_act_dmp.Group(grp);
            if(post_act_dmp && post_act_dmp.IsDumper)
                post_act_dmp.Group(grp);
        }

        dumper.Attribute = function(attr, val)
        {
            for(var i in actions)
                actions[i].Attribute(attr, val);
            if(pre_act_dmp && pre_act_dmp.IsDumper)
                pre_act_dmp.Attribute(attr, val);
            if(post_act_dmp && post_act_dmp.IsDumper)
                post_act_dmp.Attribute(attr, val);
        }

        dumper.Actions = function() {return actions;}

        dumper.CheckDeadLoop = function(cache)
        {
            if(cache[m_id])
            {
                Log(Log.l_error, "Cyclic dumper detected: " + m_name);
                DumpTrace(100);
            }
            else
            {
                cache[m_id] = true;
                var serial = dumper.Serialize();
                for(var i in serial)
                    if(typeof(serial[i].CheckDeadLoop) == "function")
                        serial[i].CheckDeadLoop(cache);
            }
        };

        return dumper;
    }

    this.Iterator = function(_dumper)
    {
        var self = arguments.callee;

        var iterator = {};
        var dumper = _dumper;

        var name = dumper.Name();

        var elements = dumper.Elements();

        var def_functor = function(elem) {return elem.Apply();}
        var functor = def_functor;

        var def_filter = function() {return true;}
        var filter = def_filter;

        var transfer = null;

        var reset = true;

        iterator.Name = function() {return name;}

        iterator.Next = function()
        {
            DLog("Next to " + name);

            if(reset)
            { // start initialization
                DLog("  clean reset flag in " + name);
                reset = false;
                elements.Reset();
                transfer = null;
            }

            while(1)
            {
                if(transfer)
                {
                    DLog("  jump to transfer from " + name + " to " + transfer.Name());
                    var r = transfer.Next();
                    if(r)
                    {
                        DLog("  found element in transfer for " + name);
                        return r;
                    }
                    transfer = null;
                }

                if(!elements.Next()) // no more elements
                {
                    DLog("  no more elements in " + name);
                    transfer = null;
                    return false;
                }

                var item = elements.Get();
                if(item)
                {
                    if(item.IsDumper)
                    { // process nested dumper
                        DLog("  creating transfer element in " + name);
                        transfer = self(item);
                        transfer.Reverse(elements.Reverse());
                        transfer.Filter(filter);
                        transfer.Functor(functor);
                    }
                    else
                    {
                        DLog("  native element found in " + name);
                        transfer = null;
                        if(filter(item))
                            return true;
                        else
                            DLog("  native element is filtered " + name);
                    }
                }
                else
                { // failed to get element... just return
                    DLog("  ERROR: failed to get element in " + name);
                    transfer = null;
                    return false;
                }
            }
        }

        iterator.Reset = function()
        {
            reset = true;
            elements.Reset();
            transfer = null;
        }

        iterator.Reverse = function(r)
        {
            if(arguments.length)
                elements.Reverse(r);
            else
                elements.Reverse(true);
            iterator.Reset();
        }

        iterator.Call = function(f)
        {
            var res;
            if(transfer)
            {
                if(f)
                    return transfer.Call(f);
                res = transfer.Call(f);
            }
            else
            {
                if(f)
                    return f(elements.Get());
                var elem = elements.Get();
                DLog("Calling functor with element: " + elem);
                res = functor(elem);
            }

            if(res != Action.r_ok && res != true)
            {
                Log("  error detected in " + name);
                Log("  error code: " + res + ". expected: " + Action.r_ok);
                if(dumper.OnError)
                {
                    Log("  calling error handler");
                    return dumper.OnError(iterator, res);
                }
            }
            return res;
        }

        iterator.Path = function(pth)
        {
            if(!pth)
                pth = [iterator];
            else
                pth.unshift(iterator);
            if(transfer && transfer.Path)
                return transfer.Path(pth);
            return pth;
        }

        iterator.Functor = function(func)
        {
            if(func)
                functor = func;
            else
                functor = def_functor;
        }

        iterator.Filter = function(f)
        {
            if(f)
                filter = f;
            else
                filter = def_filter;
        }

        iterator.Get = function()
        {
            if(transfer)
                return transfer.Get();
            else
                return elements.Get();
        }
        iterator.Item = iterator.Get;

        iterator.Dumper = function() {return dumper;}

        return iterator;
    }

    this.Trace = function(dmp)
    {
        var filter = function(coll, cb) {for(var i in coll) if(cb(coll[i], i)) return true; return false;};

        var stringify = function(obj)
        {
            var str = "";
            filter(obj, function(v, i) {str = str + (str ? ", " : "") + i + ":" + v;});
            return str;
        }

        DLog("Tracing dumper: " + dmp.Name());
        var iter = ns.Iterator(dmp);
        while(iter.Next())
        {
            var a = iter.Get();
            DLog("Trace action: " + a.Name() + " group: " + a.Group() + " attributes: " + stringify(typeof(a.Attributes) == "function" ? a.Attributes() : ""));
            if(typeof(iter.Path) == "function")
                filter(iter.Path(), function(it) {DLog("--> " + it.Dumper().Name());});
        }
    }
}
