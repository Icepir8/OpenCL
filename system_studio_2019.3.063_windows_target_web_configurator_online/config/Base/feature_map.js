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
// MSI feature processing
//###############################################################
new function ()
{
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));}

    var ns_enum = load("enums.js");

    this.FeatureMap = function(_node)
    {
        if(_node)
        {
            var fea = _node.select("feature[@id]");

            var feature = function(node)
            {
                var f = {};
                f.id = node.attributes.id;

                if(!f.id)
                    return null;

                var log = function(t, m) {Log(t, "Feature map [" + f.id + "]: ", m);}
                var info = function(msg) {log(Log.l_info, msg);}
                var warning = function(msg) {log(Log.l_warning, msg);}
                var error = function(msg) {log(Log.l_error, msg);}

                f.size = parseInt(node.attributes.size);
                f.fullsize = parseInt(node.attributes.fullsize);
                f.title = node.attributes.title;
                f.description = node.attributes.description;
                f.parentid = node.attributes.parent;

                f.Id = function() {return f.id;}
                f.Size = function() {return f.size;}
                f.FullSize = function() {return f.fullsize;}
                f.Title = function() {return f.title;}
                f.Description = function() {return f.description;}
                f.ParentId = function() {return f.parentid;}

                ns_enum.BindTo(f);

                f.product = null;
                f.parent = null;
                f.action = f.action_t.none;
                f.state = f.state_t.absent;

                f.Product = function(prod)
                {
                    if(arguments.length)
                    {
                        info("Processing feature state");
                        if(prod.IsFeatureInstalled(f.id))
                            f.State(f.state_t.installed);
                        else
                            f.State(f.state_t.absent);
                        f.product = prod;
                    }
                    return f.product;
                }

                f.State = function(state)
                {
                    if(arguments.length)
                    {
                        info("State set: " + f.state + " -> " + state);
                        switch(state)
                        {
                        case f.state_t.installed:
                            f.state = f.state_t.installed;
                            break;
                        case f.state_t.absent:
                            f.state = f.state_t.absent;
                            break;
                        default:
                            warning("Unknown state request: " + state);
                            break;
                        }
                    }

                    return f.state;
                }

                f.Action = function(action)
                {
                    if(arguments.length)
                    {
                        info("Action set: " + f.action + " -> " + action);
                        switch(action)
                        {
                        case f.action_t.install:
                            f.action = f.action_t.install;
                            break;
                        case f.action_t.remove:
                            f.action = f.action_t.remove;
                            break;
                        case f.action_t.none:
                            f.action = f.action_t.none;
                            break;
                        default:
                            warning("Unknown action request: " + action);
                            break;
                        }
                    }

                    return f.action;
                }

                f.Parent = function(parent)
                {
                    if(arguments.length)
                    {
                        info("Parent set");
                        f.parent = parent;
                    }

                    return f.parent;
                }

                f.map = null;
                f.Map = function(map) {f.map = map;} // for internal usage - link to parent object

                f.Childs = function(cb) {return f.map ? f.map.Childs(f, cb) : null;}

                f.Deep = {Childs : function(cb) {return f.map ? f.map.Deep.Childs(f, cb) : null;},
                          Tree   : function(cb) {return f.map ? f.map.Deep.Tree(f, cb) : null;},
                          Action : function(action) {f.Action(action); f.Childs(function(c) {c.Deep.Action(action); return false;})}};

                info("Created: " + f.id + " : " + f.title + " : " + f.description);

                return f;
            }

            var fmap = {};
            
            for(var i in fea)
            {
                var f = feature(fea[i]);
                if(f)
                    fmap[f.Id()] = f;
            }

            for(var j in fmap)
            { // set parent objects for features
                var pid = fmap[j].ParentId();
                if(pid && fmap[pid])
                    fmap[j].Parent(fmap[pid]);
            }

            var log = function(t, m) {Log(t, "Feature map: ", m);}
            var info = function(msg) {log(Log.l_info, msg);}
            var warning = function(msg) {log(Log.l_warning, msg);}
            var error = function(msg) {log(Log.l_error, msg);}

            // now build feature map object
            var map = {};
            ns_enum.BindTo(map);

            map.List = function(cb)
            {
                if(typeof(cb) == "function")
                {
                    for(var k in fmap)
                        if(cb(fmap[k]))
                            return true;
                    return false;
                }

                return fmap;
            }

            map.List(function(_f) {_f.Map(map); return false;});

            map.Get = function(id)
            {
                if(id)
                    if(fmap[id])
                        return fmap[id];
                warning("Failed to find feature: " + id);
                return null;
            }

            map.Deep = {}; // object to process elements recursively
            
            map.Childs = function(parent, cb) // null parent for root features
            {
                var equ;
                if(parent)
                    equ = function(_f) {return parent.Id() == _f.ParentId();}
                else
                    equ = function(_f) {return !_f.Parent();}

                var r = typeof(cb) == "function" ? false : [];

                map.List(function(_f)
                {
                    if(equ(_f))
                    {
                        if(typeof(cb) == "function")
                        {
                            if(cb(_f))
                            {
                                r = true;
                                return true;
                            }
                            else
                                r = false;
                        }
                        else
                            r.push(_f);
                        return false;
                    }
                });

                return r;
            }

            // enumerate all childs recursively
            map.Deep.Childs = function(parent, cb)
            {
                var self = arguments.callee;
                if(typeof(cb) == "function")
                {
                    return map.Childs(parent, function(_f)
                    {
                        if(cb(_f))
                            return true;
                        else
                            return self(_f, cb);
                    });
                }
                else
                {
                    var r = [];
                    self(parent, function(_f) {r.push(_f); return false;});
                    return r;
                }
            }

            // enumerate all childs recursively, including parent element
            map.Deep.Tree = function(parent, cb)
            {
                var self = arguments.callee;
                if(typeof(cb) == "function")
                {
                    if(cb(parent))
                        return true;
                    return map.Deep.Childs(parent, cb);
                }
                else
                    return [parent].concat(map.Deep.Childs(parent, cb));
            }

            // returns list of features by requested action
            map.ListAction = function(action)
            {
                var list = "";
                var append = function(name) {list = list + (list ? "," : "") + name;}
                map.List(function(_f) {if(_f.Action() == action) append(_f.Id()); return false;});
                return list;
            }

            // returns list of features by requested state (useful for rollback)
            map.ListState = function(state)
            {
                var list = "";
                var append = function(name) {list = list + (list ? "," : "") + name;}
                map.List(function(_f) {if(_f.State() == state) append(_f.Id()); return false;});
                return list;
            }

            return map;
        }

        return null;
    }
}


