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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory()), name);}

    var log = GetOpt.Exists("barb-log") ? function(l){Log("Barbwire: ${l}");} : function(){};

    var queue = load("queue.js");

    var ns = this;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    this.skip    = "skip";
    this.back    = Action.r_back;
    this.next    = Action.r_next;
    this.ok      = Action.r_ok;
    this.error   = Action.r_error;
    this.failed  = this.error;
    this.abort   = Action.r_abort;
    this.finish  = "finish";
    this.cancel  = Action.r_cancel;
    this.repeat  = "repeat";
    this.disable = "disable"; // action should not be executed anymore

    var attach_directs = function(ob)
    {
        ob.skip    = ns.skip;
        ob.back    = ns.back;
        ob.next    = ns.next;
        ob.ok      = ns.ok;
        ob.error   = ns.error;
        ob.abort   = ns.abort;
        ob.finish  = ns.finish;
        ob.cancel  = ns.cancel;
        ob.repeat  = ns.repeat;
        ob.failed  = ns.failed;
        ob.disable = ns.disable;
    }

    this.AttachConstants = function(ob)
    {
        if(ob)
        {
            ob.barb_t = {};
            attach_directs(ob.barb_t);
        }
    }

    this.AttachConstants(this);

    this.Failed = function(res)
    {
        switch(res)
        {
        case ns.error:
        case ns.abort:
        case ns.cancel:
        case ns.failed:
            return true;
        }
    };

    var makethorn = function(n)
    {
        if(arguments.length && n)
        {
            if(n.isthorn)
                return n;
            else
                return ns.Thorn(n);
        }
        return n;
    }

    this.Barbwire = function(fn)
    {
        var stack = [];

        var starter = null;
        
        var skip = function() {return false;}
        
        var meth = null;
        
        var act_result_map = {};

        var func = function(direction, barb)
        {
            if(skip.apply(this, arguments)) // global skip of whole barbwire
                return ns.skip;

            stack = []; // clear stack

            var current = starter;
            var direct = direction;

            var visual = function(e)
            {
                if(e && !e.disabled && typeof(e.Origin) == "function" &&
                   typeof(e.Origin().Visual) == "function" && e.Origin().Visual())
                    return true;
                return false;
            }

            var errcode = Action.r_ok;

            while(current)
            {
                if(typeof(current) == "function")
                {
                    if(!arguments.length)
                    { // top-level barbwire
                      // make some configurations: let start element know that it is first element
                        if(current && current.First && typeof(starter.First) == "function")
                        { // stack is empty - notify element to be first (to disable "back" button)
                            if(!stack.length  || !filter(stack, visual))
                                current.First(true); // if stack is empty or all items are disabled
                            else
                                current.First(false);
                        }
                    }

                    var result = current.disabled ? ns.skip : current(direct, meth);
                    log("Function ended: " + result + "(" + typeof(result) + ")");

                    if(result == ns.disable)
                    {
                        current.disabled = true;
                        result = direct;
                    }
                    else if(result == ns.skip || typeof(result) == "undefined")
                    { // element skipped processing... process result value as direction
                        result = direct;
                    }

                    if(!result || result == ns.next || result == ns.ok || result == Action.r_ok || result == Action.r_next)
                    { // go to next element
                        log("  Processing next");
                        errcode = Action.r_ok;
                        direct = ns.next;
                        stack.push(current);
                        if(current.Next && typeof(current.Next) == "function")
                            current = current.Next();
                    }
                    else if(result == ns.back || result == Action.r_back)
                    { // go back
                        log("  Processing back");
                        direct = ns.back;
                        if(stack.length)
                            current = stack.pop();
                        else
                            current = null;
                    }
                    else if(result == ns.cancel || result == Action.r_cancel)
                    {
                        log("  Processing cancel");
                        errcode = Action.r_cancel;
                        direct = ns.cancel;
                        current = null;
                    }
                    else if(result == ns.error || result == Action.r_error)
                    {
                        log("  Processing error");
                        errcode = Action.r_error;
                        direct = ns.error;
                        current = null;
                    }
                    else if(result == ns.abort || result == Action.r_abort)
                    {
                        log("  Processing abort");
                        errcode = Action.r_error;
                        direct = ns.abort;
                        current = null;
                    }
                    else if(result == ns.finish)
                    {
                        log("  Processing finish");
                        errcode = Action.r_ok;
                        direct = ns.finish;
                        current = null;
                    }
                    else if(result == ns.repeat)
                    {
                        log("  Processing repeat");
                        // do not modify anything... just make one more iteration
                    }
                }
                else
                {
                    Log(Log.l_warning, "Barbwire: Element is not function: " + current);
                    return ns.error;
                }
            }

            log("No more elements");

            log("Processing result:  check if there is callbacks");
            if(act_result_map[direct])
            {
                log("Processing OnExit callback");
                var r = act_result_map[direct]();
                if(typeof(r) != "undefined" && r !== null && r != ns.barb_t.disable) // if return value is redefined - return redefined value
                    return r;
            }

            if(arguments.length)
                return direct; // nested barbwire - just return last direction
            else // top-level barbwire...
                return errcode;
        }

        meth = ns.Thorn(func);

        meth.Set = function(thorn)
        {
            starter = makethorn(thorn);
            return starter;
        }

        if(fn)
            meth.Set(fn);

        meth.OnExit = function(result, callback)
        {
            if(result && callback)
                act_result_map[result] = callback;
        }


        meth.Skip = function(_fn)
        {
            if(arguments.length)
            {
                if(_fn)
                    skip = _fn;
                else
                    skip = function() {return false;}
            }

            return skip;
        }

        return meth;
    }

    this.Thorn = function(func)
    {
        var meth = function(direction, barb)
        {
            if(func)
            {
                if(func.Skip)
                { // check if element should be skipped
                    var skip = typeof(func.Skip) == "function" ? func.Skip(barb, direction) : func.Skip;
                    if(skip)
                        return ns.skip;
                }

                if(arguments.length)
                    return func(barb, direction, meth);
                else
                    return func();
            }
        }

        meth.Origin = function() {return func;}

        meth.isthorn = true;

        var next = null;

        meth.Next = function(n)
        {
            if(arguments.length)
                next = makethorn(n);
            return next;
        }

        meth.Add = meth.Next;

        attach_directs(meth);

        meth.First = function()
        {
            if(func && func.First && typeof(func.First) == "function")
                func.First.apply(this, arguments);
        }

        meth.Last = function()
        {
            if(func && func.Last && typeof(func.Last) == "function")
                func.Last.apply(this, arguments);
        }

        return meth;
    }

    this.Fork = function(func, _st)
    {
        var unfunc = function(f)
        {
            if(typeof(f) == "function")
                return f();
            return f;
        }

        var meth = ns.Thorn(func);

        var add = meth.Add;
        var next = meth.Next;

        var fork = [];

        var state = _st;

        meth.Add = function(n, st)
        {
            if(arguments.length != 2)
            { // used default method
                return add.apply(this, arguments);
            }
            else // if(arguments.length == 2)
            { // set specific branch
                var thorn = makethorn(n);
                fork.push({next: thorn, state: st});
                return thorn;
            }
        }

        meth.State = function(st)
        {
            if(arguments.length)
                state = st;
            return unfunc(state);
        }

        meth.Next = function()
        {
            if(!arguments.length)
            { // get next element based on fork state
                var forks = (Array().concat(fork)).reverse(); // use reversed array to
                                                              //last added branches have higher priority
                var st = unfunc(state);
                var nxt = null;

                if(filter(forks, function(f) {if(st == unfunc(f.state)) {nxt = f.next; return true;}}) && nxt)
                    return nxt;
            }
            return next.apply(this, arguments);
        }

        return meth;
    }
}

