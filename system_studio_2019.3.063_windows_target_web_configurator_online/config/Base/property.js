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
    var ns_prop_set = load("property_set.js")

    var ns = this;

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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
    
    
    var all = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }
        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(!r1)
                return false;
        }
        return true;
    }    

    //###############################################################
    //class Property
    //###############################################################
    this.Property = function(def_val, _attributes)
    {
        var on_set = ns_event.FEvent();
        var before_set = ns_event.FEvent();

        var value = typeof(def_val) != "undefined" ? def_val : null;

        var previous_value = null;
        
        var prop = function(val, _attr)
        {
            if(arguments.length > 0)
            {
                //prop.Attributes(_attr);
                return (typeof(_attr) != "undefined") ? _set(val, _attr) : _set(val);
            }
            else
                return _get();
        }

        prop.Attributes = ns_prop_set.PropertySet();
        prop.Attributes(_attributes);
        prop.Log = function(){};
        //###############################################################
        // required functions
        //###############################################################
        function _set(val, attributes)
        {
            if(prop.Filter(val))
            {
                //var v = prop.Transform(val);
                //var res = prop.Set(val);
                return (typeof(attributes) != "undefined") ? prop.Set(val, attributes) : prop.Set(val);
            }

            return prop.Get();
        }

        function _get(){ return prop.Get(); }
        

        function un_function(val)
        {
            if(typeof(val) == "function")
                return val();
            return val;
        }
        //###############################################################

        prop.PreviousValue = function(val){ if(typeof(val) != "undefined") previous_value = val; return previous_value;}
        prop.Filter = function(val){ return typeof(val) == "undefined" ? false : true; }
        prop.Transform = function(val){ return val;}
        prop.DefaultSet = function(val, _attr)
        {
            prop.PreviousValue(value);
            var tval = prop.Transform(val);
            before_set(tval);
            value = tval;
            prop.Attributes(_attr);
            on_set(value);
            return value;
        }
        prop.Set = prop.DefaultSet;
        prop.Subscribe = function(cb) {on_set.Connect(cb);}
        prop.SubscribeBeforeSet = function(cb) {before_set.Connect(cb);}
        prop.Cascade = function(p) {prop.Subscribe(function(v) {p(v);});}

        prop.DefaultGet = function(){ return un_function(value);}
        prop.Get = prop.DefaultGet;
        // get raw value - without undecoration
        prop.GetRaw = function(){ return value; }

        return prop;
    }
    //###############################################################
    //class Constant Property
    //###############################################################
    this.Constant = function(def_val)
    {
        var on_set = ns_event.FEvent();

        var value;
        if (arguments.length > 0) 
            value = def_val;
        
        var prop = function(val){ return _get();}
        //###############################################################
        // required functions
        //###############################################################
        function _get(){ return prop.Get(); }
        
        function un_function(val)
        {
            if(typeof(val) == "function")
                return val();
            return val;
        }
        //###############################################################
        prop.DefaultGet = function(){ return un_function(value);}
        prop.Get = prop.DefaultGet;
        // get raw value - without undecoration
        prop.GetRaw = function(){ return value; }

        return prop;
    }

    //###############################################################
    var P = function(val){return ns.Property(val);}

    //###############################################################
    //class Callback
    //this is the property that specially done for storing functions. It returns undecorated value
    //###############################################################
    this.Callback = function(cb)
    {
        var func = P(cb);
        func.Get = func.GetRaw;
        return func;
    }
    
    //###############################################################
    //class TProperty
    //this is the property that returns undecorated value (true property)
    //###############################################################
    this.TProperty = function(val, attr)
    {
        var tp = ns.Property(val, attr);
        tp.Get = tp.GetRaw;
        return tp;
    }

    /*
    //###############################################################
    // Collector
    //###############################################################
    this.Collector = function(inti_val)
    {
        var items = [];
        var default_val = P(); // this property is for keeping backward compatibility
        var result_property = P(false); // it is the result property subscribers will be connected to it

        var cont = function(val)
        {
            if(typeof(val) != "undefined")
            {
                if(typeof(val) == "function")
                {
                    if(iterate(items, function(obj){ if(obj == val) return true;}))
                    {
                        cont.Log("attempt to add the same item twice. Ignore.");
                        return;
                    }

                    items.push(val);
                    if(val.Subscribe)
                        val.Subscribe(cont.ItemsSubscriber);
                    else
                        cont.Log("Added element doesn't have method Subscribe. Ignore.");
                }
                else
                {
                    default_val(val ? true : false);
                }

                cont.Refresh();
            }
            else
              return result_property();
        }

        cont.Cascade = function(p) {p.(cont);}

        cont.Subscribe = result_property.Subscribe;

        cont.Log = log_helper("Collector: ");

        cont.Number = function() {return items.length;}

        cont.Items = function()
        {
            var r = [];
            for(var i in items)
                r.push(items[i]);

            return r;
        }

        cont.Exists = function(val){ return iterate(items, function(obj){ if(obj == val) return true;} ); }

        cont.Refresh = function()
        {
            var res = default_val();

            var new_val = res ? res : iterate(items, function(obj){ if(res || obj()) return true;} );

            var prev_val = result_property();

            if(new_val != prev_val)
                result_property(new_val);
        }

        cont.ItemsSubscriber = function(val)
        {
            cont.Refresh();
        }

        default_val.Subscribe(cont.ItemsSubscriber);

        if(typeof(inti_val) != "undefined")
            cont(init_val);

        return cont;
    }
    */
    //###############################################################
    // Collector
    //###############################################################
    this.Collector = function(init_val, attributes)
    {
        var items = [];
        var default_val = P(); // this property is for keeping backward compatibility
        var cont = P(); // it is the result property subscribers will be connected to it
        cont.Log = GetOpt.Exists("property-log") ? log_helper("CollectorProperty: ") : function(){};

        cont.BaseValue = function(){ return default_val;}

        cont.Set = function(val, _attr)
        {
            if(typeof(val) == "function")
            {
                cont.Add(val);
            }
            else
            {
                cont.Log(Log.l_debug, "Setting default_val with " + val);
                default_val(val, _attr);

                if(_attr)
                    iterate(_attr, function(_val, _name)
                    {
                      cont.Log(Log.l_debug, "Adding attribute " + _name + " for default_val with " + _val);
                    });

                //default_val.Attributes(_attr);

            }

            cont.UpdateValue();
        }

        cont.Add = function(val)
        {
            if(typeof(val) != "function")
            {
                cont.Log(Log.l_debug, "attempt to add the function which isn't a function. Ignore.");
                return;
            }

            cont.Log(Log.l_debug, "Adding function ");
            if(iterate(items, function(obj){ if(obj == val) return true;}))
            {
                cont.Log(Log.l_debug, "attempt to add the same item twice. Ignore.");
                return;
            }

            items.push(val);
            if(val.Subscribe)
                val.Subscribe(cont.ItemsSubscriber);
            else
                cont.Log("Added element doesn't have method Subscribe. Ignore.");

            cont.UpdateValue();
        }

        cont.Cascade = function(p)
        {
            if(!p)
            {
                cont.Log(Log.l_warning, "Property:Container:Cascade: incoming parameter isn't defined! Ignore;");
                return;
            }

            if(typeof(p) != "function")
            {
                cont.Log(Log.l_warning, "Property:Container:Cascade: incoming parameter isn't a function, type = " + typeof(p) + "! Ignore;");
                return;
            }

            p(cont);
        }

        cont.Number = function() {return items.length;}

        cont.FilterItems = function(cb, sort_func)
        {
            return iterate(cont.Items(sort_func), cb);
        }

        cont.Items = function(sort_func)
        {
            var r = [];
            for(var i in items)
                r.push(items[i]);

            if(typeof(sort_func) == "function")
               return r.sort(sort_func);

            return r;
        }

        cont.Exists = function(val){ return iterate(items, function(obj){ if(obj == val) return true;} ); }

        cont.ValueEvaluator = function(){ var res = iterate(items, function(obj){ if(obj()) return true;} ); return res ? true : false;}

        cont.UpdateValue = function()
        {
            var new_val = cont.ValueEvaluator();

            var prev_val = cont();

            cont.Log(Log.l_debug, "UpdateValue new_val = " + new_val + " prev = " + prev_val);

            if(new_val != prev_val)
                cont.DefaultSet(new_val);
        }

        cont.ItemsSubscriber = function(val){ cont.Log(Log.l_debug, "ItemsSubscriber with val " + val); cont.UpdateValue(); }

        cont(default_val); // just adding default_val as one of items.
        //default_val.Subscribe(cont.ItemsSubscriber);

        //if(typeof(init_val) != "undefined")
        cont(init_val, attributes);

        return cont;
    }
    
    this.CollectorByAnd = function(init_val, attributes)
    {
        var cont = this.Collector(init_val, attributes);
        cont.ValueEvaluator = function(){ var res = all(cont.Items(), function(obj){ if(obj()) return true;} ); return res ? true : false;}
        return cont;
    }    

}
