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

    this.PropertySet = function()
    {
        var properties = {};
        var unformatted = [];
        var on_change = ns_event.FEvent();

        var un_function = function(val)
        {
            if(typeof(val) == "function")
                return val();
            return val;
        }

        // set is a function object which allows set/get values
        // if first parameter is an object, all its keys will be added into set
        var set = function(name, val)
        {
            if(name && typeof(name) == "object")
            {
                for(var i in name)
                    set.Value(i, name[i]);

                return set;
            }

            if(arguments.length > 1)
            {
                return set.Value(name, val);
            }

            if(arguments.length == 0)
                return set; // this situation can occur when property set is a value for a property -> it means that it wil try to call set as a function

            return set.Value(name);
        }

        // set/get value. if value argument omitted - property value returned (undecorated)
        set.Value = function(name, value)
        {
            if(name)
            {
                if(arguments.length > 1)
                {
                    if(typeof(value) == "undefined")
                        delete properties[name];
                    else
                        properties[name] = value;
                    on_change(name, value);
                }
                else
                    return un_function(properties[name]);
            }

        }

        set.Add = function(name, value)
        {
            if(arguments.length == 2)
                return set.Value(name, value);
            else if(arguments.length == 1)
                unformatted.push(name); // add unformatted value, like NAME=VALUE
        }

        // subscribe to changes of set
        set.Subscribe = function(callback) {on_change.Connect(callback);}

        // cascade subscribe: allows to build cascade sets
        set.Cascade = function(pset) {set.Subscribe(function(n,v) {pset.Value(n,v);});}

        // get raw value - without undecoration
        set.Raw = function(name)
        {
            if(set.Exists(name))
                return properties[name];
        }

        // deletes all properties
        set.Clear = function(name)
        {
            var keys = [];
            set.Filter(function(_name) {keys.push(_name); return false;});
            for(var i in keys) {set.Delete(keys[i]);}
            properties = {};
        }

        // deletes property
        var undef; //undefined
        set.Delete = function(name) {set.Value(name, undef);}

        // check if any property defined in set
        set.Exists = function(name)
        {
            if(name)
                if(properties.hasOwnProperty(name))
                    return true;

            return false;
        }

        // iterate all properties, cb - callback function to call
        set.Filter = function(cb)
        {
            if(cb)
                for(var i in properties)
                    if(cb(i, un_function(properties[i])))
                        return true;

            return false;
        }

        set.String = function(include_empty)
        {
            var str = "";
            var e = include_empty;

            var quote = function(s) {return !s ? "" : ((typeof(s) == "string" && s.match(/\s/)) ? ('"' + s + '"') : s);}
            set.Filter(function(n, v) {if(e || v) str = str + (str ? " " : "") + quote(n) + "=" + quote(v); return false;});
            for(var i in unformatted)
                str = str + (str ? " " : "") + unformatted[i];
            return str;
        }

        return set;
    }
}// namespace Root.component
