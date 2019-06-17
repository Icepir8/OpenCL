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
    var ns_prop = load("property.js");

    //ESLINT hit: base and own are used as closures and as output parameters as well
    this.Directory = function(base, own)
    {
        var attribute_type = "Type";
        var attribute_description = "Description";
        // following sort functions are required for sorting items in property Disabled
        var SortAscendingByAttributeType = function(a,b)
        {
            var a_priority = (a.Attributes && typeof(a.Attributes.Value(attribute_type)) != "undefined") ? a.Attributes.Value(attribute_type) : 100;
            var b_priority = (b.Attributes && typeof(b.Attributes.Value(attribute_type)) != "undefined") ? b.Attributes.Value(attribute_type) : 100;

            return a_priority - b_priority;
        }

        var directory = function () { return (base || own) ? FileSystem.AbsPath(base, own) : ""; }
        var on_change = ns_event.FEvent();

        directory.Base = function(dir)
        {
            if(!directory.Locked() && arguments.length && dir)
            {
                base = dir;
                on_change(directory());
            }

            return base;
        }

        directory.Own = function(dir)
        {
            if(!directory.Locked() && arguments.length)
            {
                own = dir;
                // own installdir should be passed to subscribers only in case if base dir defined
                // in other case children's result dir became incorrect (null is transparented into current module location folder by FileSystem.AbsPath(base, own))
                // the whole dir will be passed to children when base directory is defined
                if(directory.Base())
                {
                    on_change(directory());
                }
            }

            return own;
        }

        directory.Subscribe = function(callback) {on_change.Connect(callback);}

        directory.Cascade = function(dir) {directory.Subscribe(function(b) {dir.Base(b);});}

        var PLocked = function(val, sort_func)
        {
            var cont = ns_prop.Collector(val);

            cont.SubscribeBeforeSet(function(_val)
            {
               //var description = "Description";
               var type = attribute_type;

               if(_val)
               cont.FilterItems(function(obj)
               {
                   if(obj())
                   {
                       Log("setting " + attribute_description + " from locked indicator: " + obj.Attributes ? obj.Attributes.Value(attribute_description) : "");
                       cont.Attributes.Value(attribute_description, obj.Attributes ? obj.Attributes.Value(attribute_description) : "");

                       if(obj.Attributes && obj.Attributes.Value(attribute_type))
                       {
                           Log("setting " + attribute_type + " : " + obj.Attributes.Value(attribute_type));
                           cont.Attributes.Value(attribute_type, obj.Attributes.Value(attribute_type));
                       }

                       return true;
                   }
               }, sort_func);
            });

            return cont;
        }

        //directory.Locked = ns_prop.Collector(false);
        directory.Locked = PLocked(false, SortAscendingByAttributeType);

        directory.Lock = function(l)
        {
            if(!arguments.length)
            {
                if(directory.Locked())
                    return;

                directory.Locked(true);
            }
            else if(typeof(l) != "function")
            {
                directory.Locked(l ? true : false);
            }
            else
            {
                directory.Locked(l);
            }
        }

        directory.Lock.Cascade = function(dir)
        {
            if(dir.Locked)
                dir.Locked(directory.Locked);
            else
                Log(Log.l_warning,"Directory.Lock.Cascade: incoming dir doesn't contain method Locked. Ignore!");
        }

        directory.Lock.Subscribe = directory.Locked.Subscribe;

        return directory;
    }
}
