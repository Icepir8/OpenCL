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
    //var ns_exec = load("executor.js");
    var ns_queue = load("queue.js");
    var ns_event = load("event.js");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    }


    //var thread_map = {};
    var defprg = "Progress1";

    var thread_map = {"Default" : defprg, "Download" : "Progress2"}; // list of groups which must be executed using 2+ progress

    /*var group_header_template =
    {
        "Install"  :"[PrgInstall]\n[PrgInstallCurrComponent]",
        "Uninstall":"[PrgRemove]\n[PrgRemoveCurrComponent]",
        "Download" : (!GetOpt.Exists("single-file-download") ? "[PrgDownload]\n[PrgDownloadFilesList]" : "[PrgDownload]\n[PrgDownloadCurrComponent]")
    };*/

    var groups_disable_rollback =
    {
        "Uninstall" : true
    };

    var finished_tasks = {};

    var isasync = function(item)
    {
        if(item.Group && item.Async)
        {
            var g = item.Group();
            if(g && g in thread_map && g != defprg && thread_map[g])
                return thread_map[g];
        }
        return null;
    }

    var threadnum = function(dmp)
    {
        var threadname = function(item){return isasync(item) || thread_map["Default"];};
        var prgs = {};
        filter(thread_map, function(p){prgs[p] = false;});

        var acts = dmp.Serialize(true);
        filter(acts, function(item){prgs[threadname(item)] = true;});

        var n = 0;
        filter(prgs, function(v){if(v) n++;});
        var keys = [];
        filter(prgs, function(v, i){keys.push(i);});
        return {num:n, keys:keys, sync:filter(acts, function(item){return item.Group() in groups_disable_rollback;})};
    }

    var aborted = function() {return Wizard.Aborted() || Wizard.Canceled();};

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
    var rollback = function(dmp, filterfunc)
    {
        var iter = ns_dmp.Iterator(dmp);
        iter.Filter(filterfunc || function(a){return a.completed && !a.failed;});
        iter.Functor(function(a)
        {
            if(typeof(a.Rollback) == "function" && a.completed)
            {
                Log("Rollback action: " + a.Name());
                if(typeof(a.ProgressRollback) == "function")
                {
                    var p = a.ProgressRollback();
                    if(p && p.id)
                        Wizard.Notify(defprg, "connect", p.id);
                }
                safecall(function(){on_rollback(a, defprg);});
                a.Rollback();
            }
            a.failed = true;
            return Action.r_ok;
        });
        iter.Reverse(true);
        while(iter.Next())
            iter.Call();
        if(!filterfunc)
        { // mark all actions in dumper as failed
            var iter = ns_dmp.Iterator(dmp); // set whole dumper as failed
            iter.Functor(function(a) {a.failed = true; return Action.r_ok;});
            while(iter.Next())
                iter.Call();
        }
    };

    var commit = function(dmp)
    {
        var iter = ns_dmp.Iterator(dmp);
        iter.Filter(function(a){return a.completed && !a.failed;});
        iter.Functor(function(a)
        {
            if(a.Commit)
            {
                Log("Commit action: " + a.Name());
                if(a.ProgressCommit)
                {
                    var p = a.ProgressCommit();
                    if(p)
                        Wizard.Notify(defprg, "connect", p.id);
                }
                safecall(function(){on_commit(a, defprg);});
                a.Commit();
            }
            return Action.r_ok;
        });
        while(iter.Next())
            iter.Call();
    }

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
    
    var GlobalProgress = Progress.Partial();
    var scale = 1000;
    var last_pid = null;

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

                //var main_thread = Thread.Self().executor_main_thread;

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
                        //if(main_thread)
                            item.rollback_started = true;
                    }
                }

                var reverse = function()
                {
                    //if(main_thread)
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
            //Log("Rollback handler main thread: " + Thread.Self().executor_main_thread);

            Log("Rollback functor started. item: " + item.Name());
            if(item.succeed)
            {
                var header = StringList.Format("[PrgRollback]\n[PrgRollbackCurrComponent]", current, total);
                if(item_name(item))
                    header += ": " + item_name(item);
                //Wizard.Notify("Progress1", "header", header);
                /*
                var progress = item.ProgressRollback();
                if(progress)
                {
                    progress.backward = true;
                    Wizard.Notify("Progress1", "connect", progress.id);
                }
                */
                
                if(countable(item))
                    current++;
                if(current > total)
                    current = total;
                
                if(item_name(item))
                {
                    if (GlobalProgress.total < 0)
                    {
                        GlobalProgress.total = total * scale;
                        GlobalProgress.position = total * scale;
                    }
                    
                    if (GlobalProgress.position > GlobalProgress.total)
                        GlobalProgress.position = GlobalProgress.total;
                    if (GlobalProgress.position > 0)
                        GlobalProgress.position = GlobalProgress.position - 1 * scale;
                    GlobalProgress.message = header;   
                    Wizard.Notify("Progress1", "connect", GlobalProgress.id);    
                }                
                
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
                var header = StringList.Format("[PrgCommit]\n[PrgCommitCurrComponent]", current, total);
                if(item_name(item))
                    header += ": " + item_name(item);
                //Wizard.Notify("Progress1", "header", header);
                GlobalProgress.message = header;
                if (last_pid)
                {
                    GlobalProgress.Disconnect(last_pid);
                    last_pid = null;
                }
                var progress = item.ProgressCommit();
                if(progress)
                {
                    //apply own progress
                    progress.backward = false;
                    //Wizard.Notify("Progress1", "connect", progress.id);
                    GlobalProgress.start_position = GlobalProgress.position;
                    GlobalProgress.finish_position = GlobalProgress.total;
                    GlobalProgress.Connect(progress.id);
                    last_pid = progress.id;
                }
                else
                {
                    //this is the last action without the own progress
                    //set the end of the process
                    GlobalProgress.position = GlobalProgress.total;
                }
                
                Wizard.Notify("Progress1", "connect", GlobalProgress.id);

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
            /*if(!thr)
                Thread.Self().executor_main_thread = true;*/

            ALog(Log.l_debug, "Apply functor started: item: " + (item ? item.Name() : "Unknown"));
            if(item.failed)
            {
                //Log("  Item marked as 'Failed', Main thread: " + Thread.Self().executor_main_thread);
                //if(Thread.Self().executor_main_thread) // main thread execution
                    return Wizard.Canceled() ? Action.r_cancel : Action.r_error;
                //else
                    //return Action.r_ok; // on threaded functors - just ignore failed elements
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
                            Log("Not locked element");
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

    /* creates function which updates progress bar header
     *
     */

    this.Process = function(dmp)
    {
        ns_dmp.Trace(dmp);
        if(GetOpt.Exists("fake-dumper"))
        {
            var ns_fake = load("fakedmp.js");
            dmp = ns_fake.Fake(dmp);
            Log("Fake dumper trace:");
            ns_dmp.Trace(dmp);
        }

        var finished_flag = false;

        var nextnoskip = function(t, includecurrent)
        {
            if(finished_flag)
                return false;

            if(includecurrent)
            { // check for current element first
                var i = t.get();
                if(i && !i.Skip())
                    return true;
                else if(i)
                    safecall(function(){Log("Action " + i.Name() + " skipped"); on_skip(i, t.id);});
            }
            while(t.next())
                if(!t.get().Skip())
                    return true;
                else
                    safecall(function(){Log("Action " + t.get().Name() + " skipped"); on_skip(t.get(), t.id);});
            return false;
        };

        var tinfo = threadnum(dmp);
        if(!tinfo)
        {
            Log("Failed to process thread info. Abort.");
            return Action.r_error;
        }

        var tnum = tinfo.num;
        var ids = tinfo.keys;
        var sync_thread_after_all = tinfo.sync;
        Log("Thread num: " + tnum + " : " + ids + " : " + sync_thread_after_all);
        var threads = [];
        for(var i = 0; i < tnum; i++)
        { // every thread element is just iterator & some attributes, not real thread
            var create_thread_el = function()
            {
                var t = {};
                t.result = Action.r_ok;
                t.busy = false;
                t.id = ids[i];
                var id = t.id;
                t.sync = ids[i] == defprg; // mark thread with id 'Progress1' as sync. in case if
                                           // there are several threads with id Progress1 - only
                                           // one thread will be sync (other will be marked as
                                           // async below)
                t.iter = ns_dmp.Iterator(dmp);
                t.get = t.iter.Get;
                t.next = t.iter.Next;
                if(t.sync)
                {
                    t.iter.Filter(function(i) {
                        if(!i.completed && !i.failed)
                            return true;
                        return false;
                    });
                }
                else
                    t.iter.Filter(function(i) {
                        if(!i.completed && !i.failed && id == isasync(i))
                            return true;
                        return false;
                    });
                Log("Created thread: " + t.id + " : " + t);
                while(t.next())
                {
                    safecall(function(){on_actionmap(t.id, t.get());});
                    Log("  " + t.get().Group() + " : " + isasync(t.get()) + " : " + t.get().Name());
                }
                t.iter.Reset();
                return t;
            }
            threads.push(create_thread_el());
        }

        // move sync thread to last element and mark other threads as async
        for(var i in threads)
        {
            var v = threads[i];
            if(v.sync)
            {
                delete threads[i];
                filter(threads, function(t) {t.sync = false;}); // mark other threads as async
                threads.push(v);
                break;
            }
        }

        // if sync-thread-after-all mode - rename one of the groups to Progress1
        if(sync_thread_after_all)
            filter(threads, function(t) {if(!t.sync) {t.id = defprg; return true;}});

        var queue = ns_queue.Queue();

        var isfinished = function(res)
        { // check if action requested finish processing
            if(res == 'finish')
            {
                finished_flag = true;
                Log("Requested finish of scenario processing. No more actions will be processed.");
                return Action.r_ok;
            }
            return res;
        };

        var startact = function(act, thr)
        {
            Log("Apply action start: " + act.Name());
            //Wizard.Notify(thr.id, "header", "Header: " + act.Name());
            if(!act || !thr)
            {
                Log(Log.l_error, "Wrong startact arguments: " + arguments);
                DumpTrace();
            }

            if(!thr.started)
            {
                thr.started = true;
                safecall(function() {on_started(thr.id);});
            }

            safecall(function() {on_apply(act, thr.id);});

            var prg = act.ProgressApply ? act.ProgressApply() : null;
            if(prg)
                Wizard.Notify(thr.id, "connect", prg.id);
            if(typeof(act.Async) == "function")
            { // next action is async... just launch it & continue
                thr.busy = true;

                Log("Async action calling: " + act.Name());

                var completed = function(t)
                {
                    return function(res) {
                        Log("" + thr.id + " : Async action completed: " + res + " : " + act.Name());
                        t.result = isfinished(res);
                        queue.Push(t);
                    };
                };
                act.Complete(completed(thr));
                act.Async(true);
                act.Apply();
            }
            else
            {
                Log("Sync action calling: " + act.Name());
                thr.busy = true;
                thr.result = isfinished(act.Apply());
                Log("" + thr.id + " : Sync action completed: " + thr.result + " : " + act.Name());
                queue.Push(thr);
            }
        }

        var waitall = function()
        {
            Log("Waiting for all async actions to finish");
            while(filter(threads, function(t) {return t.busy;}))
            {
                var thr = queue.Pop();
                thr.busy = false;
                thr.get().completed = true;
            }
            Log("All async actions finished");
        }

        // return false if one of async thread is not completed
        var asynccompleted = function() {return !filter(threads, function(t) {return !t.sync && !t.completed;});};

        var failed = function(thr)
        {
            if(!thr || !thr.id)
            {
                Log("Wrong thread: " + thr);
                DumpTrace();
                return false;
            }

            if(thr.result === Action.r_ok || thr.result === true || thr.result === 1)
                return false;
            else
                return true;
        };

        var pro_completed = Progress();
        var pro_waiting = Progress();

        pro_completed.total = -2;
        pro_waiting.total = -1;

        var markcompleted = function(thr)
        {
            thr.completed = true;
            Wizard.Notify(thr.id, "connect", pro_completed.id);
            safecall(function() {on_completed(thr.id);});
            Log("Thread completed: " + thr.id);
        }

        safecall(function() {on_begin(dmp);});

        Log("Start execution loop");

        do
        {
            // get finished entries & try to start next elements
            while(queue.Count() > 0)
            {
                if(aborted())
                    break;

                Log("Waiting for any action to complete");
                var thr = queue.Pop(); // queue includes thread objects to process
                if(!thr.busy)
                    Log(Log.l_warning, "Thread " + thr.id + " was not marked as busy");
                thr.busy = false;

                var item = thr.get();
                if(item)
                    item.completed = true; // mark current action as completed (even for failed items)

                // check if any action failed
                Log("Thread " + thr.id + " freed: " + thr.result);
                if(filter(threads, failed))
                    break;

                // notify about action which can't be rolled back
                if(thr.get().Group() in groups_disable_rollback)
                    safecall(on_droll);

                if(!thr.sync && !failed(thr))
                { // if action finished normally - start next action attached to current thread
                  // for synced thread .next() sould be called below (there is special processing)
                    if(nextnoskip(thr))
                    {
                        var item = thr.get();
                        if(!item)
                            Log(Log.l_error, "Failed to get current element");
                        else
                        {
                            if(!isasync(item)) // next action is async... just launch it & continue
                                Log(Log.l_error, "Action is not async. It should not be here: " + thr.id + " : " + item.Name());
                            startact(item, thr);
                        }
                    }
                    else
                        markcompleted(thr);
                }
                else if(failed(thr))
                {
                    Log(Log.l_error, "Error detected: " + thr.result + ". Break async loop");
                    break;
                }
            }

            if(aborted())
                break; // exit from loop on failed or canceled

            // ok, async loops are processed... now check for errors
            while(filter(threads, failed))
            {   // error detected...
                Log("Failed thread exists...");
                if(aborted())
                    break; // exit from loop on failed or canceled

                var fitem = null; // failed thread item
                filter(threads, function(i) {
                    if(failed(i))
                    {
                        fitem = i;
                        return true;
                    }
                });
                if(!fitem)
                {
                    Log("Can't find failed thread... Continue");
                }
                else
                {
                    var fact = fitem.get();
                    if(!fact)
                        Log("Can't find failed item. Continue");
                    else
                    {
                        Log("Failed item: " + fitem.id + ": " + fact.Name());
                        if(fact.failed)
                        {
                            Log("Current element is marked as failed - element already processed as failed. Ignore second request");
                            fitem.result = Action.r_ok; // reset error
                        }
                        else
                        { // looking for product/dumper which may be locally rolled back
                            safecall(function(){on_failed_item(fitem.iter);});

                            var localrollback = null;
                            if(typeof(fitem.iter.Path) == "function")
                            {
                                filter(fitem.iter.Path(), function(i) {
                                    var path_dmp = i.Dumper();
                                    if(!aborted() && typeof(path_dmp.IgnoreError) == "function")
                                    {
                                        if(safecall(function(){return path_dmp.IgnoreError(i, fitem.result)}))
                                        {
                                            localrollback = i;
                                            return true;
                                        }
                                    }
                                });
                            }
                            else if(typeof(dmp.IgnoreError) == "function") // if Path method is not defined
                                safecall(function(){dmp.IgnoreError(fitem.iter, fitem.result);}); // then try to notify top-level dumper

                            if(localrollback)
                            {
                                // waiting for all async threads finished
                                waitall();
                                rollback(localrollback.Dumper()); // rollback failed product
                                // in case if elements were marked for force rollback - rollback it or marked as failed
                                rollback(dmp, function(a){return !a.failed && a.forcerollback;});
                                fitem.result = Action.r_ok; // reset error
                            }
                            else
                                Wizard.Abort();
                        }
                    }
                }
            }

            if(aborted())
                break; // exit from loop on failed or canceled

            // processing threads which is no busy
            for(var i in threads)
            {
                var thr = threads[i];
                if(aborted())
                    break; // exit from loop on failed or canceled

                if(!thr.completed && !thr.busy)
                { // skip completed & busy threads
                    Log("Thread loop: " + thr);
                    if(thr.sync)
                    {
                        // check if here is sync-thread-after-all mode && async actions are not completed
                        if(sync_thread_after_all && !asynccompleted())
                            continue;

                        // synced action can't be started before all previous async astions completed
                        while(!thr.completed && !thr.busy)
                        { // iterate sync elements till something is started or thread completed
                            var item = thr.get();

                            if(!item)
                            {
                                nextnoskip(thr); // jump to first element
                                item = thr.get();
                            }

                            if(!item) // no more items? ok, finish thread
                            {
                                markcompleted(thr);
                                break;
                            }

                            var sync_locked = function(i)
                            {
                                Log("Check for item: " + isasync(i) + " : " + i.completed + " : " + i.failed + " : " + i.Skip() + " : " + i.Name());
                                return item && isasync(item) && !item.completed && !item.failed && !item.Skip();
                            }

                            if(sync_locked(item))
                            {
                                Log("Sync thread: " + thr.id + ". Item is async && not completed - wait for finished: " + item.Name());
                                Wizard.Notify(thr.id, "connect", pro_waiting.id);
                                safecall(function() {on_waiting(item, thr.id);});
                                break; // if current element is async & not processed - wait till it is processed
                            }

                            if(!isasync(item) && !item.completed && !item.failed && !item.Skip())
                            { // if current item is sync & not processed - start it
                                startact(item, thr);
                                break;
                            }
                            else // look for next item
                            {
                                if(!nextnoskip(thr))
                                {
                                    markcompleted(thr);
                                    break; // no more items in thread
                                }
                            }
                        }
                    }
                    else
                    {
                        if(nextnoskip(thr))
                        {
                            var item = thr.get();
                            if(!item)
                                Log("Can't get item. Complete thread");
                            else
                                startact(item, thr);
                        }
                        else // no more items? mark thread as completed
                            markcompleted(thr);
                    }
                }
            }

            if(queue.Count() == 0 && !filter(threads, function(t) {return t.busy;}) && filter(threads, function(t) {return !t.completed;}))
            {
                Log(Log.l_error, "Deadlock: no busy && !completed threads && queue is empty. Abort.");
                Wizard.Abort();
                break;
            }
            else if(queue.Count() == 0 && filter(threads, function(t) {return t.busy;}))
            {
                queue.Push(queue.Pop()); // trick: wait for any action to complete & push result back to queue
            }
        } while(filter(threads, function(t) {return !t.completed;}));

        safecall(on_apply_cmp);

        Log("Main loop completed");

        waitall();

        //Log("set all async threads progress to 'complete'");
        //filter(threads, function(t) {if(!t.sync) Wizard.Notify(t.id, "connect", pro_completed.id);});

        if(aborted())
            safecall(on_failed);

        if(aborted())
            rollback(dmp);
        else
            commit(dmp);

        safecall(on_end);

        if(Wizard.Canceled())
            return Action.r_cancel;
        else if(Wizard.Aborted())
            return Action.r_error;
        else
            return Action.r_ok;
    }

    this.ThreadMap = function(tm)
    {
        //if(tm)
        //    thread_map = tm;
    }

    this.ThreadNum = function(dmp)
    {
        if(GetOpt.Exists("fake-dumper"))
        {
            var ns_fake = load("fakedmp.js");
            dmp = ns_fake.Fake(dmp);
        }
        var tinfo = threadnum(dmp);
        if(!tinfo)
        {
            Log("Failed to process thread info. Abort.");
            return 0;
        }

        var num = tinfo.num;
        var stal = tinfo.sync;
        return stal ? num - 1 : num;
        // in case if sync-after-all mode (stal == true) sync thread is started after
        // all async threads are finished. that is why return number of
        // threads = real threads - 1
        // one of async thread will report progress into Progress1
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
