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
    //###############################################################
    // Format SN fields for licensing dialogs
    //###############################################################
    var helper = function()
    {
   
        var caret = 0;

        // format sn number
        var sn_format = function(text)
        {
            var caret_diff = 0;
            var updated_str = "";
            var dash_pos = 0;

            for(var i = 0; i < text.length; i++)
            {
                if(text[i] != "-"){
                    updated_str = updated_str + text[i];
                }else{
                    caret_diff--;
                }
                if((updated_str.length - dash_pos) % 4 == 0 && updated_str.length  != dash_pos) // add '-'
                {
                    if(updated_str.length > 5){
                        continue;
                    }
                    caret_diff++;
                    updated_str = updated_str + "-";
                    dash_pos = updated_str.length;
                }
            }
            caret += caret_diff;

            if(updated_str.length == dash_pos) // cut trailing "-"
            {
                updated_str = updated_str.substr(0, updated_str.length - 1);
                caret--;
            }
            var diff = updated_str.length - 13;
            if(diff > 0)
            {
                updated_str = updated_str.substr(0, updated_str.length - diff);
                caret = caret - diff;
            }
            return updated_str.toUpperCase();
        }
        
        var obj = {};
        obj.SetCaret = function(i_caret)
        {
            caret = i_caret;
        }
        obj.GetCaret = function()
        {
            return caret >= 0 ? caret : 0;
        }
        obj.Format = function(sn)
        {
            return sn_format(sn);
        }
        
        return obj;
    }
    
    this.Helper = helper;
    
}
        