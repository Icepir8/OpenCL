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

    var info_actions    = [];
    var requisites      = [];
    var failed          = [];
    var failed_fatal    = [];
    var failed_critical = [];
    var failed_warning  = [];
    var failed_info     = [];

    var rtf = false;
    var message_template = "";
    //###############################################################
    this.info     = "info";
    this.warning  = "warning";
    this.critical = "critical";
    this.fatal    = "fatal";

    //###############################################################
    var string_format_cb = function(type, msg)
    {
        if(type == ns.fatal)
            return StringList.Format("{\\cf1 [%s]} \\par", msg);
        else if(type == ns.critical)
            return StringList.Format("{\\cf1 [%s]} \\par", msg);
        else if(type == ns.warning)
            return StringList.Format("{\\cf2 [%s]} \\par", msg);
        else if(type == ns.info)
            return StringList.Format("[%s] \\par", msg);

        return msg;
    }
    
    //###############################################################
    // PreRequisite class
    //###############################################################
    this.PreRequisite = function( msg, type )
    {        
    	this.msg  = msg  || "not defined";
		this.type = type || ns.req_t.info;
    }
    //###############################################################
    this.PreRequisite.prototype.Message = function (msg)
    {
        if(msg)
            this.msg = msg;
    }
    //###############################################################
    this.PreRequisite.prototype.Type = function (type)
    {
        if(type)
            this.type = type;
    }
    //###############################################################
    // text generation
    var generate_message = function(messages)
    {
        var text = "";
        for(var i in messages)
        {
            var type = messages[i].type;
            var msg = messages[i].msg;
            if(rtf)
                text = text + string_format_cb(type, msg);
            else
                text = text + StringList.Format("[%s]\n", msg);
        }

        return StringList.Format(message_template, text);
    }

    //###############################################################
    this.Check = function()
    {
        Log("PreRequisites check was launcher");

        failed_fatal    = [];
        failed_critical = [];
        failed_warning  = [];
        failed_info     = [];
        failed          = [];

        for(var i in info_actions)
            if(!info_actions[i]())
                return false;

        for(var r in requisites)
        {
            var req = requisites[r];
            var prereq = req();
            if(prereq)
            {
                failed.push(prereq);
                if(prereq.type == ns.fatal)
                    failed_fatal.push(prereq);
                else if(prereq.type == ns.critical)
                    failed_critical.push(prereq);
                else if(prereq.type == ns.warning)
                    failed_warning.push(prereq);
                else if(prereq.type == ns.info)
                    failed_info.push(prereq);
            }
        }
        // concatenating all type of failed prerequisites into single array in order 
        // fatal;critical;warning;info
        var text = failed_fatal.concat(failed_critical.concat(failed_warning.concat(failed_info)));

        var message = generate_message(text);

        Log("message format: " + rtf ? "RTF" : "plain text");
        Log("PreRequisite message: " + message);
        Wizard.Notify("prerequisite_text", rtf ? "set rtf text" : "set text", message);

        return (failed.length != 0);
    }
    //###############################################################
    this.FailedFatal = function()
    {
        return (failed_fatal.length != 0);
    }
    //###############################################################
    this.FailedCritical = function()
    {
        return (failed_critical.length != 0);
    }
    //###############################################################
    this.Failed = function()
    {
        Log("failed " + failed.length + " prerequisites");
        return (failed.length != 0);
    }
    //###############################################################
    this.AddInfoAction = function(action)
    {
        if(action)
            info_actions.push(action);
    }
    //###############################################################
    this.AddPreRequisite = function(req)
    {
        if(req)
            requisites.push(req);
    }
    //###############################################################
    this.MessageTemplate = function(text)
    {
        rtf = false;
        message_template = text;
    }
    //###############################################################
    this.RTFMessageTemplate = function(text)
    {
        rtf = true;
        message_template = text;
    }

    //###############################################################
    this.RTFStringFormat = function(func)
    {
        string_format_cb = func;
    }

    // text generation
}
