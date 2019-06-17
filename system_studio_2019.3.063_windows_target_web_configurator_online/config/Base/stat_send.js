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

new function() {

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var stat_pick = {};
    var test_url = null;

    var get_event_full = function()
    {
        if (typeof(HomePhoneStatistics) == "undefined") return;

        var event = {
            Event: {
                EventId: "0CC3E174-285E-4080-8F8F-99F3887FC336",
                EventTime: "/Date(" + (new Date()).valueOf() + ")/",
                ContextData: [
                    {key: "Id", value: "00000000-0000-0000-0000-000000000001"},
                    {key: "ProductId", value: stat_pick.Property("product_id")},
                    {key: "EventId", value: "install-full"},
                    {key: "ComponentId", value: stat_pick.Property("product_id")},
                    {key: "Message", value: "(null)"},
                    {key: "Platform", value: stat_pick.Property("platform")},
                    {key: "OSArch", value: (HomePhoneStatistics.Is64BitOS() ? 64 : 32)},
                    {key: "Source", value: HomePhoneStatistics.GetSourceValue()},
                    {key: "PlatformDetails", value: stat_pick.Property("platform_details")},
                    {key: "InstalledProducts", value: stat_pick.Property("installed_products")}
                ],
                DomainId: "8542DA87-3F34-4C4C-9838-1AD051DACBD4",
                SessionId: "00000000-0000-0000-0000-000000000001"
            }
        };

        var data = {};
        filter(event.Event.ContextData, function(d) {data[d.key] = d.value;});
        data.Message = JSON.stringify(stat_pick.get_stat_info(), null, "  ");
        //Log("Stat info: " + data.Message);
        event.Event.ContextData = [];
        filter(data, function(d, n) {event.Event.ContextData.push({key: n, value: d});});

        var eventstr = JSON.stringify(event, null, "  ");
        Log("Event text: " + eventstr);
        return eventstr;
    }
    
    var get_event_trunc = function()
    {
        if (typeof(HomePhoneStatistics) == "undefined") return;

        var event = {
            Event: {
                EventId: "0CC3E174-285E-4080-8F8F-99F3887FC336",
                ContextData: [
                    {key: "EventId", value: "install-min"},
                    {key: "Message", value: "(null)"}
                ]
            }
        };

        var data = {};
        filter(event.Event.ContextData, function(d) {data[d.key] = d.value;});
        data.Message = JSON.stringify(stat_pick.get_trunc_info(), null, "  ");
        //Log("Stat info: " + data.Message);
        event.Event.ContextData = [];
        filter(data, function(d, n) {event.Event.ContextData.push({key: n, value: d});});

        var eventstr = JSON.stringify(event, null, "  ");
        Log("Event text: " + eventstr);
        return eventstr;
    }

    var SendStatistics = function(s)
    {
        if (typeof(HomePhoneStatistics) == "undefined") return;
        if (System.Environment("INTEL_STATISTICS_DISABLE") == "1")
        {
            Log("Sending statistics is disabled due to environment variable INTEL_STATISTICS_DISABLE is set to 1");
            return;
        }
        if (GetOpt.Exists('disable-hp-statistics'))
        {
            Log("Sending statistics is disabled by passing the command line option disable-hp-statistics");
            return;
        }
        var custom_url = test_url ? test_url : GetOpt.Get("hp-url");
        if (custom_url)
            Log("custom_url = "+custom_url);
        
        //sending 
        HomePhoneStatistics(s, custom_url);
    }
    
    var LogStatistics = function(s)
    {
        Log("BEGINDUMPSTAT");
        Log(JSON.stringify(s, null, "  "));       
        Log("ENDDUMPSTAT");
    }
    this.Init = function(stat)
    {
        stat_pick = stat;
    }
    
    this.SendTrunc = function()
    {
        var s = get_event_trunc();
        return GetOpt.Exists("dump-stat")? LogStatistics(s) : SendStatistics(s);
    }
    this.SendFull = function()
    {
        var s = get_event_full();
        return GetOpt.Exists("dump-stat")? LogStatistics(s) : SendStatistics(s);
    }

    this.TestUrl = function(url)
    {
        if (typeof(url) != "undefined")
            test_url = url;
        return test_url;
    }

}
