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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "Base"));};
    //var pconfig = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "ProductConfig"));};

    var ns_inst = Namespace("Root.installer");

    var ns_db_info_cmp = base("db_info_component.js");
    var ns_info = base("component_info.js");

    //var group_name = StringList.Format("[group_name]");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var ns_load_cfg = load("load_xml.js");
    if(!ns_load_cfg || !ns_load_cfg.LoadConfig || !ns_load_cfg.LoadConfig())
    {
        Log(Log.l_error, "Can't get loading configuration! Will not continue.");
        return;
    }

    var load_cfg = ns_load_cfg.LoadConfig();

    var prod = null;

    var media = false;

    var ns_cnt  = load("product_content.js");

    // load_stage parameter determines the stage on which product will be loaded (when the LoadContent and SetRelations are called)
    this.Cache = function(start, groups, load_stage)
    {
        Log("load from cache");
        media = false;
        //if(group == group_name)
        if(load_cfg.BelongToGroupsList(groups))
        {
            prod = ns_cnt.ProductFromCache();
            prod.start = (typeof(prod.start) != "undefined" && prod.start) ? prod.start : start;

            if(!prod.LoadMarkers)
                prod.LoadMarkers = {};

            if(typeof(load_stage) != "undefined" && load_stage)
                prod.LoadMarkers.LoadStage = load_stage;
        }

        return prod;
    }

    // load_stage parameter determines the stage on which product will be loaded (when the LoadContent and SetRelations are called)
    this.Media = function(start, groups, load_stage)
    {
        Log("load from media, start = " + start);
        media = true;
        //if(group == group_name)
        if(load_cfg.BelongToGroupsList(groups))
        { // should always go here
            prod = ns_cnt.ProductFromMedia(false);
            prod.start = start;

            if(prod)
                prod.SetAction(prod.action_t.install);

            if(!prod.LoadMarkers)
                prod.LoadMarkers = {};

            if(typeof(load_stage) != "undefined" && load_stage)
                prod.LoadMarkers.LoadStage = load_stage;
        }

        return prod;
    }

    // loading of the DB doesn't require start, load_stage and groups
    this.DB = function(product_id, config_location)
    {
        Log("mediaconfig: load product " + product_id + " from db");
        //media = false;
        return ns_cnt.ProductFromDB(product_id, config_location);
    }

    var order_function_for_products_load = function(container, action)
    {
        var res_arr = [];
        // the start product should be the last one for content loading and relations setting
        filter(container, function(p){ p.start ? res_arr.push(p) : res_arr.unshift(p); });
        return res_arr;
    }

    this.Go = function()
    {
        Log("========= mediaconfig - Go =====================================");

        if(ns_inst.Installer.Silent())
        {
            Log("   hiding splash");
            Splash.Hide();
        }

        if(!prod)
        {
            Log(Log.l_critical, "Product could not be created");
            return;
        }

        Log("========= mediaconfig - LoadDBInfo =============================");
        ns_inst.Installer.LoadDBInfo(); // loading DBInfoProduct objects from DB

        Log(Log.l_debug, "dump loaded content");
        //##############################################################
        // Functions for dumping components and features created from DB
        var DumpComponents = function(ftr, shift)
        {
           if(ftr.Components().Number() < 1)
               return;

           var m_shift = shift + "   ";
           Log(m_shift + "Components:");
           ftr.Components().Filter(function(cmp)
           {
               Log(m_shift + "   " + cmp.Name() + "/" + cmp.Id());
               Log(m_shift + "      version = "+ cmp.Version().Str() + " type = " + cmp.Type());
               Log(m_shift + "      alias = "+ cmp.Info().Property("alias"));
               Log(m_shift + "      state = " + cmp.State());// + " action = " + cmp.Action());
               Log(m_shift + "      installdir = " + cmp.InstallDir());// + " action = " + cmp.Action());
           });
        }

        var DumpFeatures = function(ftr, shift)
        {
           var m_shift = shift + "   ";
           Log(m_shift + "Feature: id = " + ftr.Id());
           Log(m_shift + "   name = "+ ftr.Name());
           Log(m_shift + "   version = "+ ftr.Version().Str());
           Log(m_shift + "   installdir = "+ ftr.InstallDir());
           //Log(m_shift + "   state = " + ftr.State());// + " action = " + cmp.Action());
           DumpComponents(ftr, m_shift);
           ftr.Features().Filter(function(f)
           {
               DumpFeatures(f, m_shift);
           });
        }
	/*
        for(var i in ns_inst.Installer.DBInfo.Products)
            DumpFeatures(ns_inst.Installer.DBInfo.Products[i]);
	*/
        // collect product loading time to use it for estimation time required for loading other cached products ( to dispaly correct progress)
        Log("========= mediaconfig - Installer.Load =========================");
        prod.start_loading_time = new Date().getTime();
        ns_inst.Installer.Load(order_function_for_products_load, ns_inst.Installer.GetFilterByLoadStage("first_load_stage"));
        ns_inst.Installer.FromMedia(media);
        // time required for loading this product (in this reduction only current product has "first_load_stage" marker)
        prod.loading_time = (new Date().getTime()) - prod.start_loading_time;

        Log("       product loading time = " + prod.loading_time);

        if(!media) // enforce modify mode on launching from cache
            prod.InstallMode(prod.install_mode_t.modify);
            
        for (var i in ns_inst.Installer.Products)
        {
            var p = ns_inst.Installer.Products[i];
            if(p != prod)
            {
               Log("        setting State = installed for ARP, MICL, IS components. Product = " + ns_inst.Installer.Products[i].Name()); 
               if(p.ARP)
                   p.ARP.State(p.state_t.installed);
               if(p.MICL)
                   p.MICL.State(p.state_t.installed);
               if(p.IS)
                   p.IS.State(p.state_t.installed);
            }
            else 
            {
                Log(Log.l_debug, "The same product. Skip it");
            }        
        }
        Log("========= mediaconfig - CheckForUpgrade ========================");
        prod.CheckForUpgrade();
        Log("========= mediaconfig - ProductPostProcess =====================");
        if(prod.ProductPostProcess)
        {
            prod.ProductPostProcess.Call();
            prod.Refresh();
        }
        Log("========= mediaconfig - GenerateNodes ==========================");
        prod.GenerateNodes();

        StringList.Replace("title", prod.Info().Property("title") ? prod.Info().Property("title") : prod.Name());
        //StringList.Replace("title", prod.Name());

        Log("========= mediaconfig - load(iscenario.js).Scenario(prod) ======");
        var scn = load("iscenario.js").Scenario(prod);

        if(!scn)
        {
            Log(Log.l_critical, "scenario is undefined!");
            return Action.r_error;
        }

        Log("========= mediaconfig - Start scenario execution ===============");
        return scn();
    }
}
