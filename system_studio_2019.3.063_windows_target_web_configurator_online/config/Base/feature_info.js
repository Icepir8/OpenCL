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

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var info_log = ALog ? ALog : Log;

    var Info = function()
    {
        var info = {};

        var properties = {};
        var actual = false;
        var priority = 0;

        info.Property = function(name, value)
        {
            if(name)
            {
                if(arguments.length > 1)
                {
                    properties[name] = value;
                    info_log(Log.l_debug, "  Info: property " + name + " = " + value);
                }
                else
                    return properties[name];
            }
        }

        info.Properties = function() {return properties;}

        info.Actual = function(act)
        {
            if(arguments.length)
                actual = act;
            else
                return actual;
        }

        info.Priority = function(p)
        {
            if(arguments.length)
                priority = p;
            else
                return priority;
        }

        info.Id = function() {return info.Property("id");}
        info.Name = function() {return info.Property("name");}
        info.Version = function() {return info.Property("version");}
        info.Description = function() {return info.Property("description");}
        info.ErrorDescription = function() {return info.Property("error_description");}

        info.GetInfo = function(){ return info; }

        return info;
    }

    //###############################################################
    //###############################################################
    var GetStorageChildsExtractor = function(rp)
    {
        var res = {};
        var func = function(name){ return res[name]; }

        if(!rp)
            return func;

        if(typeof(rp.GetChildsAsStringFromPath) != "function")
        {
            func = function(name){ return rp(name).value; }
        }

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            childs_string = String(rp.childs_as_string);
        }

        filter(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                res[arr[0]] = (arr.length > 1) ? arr[1] : null;
        });

        return func;
    }

    var FilterStorageChilds = function(rp, cb)
    {
        var res = {};
        if(!rp || typeof(cb) != "function")
            return;

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            if(typeof(rp.GetChildsAsStringFromPath) == "function")
            {
                // storage binding supports childs serialization
                childs_string = String(rp.childs_as_string);
            }
            else
            {
                // storage binding doesn't supports childs serialization
                filter(rp.childs, function(name)
                {
                    if(cb(name, rp(name).value))
                        return true;
                });

                return;
            }
        }

        filter(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                if(cb(arr[0], (arr.length > 1) ? arr[1] : null))
                    return true;
        });
    }

    //###############################################################

    var get_childs_as_string_exists = "undefined";

    var GetChildsAsStringFromPath = function(rp, path)
    {
        if(!rp || !path || typeof(path) == "undefined")
            return "";

        if(get_childs_as_string_exists == "undefined")
            get_childs_as_string_exists = typeof(rp.GetChildsAsStringFromPath) == "function" ? true : false;

        return get_childs_as_string_exists ? rp.GetChildsAsStringFromPath(path) : rp(path);
    }
    //###############################################################

    this.InfoDB = function(db_restore_point)
    {
        var rp = null;
        if(typeof(db_restore_point) == "string")
        {
            //need to load rp
            rp = Storage("*");
            rp.Read(db_restore_point);
        }
        else
        {
            // restore point storage was provided
            rp = db_restore_point;
        }

        if(rp)
        {
            var info = Info();
            info.Priority(100);

            var childs = GetStorageChildsExtractor(rp);
            var iproperties = info.Properties();

            iproperties["id"] = childs("id");
            iproperties["name"] = childs("name");
            iproperties["version"] = childs("version");
            iproperties["type"] = childs("obj_type");

            info.RestorePointObj = rp;

            //var pinfo = rp("Info");

            //Log("info = " + pinfo.childs_as_string);

            //Log("info_childs = "+ info_childs);

            FilterStorageChilds(GetChildsAsStringFromPath(rp, "Info"), function(name, val)
            {
                //Log("info name = " + name + " val = " + val);
                iproperties[name] = val;
            });

            //Log("load cmp info from DB done");

            return info;
        }
        return null;
    }

    this.InfoPure = function(id, nm, dscr, vr)
    {
        if(!id)
            return null;
        
        var info = Info();
        info.Property("id", id);
        info.Property("name", nm ? nm : id);
        info.Property("description", dscr);
        info.Property("version", vr);
        
        return info;
    }
}


