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
    var ns_event = base("event.js");
    var ns_prop = base("property.js");

    var P = function(val){return ns_prop.Property(val);}
    
    var create_ev = function(obj)
    {
        var event = ns_event.FEvent();
              
        var ev = function(cb)
        {
            if(cb)
                event.Connect(cb);
            else
                return event;
        }
        
        ev.Object = P(obj);
        //if OnTransmit returns false, event is not transmitted
        ev.OnTransmit = P();
        ev.Perform = function(sender, event_id)
        {
            var ev_id = event_id ? event_id : sender;
            var ca = ev.OnTransmit.GetRaw();
            var gen = true;
            if (ca && typeof(ca) == "function")
                gen = ca(sender, ev_id);
            
            if (gen)
                event(obj, ev_id);
            return gen;
        }
        //transmit an event from default_sender
        //and use it as event_id
        ev.Transmit = function(default_sender) 
        {
            return function(sender, event_id)
            {
                var snd = default_sender ? default_sender : sender;
                var ev_id = default_sender ? default_sender : event_id;
                
                var ca = ev.OnTransmit.GetRaw();
                var gen = true;
                if (ca && typeof(ca) == "function")
                    gen = ca(snd, ev_id);
                
                //generating a parent event
                if (gen)
                    event(obj, ev_id);
                return gen;
            };
        }
        
        return ev;
    }

    
    this.DialogEvent = function(object)
    {
        var ev = create_ev(object);
        return ev;
    }
        
}