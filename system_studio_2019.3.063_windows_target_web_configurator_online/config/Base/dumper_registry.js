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
        var act = DumperAction.Registry();

        var wow = true;
        var expand = false;

        act.Wow = function(w)
        {
            wow = w;
        }

        act.Expand = function(e) {expand = e;}

        act.CreateKey = function(root, key)
        {
            return act.Configure({action:"key_create", root:root, key:key, wow:wow});
        }

        act.DeleteKey = function(root, key)
        {
            return act.Configure({action:"key_delete", root:root, key:key, wow:wow});
        }

        act.SetValue = function(root, key, name, value)
        {
            return act.Configure({action:"value_set", root:root, key:key, name:name, value:value, wow:wow, expand: expand});
        }

        act.DeleteValue = function(root, key, name)
        {
            return act.Configure({action:"value_set", root:root, key:key, name:name, wow:wow});
        }

        act.IgnoreErrors = function(ignore)
        {
            if(ignore)
                return act.Configure("ignore_error");
            else
                return act.Configure("process_error");
        }

        return act;
    }
}
