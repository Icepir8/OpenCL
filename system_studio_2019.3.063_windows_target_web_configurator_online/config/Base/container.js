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

//###############################################################
// This file contains definition for:
//  enum ftr_state_t
//  class Feature
//###############################################################
//Namespace("Root.feature", function ()
new function ()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_event     = load("event.js");

    var blank_f = function(){return ""};

    var ns = this;

    var SortByOrder = function(a,b){ return (a.Order ? a.Order() : 100) - (b.Order ? b.Order() : 100);}
    //###############################################################
    // elements
    //###############################################################
    this.Container = function()
    {
        var cont = {};
        var items = {};
        var items_order = [];
        var on_add = ns_event.FEvent();
        var on_rm  = ns_event.FEvent();

        cont.Log = log_helper("Container: ");

        cont.Number = function() {return items_order.length;}

        cont.Order = function(sort_func) { var arr = items_order.concat([]); return arr.sort((typeof(sort_func) == "function") ? sort_func : SortByOrder);}
        cont.Items = function()
        {
            var r = {};
            for(var i in items)
                r[i] = items[i];

            return r;
        }
        cont.Item = function(id)
        {
            if(id && items[id])
                return items[id];
        }

        cont.Exists = function(id){ return items[id] ? true : false; }

        cont.Transform = function(args)
        {
            if(args.length == 1)
                return {id : args[0].Id(), obj : args[0]};

            if(args.length == 2)
                return {id : args[0], obj : args[1]};

            Log("Container: Transform: incorrect function call - more then 2 input parameters");
            //return undefined;
        }

        cont.Add = function()
        {
            var args = arguments;

            if(!cont.Add.Filter(args))
                return false;

            var el = cont.Transform(args);

            if(!el)
            {
                cont.Log("attempt to add undefined item");
                return false;
            }

            if(el.id)
            {
                if(items[el.id])
                {
                    cont.Log("element with id = " + el.id + " already exists");
                    return true;
                }

                //cont.Log("add element with id " + el.id);
                items_order.push(el.obj);
                items[el.id] = el.obj;

                var _args = arguments;
                on_add.apply(cont, _args);
            }
            else
            {
                cont.Log("can't add element with undefined id");
                return false;
            }

            return true;
        }

        cont.Add.Filter = function(args){ return true;}

        cont.Add.Subscribe = function(cb) {on_add.Connect(cb);}

        cont.Remove = function(id)
        {
            if(!id)
            {
                cont.Log("attempt to remove item with undefined id");
                return false;
            }

            if(items[id])
            {
                var rem_el = items[id];

                var arr = items_order.concat([]);

                // clear items_order and fill it again just without removed element
                items_order = [];
                for(var i in arr)
                    if(arr[i] != rem_el)
                        items_order.push(arr[i]);

                delete items[id];

                on_rm(rem_el);
                cont.Log("item with id = " + id + " was removed");
            }
            else
            {
                cont.Log("item with id = " + id + " doesn't present");
            }

            return true;
        }

        cont.Remove.Subscribe = function(cb) {on_rm.Connect(cb);}

        // iterate all items, with applying cb (callback function to call) until items end or cb returns false
        // returns true if all items were completed successfully and false otherwise
        cont.Apply = function(cb)
        {
            var self = arguments.callee;
            //self.FailedItem = undefined;

            var arr = cont.Order();
            for(var i in arr)
                if(!cb(arr[i]))
                {
                    self.FailedItem = arr[i];
                    return false;
                }

            return true;
        }

        // iterate all items in reverse mode, with applying cb (callback function to call) until items end or cb returns false
        // returns true if all items were completed successfully and false otherwise
        cont.ApplyReverse = function(cb)
        {
            var self = arguments.callee;
            //self.FailedItem = undefined;

            var arr = cont.Order();
            arr.reverse();

            for(var i in arr)
                if(!cb(arr[i]))
                {
                    self.FailedItem = arr[i];
                    return false;
                }

            return true;
        }

        // iterate all items, with applying cb (callback function to call) until items end or cb returns true
        cont.Filter = function(cb)
        {
            if(cb)
            {
                var arr = cont.Order();
                for(var i in arr)
                    if(cb(arr[i]))
                        return true;
            }
            return false;
        }

        return cont;
    }
}

