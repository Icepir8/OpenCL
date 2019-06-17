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

/*
   Format method set progress format line, supported keywords:
   file - file name to download
   path - full path to download
   url  - original source url
   size - file size (data from server)
   rest - data size left to download
   downloaded - dwnloaded size
   speed - download speed (average) per second

   lhour, lmin, lsec - hour, minutes, seconds left to complete download
   left - time left to download complete, short format, like 00:00:00
   left-long - time left to download complete, long format, like 1 hour 10 min 30 sec

   ehour, emin, esec - hour, minutes, seconds elapsed
   elapsed - time elapsed from start, short format, like 00:00:00
   elapsed-long - time elapsed from start, long format, like 1 hour 10 min 30 sec

example:

    var acttion = ns_download.Download();
    action.File("myfile");
    action.Url("http://my_server/my_page/my_file");
    acttion.Format("[file] [elapsed] [elapsed-long] === [left] [left-long] === [downloaded] : [rest] : [size] : [speed]");
*/


new function()
{
    this.Download = function()
    {
        var act = DumperAction.Download();

        act.Url = function(url)
        {
            if(url)
                return act.Configure({url:encodeURI(url)});
            return false;
        }
        act.File = function(file)
        {
            if(file)
                return act.Configure({file:file});
            return false;
        }
        act.Chksum = function(chksum)
        {
            if(chksum)
                return act.Configure({chksum:chksum});
            return false;
        }
        act.Format = function(format)
        {
            if(format)
                return act.Configure({"message-format":format});
            return false;
        }

        return act;
    }

    this.DownloadList = function()
    {
        var download_list_obj = Download.DownloadList();

        // ProgressApplyHeader function is targeted for customization the header of the progress dialog
        download_list_obj.Apply = function()
        {
            return download_list_obj.Download();
        }

        download_list_obj.ProgressApply = function()
        {
            return download_list_obj.Progress();
        }

        download_list_obj.ProgressApplyHeader = function(group_current_element, group_total_elements)
        {
            return StringList.Format("[PrgDownload]");
        }

        download_list_obj.Format = function(format)
        {
            if(format)
                return download_list_obj.MessageTemplate(format);
            return false;
        }
        download_list_obj.Resolved = function()
        {
            return (download_list_obj.Error() == 0);
        }

        return download_list_obj;
    }

}
