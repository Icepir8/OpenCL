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
    this.CreateAction = function()
    {
        var act = {};

        var records = [];

        var backup = [];

        var s_name = "DB_dumper::backup::*";
        var backup_storage = Storage(s_name);

        act.Save = function(key, storage)
        {
            var r = {};
            r.key = key;
            r.storage = storage;
            records.push(r);
        }

        act.Delete = function(key)
        {
            var r = {};
            r.key = key;
            records.push(r);
        }

        act.Apply = function()
        {
            for(var i in records)
            {
                var r = records[i];
                if(r.key)
                {
                    // save original value to backup
                    var b = {};
                    
                    // check for existence of updated key
                    if(DB.Exists(r.key))
                    {
                        var s = backup_storage(r.key);
                        s.Read(r.key);
                        b.key = r.key;
                        b.storage = s;
                    }
                    else
                        b.key = DB.Head(r.key);

                    backup.unshift(b);

                    // update database
                    if(r.storage)
                        r.storage.Write(r.key);
                    else
                        DB.Remove(r.key);
                }
            }
            records = [];

            return true;
        }

        act.Rollback = function()
        {
            for(var i in backup)
            {
                var r = backup[i];
                if(r.key)
                {
                    if(r.storage)
                        r.storage.Write(r.key);
                    else
                        DB.Remove(r.key);
                }
            }
            backup = [];
            return true;
        }

        act.Commit = function() // fake function, just return true
        {
            return true;
        }

        return act;
    }
}
