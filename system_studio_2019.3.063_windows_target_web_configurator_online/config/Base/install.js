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
    var dialogs = function(name) {return load("../Dialogs/WPF/" + name);};

    var ns_dmp  = load("dumper.js");
    var ns_exec = load("executor.js");
    var ns_event = load("event.js");
    var ns_progress_manager = load("progress_manager.js");


    var thread_map = {};

    var groups_disable_rollback =
    {
        "Uninstall" : true
    };

    var finished_tasks = {};

    // callbacks to external notifications
    var on_apply     = ns_event.FEvent();
    var on_rollback  = ns_event.FEvent();
    var on_commit    = ns_event.FEvent();
    var on_skip      = ns_event.FEvent();
    var on_failed    = ns_event.FEvent();
    var on_failed_item = ns_event.FEvent();
    var on_waiting   = ns_event.FEvent();
    var on_started   = ns_event.FEvent();
    var on_completed = ns_event.FEvent();
    var on_droll     = ns_event.FEvent();
    var on_eroll     = ns_event.FEvent();
    var on_apply_cmp = ns_event.FEvent();

    var on_begin     = ns_event.FEvent();
    var on_end       = ns_event.FEvent();
    var on_actionmap = ns_event.FEvent();

    var item_in_thread = function(item, groups)
    {
        var group = item.Group();
        if(group)
        {
            for(var i in groups)
            {
                if(group == groups[i])
                    return true;
            }
        }
        return false;
    }

    var threads_num = function(iter)
    {
        var thr = {};
        iter.Reset();

        while(iter.Next())
        {
            var item = iter.Get();
            if(item && !item.Skip())
            {
                for(var i in thread_map)
                {
                    if(item_in_thread(item, thread_map[i]))
                        thr[i] = true;
                }
            }
        }

        var num = 0;
        for(var _i in thr)
            num++;

        iter.Reset();

        return num;
    }

    var threaded = function(item)
    {
        var group = item.Group();
        if(group)
        {
            for(var i in thread_map)
            {
                if(item_in_thread(item, thread_map[i]))
                    return true;
            }
        }
        return false;
    }

    var has_no_rollback_items = function(dmp)
    {
        var iter = ns_dmp.Iterator(dmp);
        while(iter.Next())
        {
            var item = iter.Get();
            if(item && !item.Skip())
            {
                var grp = item.Group();
                if(grp && groups_disable_rollback[grp])
                    return true;
            }
        }
        return false;
    }

    var items_count = function(iter)
    {
        iter.Reset();
        var num = 0;
        while(iter.Next())
            num++;
        iter.Reset();
        return num;
    }

    var countable = function(item)
    {
        if(item)
        {
            if(item.Attribute && item.Attribute("countable"))
                return true;
            if(!item.Attribute)
                return true; // for older items - assume that all items are countable
        }

        return false;
    }

    var item_name = function(item)
    {
        if(item && item.Attribute && item.Attribute("name"))
            return item.Attribute("name");

        return null;
    }

    var error_handler_lock = Mutex();

    // function sets error handler for dumper and all sub-dumpers
    var set_error_handler = function(dumper)
    {
        Log("Set handler for: " + dumper.Name());
        var self = arguments.callee;

        var create_error_handler = function()
        {
            var processed = false;
            var reverse_here = false;
            var result = Action.r_ok;

            var error_reason = function()
            {
                var errs = GlobalErrors.List();
                if(errs && errs.length)
                {
                    var txt = "";
                    for(var i in errs)
                    {
                        var e = (txt.length ? "\n" : "") + StringList.Format(errs[i]);
                        txt += e;
                    }
                    var dir = Log.GetLogDir();
                    txt = txt + "\n\n"  +  StringList.Format("{[logs_location]}", String(dir).replace(/\\/g, "\\\\"));
                    return txt;
                }

                return "";
            }

            var handler = function(iter, error)
            {
                // TODO: add lock for manipulations with tree data
                Log("Error handles: main thread: " + Thread.Self().executor_main_thread);
                if(iter.Get())
                    Log("Failed item: " + iter.Get().Name());
                if(iter.Dumper())
                    Log("Current dumper: " + iter.Dumper().Name());

                error_handler_lock.Lock();

                if (error == Action.r_cancel || Wizard.Canceled())
                {
                    error_handler_lock.Unlock();
                    Log("'Canceled' status is passed to parent object");
                    return Action.r_cancel; // do not process canceled operations
                }

                if(iter.Dumper() && iter.Dumper().Owner && iter.Dumper().Owner())
                {
                    //gather statistic
                    var name = iter.Dumper().Name();
                    var owner = iter.Dumper().Owner();
                    var manager = (typeof(owner.StatManager) == "function")? owner.StatManager() : null;
                    var component_id = owner.Info().Property("alias");
                    Log("Statistic begin");
                    Log("Statistic owner = " + component_id);
                    if (manager)
                    {
                        var state = String(manager.Property("state"));

                        Log("Statistic state = " + state);
                        manager.Property("retcode", error);
                        manager.Property("error_msg", error_reason());
                        if (state == "download")
                        {
                            manager.DownloadStage.stop();
                            manager.Property("status", "download_fail");
                        }
                        else
                        {
                            manager.InstallStage.stop();
                            manager.Property("status", "install_fail");
                        }
                        manager.Parent.Property("complete_fail", "complete_fail");
                    }
                }

                if(Wizard.Aborted())
                {
                    error_handler_lock.Unlock();
                    Log("'Aborted' status is passed to parent object");
                    return error;
                }

                var main_thread = Thread.Self().executor_main_thread;

                // mark all items in current iterator as failed
                var _dumper = iter.Dumper();
                var i = ns_dmp.Iterator(_dumper);
                while(i.Next())
                {
                    var item = i.Get();
                    if(item)
                    { // disable real Apply execution
                        Log("Disable Apply actions for item: " + item.Name());
                        item.Apply = function(){return Action.r_ok;}
                        item.Skip = function(){return true;}
                        item.failed = true;
                        if(main_thread)
                            item.rollback_started = true;
                    }
                }

                var reverse = function()
                {
                    if(main_thread)
                    {
                        Log("Reverse iterator for _dumper: " + iter.Dumper().Name());
                        iter.Reverse(true);
                        iter.Reset();
                        iter.Filter(function(){return true;});
                        iter.Functor(create_rollback_functor(_dumper));
                    }
                }

                if(!processed)
                {
                    processed = true;
                    if(_dumper.IgnoreError && _dumper.IgnoreError(iter))
                    {
                        if(!main_thread)
                        {
                            Log("Async thread. Set marker to reverse iterator");
                            reverse_here = true; // set marker to reverse iterator on main thread
                        }
                        else
                            reverse();
                        error_handler_lock.Unlock();
                        Log("'Ok' status is passed to parent object");
                        return Action.r_ok;
                    }
                }
                else
                { // in case if error was processed by handler - just return Ok status
                    if(main_thread && reverse_here)
                    {
                        reverse(); // reverse only in case if ignore error or in top-level error handles
                        reverse_here = false; // reverse done
                        error_handler_lock.Unlock();
                        Log("'Ok' status is passed to parent object");
                        return Action.r_ok;
                    }
                }

                //reverse(); // reverse only in case if ignore error or in top-level error handles
                error_handler_lock.Unlock();
                Log("Error status is passed to parent object: " + error);
                return error;
            }
            return handler;
        }

        dumper.OnError = create_error_handler();

        var el = dumper.Elements();
        while(el.Next())
        {
            var item = el.Get();
            if(item && item.IsDumper)
                self(item);
        }
    }

    var create_rollback_functor = function(dumper)
    {
        var iter = ns_dmp.Iterator(dumper);
        iter.Filter(function(item){return item.succeed && countable(item);});

        var total = items_count(iter);
        var current = 1;
        if(current > total)
            total = current;

        var functor = function(item)
        {
            Log("Rollback handler main thread: " + Thread.Self().executor_main_thread);

            Log("Rollback functor started. item: " + item.Name());
            if(item.succeed)
            {
                if(countable(item))
                    current++;
                if(current > total)
                    current = total;
                ns_progress_manager.adjust_rollback(item, current, total);

                safecall(function(){on_rollback(item, "Progress1");});
                safecall(function(){item.Rollback();},
                         function(){Log(Log.l_error, "Exception handled calling Rollback method of Action: " + item.Name());});
                item.succeed = false;
            }
            item.rollback_started = false;
            item.rollback_done = true;
            Log("Rollback functor finished");
            return Action.r_ok;
        }

        return functor;
    }

    var create_commit_functor = function(dumper)
    {
        var iter = ns_dmp.Iterator(dumper);
        iter.Filter(function(item){return item.succeed && countable(item);});

        var total = items_count(iter);
        var current = 1;
        if(current > total)
            total = current;

        var functor = function(item)
        {
            ALog(Log.l_debug, "Commit functor started. item: " + item.Name());
            if(item.succeed)
            {
                ns_progress_manager.adjust_commit(item, current, total);
                if(countable(item))
                    current++;
                if(current > total)
                    current = total;

                safecall(function(){on_commit(item, "Progress1");});
                safecall(function(){item.Commit();},
                         function(){Log(Log.l_error, "Exception handled calling Commit method of Action: " + item.Name());});

                item.commited = true;
            }
            return Action.r_ok;
        }

        return functor;
    }

    var lock = Mutex();
    Wizard.Subscribe("progress", "lock", function(){lock.Lock();});
    Wizard.Subscribe("progress", "unlock", function(){lock.Unlock();});

    var create_apply_functor = function(thr, header)
    {
        var functor = function(item)
        {
            if(!thr)
                Thread.Self().executor_main_thread = true;

            ALog(Log.l_debug, "Apply functor started: item: " + (item ? item.Name() : "Unknown"));
            if(item.failed)
            {
                Log("  Item marked as 'Failed', Main thread: " + Thread.Self().executor_main_thread);
                if(Thread.Self().executor_main_thread) // main thread execution
                    return Wizard.Canceled() ? Action.r_cancel : Action.r_error;
                else
                    return Action.r_ok; // on threaded functors - just ignore failed elements
            }
            if(item.Skip())
            {
                item.skipped = true;
                return Action.r_ok;
            }
            if(header)
            {
                lock.Lock();
                header(item);
                lock.Unlock();
            }

            if(item)
            {
                var item_name = item.Name();
                if(!item_name.match(/^(Download|ForceCheck: checker: sha256)/ig))
                    Log("Apply starting for \"" + item_name + "\"");
            }

            safecall(function() {on_apply(item, "Progress1");});
            var res = safecall(function(){return item.Apply();},
                               function(){Log(Log.l_error, "Exception handled calling Apply method of Action: " + item.Name()); return Action.r_error;});
            Log("Apply done: " + res);
            header.complete(item);

            if(res == Action.r_ok || res == true)
            {
                item.succeed = true;
                var group = item.Group();
                if(groups_disable_rollback[group])
                {
                    safecall(on_droll);
                    Wizard.Cancel.Disable();
                }
                else
                    safecall(on_eroll);

                var prog = Progress();
                return Wizard.Canceled() ? Action.r_cancel : Action.r_ok;
            }

            return Wizard.Canceled() ? Action.r_cancel : Action.r_error;
        }
        return functor;
    }

    /* tasker - is function which select Action from iterator
     * and return it.
     * additionally create_tasker function creates & configure iterators
     * for processing dumper
     */
    var create_tasker = function(dumper, header, groups, id, main_wait_for_others)
    {
        var iter = ns_dmp.Iterator(dumper);

        if(groups)
        { // threaded tasker
            iter.Filter(function(item){return item_in_thread(item, groups);});
            iter.Functor(create_apply_functor(true, header));

            if(id)
                finished_tasks[id] = false;

            return function()
            {
                // if current task is marked as finished - return null
                if(id && finished_tasks[id])
                    return null;

                ALog(Log.l_debug, "Generating new task in: " + id);
                while(iter.Next())
                    if(!iter.Get().failed) // skip all failed items
                        return iter.Call;
                Log("No more tasks");
                if(id) // generate function to mark current task as finished
                    return function(){Log("Task " + id + " marked as finished"); safecall(function() {on_completed(id);}); finished_tasks[id] = true; return Action.r_ok;}
                return null;
            }
        }
        else
        { // main thread tasker
            iter.Functor(create_apply_functor(false, header));
            if(iter.Next()) // exists at least one element
            {
                var wait_progress = Progress();
                if(wait_progress)
                {
                    wait_progress.total = -1;
                    wait_progress.message = StringList.Format("[waiting_for_media]");
                }
                else
                {
                    Log(Log.l_error, "wait_progress = Progress(); wait_progress is null");
                }

                var tasker = function()
                {
                    ALog(Log.l_debug, "Main thread tasker called");

                    if(main_wait_for_others)
                    { // wait for other threads are finished
                      // used when uninstallation action exists
                        for(var i in finished_tasks)
                            if(!finished_tasks[i])
                            {
                                Log("Found non-finished task: " + i);
                                if(wait_progress)
                                    Wizard.Notify("Progress1", "connect", wait_progress.id);
                                return null;
                            }
                    }

                    var item = iter.Get();
                    if(!item) // first step
                    {
                        if(!iter.Next())
                            return null;
                        item = iter.Get();
                    }

                    while(true)
                    {
                        ALog(Log.l_debug, "Processing item: " + item.Name());
                        if(item.rollback_started)
                        {
                            Log("rollback_started flag exists: " + item.rollback_started);
                            return iter.Call; // do not filter rollback items
                        }

                        // check if item already processed
                        if(item.succeed || item.rollback_done || item.skipped)
                        {
                            ALog(Log.l_debug, "switch to next item: " + item.succeed + " : " + item.rollback_done);
                            if(!iter.Next())
                                return null;
                            item = iter.Get();
                            continue;
                        }

                        // check if current element is locked
                        if(threaded(item))
                        {
                            ALog(Log.l_debug, "Threaded item processing: " + item.Name());
                            if(!item.failed)
                            {
                                ALog(Log.l_debug, "Wait for locked item");
                                if(wait_progress)
                                    Wizard.Notify("Progress1", "connect", wait_progress.id);
                                return null;
                            }
                            else
                            {
                                Log("Item marked as 'failed'. Return caller");
                                return iter.Call;
                            }
                        }
                        else // not locked element
                        {
                            Log(Log.l_debug, "Not locked element");
                            return iter.Call;
                        }
                    }
                }
                return tasker;
            }
            else
                return function(){return null;} // fake tasker - nothing to do
        }
    }

    this.Process = function(dmp)
    {
        if(!dmp)
        {
            Log(Log.l_error, "No dumper provided");
            return Action.r_error;
        }

        Log("Preliminary installation sequence: ");
        ns_dmp.Trace(dmp);

        set_error_handler(dmp);

        // set high level error processing function
        dmp.OnError = function(iter, error)
        {
            Log("====> Top-level Error handler called: " + error);
            Log("Top-level error handler: main thread: " + Thread.Self().executor_main_thread);
            if(typeof(WPF) != "undefined")
            {
                var _item = iter.Get();
                if(_item && typeof(_item.Error) == "function")
                {
                    var ns_errhan = dialogs("error_handler.js");
                    ns_errhan.SetRoot(_item.Error());
                }
            }

            safecall(on_droll);
            Wizard.Cancel.Disable();
            if(!Wizard.Canceled())
                Wizard.Abort();

            var main_thread = Thread.Self().executor_main_thread;

            var itm = iter.Get();
            if(itm)
            {
                if(main_thread)
                { // in case if this is main thread - rollback all changes
                    iter.Reverse(true);
                    iter.Reset();
                    iter.Functor(create_rollback_functor(iter.Dumper()));
                    Log("  Reverse iterator");
                }
            }

            Log("  Disable all nodes to execute");
            var dumper = iter.Dumper();
            var i = ns_dmp.Iterator(dumper);
            while(i.Next())
            {
                var _itm = i.Get();
                if(_itm)
                { // mark all elements as failed & rebuild Skip & Apply calls
                    if(main_thread)
                        _itm.rollback_started = true;
                    _itm.failed = true;
                    _itm.Skip = function() {return true;}
                    _itm.Apply = function() {return Action.r_ok;}
                }
            }
            Log("  Done");
            return Action.r_ok;
        }

        // generate header processors
        var header = ns_progress_manager.create_header(dmp);
        header.bind_progress("Progress1", "Install");
        header.bind_progress("Progress1", "Uninstall");

        var mapped = {};

        for(var i in thread_map)
        {
            for(var j in thread_map[i])
            {
                header.bind_progress(i, thread_map[i][j]);
                mapped[thread_map[i][j]] = true;
            }
        }

        var k = ns_dmp.Iterator(dmp);
        while(k.Next())
        {
            var _it = k.Get();
            if(_it)
            {
                var gr = _it.Group();
                if(gr && !mapped[gr])
                    header.bind_progress("Progress1", gr);
            }
        }

        var exec = ns_exec.Executor();

        var single_thread = has_no_rollback_items(dmp);

        exec.AddThread(create_tasker(dmp, header, null, "main", single_thread)); // main thread tasker
        for(var m in thread_map)
        {
            if(thread_map[m] && thread_map[m].length)
            {
                Log("Creating execution thread for: " + m + ": " + thread_map[m]);
                exec.AddThread(create_tasker(dmp, header, thread_map[m], "thread " + m)); // threaded tasker
            }
        }

        safecall(function() {on_begin(dmp);});
        exec.Start();

        safecall(on_droll);
        safecall(on_apply_cmp);
        Wizard.Cancel.Disable();

        if(Wizard.Aborted() || Wizard.Canceled())
            safecall(on_failed);

        if(!Wizard.Canceled() && !Wizard.Aborted())
        { // commit all changes
           
            var commit_iterator = ns_dmp.Iterator(dmp);
            commit_iterator.Functor(create_commit_functor(dmp));
            while(commit_iterator.Next())
                commit_iterator.Call();

            safecall(on_end);
            return Action.r_ok;
        }
        else
        {
            safecall(on_end);
            if(Wizard.Canceled())
                return Action.r_cancel;
            else
                return Action.r_error;
        }

    }

    this.ThreadMap = function(tm)
    {
        if(tm)
            thread_map = tm;
    }

    this.ThreadNum = function(dmp)
    {
        var thr_iterator = ns_dmp.Iterator(dmp);
        if(thr_iterator)
            return threads_num(thr_iterator) + 1;
        return 1;
    }

    this.OnFailed = function(cb)
    {
        if(cb)
            on_failed.Connect(cb);
        else
            return on_failed;
    }

    this.OnFailedItem = function(cb)
    {
        if(cb)
            on_failed_item.Connect(cb);
        else
            return on_failed_item;
    }

    this.OnWaiting = function(cb)
    {
        if(cb)
            on_waiting.Connect(cb);
        else
            return on_waiting;
    }

    this.OnThreadStarted = function(cb)
    {
        if(cb)
            on_started = cb;
        else
            return on_started;
    }

    this.OnThreadCompleted = function(cb)
    {
        if(cb)
            on_completed.Connect(cb);
        else
            return on_completed;
    }

    this.OnApply = function(cb)
    {
        if(cb)
            on_apply.Connect(cb);
        else
            return on_apply;
    }

    this.OnRollback = function(cb)
    {
        if(cb)
            on_rollback.Connect(cb);
        else
            return on_rollback;
    }

    this.OnCommit = function(cb)
    {
        if(cb)
            on_commit.Connect(cb);
        else
            return on_commit;
    }

    this.OnSkip = function(cb)
    {
        if(cb)
            on_skip.Connect(cb);
        else
            return on_skip;
    }

     this.OnEnableRollback = function(cb)
    {
        if(cb)
            on_eroll.Connect(cb);
        else
            return on_eroll;
    }

    this.OnDisableRollback = function(cb)
    {
        if(cb)
            on_droll.Connect(cb);
        else
            return on_droll;
    }

    this.OnBegin = function(cb)
    {
        if(cb)
            on_begin.Connect(cb);
        else
            return on_begin;
    }

    this.OnEnd = function(cb)
    {
        if(cb)
            on_end.Connect(cb);
        else
            return on_end;
    }

    this.OnActionMap = function(cb)
    {
        if(cb)
            on_actionmap.Connect(cb);
        else
            return on_actionmap;
    }

    this.OnApplyCompleted = function(cb)
    {
        if(cb)
            on_apply_cmp.Connect(cb);
        else
            return on_apply_cmp;
    }
}
