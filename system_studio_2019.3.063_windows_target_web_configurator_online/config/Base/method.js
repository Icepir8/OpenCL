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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));}
    var ns_event = load("event.js");

    //###############################################################
    // class Method is wrapper for your function which allows calling required callback after the function
    // is successfully completed (returned true)
    //###############################################################
    this.Method = function(f)
    {
        var on_begin = ns_event.FEvent();
        var on_end = ns_event.FEvent();

        var blank_f = function(){Log("call of uninitialized method!"); return true;}
        var func = (arguments.length > 0) ? f : blank_f;

        var mthd = function()
        { 
            var ns = this;
            var args = arguments;
            
            on_begin.apply(ns,args);
            var res = func.apply(ns, args);
            if(res)
                on_end.apply(ns,args);

            return res;
        }
        
        mthd.Function = function(p){ func = (arguments.length > 0) ? p : blank_f; return func;}        

        mthd.SubscribeOnBegin = function(cb) {on_begin.Connect(cb);}
        mthd.SubscribeOnEnd = function(cb) {on_end.Connect(cb);}

        return mthd;
    }
}

