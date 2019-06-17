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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../../Base/" + name);};
    var ns_inst = base("installer.js");

    this.Init = function(prod)
    {
        var ns = this;

        var prereq_fatal    = [];
        var prereq_critical = [];
        var prereq_warning  = [];
        var prereq_info     = [];

        var prereq_custom_checker = null;
        var prereq_stage = null;

        var prereq_clear = function()
        {
            prereq_fatal    = [];
            prereq_critical = [];
            prereq_warning  = [];
            prereq_info     = [];
        };
        
        var prereq_fill = function(stage)
        {
            prereq_clear();
            if(prereq_custom_checker)
            {
                prereq_custom_checker(stage);
            }
        };
        
        var silent = ns_inst.Installer.Silent();
        var Output = function(mes)
        {
            Log(mes);
            ns_inst.Installer.OutputFile().Append(mes);
        }
        
        var prereq_check = function()
        {
            if(prereq_fatal.length || prereq_critical.length || prereq_warning.length || prereq_info.length)
                return true;

            return false;
        }
        
        var silent_prereq_check = function()
        {
            if(prereq_fatal.length || prereq_critical.length)
                return true;

            return false;
        }
        
        this.FillPrerequisites = function()
        {
            Log("fill pre-requisites");
            prereq_fill(prereq_stage);
            return Action.r_ok;
        }
        
        this.FillPrerequisites.Check = function()
        {
            Log("check for pre-requisites");
            var check = silent ? silent_prereq_check : prereq_check
            return check();
        }
        
        this.FillPrerequisites.Stage = function(_stage)
        {
            if (arguments.length)
            {
                Log(Log.l_debug, "setting Stage = " + (_stage ? _stage : "null"));
                prereq_stage = _stage;
                return;
            }
            
            return prereq_stage;
        }

        this.FillPrerequisites.Skip = function()
        {
            if (GetOpt.Exists("noprereq"))
            {
                Log("Filling prerequsites is skipped due to commandline parameter");
                return true;
            }
            if (ns_inst.Installer.DownloadOnly())
            {
                Log("Filling prerequsites is skipped due to download-only mode");
                return true;
            }

            return false;
        }

        var shift = "  ";

        var prev_prereq_SFatal    = function(msg) {prereq_fatal.push(StringList.Format(shift + "Fatal: [%s]\r\n", msg));}
        var prev_prereq_SCritical = function(msg) {prereq_critical.push(StringList.Format(shift + "Critical: [%s]\r\n", msg));}
        var prev_prereq_SWarning  = function(msg) {prereq_warning.push(StringList.Format(shift + "Warning: [%s]\r\n", msg));}
        var prev_prereq_SInfo     = function(msg) {prereq_info.push(StringList.Format(shift + "Info: [%s]\r\n", msg));}

        var prev_prereq_SFatalExt    = function(header, desc) {prereq_fatal.push(StringList.Format(shift + "Fatal: [%s]\r\n" + shift + shift + "Details: [%s]\r\n", header, desc));}
        var prev_prereq_SCriticalExt = function(header, desc) {prereq_critical.push(StringList.Format(shift + "Critical: [%s]\r\n" + shift + shift + "Details: [%s]\r\n", header, desc));}
        var prev_prereq_SWarningExt  = function(header, desc) {prereq_warning.push(StringList.Format(shift + "Warning: [%s]\r\n" + shift + shift + "Details: [%s]\r\n", header, desc));}
        var prev_prereq_SInfoExt     = function(header, desc) {prereq_info.push(StringList.Format(shift + "Info: [%s]\r\n" + shift + shift + "Details: [%s]\r\n", header, desc));}
       
        
        var prev_prereq_Fatal    = function(msg) {prereq_fatal.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par}", msg));}
        var prev_prereq_Critical = function(msg) {prereq_critical.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par}", msg));}
        var prev_prereq_Warning  = function(msg) {prereq_warning.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par}", msg));}
        var prev_prereq_Info     = function(msg) {prereq_info.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par}", msg));}

        var prev_prereq_FatalExt    = function(header, desc) {prereq_fatal.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par\\cf0[%s]\\par}", header, desc));}
        var prev_prereq_CriticalExt = function(header, desc) {prereq_critical.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par\\cf0[%s]\\par}", header, desc));}
        var prev_prereq_WarningExt  = function(header, desc) {prereq_warning.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par\\cf0[%s]\\par}", header, desc));}
        var prev_prereq_InfoExt     = function(header, desc) {prereq_info.push(StringList.Format("{\\cf0\\b [%s]\\b0\\par\\cf0[%s]\\par}", header, desc));}

        var stat_pick = base("stat_pick.js").Stat_pick;
        
        this.FillPrerequisites.Fatal    = function(msg) {
            silent ? prev_prereq_SFatal(msg) : prev_prereq_Fatal(msg);
            stat_pick.add_prerequisite("fatal", msg);
        }
        this.FillPrerequisites.Critical = function(msg) {
            silent ? prev_prereq_SCritical(msg) : prev_prereq_Critical(msg);
            stat_pick.add_prerequisite("critical", msg);
        }
        this.FillPrerequisites.Warning  = function(msg) {
            silent ? prev_prereq_SWarning(msg) : prev_prereq_Warning(msg);
            stat_pick.add_prerequisite("warning", msg);
        }
        this.FillPrerequisites.Info     = function(msg) {
            silent ? prev_prereq_SInfo(msg) : prev_prereq_Info(msg);
            stat_pick.add_prerequisite("info", msg);
        }

        this.FillPrerequisites.FatalExt    = function(header, desc) {
            silent ? prev_prereq_SFatalExt(header, desc) : prev_prereq_FatalExt(header, desc);
            stat_pick.add_prerequisite("fatal", header, desc);
        }
        this.FillPrerequisites.CriticalExt = function(header, desc) {
            silent ? prev_prereq_SCriticalExt(header, desc) : prev_prereq_CriticalExt(header, desc);
            stat_pick.add_prerequisite("critical", header, desc);
        }
        this.FillPrerequisites.WarningExt  = function(header, desc) {
            silent ? prev_prereq_SWarningExt(header, desc) : prev_prereq_WarningExt(header, desc);
            stat_pick.add_prerequisite("warning", header, desc);
        }
        this.FillPrerequisites.InfoExt     = function(header, desc) {
            silent ? prev_prereq_SInfoExt(header, desc) : prev_prereq_InfoExt(header, desc);
            stat_pick.add_prerequisite("info", header, desc);
        }
        
        this.FillPrerequisites.FatalArray = function() { return prereq_fatal;}
        this.FillPrerequisites.CriticalArray = function() { return prereq_critical;}
        this.FillPrerequisites.WarningArray = function() { return prereq_warning;}
        this.FillPrerequisites.InfoArray = function() { return prereq_info;}

        this.FillPrerequisites.Callback = function(cb) {prereq_custom_checker = cb;}
        
        //===================================================================================
        //===================================================================================
        this.SPreRequisites = function()
        {
            ns.FillPrerequisites();
            
            var message = "";
            var i;

            var p_fatal = ns.FillPrerequisites.FatalArray();
            var p_critical = ns.FillPrerequisites.CriticalArray();
            var p_warning = ns.FillPrerequisites.WarningArray();
            var p_info = ns.FillPrerequisites.InfoArray();

            if(p_fatal.length || p_critical.length)
            {
                for(i in p_fatal)
                    message += p_fatal[i];
                for(i in p_critical)
                    message += p_critical[i];
            }
            else
            {
                for(i in p_warning)
                    message += p_warning[i];
                for(i in p_info)
                    message += p_info[i];
            }

            if(message)
            {
                Output("PreRequisites:\r\n");
                Output(message);
            }
            
            if (ns.FillPrerequisites.Check())
                return Action.r_error;
            
            return Action.r_ok;
        }
        
        this.SPreRequisites.Skip = this.FillPrerequisites.Skip;
    }
}
