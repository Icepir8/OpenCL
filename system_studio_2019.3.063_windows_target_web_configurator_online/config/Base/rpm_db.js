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


Namespace("Root.DB", function()
{
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var ns_prop  = base("property.js");
    var P = function(val){return ns_prop.Property(val);}
    
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };
    
    var ns = this;

    this.DB = this.DB || new function()
    {
        var db = this;
        
        this.DBPath = P("");
    
        this.DBName = P("intel_sdp_products.db");
        
        this.FieldMask = ["zer", "name", "id", "path", "log"];
        
        var path = function(){return FileSystem.MakePath(db.DBName(), db.DBPath() ? db.DBPath() : Origin.Directory());}
        
        var connected = false;  
        var position = -1;
        var eof = true;
                
        this.Path = function(){return path();}
        this.Connected = function(){return connected;};
        
        var records = [];
        
        var fetch = function()
        {
            if (eof) 
                return;
            
            return records[position];
        }
        
        this.Connect = function()
        {
            if (connected)
                return true;
            
            //open & read file
            records = [];
            var cont = FileSystem.ReadFileUTF8(path());
            if (!cont)
                return false;
            
            var rec_array = cont.split("|>\n");
            if(rec_array && rec_array.length)
            {
                for(var i in rec_array)
                {
                    var obj = {};
                    var obj_array = [];
                    if(rec_array[i].length)
                    {
                        obj_array = rec_array[i].split("|"); //arguments and commands are separated by pipes
                    }
                    for(var f in db.FieldMask)
                    {
                        obj[db.FieldMask[f]] = obj_array[f+1];
                    }
                    records[i] = obj;
                }
            }

            connected = true;
            eof = (db.Count() == 0);
            position = eof ? -1 : 0;
            return true;
        }
        
        this.Disconnect = function()
        {
             connected = false;
             eof = true;
             position = -1;
             records = [];
        }
        
        this.Refresh = function()
        {
            db.Disonnect();
            db.Connect();
        }
        
        this.Count = function()
        {
            if (!connected)
                return 0;
            
            return records.length;
        }
        
        //cursor pos
        this.First = function()
        {
            if (!db.Count())
                return;
            
            position = 0;
            eof = false;
            return fetch();
        }
        
        this.Last = function()
        {
            if (!db.Count())
                return;
            
            position = db.Count() - 1;
            eof = false;
            return fetch();
        }
        
        this.Next = function()
        {
            if (eof)
                return;
            
            if (position == db.Count() - 1)
            {
                eof = true;
                return;
            }
            
            position++;
            return fetch();
        }
        
        this.Fetch = function()
        {
            if (eof)
                return;
            
            return fetch();
        }
        
        this.Go = function(pos)
        {
            if (pos < 0)
                return;
            if (pos >= db.Count())
                return;
            if (db.Count() == 0)
                return;
            
            position = pos;
            eof = false;
            return fetch();
        }
        
        
        this.Eof = function()
        {
            return eof;
        }        
        
        this.Locate = function(field_name, val)
        {
            if (!connected)
                return;
            if (!field_name)
                return;
            if (!val)
                return;
            
            if (!filter(db.FieldMask, function(el) 
            {
                if (el == field_name)
                    return true;
            }))
            {
                Log(Log.l_error, "No such field - " + field_name);
                return;
            }
            
            if (db.Count() == 0)
                return;
            
            //check if we are staying on it
            if (position >= 0)
            {
                var ce = records[position];
                if (ce[field_name] == val)
                {
                    eof = false;
                    return fetch();
                }
            }
            
            for(var i in records)
            {
                var e = records[i];
                if (e[field_name] == val)
                {
                    eof = false;
                    position = i;
                    return fetch();
                }
            }
        }
        
        this.FieldByName = function(field_name)
        {
            if (eof)
                return;
            
            if (!filter(db.FieldMask, function(el) 
            {
                if (el == field_name)
                    return true;
            }))
            {
                Log(Log.l_error, "No such field - " + field_name);
                return;
            }
            
            var rec = fetch();
            return rec[field_name];
            
        }
    }
    
    //rpm component    
    this.Rpm = function(_id)
    {
        var id = _id;
        var cmp = {};
        cmp.Id = function() {return id;}
        cmp.Installed = function()
        {
            if(!id)
                return false;
            
            if (!ns.DB.Connect())
                return;
            
            var rec = ns.DB.Locate("id", id);
            return rec ? true : false;
        }
        
        cmp.Path = function()
        {
            if (!cmp.Installed())
                return;
            
            if (!ns.DB.Connect())
                return;
            
            var rec = ns.DB.Locate("id", id);
            if(rec)
                return ns.DB.FieldByName("path");
        }
        
        return cmp;
    }

});
