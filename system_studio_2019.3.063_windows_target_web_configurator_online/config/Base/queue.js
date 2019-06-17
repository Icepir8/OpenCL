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


/*
    Locking queue implementation

    Push(obj) - push object to queue
    var obj = Pop(); - pop object from queue - locked till at least one object is available
*/

new function()
{
    this.Queue = function()
    {
        var sema = Semaphore();
        //var lock = Mutex();
        var data = [];

        var queue = {};

        queue.Push = function(obj)
        {
            //lock.Lock();
            data.unshift(obj);
            sema.Inc();
            //lock.Unlock();
        }

        queue.Pop = function()
        {
            sema.Dec();
            //lock.Lock();
            var obj = data.pop();
            //lock.Unlock();
            return obj;
        }

        queue.Clear = function()
        {
            //lock.Lock();
            while(sema.count)
                sema.Dec();
            data = [];
            //lock.Unlock();
        }

        queue.Count = function()
        {
            //lock.Lock();
            var cnt = sema.count;
            //lock.Unlock();
            return cnt;
        }

        return queue;
    }
}



