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


// This file contains definition for:
//  enum install_scope_t
//  class Installer
//###############################################################
Namespace("Root.installer", function()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};
    
    var ns_dump  = load("dumper.js");
    var ns_enums = load("enums.js");
    var ns_exec  = load("executor.js");
    var ns_inst  = null;
    if(typeof(Duktape) == "object")
        ns_inst  = load("install_duk.js");
    else
        ns_inst  = load("install.js");

    var ns_event = load("event.js");
    var ns_cont  = load("container.js");
    var ns_meth  = load("method.js");
    var ns_prop  = load("property.js");
    var db_mgr = load("database_manager.js");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };
    var P = function(val){return ns_prop.Property(val);}

    var rp_hive = "RestorePoint::";
    //###############################################################
    // Installer class
    //###############################################################
    this.Installer = this.Installer || new function()
    {
        ns_enums.BindTo(this);

        var ns = this;

        this.Log = log_helper("Installer : ");
        this.Products   = {};
        this.Features   = {};
        this.Components = {};
        this.Groups     = {};
        this.ObjectsToUpgrade = [];
        this.UDumper = ns_dump.Dumper("Uninstaller");
        this.IDumper = ns_dump.Dumper("Installer");

        this.OnApplyUpgradeDone = new ns_event.Event(this);
        this.OnApplyRemoveDone = new ns_event.Event(this);
        this.OnApplyInstallDone = new ns_event.Event(this);
        this.OnApplyRepairDone = new ns_event.Event(this);

        this.DownloadDumper = ns_dump.Dumper("Downloader");

        this.ResetActs  = [];
        this.start_product = null;
        this.m_install_mode = this.install_mode_t.install;
        this.m_setup_type   = this.setup_type_t.setup_default;
        this.m_install_dir  = "";
        this.m_online_installer_ind = null;
        this.m_download_dir = "";
        
        this.Downloader = {};
        this.Downloader.Products   = {};
        this.Downloader.Features   = {};
        this.Downloader.Components = {};

        this.DBInfo = {};
        this.DBInfo.Products   = {};
        this.DBInfo.Features   = {};
        this.DBInfo.Components = {};
        var reboot_reasons = [];
        
        //###############################################################
        this.Clean = function()
        {
            this.Products   = {};
            this.Features   = {};
            this.Components = {};
            this.Groups     = {};
            this.ObjectsToUpgrade = [];
            this.UDumper = ns_dump.Dumper("Uninstaller");
            this.IDumper = ns_dump.Dumper("Installer");

            this.OnApplyUpgradeDone = new ns_event.Event(this);
            this.OnApplyRemoveDone = new ns_event.Event(this);
            this.OnApplyInstallDone = new ns_event.Event(this);

            this.DownloadDumper = ns_dump.Dumper("Downloader");

            this.ResetActs  = [];
            this.start_product = null;
            this.m_install_mode = this.install_mode_t.install;
            this.m_setup_type   = this.setup_type_t.setup_default;
            this.m_install_dir  = "";
            this.m_online_installer_ind = null;
            this.m_download_dir = "";
            this.analize_configuration_was_done = false;
            this.DownloadOnly(false);
            this.InstallationDenied(false);
            this.RebootRequired(false);
            this.FromMedia(false);
            reboot_reasons = [];
        }
        //###############################################################
        this.InstallMode = function()
        {
            if(arguments[0])
                this.m_install_mode = arguments[0];

            return this.m_install_mode;
        }
        //###############################################################
        this.SetupType = function()
        {
            if(arguments[0])
                this.m_setup_type = arguments[0];

            return this.m_setup_type;
        }
        //###############################################################
        this.OnlineInstaller = function()
        {
            if (this.m_online_installer_ind === null)
            {
                var offline_installation_ind = "offline_installation.ind";
                var from_config = function(name) {return FileSystem.MakePath(name, base_script_dir + "..");};
                this.m_online_installer_ind = !FileSystem.Exists(from_config(offline_installation_ind));
            }

            return this.m_online_installer_ind && this.FromMedia();
        }
        //###############################################################
        this.FromMedia = P(false);

        //###############################################################
        this.InstallationDenied = P(false);
        //###############################################################
        this.DownloadOnly = P(false);
        this.TypeProgress = P("GlobalProgress");
        this.NotDownload = P(!this.DownloadOnly());
        this.NotDownload.Transform = function(val){return !val;}
        this.DownloadOnly.Subscribe(this.NotDownload);
        //###############################################################
        this.RebootRequired = P(false);
        
        this.RebootReasons = function()
        {
            return reboot_reasons;
        }
        
        this.RebootReasons.Add = function(reason)
        {
            if(reboot_reasons.indexOf(reason) == -1)
               {
                 reboot_reasons.push(reason);
               } 
            else Log("reboot_reasons have already contained reason");
        }
        //###############################################################
        this.DownloadDir = function(val)
        {
            if(typeof(val) != "undefined")
                this.m_download_dir = val;

            return this.m_download_dir;
        }
        //###############################################################
        this.Silent = function()
        {
            var scmd = GetOpt.GetRaw(1);
            if(scmd == "install" || scmd == "modify" || scmd == "repair" || scmd == "remove" || GetOpt.Exists("silent") || GetOpt.Exists("status"))
                return true;

            return false;
        };

        //###############################################################
        this.OutputFile = function()
        {
            var output_file = GetOpt.Get("output");
            var f_not_defined = function(){Log(Log.l_warning, "Installer.OutputFile.Read: file isn't defined ");};

            var f = {};
            f.Name = function() { return output_file; };
            f.Read = function()
            {
                if(!output_file)
                {
                    f_not_defined();
                    return;
                }

                return FileSystem.ReadFileUTF8(output_file, true);
            };

            f.Write = function(mes)
            {
                if(!output_file)
                {
                    f_not_defined();
                    return false;
                }

                return FileSystem.WriteFileUTF8(output_file, mes);
            };

            f.Append= function(mes)
            {
                if(!output_file)
                {
                    f_not_defined();
                    return false;
                }

                var cnt = FileSystem.ReadFileUTF8(output_file, true);
                return FileSystem.WriteFileUTF8(output_file, cnt  ? (cnt + "\r\n" + mes) : mes);
            };

            f.Clear = function()
            {
                if(!output_file)
                {
                    f_not_defined();
                    return false;
                }

                FileSystem.WriteFileUTF8(output_file, "");
            }

            return f;
        }
        //###############################################################
        this.InstallDir = function()
        {
            if(arguments[0])
                this.m_install_dir = arguments[0];

            return this.m_install_dir;
        }
        //###############################################################
        var not_first_product = false;
        this.AddProduct = function(p)
        {
            if(!p)
            {
                this.Log("AddProduct - product is undefined");
                return false;
            }

            if(!p.Id || !p.Id())
            {
                this.Log("AddProduct - product Id() is undefined");
                return false;
            }

            this.Log("AddProduct id= " + p.Id());
            if(not_first_product)
            {
                p.ProductState = function(){ return p.state_t.installed;}
            }
            else
            {
                not_first_product = true;
            }

            if(!this.Products[p.Id()])
                this.Products[p.Id()] = p;
            else
                this.Log("Product already exists");

            return true;
        }
        //###############################################################
        this.AddFeature = function(f)
        {
            if(!f)
            {
                this.Log("AddFeature - feature is undefined");
                return false;
            }

            if(!f.Id || !f.Id())
            {
                this.Log("AddFeature - feature Id() is undefined");
                return false;
            }

            this.Log("AddFeature id= " + f.Id());

            if(!this.Features[f.Id()])
                this.Features[f.Id()] = f;
            else
                this.Log("Feature already exists");

            return true;
        }
        //###############################################################
        this.AddComponent = function(c)
        {
            if(!c)
            {
                ns.Log("AddComponent - component is undefined");
                return false;
            }

            if(!c.Id || !c.Id())
            {
                ns.Log("AddComponent - component Id() is undefined");
                return false;
            }

            ns.Log("AddComponent id= " + c.Id());

            if(!ns.Components[c.Id()])
                ns.Components[c.Id()] = c;
            else
                ns.Log("Component already exists");

            return true;
        }
        
        //###############################################################        
        this.Downloader.AddProduct = function(p)
        {
            if(!p)
            {
                this.Log("Downloader.AddProduct - product is undefined");
                return false;
            }

            if(!p.Id || !p.Id())
            {
                this.Log("Downloader.AddProduct - product Id() is undefined");
                return false;
            }

            this.Log("Downloader.AddProduct id= " + p.Id());

            if(!ns.Downloader.Products[p.Id()])
                ns.Downloader.Products[p.Id()] = p;
            else
                this.Log("Downloader: Product already exists");

            return true;
        }
        //###############################################################
        this.Downloader.AddFeature = function(f)
        {
            if(!f)
            {
                this.Log("Downloader.AddFeature - feature is undefined");
                return false;
            }

            if(!f.Id || !f.Id())
            {
                this.Log("Downloader.AddFeature - feature Id() is undefined");
                return false;
            }

            this.Log("Downloader.AddFeature id= " + f.Id());

            if(!ns.Downloader.Features[f.Id()])
                ns.Downloader.Features[f.Id()] = f;
            else
                this.Log("Downloader: Feature already exists");

            return true;
        }
        //###############################################################
        this.Downloader.AddComponent = function(c)
        {
            if(!c)
            {
                ns.Log("Downloader.AddComponent - component is undefined");
                return false;
            }

            if(!c.Id || !c.Id())
            {
                ns.Log("Downloader.AddComponent - component Id() is undefined");
                return false;
            }

            ns.Log("Downloader.AddComponent id= " + c.Id());

            if(!ns.Downloader.Components[c.Id()])
                ns.Downloader.Components[c.Id()] = c;
            else
                ns.Log("Downloader: Component already exists");

            return true;
        }
        //###############################################################
        
        this.DBInfo.AddProduct = function(p)
        {
            if(!p)
            {
                ns.Log("DBInfo.AddProduct - product is undefined");
                return false;
            }

            if(!p.Id || !p.Id())
            {
                ns.Log("DBInfo.AddProduct - product Id() is undefined");
                return false;
            }

            ns.Log("DBInfo.AddProduct id= " + p.Id());

            if(!ns.DBInfo.Products[p.Id()])
                ns.DBInfo.Products[p.Id()] = p;
            else
                ns.Log("Product already exists");

            return true;
        };
        //###############################################################
        this.DBInfo.AddComponent = function(c)
        {
            if(!c)
            {
                ns.Log("DBInfo.AddComponent - component is undefined");
                return false;
            }

            if(!c.Id || !c.Id())
            {
                ns.Log("DBInfo.AddComponent - component Id() is undefined");
                return false;
            }

            ns.Log("DBInfo.AddComponent id= " + c.Id());

            if(!ns.DBInfo.Components[c.Id()])
                ns.DBInfo.Components[c.Id()] = c;
            else
                ns.Log("Component already exists");

            return true;
        };
        //###############################################################
        // load_filter_function - should determine to load product or not
        //
        this.LoadDBInfo = ns_meth.Method(function()
        {
            filter(this.DBInfo.Products, function(p)
            {
                if(!p.LoadMarkers)
                    p.LoadMarkers = {};
            });

            // checking of LoadMarkers and LoadMarkers.LoadContentDone and LoadMarkers.SetRelationsDone for old products which don't have SetRelations.Done or LoadContent.Done
            filter(this.DBInfo.Products, function(p)
            {
                ns.Log("Load content (db) for p.id = " + p.Id());
                if(p && p.LoadContent)
                {
                    if(typeof(p.LoadContent.Done) != "function" && p.LoadMarkers && p.LoadMarkers.LoadContentDone)
                    {
                        ns.Log("LoadContent was already done for p.id = " + p.Id() + ". Skipped.");
                        return;
                    }

                    p.LoadContent();

                    if(p.LoadMarkers)
                        p.LoadMarkers.LoadContentDone = true;
                }
            });

            filter(this.DBInfo.Products, function(p)
            {
                if(p && p.SetRelations)
                {
                    if(typeof(p.SetRelations.Done) != "function" && p.LoadMarkers && p.LoadMarkers.SetRelationsDone)
                    {
                        ns.Log("SetRelations was already done for p.id = " + p.Id() + ". Skipped.");
                        return;
                    }
                    ns.Log("Set relations (db) for p.id = " + p.Id());
                    p.SetRelations();
                    ns.Log("Set relations (db) done for p.id = " + p.Id());
                    if(p.LoadMarkers)
                        p.LoadMarkers.SetRelationsDone = true;
                }
            });
            return true;
        });

        //###############################################################
        this.AddResetAction = function (act)
        {
            if (!act)
            {
                ns.Log(Log.l_warning, "request for adding empty action to Installer.ResetActs. Ignore.");
                return false;
            }

            this.ResetActs.push(act);

            return true;
        };
        //###############################################################
        this.AddObjectToUpgrade = function (obj)
        {
            if (!obj)
            {
                ns.Log(Log.l_warning, "request for adding empty obj to Installer.ObjectsToUpgrade. Ignore.");
                return false;
            }

            this.ObjectsToUpgrade.push(obj);

            return true;
        };

        //###############################################################
        this.Reset = function ()
        {
            ns.Log("reset product settings to default");
            for (var i in this.ResetActs)
            {
                this.ResetActs[i]();
            }
        };

        // following function orders objects from input container in required order (taking into consideration desired action)
        // returns back container with objects in required order
        var order_products_for_load = function(cnt, action) { return cnt;}

        this.OrderFunctionForLoad = function(order_function)
        {
            if(order_function && typeof(order_function) == "function")
                order_products_for_load = order_function;

            return order_products_for_load;
        }

        // following function return true if product should be loaded or false in other case
        var filter_products_for_load = function(prod) { return true; }

        this.FilterFunctionForLoad = function(load_filter_function)
        {
            if(load_filter_function && typeof(load_filter_function) == "function")
                filter_products_for_load = load_filter_function;

            return filter_products_for_load;
        }

        //###############################################################
        // GetFilterByLoadStage allows to separate products loading, it is used in Installer.Load function
        //###############################################################
        this.GetFilterByLoadStage = function(_stage)
        {
            return function(p)
            {
                ns.Log("filter products for loading (p.id = " + p.Id()+")");
                if(typeof(_stage) == "undefined" || (p.LoadMarkers && p.LoadMarkers.LoadStage && String(p.LoadMarkers.LoadStage).toLowerCase() == String(_stage).toLowerCase()))
                {
                    ns.Log(" can be loaded");
                    return true;
                }

                ns.Log(" can be skipped");
                return false;
            };
        };
        //###############################################################
        // load_filter_function - should determine to load product or not
        //
        this.Load = function(order_function, load_filter_function)
        {
            var orderer = (order_function && typeof(order_function) == "function") ? order_function : this.OrderFunctionForLoad();
            var load_filter = (load_filter_function && typeof(load_filter_function) == "function") ? load_filter_function : this.FilterFunctionForLoad();

            ns.Log("****************************************************************");
            ns.Log("*********** Installer - Load ***********************************");
            ns.Log("****************************************************************");
            var load_content = orderer(this.Products, "LoadContent");

            filter(this.Products, function(p)
            {
                if(!p.LoadMarkers)
                    p.LoadMarkers = {};
            });

            // checking of LoadMarkers and LoadMarkers.LoadContentDone and LoadMarkers.SetRelationsDone for old products which don't have SetRelations.Done or LoadContent.Done
            filter(load_content, function(p)
            {
                if(Wizard.Canceled())
                    return Action.r_cancel;

                ns.Log("Load content for p.id = " + p.Id());
                if(p && p.LoadContent && load_filter(p))
                {
                    if(typeof(p.LoadContent.Done) != "function" && p.LoadMarkers && p.LoadMarkers.LoadContentDone)
                    {
                        ns.Log("LoadContent was already done for p.id = " + p.Id() + ". Skipped.");
                        return;
                    }

                    p.LoadContent();

                    if(p.LoadMarkers)
                        p.LoadMarkers.LoadContentDone = true;
                }
            });
            ns.Log("****************************************************************");
            ns.Log("*********** Installer - SetRelations ***************************");
            ns.Log("****************************************************************");
            var set_relations = orderer(this.Products, "SetRelations");

            filter(set_relations, function(p)
            {
                if(Wizard.Canceled())
                    return Action.r_cancel;

                if(p && p.SetRelations && load_filter(p))
                {
                    if(typeof(p.SetRelations.Done) != "function" && p.LoadMarkers && p.LoadMarkers.SetRelationsDone)
                    {
                        ns.Log("SetRelations was already done for p.id = " + p.Id() + ". Skipped.");
                        return;
                    }
                    ns.Log("Set relations for p.id = " + p.Id());
                    p.SetRelations();
                    ns.Log("Set relations done for p.id = " + p.Id());
                    if(p.LoadMarkers)
                        p.LoadMarkers.SetRelationsDone = true;
                }
            });
        }
        //###############################################################
        this.AnalizeConfiguration = function()
        {
            if(this.analize_configuration_was_done)
                return;

            this.analize_configuration_was_done = true;

            this.Apply();

            // to have Commit called after Apply;
            var inst_obj = this;
            var dobj = { Commit : function() { return inst_obj.Commit(); } };

            this.IDumper.PostAction().AddAction(dobj, "Installer commit");
        }
        //###############################################################
        var on_start_cb = ns_event.FEvent();
        this.OnStart = function(cb) {on_start_cb.Connect(cb);}
        this.OnRollback = function(cb) {ns_inst.OnRollback(cb);}
        //###############################################################
        this.Execute = function()
        {
            this.Log("Execution begin");

            this.AnalizeConfiguration();

            //this.IDumper.ThreadsNum(1);

            //this.DownloadDumper.ThreadsNum(1);

            var idmp = this.IDumper;

            //var exec = new ns_exec.Create();
            //this.Log("Adding tasks for download");
            //this.DownloadDumper.AddTasksToExecutor(exec);

            //this.Log("Adding tasks for install/remove");
            //idmp.AddTasksToExecutor(exec);

            this.UDumper.Group("Uninstall");
            this.IDumper.PreAction().AddAction(this.UDumper);

            ns_inst.ThreadMap({"Progress2":["Download"]});
            if(on_start_cb)
                on_start_cb(ns_inst.ThreadNum(this.IDumper), ns_inst);

            var res = ns_inst.Process(this.IDumper);

            this.Log("Execution complete res = " + res);
            return res;
        }
        //###############################################################
        //###############################################################
        this.Apply = ns_meth.Method(function()
        {
            var cont = ns_cont.Container();
            filter(this.Products, function(p) {cont.Add(p);}); // create products container

            var self = this;

            this.Log("ApplyUpgrade begin");

            cont.ApplyReverse(function(p) { if(Wizard.Canceled()){ return false; } p.ApplyUpgrade(); return true;}); // use reverse order to create items to remove
            //for(var i in this.Products)
                //this.Products[i].ApplyUpgrade();

            if(Wizard.Canceled())
                return false;

            this.OnApplyUpgradeDone.Call();

            this.Log("ApplyUpgrade complete");

            if(Wizard.Canceled())
                return false;

            this.Log("ApplyRemove begin");
            //for(var i in this.ObjectsToUpgrade)
                //if(this.ObjectsToUpgrade[i].ApplyRemove)
                    //this.ObjectsToUpgrade[i].ApplyRemove(this.UDumper);

            this.Log("  Doing ApplyRemove for each product");

            cont.ApplyReverse(function(p) {if(Wizard.Canceled()){ return false; } p.ApplyRemove(self.UDumper); return true;});
            //for(var i in this.Products)
                //this.Products[i].ApplyRemove(this.UDumper);

            this.Log("  Doing ApplyRemove for each object from ObjectsToUpgrade array");

            filter(this.ObjectsToUpgrade, function(otou)
            {
                if(Wizard.Canceled())
                    return true;

                if(typeof(otou.ApplyRemove) == "function")
                    otou.ApplyRemove(self.UDumper);
            });

            this.OnApplyRemoveDone.Call();

            this.Log("ApplyRemove complete");

            if(Wizard.Canceled())
                return false;

            this.Log("ApplyRepair begin");

            cont.Apply(function(p)
            {
                if(Wizard.Canceled())
                    return false;

                if(typeof(p.ApplyRepair) == "function")
                    p.ApplyRepair(self.IDumper);
                return true;
            });
            //for(var i in this.Products)
                //if(typeof(this.Products[i].ApplyRepair) == "function")
                    //this.Products[i].ApplyRepair(this.IDumper);

            this.OnApplyRepairDone.Call();

            this.Log("ApplyRepair complete");

            if(Wizard.Canceled())
                return false;

            this.Log("ApplyInstall begin");

            cont.Apply(function(p) {if(Wizard.Canceled()){ return false; } p.ApplyInstall(self.IDumper); return true;});
            //for(var i in this.Products)
                //this.Products[i].ApplyInstall(this.IDumper);

            this.OnApplyInstallDone.Call();

            this.Log("ApplyInstall complete");

            return true;
        });
        //###############################################################
        this.Commit =  ns_meth.Method(function()
        {       
            this.Log("Commit begin");
            rp = Storage("*");
            var products_for_commit = [];
            for(var i in this.Products)
            {
                if(this.Products[i].start)
                {                   
                    if(this.Products[i].Commit)
                    {
                        Log("commit for start product:");
                        rp.Load_DB();
                        if(!this.Products[i].Commit())
                             this.Log("product id = " + this.Products[i].Id() + " name = " + this.Products[i].Name() + " caused failure during commit!");
                             
                    }
                    
                    this.Log("Saving in DB");
            
                    rp.Save();
                    rp.Disconnect();
                    products_for_commit = db_mgr.GettingUpgradeProducts(this.Products[i]);
                }
                          
                else if(products_for_commit.length)
                {
                    rp = Storage("*");
                    Log("using products_for_commit for commit");
                    for(var j in products_for_commit)
                    {
                        if(this.Products[i].Name() == products_for_commit[j])
                        {                                                    
                            Log("Name of additional product commit is:" + this.Products[i].Name());
                 
                            rp.Load_DB(db_mgr.GetCommitDB(this.Products[i].Name()));
                            if(!this.Products[i].Commit())
                            {
                                this.Log("product id = " + this.Products[i].Id() + " name = " + this.Products[i].Name() + " caused failure during commit!");
                                
                            }
                                                  
                            this.Log("Saving in certain DB");
            
                            rp.Save_DB(db_mgr.GetCommitDB(this.Products[i].Name()));
                            
                        }
                    }
                    
                    
                }
                
            }
           
            this.Log("Commit complete");

            return true;
        });
    };
}
);
