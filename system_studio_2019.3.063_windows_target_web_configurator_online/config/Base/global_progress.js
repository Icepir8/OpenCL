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
    var GlobalProgress = Progress.Partial();
    var scale = 1000;
    var last_pid = null;

    var item_name = function(item)
    {
        if(item && item.Attribute && item.Attribute("name"))
            return item.Attribute("name");

        return null;
    }

    this.functor_rollback = function(item, total, header)
    {
        Log("GlobalProgress rollback");
        if(item_name(item))
        {
            if (GlobalProgress.total < 0)
            {
                GlobalProgress.total = total * scale;
                GlobalProgress.position = total * scale;
            }
                    
            if (GlobalProgress.position > GlobalProgress.total)
                GlobalProgress.position = GlobalProgress.total;
            if (GlobalProgress.position > 0)
                GlobalProgress.position = GlobalProgress.position - 1 * scale;

            GlobalProgress.message = header;   
            Wizard.Notify("Progress1", "connect", GlobalProgress.id);    
        }      
    }

    this.functor_commit = function(item, header)
    {
        Log("GlobalProgress committing");
        GlobalProgress.message = header;
        if (last_pid)
        {
            GlobalProgress.Disconnect(last_pid);
            last_pid = null;
        }
        var progress = item.ProgressCommit();
        if(progress)
        {
            //apply own progress
            progress.backward = false;
            GlobalProgress.start_position = GlobalProgress.position;
            GlobalProgress.finish_position = GlobalProgress.total;
            GlobalProgress.Connect(progress.id);
            last_pid = progress.id;
        }
        else
        {
            //this is the last action without the own progress
            //set the end of the process
            GlobalProgress.position = GlobalProgress.total;
        }
        Wizard.Notify("Progress1", "connect", GlobalProgress.id);
    }

    var set_progress = function(_item, current, total, message)
    {
  
        if(item_name(_item))
        {
            GlobalProgress.backward = false;
            GlobalProgress.total = total * scale;
            GlobalProgress.message = message;
            var initial_pos = (current - 1) * scale;
            var own_p = _item.ProgressApply();
            GlobalProgress.position = initial_pos;
        }
        if (last_pid)
        {
            GlobalProgress.Disconnect(last_pid);
            last_pid = null;
        }
        if (own_p)
        {
            Log("own progress");
            //transmit own component progress
            //to the cut between start and finish position
            GlobalProgress.start_position = initial_pos;
            GlobalProgress.finish_position = initial_pos + scale;
         //   GlobalProgress.Connect(own_p.id);
            last_pid = own_p.id;
        }

        Wizard.Notify("Progress1", "connect", GlobalProgress.id);
    }

    /* creates function which updates progress bar header
     *
     */
    this.create_header = function(_item, current, total, header)
    {
        Log("GlobalProgress set header");
        var p_h = _item.ProgressApplyHeader || ( (typeof(_item.Holder) == "function" && _item.Holder()) ? _item.Holder().ProgressApplyHeader : null);
        var message = "";
        var iname = item_name(_item);

        if(typeof(p_h) == "function")
        {
            // found function which should customize ProgressDialog Header -> use it instead of default one
            // it is used for DownloadList functionality for example.
            message = p_h(current ? current : 1, total);
        }
        else
        {
            message = StringList.Format(header, current ? current : 1, total);
            if(item_name(_item))
                message += ": " + item_name(_item);
        }
                             
        set_progress(_item, current, total, message);  
      
    }
}
