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

    var ns = this;
    var queue = load("queue.js");

    this.Executor = function()
    {
        var exec = {};

        var threads = [];
        var running = 0;
        var abort = false;

        var finished = queue.Queue();

        exec.AddThread = function(func)
        {
            if(func)
            {
                var thr = {};
                thr.queue = queue.Queue();
                thr.func = func;
                thr.tasks = 0;
                threads.push(thr);
            }
        }

        var thread_func = function(q, id)
        {
            if(q)
            {
                Log("Executor thread started to work: ", id);
                var task;
                var t = function(){task();};
                while(1)
                {
                    task = q.Pop();
                    if(!task)
                    {
                        Log("Executor thread finished to work");
                        return 0;
                    }

                    safecall(t);
                    finished.Push(id);
                }
            }
        }
        
        exec.Start = function()
        {
            var tf_i = function(i) { return function(){thread_func(threads[i].queue, i);}; };
            for(var i in threads)
            {
                var tf = tf_i(i);
                threads[i].thr = Thread(tf);
            }

            while(1)
            {
                if(abort)
                    break;

                for(var j in threads)
                {
                    if(abort)
                        break;
                    if(threads[j].tasks)
                        continue;
                    var task = threads[j].func();
                    if(task)
                    {
                        //Log("Executor got new task");
                        running++;
                        threads[j].tasks++;
                        threads[j].queue.Push(task);
                    }
                }

                if(abort || !running)
                    break;

                var id = finished.Pop();
                if(threads[id])
                    threads[id].tasks--;
                running--;
            }

            exec.Abort();

            for(var k in threads)
                threads[k].thr.Join();
        }

        exec.Abort = function()
        {
            for(var i in threads)
            {
                threads[i].queue.Clear();
                threads[i].queue.Push(null);
            }
        }

        return exec;
    }
}
