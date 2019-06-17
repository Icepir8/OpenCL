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
    //class Event
    //###############################################################
    this.Event = function(owner)
    {
        this.owner = owner;
        this.processors = [];
    }
    //###############################################################
    // Connect method allows adding processor for current event
    //###############################################################
    this.Event.prototype.Connect = function (proc, obj)
    {
        if(!proc)
            return false;

        if(!obj)
            this.processors.push(proc);
        else
            this.processors.push(function(event_owner){proc.call(obj,event_owner);});

        return true;
    }
    //###############################################################
    // Clear method removes all processors for this event
    //###############################################################
    this.Event.prototype.Clear = function () { this.processors = []; }
    //###############################################################
    // Call method calling all processors with this defined with owner object
    //###############################################################
    this.Event.prototype.Call = function ()
    {
        var ns = this;
        var func_i = function(i) { return function(){ns.processors[i](ns.owner);}; };
        for(var i in this.processors)
            safecall(func_i(i));
    }

    //###############################################################
    // FEvent - functor to be used as function
    //###############################################################
    this.FEvent = function()
    {
        var subscribers = [];

        var f = function()
        {
            var ns = this;
            var args = arguments;
            var apply_i = function(i) { return function(){subscribers[i].apply(ns, args);}; };
            var log_i = function(i) { return function(){Log("Exception catched on calling FEvent: " + subscribers[i]);}; };
            for(var i in subscribers)
            {
                if(subscribers[i])
                {
                    safecall(apply_i(i), log_i(i));
                }
            }
        }

        f.Connect = function(func)
        {
            if(func && typeof(func) == "function")
                subscribers.push(func);
            else
                Log(Log.l_warning, "FEvent:Connect: incoming parameter isn't defined or not a function. Ignore.");
        }
        
        f.Disconnect = function(func)
        {
            var ind = subscribers.indexOf(func);
            if(ind != -1)
                subscribers.splice(ind, 1);
            else
                Log(Log.l_warning, "FEvent:Disconnect: incoming parameter isn't found. Ignore.");                
        }

        f.Call = function() {return f.apply(this, arguments);}

        f.Empty = function() {return subscribers.length == 0;}

        return f;
    }
}
