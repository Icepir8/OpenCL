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
    var mediaconfig_name = "mediaconfig.js";
    var init_name = Origin.File();

    var ns = this;
    var load = function (name) { return required(FileSystem.MakePath(name, Origin.Directory())); };
    var base = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "Base")); };
    var dialogs = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "Dialogs/wpf")); };
    var path = FileSystem.MakePath;
    
    var ns_enums = base("enums.js");

    if(typeof(Wizard) != "undefined" && !Wizard.OnNotify)
        base("wizard.js");
    
    if (!Wizard.Theme())
    {
        var ns_tm = dialogs("set_theme.js");
        if (ns_tm && ns_tm.ApplyTheme)
            ns_tm.ApplyTheme();
    }
    
    if (typeof (WPF) != "undefined") {
        WPF.asyncSetter = true;

        var ns_splash = dialogs("splash.js");
        if (ns_splash && ns_splash.Init && typeof (ns_splash.Init) == "function")
            ns_splash.Init.call(ns);
    }

    var splash_obj = ns.show_splash_screen && typeof (ns.show_splash_screen) == "function" ? ns : Action;

    if (typeof (Splash) == "undefined") {
        Splash = { Canceled: function () { return Wizard.Aborted() || Wizard.Canceled() } };
    }

    Log("###############################################################");
    Log('### Executing of init file "' + path(init_name, Origin.Directory()) + '" begin');

    if(GetOpt.Exists("split-cache")) {
       DB.Connect(Cache.CacheDir() + "/../..");//micl db will be attached to cache location. Cache location should be different for different users.
    }
    else {
       DB.Connect(FileSystem.SpecialFolder.app_data + "/Intel/Installer/");
    }

    base("namespace.js");
    base("extend.js");
    base("log_helper.js");

    var ns_load_cfg = load("load_xml.js");
    if(!ns_load_cfg || !ns_load_cfg.LoadConfig || !ns_load_cfg.LoadConfig())
    {
        Log(Log.l_error, "Can't get loading configuration! Will not continue.");
        return;
    }
    var ns_custom_load = null;
    if (FileSystem.Exists(FileSystem.MakePath("custom_load.js", Origin.Directory())))
        ns_custom_load = load("custom_load.js");

    if(typeof(Namespace) != "undefined" && !Namespace.Defined("Root.installer"))
        base("installer.js");

    var ns_inst = Namespace("Root.installer");

    var load_cfg = ns_load_cfg.LoadConfig();
    // contains init objects for all founded and loaded inits
    // key init file path (for example c:\...\init.js), val object received after executing required("c:\...\init.js")
    var init_objects = {};

    var current_prod = null; // reference to current product which will be created later from mediaconfig

    var splash = function()
    {
        if(ns_inst && ns_inst.Installer.Silent())
            return;

        Log("SplashTitle = " + FileSystem.MakePath(StringList.Format("[splash_title_rtf]"), Origin.Directory()));
        Log("SplashPNG = " + FileSystem.MakePath(StringList.Format("[splash_png]"), Origin.Directory()));

        var blank_f = function(){};

        //splash_obj.splash_title_pos({x1:43, x2:90, y1:32, y2:70}); // x1, x2, … - percent’s of picture size: 0..100
        //splash_obj.splash_status_pos({x1:38, x2:90, y1:62, y2:70});
        splash_obj.splash_title({ title: StringList.Format(FileSystem.ReadFileUTF8(FileSystem.MakePath(StringList.Format("[splash_title_rtf]"), Origin.Directory()))) });

        splash_obj.splash_title_pos = blank_f;
        splash_obj.splash_status_pos = blank_f;
        splash_obj.splash_title = blank_f;

        splash_obj.show_splash_screen({ image: path(FileSystem.MakePath(StringList.Format("[splash_png]"), Origin.Directory())) });
        var progress = Progress();
        Wizard.Notify("splash", "connect", progress.id);
    }

    var splash_for_modify = function()
    {
        if(ns_inst && ns_inst.Installer.Silent())
            return;

        var splash_png = FileSystem.MakePath(StringList.Format("[splash_png]"), Origin.Directory());

        if(StringList.Format("[splash_png_for_modify]") != "splash_png_for_modify")
          splash_png = FileSystem.MakePath(StringList.Format("[splash_png_for_modify]"), Origin.Directory());

        Log("SplashTitle = " + FileSystem.MakePath(StringList.Format("[splash_title_rtf]"), Origin.Directory()));
        Log("SplashPNG = " + splash_png);

        var blank_f = function () { };

        //splash_obj.splash_title_pos({x1:43, x2:90, y1:32, y2:70}); // x1, x2, … - percent’s of picture size: 0..100
        //splash_obj.splash_status_pos({x1:38, x2:90, y1:62, y2:70});
        splash_obj.splash_title({ title: StringList.Format(FileSystem.ReadFileUTF8(FileSystem.MakePath(StringList.Format("[splash_title_rtf]"), Origin.Directory()))) });

        splash_obj.splash_title_pos = blank_f;
        splash_obj.splash_status_pos = blank_f;
        splash_obj.splash_title = blank_f;

        splash_obj.show_splash_screen({ image: path(splash_png) });
        var progress = Progress();
        Wizard.Notify("splash", "connect", progress.id);
    }

    var cached_products_list = {};
    var loaded_products = {};

    var GetCachedProductsList = function()
    {
        if(!GetCachedProductsList.list_generated)
        {
            var products_pattern = "*";
            if (GetOpt.Exists("filter-micl-cache")) {
                products_pattern = GetOpt.GetDefault("filter-micl-cache", "*");
                Log("Changed filter-micl-cache pattern to: " + products_pattern);
            }

            var products = FileSystem.FindFiles(Cache.CacheDir(), products_pattern);

            var cache_dir = Cache.CacheDir();

            for(var i in products)
            {
                if(Splash.Canceled())
                    return;

                var init_dir = path(products[i], cache_dir);

                if(!FileSystem.IsDirectory(init_dir))
                    continue; // looking only for directories

                if(FileSystem.Same(init_dir, Origin.Directory()))
                    continue; // skip own directory

                var t_init = path(init_name, init_dir);

                Log(" check existence of init file : " + t_init );

                if(FileSystem.Exists(t_init))
                {
                    cached_products_list[products[i]] = t_init;
                }

                GetCachedProductsList.list_generated = true;
            }
        }

        return cached_products_list;
    };

    //###############################################################
    // Function finds init scripts in cached folders (skip the current one)
    // and launch provided callback with init object (object from init.js) as 1st input parameter and full path to this inti as 2nd
    //###############################################################
    var ProcessCachedProducts = function(cb)
    {
        if(!cb)
        {
            Log("ProcessCachedProducts: incoming callback isn't defined. Ignore!");
            return;
        }

        if(GetOpt.Exists("no-load-cache"))
            return;

        Log("###############################################################");
        Log("### processing of other cached products begin");

        var products = GetCachedProductsList();

        for(var id in products)
        {
            if(Splash.Canceled())
                return;

            var t_init = products[id];

            if(!init_objects[t_init])
            {
                //Log("Loading strings for " + path(products[i], cache_dir));
                //StringList.Load(init_dir);
                //var starter = required(t_init);
                //init_objects[t_init] = {product_id : products[i], starter: required(t_init), location: FileSystem(init_dir, path: t_init};
                init_objects[t_init] = {product_id : id, starter: required(t_init), location: FileSystem.Directory(t_init), path: t_init};
            }

            Log("Calling processor of the " + t_init);
            //cb(init_objects[t_init].starter, t_init, init_objects[t_init].product_id);
            cb(init_objects[t_init]);
            Log("Calling processor of the " + t_init + " done");
        }

        Log("### processing of other cached products done");
        Log("###############################################################");
    }

    var LoadCachedProductInputParamsIsValid = function(init_obj)
    {
        if(!init_obj)
        {
            Log("LoadCachedProductInputParamsIsValid: init_obj isn't defined");
            return false;
        }

        var product_id = init_obj.product_id;

        if(!init_obj.product_id)
        {
            Log("LoadCachedProductInputParamsIsValid: product_id isn't defined");
            return false;
        }

        if(current_prod && typeof(current_prod.Id) == "function" && product_id == current_prod.Id())
        {
            Log("LoadCachedProductInputParamsIsValid: Found cache for current product " + product_id + " skip it from loading.");
            return false;
        }

        return true;
    }
       

    // function expects initi_obj which should have members starter, product_id and location
    // peoduct_id will be used to load db info for certain product
    //var LoadCachedProductDBInfo = function(init_obj)
    var LoadCachedProductDBInfo = function(init_obj)
    {
        if(!LoadCachedProductInputParamsIsValid(init_obj))
        {
            return;
        }

        var product_id = init_obj.product_id;
        var starter = init_obj.starter;

        if(starter && starter.Cache && typeof(starter.Cache) == "function")
        {
            Log("LoadCachedProductDBInfo: Load cached products: list of groups to load: " + FullListOfGroupsToLoad());

            if(typeof(starter.BelongToGroupsList) == "function" && !starter.BelongToGroupsList(FullListOfGroupsToLoad()))
            {
                Log("LoadCachedProductDBInfo: this product doesn't belong to groups list. Ignore.");
                return;
            }
            
            if(product_id.match(/_2018_/i) || product_id.match(/_2017_/i) || product_id.match(/_2016_/i) || product_id.match(/_2015_/i))
            {
                Log("LoadCachedProductDBInfo: 2015, 2016, 2017, 2018 products must be loaded from the cache");
                return;
            }


            safecall(function()
            {
                /*
                if(typeof(starter.DB) == "function")
                {
                    // there is DB method in starter
                    ns_inst.Installer.LoadDBInfo.SubscribeOnBegin(function() { Log("loading from db (via cached product's starter) product: " + product_id); return starter.DB(product_id, init_obj.location);});
                }
                else
                {
                */
                // Loading via another starter cuases execution all their scripts
                // to prevent it loading DBInfoProducts by these scripts
                ns_inst.Installer.LoadDBInfo.SubscribeOnBegin(function() { Log("LoadCachedProductDBInfo: loading from db (via start product's starter) product: " + product_id); return ns.DB(product_id, init_obj.location);});
                //}
            }, function() {Log(Log.l_error, "LoadCachedProductDBInfo: Exception handled loading cached product db_info");});
        }
        else
        {
            Log("incoming object or object.Cache isn't defined or object.Cache not a function");
        }
    }

    // function expects init object (object from init.js) as input parameter and launches Cache function from it
    var LoadCachedProduct = function(init_obj)
    {
        if(!LoadCachedProductInputParamsIsValid(init_obj))
        {
            return;
        }

        var product_id = init_obj.product_id;
        var starter = init_obj.starter;

        if(starter && starter.Cache && typeof(starter.Cache) == "function")
        {
            Log("Load cached products: list of groups to load: " + FullListOfGroupsToLoad());

            if(typeof(starter.BelongToGroupsList) == "function" && !starter.BelongToGroupsList(FullListOfGroupsToLoad()))
            {
                Log("this product doesn't belong to groups list. Ignore.");
                return;
            }
            
            if(loaded_products[product_id] == 1)
            {
                Log("this product was already loaded. Ignore.");
                return;
            }

            // Loading strings sources for other cached product
            StringList.Load(FileSystem.Parent(init_obj.path));

            safecall(function() {starter.Cache(false, FullListOfGroupsToLoad(), "second_load_stage");},
                     function() {Log(Log.l_error, "Exception handled calling init.Cache method");});
            loaded_products[product_id] = 1;
        }
        else
        {
            Log("incoming object or object.Cache isn't defined or object.Cache not a function");
        }
    }
    
    //function loads only whose products that are not presented in db
    var LoadNotPresentedInDB = function(init_obj)
    {
        if(!LoadCachedProductInputParamsIsValid(init_obj))
        {
            return;
        }

        var product_id = init_obj.product_id;
        var starter = init_obj.starter;

        if(starter && starter.Cache && typeof(starter.Cache) == "function")
        {
            Log("Load products not presented in db: list of groups to load: " + FullListOfGroupsToLoad());

            if(typeof(starter.BelongToGroupsList) == "function" && !starter.BelongToGroupsList(FullListOfGroupsToLoad()))
            {
                Log("this product doesn't belong to groups list. Ignore.");
                return;
            }
            
            //check if product wasn't loaded from DB
            

            // Loading strings sources for other cached product
            StringList.Load(FileSystem.Parent(init_obj.path));
            
            safecall(function()
            {

                ns_inst.Installer.LoadDBInfo.SubscribeOnEnd(function() 
                { 
                    //DbInfo should be filled to this moment
                    if(!filter(ns_inst.Installer.DBInfo.Products, function(el, id) {if(id == product_id) return true;}))
                    {
                        Log("LoadNotPresentedInDB: loading not presented product: " + product_id); 
                        if(loaded_products[product_id] == 1)
                        {
                            Log("this product was already loaded. Ignore.");
                            return;
                        }
                        starter.Cache(false, FullListOfGroupsToLoad(), "first_load_stage");
                        var p = ns_inst.Installer.Products[product_id];
                        if(!p)
                        {
                            Log("ERROR: product " + product_id + " wasn't created");
                            return;
                        }
                        Log(" >>> Setting Installed for MICL, IS, ARP, init.js")
                        if(p.MICL)
                            p.MICL.State(p.state_t.installed);
                        if(p.IS)
                            p.IS.State(p.state_t.installed);
                        if(p.ARP)
                            p.ARP.State(p.state_t.installed);
                        loaded_products[product_id] = 1;
                    }
                });
            }, function() {Log(Log.l_error, "LoadNotPresentedInDB: Exception handled loading cached product db_info");});
        }
        else
        {
            Log("incoming object or object.Cache isn't defined or object.Cache not a function");
        }
    }

    // function expects init object (object from init.js) as input parameter and launches Media function from it
    var LoadMediaProduct = function(init_obj)
    {
        if(!init_obj)
        {
            Log("LoadMediaProduct: init_obj isn't defined");
            return;
        }

        var starter = init_obj.starter;
        var product_id = init_obj.product_id;

        if(starter && starter.Media && typeof(starter.Media) == "function")
        {
            Log("Load media products: list of groups to load: " + FullListOfGroupsToLoad());

            if(typeof(starter.BelongToGroupsList) == "function" && !starter.BelongToGroupsList(FullListOfGroupsToLoad()))
            {
                Log("this product doesn't belong to groups list. Ignore.");
                return;
            }
            
            if(loaded_products[product_id] == 1)
            {
                Log("this product was already loaded. Ignore.");
                return;
            }

            // Loading strings sources for other Media product
            StringList.Load(FileSystem.Parent(init_obj.path));

            safecall(function() {starter.Media(false, FullListOfGroupsToLoad(), "first_load_stage");},
                     function() {Log(Log.l_error, "Exception handled calling init.Media method");});
            loaded_products[product_id] = 1;
        }
        else
        {
            Log("incoming object or object.Media isn't defined or object.Media not a function");
        }
    }

    // all_groups_to_load_list contains object with two fields
    // list - list of groups to load
    // skip - skip this list from further merging
    //var all_groups_to_load_list = [];
    // function expects init object as input parameter, takes list of groups to load from it and add corresponding object into all_groups_to_load_list
    var GetListOfGroupsToLoadFromInitObject = function(init_obj)
    {
        if(!init_obj)
        {
            Log("GetListOfGroupsToLoadFromInitObject: init_obj isn't defined");
            return;
        }

        var starter = init_obj.starter;
        var product_id = init_obj.product_id;
        var starter_path = init_obj.path;

        if(starter && starter.LoadGroupsList && typeof(starter.LoadGroupsList) == "function")
        {
            if(!starter.BelongToGroupsList && starter_path)
            {   // init object doesn't have BelongToGroupsList seems it is old product
                // try to find this function in its load_xml.js
                Log("GetListOfGroupsToLoadFromInitObject: load groups_list from " + starter_path + " it doesn't have BelongToGroupsList function, will try to find it");
                var ns_other_load_cfg = required(path("load_xml.js", FileSystem.Directory(starter_path)));
                if(!ns_other_load_cfg || !ns_other_load_cfg.LoadConfig || !ns_other_load_cfg.LoadConfig())
                {
                    Log(Log.l_error, "GetListOfGroupsToLoadFromInitObject: Can't get loading configuration from it, will just take GroupsList from it.");
                }

                var other_load_cfg = ns_other_load_cfg.LoadConfig();
                starter.BelongToGroupsList = other_load_cfg.BelongToGroupsList;
            }
            //fix the bug when BelongToGroupsList is equal to LoadGroups
            if(starter.BelongToGroupsList == "function (){ return load_groups;}")
            {
                Log(Log.l_warning, "BelongToGroupsList is incorrect. Replacing it with the empty function");
                starter.BelongToGroupsList = function(groups_list)
                {
                    if(!groups_list)
                    {
                        Log("load_xml::LoadConfig::BelongToGroupsList: incoming groups list is undefined");
                        return false;
                    }
                    
                    var GroupName = function()
                    {
                        if(product_id.match(/_2018_/i))
                            return "parallel_studio_xe_2018";
                        if(product_id.match(/_2017_/i))
                            return "parallel_studio_xe_2017";
                        if(product_id.match(/_2016_/i))
                            return "parallel_studio_xe_2016";
                        if(product_id.match(/_2015_/i))
                            return "parallel_studio_xe_2015";
                        
                        return "unknown group";
                    }

                    Log("load_xml::LoadConfig::BelongToGroupsList: incoming groups list = \"" + groups_list + "\" own group = " + GroupName());

                    var arr = groups_list.split(";");

                    for(var i in arr)
                        if(String(arr[i]).toLowerCase() == String(GroupName()).toLowerCase())
                            return true;

                    Log("load_xml::LoadConfig::BelongToGroupsList: it doesn't belong to groups_list");
                    return false;
                }
            }
            safecall(function()
                     {
                         if(typeof(starter.BelongToGroupsList) == "function" && !starter.BelongToGroupsList(FullListOfGroupsToLoad()))
                         {
                            return;
                         }
                         FullListOfGroupsToLoad.Add(starter.LoadGroupsList());
                         //all_groups_to_load_list.push({list : starter.LoadGroupsList(), skip : 0});
                     },
                     function() {Log(Log.l_error, "Exception handled calling init.LoadGroupsList method");});
        }
        else
        {
            Log("incoming object or object.LoadGroupsList isn't defined or object.LoadGroupsList not a function");
        }
    };
    //###############################################################
    var mediaconfig = path(mediaconfig_name, Origin.Directory());

    var GetMediaConfigObject = function()
    {
        if(FileSystem.Exists(mediaconfig))
            return required(mediaconfig);
        return 0;
    }

    var filter = function(col, cb)
    {
        for(var i in col)
            if(cb(col[i], i))
                return true;
        return false;
    }

    var iterate = function(str, cb)
    {
        if(str)
        {
            var items = str.split(";");
            for(var i in items)
                if(cb(items[i]))
                 return true;
        }
    }

    // function finds init files from the folders located on the same level as current one
    // in case of loading from media - all folders near to config.
    // and lunches provided callback with init object received (via required(init_file)) from each found init file (except of the current one) as 1st parameter
    // and full path to this inti as 2nd
    var ProcessOtherInitFiles= function(cb)
    {
        var me = Origin();

        var stdir = FileSystem.AbsPath(Origin.Directory(), "../");
        // calling cb for every found entry
        filter(FileSystem.FindFiles(stdir, "*"), function(mconf)
        {
            var t_init = FileSystem.AbsPath(stdir, mconf + "/" + init_name);
            if(FileSystem.Exists(t_init) && !FileSystem.IsDirectory(t_init) && !FileSystem.Same(me, t_init))
            {
                if(!init_objects[t_init])
                {
                    //StringList.Load(path(products[i], cache_dir));
                    init_objects[t_init] = {product_id : mconf, starter: required(t_init), location: FileSystem.AbsPath(stdir, mconf)};
                }

                Log("Processing nested script: " + t_init);
                //cb(init_objects[t_init].starter, t_init);
                cb(init_objects[t_init]);
                Log("Processing nested script: " + t_init + " done");
            }
        });
    }
    // Manager of full list of groups
    var full_groups_list = [];
    var full_groups_list_str = "";

    var FullListOfGroupsToLoad = function()
    {
        return full_groups_list_str;
    }

    FullListOfGroupsToLoad.Add = function(list)
    {
        if(!list)
            return;

        iterate(list, function(el){ if(full_groups_list.indexOf(el) == -1) full_groups_list.push(el); });
        full_groups_list_str = full_groups_list.join(";");
    }
    
    FullListOfGroupsToLoad.Clear = function()
    {
        full_groups_list = [];
        full_groups_list_str = "";
    }
    // Adding current init groups list into array
    FullListOfGroupsToLoad.Add(load_cfg.LoadGroupsList());
    //###############################################################
    // function which provides an ability to calculate num of cached products to load
    var cached_products_counter = 0;
    var CountCachedProductToLoad = function(init_obj)
    {
        if(!LoadCachedProductInputParamsIsValid(init_obj))
            return;

        var starter = init_obj.starter;

        if(starter && starter.Cache && typeof(starter.Cache) == "function")
        {
            if(typeof(starter.BelongToGroupsList) == "function" && !starter.BelongToGroupsList(FullListOfGroupsToLoad()))
            {
                Log("this product doesn't belong to groups list. Ignore.");
                return;
            }
            cached_products_counter++;
        }
    }

    //###############################################################
    // definition of the object API

    this.LoadGroupsList = load_cfg.LoadGroupsList;
    this.BelongToGroupsList = load_cfg.BelongToGroupsList;

    // load_stage parameter determines the stage on which product will be loaded (when the LoadContent and SetRelations are called)
    this.Media = function(start, _list_of_groups_to_load, load_stage)
    {
        Log("Media init starting... Start: " + start);

        if(Splash.Canceled())
            return ns_enums.exitcode_t.canceled;

        if(start)
            splash();

        if(Splash.Canceled())
            return ns_enums.exitcode_t.canceled;

        if(start)
        {
            StringList.Replace("WpfHotKey", StringList.Format("_"));

            Log("Collecting list of groups to load from other init files");

            ProcessOtherInitFiles(GetListOfGroupsToLoadFromInitObject); // process init.js from bundled products
            ProcessCachedProducts(GetListOfGroupsToLoadFromInitObject); // process init.js from cached products

            //customize
            if (ns_custom_load && ns_custom_load.CustomizeGroups)
                ns_custom_load.CustomizeGroups(FullListOfGroupsToLoad);

            Log("Collecting list of groups to load from other init files done");
            Log("Load list = " + FullListOfGroupsToLoad());
        }

        var m_config = GetMediaConfigObject();
        if(m_config && typeof(m_config.Media) == "function")
        {
            /*
            current_prod = safecall(function(){return m_config.Media(start, _list_of_groups_to_load ? _list_of_groups_to_load : FullListOfGroupsToLoad(), load_stage ? load_stage : "first_load_stage");},
                     function(){Log(Log.l_error, "Exception handled calling mediaconfig"); return Action.r_error;});
            */
            safecall(function(){current_prod = m_config.Media(start, _list_of_groups_to_load ? _list_of_groups_to_load : FullListOfGroupsToLoad(), load_stage ? load_stage : "first_load_stage"); return current_prod;},
                     function(){Log(Log.l_error, "Exception handled calling mediaconfig"); return Action.r_error;});

        }
        else
        {
            Log(Log.l_warning, "Could not find starting script");
            return ns_enums.exitcode_t.failed;;
        }

        if(!current_prod)
        {
            Log(Log.l_warning, "Can't create product from mediaconfig!");
            return ns_enums.exitcode_t.failed;;
        }

        if(Splash.Canceled())
        {
            Log("Canceled");
            return ns_enums.exitcode_t.canceled;
        }

        if(start)
        {
            Log("Processing Media start scenario");

            ProcessOtherInitFiles(LoadMediaProduct);
            //altered database - not all products are presented in the db
            ProcessCachedProducts(LoadCachedProductDBInfo); // assigns callbacks for loading cached products db info

            if(Splash.Canceled())
                return ns_enums.exitcode_t.canceled;

            ns_inst.Installer.GetNumOfRequiredCachedProducts = function()
            {
                cached_products_counter = 0;
                ProcessCachedProducts(CountCachedProductToLoad);

                Log("GetNumOfRequiredCachedProducts num = " + cached_products_counter);
                return cached_products_counter;
            }

            ns_inst.Installer.LoadRequiredCachedProducts = function()
            {
                if(!ns_inst.Installer.LoadRequiredCachedProducts.is_completed)
                {
                    Log("executing ns_inst.Installer.LoadRequiredCachedProducts");
                    ns_inst.Installer.LoadRequiredCachedProducts.is_completed = true;
                    ProcessCachedProducts(LoadCachedProduct);
                }
            }

            ns_inst.Installer.LoadRequiredCachedProducts.is_completed = false;
            
            //altered database - loading from the cache is required
            ProcessCachedProducts(LoadNotPresentedInDB);

            if(m_config && typeof(m_config.Go) == "function")
            {
                return safecall(function(){return m_config.Go();},
                         function(){Log(Log.l_error, "Exception handled calling mediaconfig.Go"); return Action.r_error;});
            }
        }
    }
    // load_stage parameter determines the stage on which product will be loaded (when the LoadContent and SetRelations are called)
    this.Cache = function(start, _list_of_groups_to_load, load_stage)
    {
        Log("Cache init starting... Start: " + start);

        if(Splash.Canceled())
            return ns_enums.exitcode_t.canceled;

        if(start)
            splash_for_modify();

        if(Splash.Canceled())
            return ns_enums.exitcode_t.canceled;

        if(start)
        {
            StringList.Replace("WpfHotKey", StringList.Format("_"));

            Log("Collecting list of groups to load from other init files");

            ProcessCachedProducts(GetListOfGroupsToLoadFromInitObject); // process init.js from cached products
            //altered database - not all products are presented in the db
            
            //customize
            if (ns_custom_load && ns_custom_load.CustomizeGroups)
                ns_custom_load.CustomizeGroups(FullListOfGroupsToLoad);
            
            ProcessCachedProducts(LoadCachedProductDBInfo); // assigns callbacks for loading cached products db info
            Log("Collecting list of groups to load from other init files done");
        }

        var m_config = GetMediaConfigObject();
        if(m_config && typeof(m_config.Cache) == "function")
        {
            /*
            current_prod = safecall(function(){return m_config.Media(start, _list_of_groups_to_load ? _list_of_groups_to_load : FullListOfGroupsToLoad(), load_stage ? load_stage : "first_load_stage");},
                     function(){Log(Log.l_error, "Exception handled calling mediaconfig"); return Action.r_error;});
            */
            safecall(function(){current_prod = m_config.Cache(start, _list_of_groups_to_load ? _list_of_groups_to_load : FullListOfGroupsToLoad(), load_stage ? load_stage : "first_load_stage"); return current_prod;},
                     function(){Log(Log.l_error, "Exception handled calling mediaconfig"); return Action.r_error;});

        }
        else
        {
            Log(Log.l_warning, "Could not find starting script");
            return ns_enums.exitcode_t.failed;
        }

        if(!current_prod)
        {
            Log(Log.l_warning, "Can't create product from mediaconfig!");
            return ns_enums.exitcode_t.failed;
        }


        if(Splash.Canceled())
            return ns_enums.exitcode_t.canceled;

        if(start)
        {
            Log("Processing Cache start scenario");

            if(Splash.Canceled())
                return ns_enums.exitcode_t.canceled;

            ns_inst.Installer.GetNumOfRequiredCachedProducts = function()
            {
                cached_products_counter = 0;
                ProcessCachedProducts(CountCachedProductToLoad);

                Log("GetNumOfRequiredCachedProducts num = " + cached_products_counter);
                return cached_products_counter;
            }
            //ProcessCachedProducts(LoadCachedProduct);
            ns_inst.Installer.LoadRequiredCachedProducts = function()
            {
                if(!ns_inst.Installer.LoadRequiredCachedProducts.is_completed)
                {
                    Log("executing ns_inst.Installer.LoadRequiredCachedProducts");
                    ns_inst.Installer.LoadRequiredCachedProducts.is_completed = true;
                    ProcessCachedProducts(LoadCachedProduct);
                }
            }

            ns_inst.Installer.LoadRequiredCachedProducts.is_completed = false;
            
            //altered database - loading from the cache when the product is not presented in the database
            ProcessCachedProducts(LoadNotPresentedInDB);

            if(m_config && typeof(m_config.Go) == "function")
            {
                return safecall(function(){return m_config.Go();},
                                function(){Log(Log.l_error, "Exception handled calling mediaconfig.Go"); return Action.r_error;});
            }
        }
    }

    // Function which is responsible for creating DBInfoProduct object
    // first parameter is product_id, the second one is the folder with product's configs
    this.DB = function(product_id, config_location)
    {
        Log("init.js - DB Info object creation");

        var m_config = GetMediaConfigObject();
        if(m_config && typeof(m_config.DB) == "function")
        {
            //
            return safecall(function(){return m_config.DB(product_id, config_location);},
                            function(){Log(Log.l_error, "Exception handled calling mediaconfig"); return Action.r_error;});
        }
        else
        {
            Log(Log.l_warning, "Could not find starting script");
            return ns_enums.exitcode_t.failed;
        }
    }
}
