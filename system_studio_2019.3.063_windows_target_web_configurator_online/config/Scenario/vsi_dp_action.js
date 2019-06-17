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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};
    var ns_pb  =  base("parse_bool.js");
    
    this.Actions = function(prod)
    {
        var ns = this;
        Log("Scenario::vsi_config_action: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined");
            return;
        }
        
        var dp_mng = base("dp_manager.js");
        
        var vs_integration_scb = function()
        {
            var vs_idata = ns.VSIntegration.Data();
            var obj = {};
            var skipped = ns.VSIntegration.Skip(); /* check if VS Integration dialog was shown */
            for(var k in vs_idata)
            {
                var vs = vs_idata[k];
                var val = vs.selected  ? "true" : "false";
                obj[vs.id] = skipped ? "false" : val;
            }
            Log("Serialize callback:" + JSON.stringify(obj)); 
            return obj;
        };
    
        var vs_integration_dcb = function(data)
        {
            Log("Deserialize callback:" + JSON.stringify(data));
            var vs_idata = ns.VSIntegration.Data();
            if(!vs_idata)
            {
                Log(Log.l_warning,"vs_data is null");
                return;
            }
            Log("VS DATA <<< " + JSON.stringify(vs_idata));
            for(var k in vs_idata)
            {
                var vs = vs_idata[k];
                if(data && data.hasOwnProperty(vs.id))
                {
                    var val = ns_pb.ParseBoolean(data[vs.id]);
                    if(typeof(val) != "undefined")
                    {
                        vs_idata[k].selected = val ? true : false;
                    }
                }
                else
                {
                    Log("Configuration parameter for " + vs.id + " is not defined.");
                }
            }
            Log("VS DATA >>> " + JSON.stringify(vs_idata));
            ns.VSIntegration.Data(vs_idata);
        };
        
        dp_mng.AddHandler("vs_integration", vs_integration_scb, vs_integration_dcb);
    
        Log("Scenario::vsi_config_action: actions generation completed");
        return Action.r_ok;
    }
}