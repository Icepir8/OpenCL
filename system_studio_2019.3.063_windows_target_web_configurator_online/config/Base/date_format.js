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
// returns formated date 
//###############################################################
new function()
{
    var ns = this;

    this.Format = function(date, format)
    {
        if(!date)
            return;
        if(!date.getDate)
            return;
        
        
        var monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",  "Oct", "Nov", "Dec"];
        var monthFullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September",  "October", "November", "December"];
        
        var d = String(date.getDate());
        var dd = d.length == 1 ? "0" + d : d;
        var m = String(date.getMonth() + 1);
        var mm = m.length == 1 ? "0" + m : m;
        var mon = monthShortNames[date.getMonth()];
        var month = monthFullNames[date.getMonth()];
        var yyyy = String(date.getFullYear());
        var yy = yyyy.substr(2, 2);
        
        var frmt = format ? format : "yyyy-mm-dd";
        
        frmt = frmt.indexOf("yyyy") != -1 ? frmt.replace("yyyy", yyyy) : frmt.replace("yy", yy);
        frmt = frmt.indexOf("dd") != -1 ? frmt.replace("dd", dd) : frmt.replace("d", d);
        frmt = frmt.indexOf("month") != -1 ? frmt.replace("month", month) 
            : frmt.indexOf("mon") != -1 ? frmt.replace("mon", mon) 
            : frmt.indexOf("mm") != -1 ? frmt.replace("mm", mm) 
            : frmt.replace("m", m);
        
        Log(" date_format: " + frmt);
        return frmt;
    }
}
