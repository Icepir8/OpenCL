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

Namespace("Root.Stat_pick", function()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};
    var fm = StringList.Format;
    //###############################################################
    // Stat_pick class
    //###############################################################
    this.Stat_pick = this.Stat_pick || new function()
    {
        var ns_event = load("event.js");
        var before_send = ns_event.FEvent();
        
        var sp = this;
                
        var agg = function (dim, grp, compareFunc) {
            var m = null; //important
            for (var i in dim)  
            {
                var el = dim[i];
                var n = el[grp];
                m = compareFunc(n, m);
            }
            return m;
        }

        var min = function (a, b) { if (b === null || a < b) return a; return b;}
        var max = function (a, b) { if (b === null || a > b) return a; return b;}
        var ToDateTime = function (date_str) {return new Date(date_str);}
        var DateDiff = function (d2, d1) 
        { 
            if (typeof(d1) == "undefined" || !d1) return 0;
            if (typeof(d2) == "undefined" || !d2) return 0;
            return d2.getTime() - d1.getTime();
        }

        var to_sec = function (ms) {
            return Math.round(ms/1000);
        }
    
        var union = function (intervals) {
            return {start : agg(intervals, "start", min), stop : agg(intervals, "stop", max)};
        }
    
        var duration = function (interval) {
            return DateDiff(interval.stop, interval.start);
        }
    
        //Total duration of all time intervals (summary)
        var interval_duration_total = function (intervals) {
            var d = 0;
            for (var i in intervals)
            {
                d = d + duration(intervals[i]);
            }
            return to_sec(d);
        }
        //Duration of union time interval
        var interval_duration_union = function (intervals)  {
            return to_sec(duration(union(intervals)));
        }
    
        var filter = function(coll, cb)
        {
            for(var i in coll)
                if(cb(coll[i], i))
                    return true;
            return false;
        };
    
        //global not formated stat object
        var stat_support = {
            //internal properties
        };
        //global formated stat object
        //object with listed fields is used as a pattern for FormatObject
        var stat_info = {
            //properties for send
            fulfillment : "",
            lic_type : "", 
            support_type : "", 
            support_code : "",
            activation_type : "",
            activation_retcode : "",
            sn : "",
            media_id : "",
            online_flag : "",
            ui_mode : "",
            mac : "",
            locale : "",
            product_name : "",
            cpu : {},
            msvs : [],
            mode : "",
            install_status : "",
            units_retcodes : {},
            prereqs : {},
            stage : "",
            install_time : 0,
            download_time : 0,
            node_id : "",
            visited : [],
            eclipse_integration : ""
        };
        
        var trunc_info = {
            //properties for sending
            lic_type : "", 
            support_code : "",
            product_name : "",
            product_tag : "",
            install_status : ""
        };
            
        var exclude_user_name = function(message)
        {
            if (typeof(message) == "undefined") return message;
            if (String(message) == "") return message;
            //error message can contain user names
            //replace them with {UFN}, {USN}
            var mes = message;
            
            var user_name = System.UserName();
            var r_user_name = new RegExp(user_name, "ig");
            mes = mes.replace(r_user_name, "{UFN}");

            var u_name = user_name.substr(0, 6)+"~"; //short name
            var r_u_name = new RegExp(u_name, "ig");
            mes = mes.replace(r_u_name, "{USN}");
    
            return mes;
        }
        
        var max_component_order = function()
        {
            var _max = 0;
            var source = stat_support["units_retcodes"];
            for (var i in source)
            {
                var cmp = source[i];
                Log("cmpi = " + i);
                if (cmp["order"] && cmp["order"] > _max)
                    _max = cmp["order"];
            }
            return _max;
        }
    
        var ordered_formated_components = function()
        {
            var obj = {};
            var source = stat_support["units_retcodes"];
            var max_order = max_component_order();
            Log("max_order = " + max_order);
            for (var ord = 0; ord <= max_order; ord++)
            {
                for (var i in source)
                {
                    var cmp = source[i];
                    if (!cmp["order"])
                        continue;
                    if (cmp["order"] == ord)
                    {
                        obj[i] = {
                            status : cmp["status"], 
                            retcode : cmp["retcode"], 
                            error_msg : exclude_user_name(cmp["error_msg"]), 
                            filename : cmp["filename"], 
                            group : cmp["group"]
                        };
                        break;
                    }
                }
            }
            return obj;
        }
        
        var formated_prereq = function()
        {
            var obj = {};
            var source = stat_support["prereqs"];
            filter(source, function(pr, el)
            {
                obj[el] = {
                    severity : pr["severity"], 
                    message : exclude_user_name(pr["message"])
                };
            });

            return obj;
        }
    
        sp.FormatProperty = function(property)
        {
            if (property == "units_retcodes")
            {
                //order by "order" field and exclude user names
                return ordered_formated_components();
            }
            if (property == "prereqs")
            {
                //exclude user names
                return formated_prereq();
            }
            return stat_support[property];
        }
        
        sp.FormatTruncProperty = function(property)
        {
            if (property == "install_status")
            {
                //encoding 
                var st = stat_support[property] == "success" ? 0x0001 : stat_support[property] == "cancel" ? 0x0002 : stat_support[property] == "fail" ? 0x0003 : 0x0000;
                var ui = stat_support["ui_mode"] == "silent" ? 0x0010: 0x0000;
                var res = ui | st; 
                Log("st = " + st + "; ui = " + ui + "; res = " + res);
                return res;
            }
            return stat_support[property];
        }
    
        sp.FormatObject = function()
        {
            for (var i in stat_info)
            {
                stat_info[i] = sp.FormatProperty(i);
            }
            for (var i in trunc_info)
            {
                trunc_info[i] = sp.FormatTruncProperty(i);
            }
        }
    
        sp.rem_install_time = function()
        {
            stat_support["install_time"] = interval_duration_total(stat_support.install);
        }
        sp.rem_download_time = function()
        {
            stat_support["download_time"] = interval_duration_total(stat_support.download);
        }
    
        //common function for all properties
        sp.Property = function(property_name, value) {
            if (typeof(value) != "undefined") 
                stat_support[property_name] = value;
            return stat_support[property_name];
        }
        //time manager is avaliable for all groups of processes
        //allows to pick a time when process started or stoped
        sp.time_manager = function(process_id, group)
        {
            var obj = {};
            if(!stat_support[group])
                stat_support[group] = {};
            var grp = stat_support[group];
            grp[process_id] = {};
            var cmp_obj = grp[process_id];
            obj.start = function(){ cmp_obj.start = new Date();}
            obj.stop = function(){ cmp_obj.stop = new Date();}
    
            return obj;
        }
    
        var component_order = 1;
        sp.component_manager = function(component_id)
        {
            var obj = {};
            //id, status, retcode, error_msg, filename, group
            obj.Property = function(property_name, value) 
            {
                if (typeof(value) == "undefined")
                {
                    if (!stat_support.units_retcodes) return;
                    if (!stat_support.units_retcodes[component_id]) return;
                }
                if (!stat_support.units_retcodes)
                    stat_support.units_retcodes = {};
                if (!stat_support.units_retcodes[component_id])
                    stat_support.units_retcodes[component_id] = {};
                var cmp = stat_support.units_retcodes[component_id];
                if (typeof(value) != "undefined") 
                    cmp[property_name] = value;
                return cmp[property_name];
            }
                
            obj.DownloadStage = sp.time_manager(component_id, "download");
            
            obj.InstallStage = sp.time_manager(component_id, "install");

            obj.Parent = sp;
            
            obj.StartProcessing = function()
            {
                //works only one time
                if (obj.Property("order")) return;
                obj.Property("order", component_order++);
            }
            return obj;
        }
        
        //
        sp.add_visited_dialog = function(dialog_name) 
        {
            if (!stat_support["visited"])
                stat_support["visited"] = [];
            stat_support["visited"].push(dialog_name);
            stat_support["stage"] = dialog_name;
        }
        
        //using closure to assign unique Id to added prerequisites
        var prereq_id = 1;
        sp.add_prerequisite = function(severity, head, description) 
        {
            if (!stat_support["prereqs"])
                stat_support["prereqs"] = {};
            stat_support.prereqs[prereq_id++] = {severity : severity, message : fm(head) + (description ? "	" + fm(description) : "")};
        }
        sp.get_stat_support = function() 
        {
            return stat_support;
        }
        sp.get_stat_info = function() 
        {
            return stat_info;
        }
        sp.get_trunc_info = function() 
        {
            return trunc_info;
        }
        sp.JSON_stat_support = function() 
        {
            var eventstr = JSON.stringify(stat_support, null, "  ");
            return eventstr;
        }
        sp.JSON_stat_info = function() 
        {
            var eventstr = JSON.stringify(stat_info, null, "  ");
            return eventstr;
        }
        sp.JSON_trunc_info = function() 
        {
            var eventstr = JSON.stringify(trunc_info, null, "  ");
            return eventstr;
        }
        var full_checkers = [];
        var trunc_checkers = [];
        
        var all = function(coll, cb)
        {
            for(var i in coll)
                if(!cb(coll[i], i))
                    return false;
            return true;
        };
        var eula_checker = function() { return sp.Property("eula_accepted") ? true : false; }
        var external_checker = function() { return HomePhoneStatistics.GetSourceValue() != "internal";}
        var mode_install_checker = function() { return sp.Property("mode") == "install";}
        var isip_accepted = function() 
        { 
            return sp.Property("isip_done") ? sp.Property("isip_accepted") 
                : sp.Property("disable_optin_dlg") ? false 
                : Ism.OptInAvailable() && Ism.OptInIsAccepted() ? true  
                : false;
        }
        
        sp.AddFullChecker = function(checker){full_checkers.push(checker);}
        sp.AddTruncChecker = function(checker){trunc_checkers.push(checker);}
        
        //Check if the full statistic data could be sent
        //1. ISIP must be accepted for full statistic. The checker must be added outside.
        //2. statistic must be external & the mode must be install for truncated statistic
        //3. EULA must be accepted for both        
        sp.AddFullChecker(eula_checker); 
        sp.AddFullChecker(isip_accepted); 
        //
        sp.AddTruncChecker(eula_checker);
        sp.AddTruncChecker(external_checker);
        sp.AddTruncChecker(mode_install_checker);

        sp.CheckFull = function(){ return all(full_checkers, function(chk) { return chk();}); }
        sp.CheckTrunc = function(){ return all(trunc_checkers, function(chk) { return chk();}); }
        
        var HPStat_call = 0;
        sp.HPSendStat = function() 
        {
            HPStat_call++;
            if (HPStat_call > 1)
                Log("HPStat_call = " + HPStat_call);
            
            before_send();
            sp.FormatObject();
                       
            //Log("stat_support = " + sp.JSON_stat_support());
            Log("stat_info = " + sp.JSON_stat_info());
            Log("trunc_info = " + sp.JSON_trunc_info());
            
            var stat_send = load("stat_send.js");
            
            stat_send.Init(sp);
            if (sp.CheckTrunc())
            {
                Log("trying to send trunc_info");
                stat_send.SendTrunc();
            }
            else 
            {
                Log("trunc_info won't be sent");
            }
            if (sp.CheckFull())
            {
                Log("trying to send stat_info");
                stat_send.SendFull();
            }
            else 
            {
                Log("stat_info won't be sent");
            }
        }
        
        sp.SubscribeBeforeSend = function(cb) {before_send.Connect(cb);}
    }
}
);