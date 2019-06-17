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
// This file contains definition for:
//  enum install_mode_t
//  class Product
//###############################################################
//Namespace("Root.product", function()
new function()
{
    var micl_id = "{9560B63A-0C5C-479C-8279-8071F86C00F0}";

    var base_script_dir = Origin.Directory();
    //###############################################################
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_installer = load("installer.js");
    var ns_dump      = load("dumper.js");
    var ns_feature   = load("feature3.js");
    var ns_component = load("component3.js");
    var ns_cmp_inf   = load("component_info.js");
    var ns_arp       = load("component_arp3.js");
    var ns_cmp_micl  = load("component_micl3.js");
    var ns_cmp_is    = load("component_isource3.js");
    var ns_enums     = load("enums.js");
    var ns_container = load("container.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");

    var P = function(val){return ns_prop.Property(val);}
    var PBool = function(val)
    {
      var p = ns_prop.Property(val);
      p.Transform = function(_val){ return _val ? true : false; }
      return p;
    }

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    // look for cache.xml file at product directory first
    var product_cache_xml = FileSystem.MakePath("../" + Cache.config_name, base_script_dir);
    var target_dir = "C:\\DATA\\temp\\_{6789203}_test_installer_folder";
    var rp_hive = "RestorePoint::";
    //###############################################################
    //###############################################################
    var GetStorageChildsExtractor = function(rp)
    {
        var res = {};
        var func = function(name){ return res[name]; }

        if(!rp)
            return func;

        if(typeof(rp.GetChildsAsStringFromPath) != "function")
        {
            func = function(name){ return rp(name).value; }
        }

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            childs_string = String(rp.childs_as_string);
        }

        filter(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                res[arr[0]] = (arr.length > 1) ? arr[1] : null;
        });

        return func;
    }

    var FilterStorageChilds = function(rp, cb)
    {
        var res = {};
        if(!rp || typeof(cb) != "function")
            return;

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            if(typeof(rp.GetChildsAsStringFromPath) == "function")
            {
                // storage binding supports childs serialization
                childs_string = String(rp.childs_as_string);
            }
            else
            {
                // storage binding doesn't supports childs serialization
                filter(rp.childs, function(name)
                {
                    if(cb(name, rp(name).value))
                        return true;
                });

                return;
            }
        }

        filter(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                if(cb(arr[0], (arr.length > 1) ? arr[1] : null))
                    return true;
        });
    }
    //###############################################################
 
    var get_childs_as_string_exists = "undefined";

    var GetChildsAsStringFromPath = function(rp, path)
    {
        if(!rp || !path || typeof(path) == "undefined")
            return "";

        if(get_childs_as_string_exists == "undefined")
            get_childs_as_string_exists = typeof(rp.GetChildsAsStringFromPath) == "function" ? true : false;

        return get_childs_as_string_exists ? rp.GetChildsAsStringFromPath(path) : rp(path);
    }
    //###############################################################

    var ns = this;

    // update micl_id value based on data from config file
    Log(" updating micl_id from cache ");
    var custom_cache = FileSystem.Exists(product_cache_xml);
    var cfg_file = custom_cache ?  product_cache_xml : Cache.Config();
    if(FileSystem.Exists(cfg_file))
    {
        var root = custom_cache ? XML.Parse(FileSystem.ReadFileUTF8(cfg_file, true)) : XML(cfg_file);
        if(root)
        {
            var cfg = root.node("/config/micl[@id]");
            if(cfg)
            {
                var id = cfg.attributes.id;
                if(id)
                {
                    Log("MICL id configured: " + id);
                    micl_id = id;
                }
            }
        }
    }
    Log(" updating micl_id from cache done");

    var ConstP = function(val){return ns_prop.Constant(val);}
    var FilterNotEmpty = function(val)
    {
        if(typeof(val) == "undefined" || val === null)
            return false;

        return true;
    }
    //###############################################################
    // function to define install mode
    //###############################################################
    var GetInstallModeIdentifier = function(prd)
    {
        var res = function()
        {
            if(prd.ProductState() == prd.state_t.installed)
            {
                if((!prd.ImageInstalled() && prd.start && prd.LoadMarkers && prd.LoadMarkers.WasCreatedFromMedia) || ((FileSystem.FindFiles(Cache.CacheDir(), "*")).indexOf(prd.Id()) == -1))
                {
                    //prd.Log("Current product image " + prd.Image() + " isn't installed, but some components of " + prd.Name() + " is already installed");
                    prd.Log("Install mode = install due to current product image " + prd.Image() + " installed = " + prd.ImageInstalled() + " prd.start = " + prd.start + " and prd.LoadMarkers.WasCreatedFromMedia = " + prd.LoadMarkers.WasCreatedFromMedia);
                    prd.InstallMode(prd.install_mode_t.install);
                }
                else
                {
                    prd.Log("Install mode = modify due to current product image " + prd.Image() + " installed = " + prd.ImageInstalled() + " prd.start = " + prd.start + " and prd.LoadMarkers.WasCreatedFromMedia = " + (prd.LoadMarkers || {}).WasCreatedFromMedia);
                    prd.InstallMode(prd.install_mode_t.modify);
                }

                // in case when some images of the product is already installed, installdir should be locked
                //if(prd.ProductState() == prd.state_t.installed)
                //{
                prd.InstallDir.Locked(true, {"Type" : prd.locked_type_t.modify_mode, "Description" : StringList.Format(prd.locked_type_description_t[prd.locked_type_t.modify_mode], prd.Name(), String(prd.InstallDir()).replace(/\\/g, "\\\\"))});
                //}
            }
            else
            {
                if(prd.start && prd.LoadMarkers && prd.LoadMarkers.WasCreatedFromMedia)
                {
                    prd.Log("product isn't installed (none image of this product is already installed)");
                    prd.InstallMode(prd.install_mode_t.install);
                }
                else
                {
                    prd.Log("product isn't installed (none image of this product is already installed), InstallMode = install (left for backward compatibility), but action will be set to none due to prd.start = " + prd.start + " and prd.LoadMarkers.WasCreatedFromMedia = " + (prd.LoadMarkers || {}).WasCreatedFromMedia);
                    prd.InstallMode(prd.install_mode_t.install);
                    prd.Action(prd.action_t.none);
                }
            }
        };
        res.Order = function() {return 0;};
        return res;
    }
    //###############################################################
    /*
    function Transform(args)
    {
        if(args.length == 2 && args[0] && args[1])
        {
            args[1].Id = function(){ return args[0];}
            return args[1];
        }
        else if(args.length == 1)
            return args[0];

        return undefined;
    }
    */
    //###############################################################
    // function to transform storage to object
    //###############################################################
    var storage2object = function(stor)
    {
        if(stor)
        {
            var res = {};
            var childs = stor.childs;
            for(var i in childs)
            {
                var _id = childs[i];
                res[_id] = stor(_id).value;
            }
            return res;
        }

        return {}; // return empty object
    }
    //###############################################################
    // function to transform storage to object recurs
    //###############################################################
    /*
    var storage2object_rec = function(stor)
    {
        if(stor)
        {
            var res = {};
            var childs = stor.childs;

            if(!childs.length)
                return stor.value;

            for(var i in childs)
            {
                var id = childs[i];
                res[id] = storage2object_rec(stor(id));
            }
            return res;
        }

        return {}; // return empty object
    }
    */
    var storage2object_rec = function(stor)
    {
        if(stor)
        {
            var res = {};

            var childs_exist = 0;

            FilterStorageChilds(stor, function(name, val)
            {
                res[name] = storage2object_rec(stor(name));
                //Log("     Load From RP " + name);
                childs_exist = 1;
            });

            if(!childs_exist)
            {
                //Log("     set val = " + stor.value);
                return stor.value;
            }

            return res;
        }

        return {}; // return empty object
    }

    //###############################################################
    // function to restore product members from RP
    //###############################################################
    var LoadFromRP = function(prd, rp)
    {
        prd.Log(" LoadFromRP begin ");
        if(!rp)
        {
            prd.Log("Restore Point isn't defined;");
            return;
        }

        var childs = GetStorageChildsExtractor(rp);

        prd.InstallDir.Base(childs("install_dir_base"));
        prd.InstallDir.Own(childs("install_dir_own"));

        prd.Log(" installdirbase = " + prd.InstallDir.Base());
        prd.Log(" installdirown = " + prd.InstallDir.Own());
        prd.Log(" loading groups for product");

        FilterStorageChilds(GetChildsAsStringFromPath(rp, "ConfigurationOptions"), function(name, val)
        {
            prd.ConfigurationOptions().Add(name, val);
        });

        FilterStorageChilds(GetChildsAsStringFromPath(rp, "CustomProperties"), function(name, val)
        {
            prd.CustomProperties().Value(name, val);
        });

        var objs = rp("CustomObjects");

        FilterStorageChilds(rp("CustomObjects"), function(name, val)
        {
            prd.CustomObjects().Add(name, storage2object_rec(objs(name)));
        });

        FilterStorageChilds(GetChildsAsStringFromPath(rp, "groups"), function(name, val)
        {
            prd.AddToGroup(val);
        });
    }
    //###############################################################
    // class Product
    //###############################################################
    var Product = function(inf)
    {
        var prd = ns_feature.Create(inf);
        //arguments.callee.superclass.constructor.call(this);
        prd.Type("product");
        prd.dumper   = ns_dump.Dumper(null, prd);
        //ns_enums.BindTo(prd);

        prd.Log = log_helper("Product id = " + prd.Id() + ": ");

        prd.Image = P(prd.Id());
        prd.Image.Filter = FilterNotEmpty;
        //prd.curr_image_id =  prd.Id();

        prd.IS = ns_cmp_is.Create({Info : ns_cmp_inf.InfoPure("InstallSource_component_" + prd.Id()) , ISFolder : prd.Id()});
        prd.IS.AddSource(cfg_file);
        prd.IS.Parent(prd);
        prd.MICL = ns_cmp_micl.Create({Info : ns_cmp_inf.InfoPure(micl_id)});
        prd.MICL.Parent(prd);

        //###############################################################
        // Exe which is used for product uninstall
        //###############################################################
        prd.UninstallExe = ConstP(FileSystem.MakePath(FileSystem.exe_name, prd.MICL.TargetDir()));
        //###############################################################
        // Params which is used for product uninstall
        //###############################################################
        prd.UninstallParams = ConstP((GetOpt.Exists("split-cache") ? "--split-cache " : "") + (GetOpt.Exists("require-admin") ? "--require-admin " : "") + (GetOpt.Exists("suppress-admin") ? "--suppress-admin " : "") + "--product=\"" + prd.Id() + "\"");
        prd.UninstallARP = ConstP("--uninstall");
        prd.ModifyARP = ConstP("--modify");
        //###############################################################
        // Full command which is used for product uninstall
        //###############################################################
        prd.UninstallString = ConstP("\"" + prd.UninstallExe() + "\" " + prd.UninstallParams() +" "+ prd.UninstallARP());
        prd.ModifyPath = ConstP("\"" + prd.UninstallExe() + "\" " + prd.UninstallParams() +" "+ prd.ModifyARP());
        prd.ARP = ns_arp.Create({Info : ns_cmp_inf.InfoPure("ARP_cmp_" + prd.Id()), ARPId : "ARP_for_prd_" + prd.Id()});
        prd.ARP.Parent(prd);
        prd.ARP.DisplayName(prd.Id());
        prd.ARP.UninstallString(prd.UninstallString());
        prd.ARP.ModifyPath(prd.ModifyPath());
        prd.commit_to_remove = true; // flag which is changed during apply to false
                                      // if there is reason to leave this product (one of features isn't removed, ...)
                                      // if this flag is false -> product info is stored into db, else -> removed

        prd.InstallMode = P(prd.install_mode_t.install);
        // custom properties
        // custom properties API
        prd.CustomProperties = ConstP(ns_prop_set.PropertySet());
        //prd.CustomObjects = ConstP(ns_container.Container());
        // define install mode as modify if this product's image was already installed
        var rp = Storage("*");

        prd.ContentLoaders = P(ns_container.Container());
        prd.RelationSetters  = P(ns_container.Container());

        prd.ContentLoaders().Log  = log_helper(prd.Log.Prefix() + "ContentLoaders: ");
        prd.RelationSetters().Log = log_helper(prd.Log.Prefix() + "RelationSetters: ");
        prd.CustomObjects().Log   = log_helper(prd.Log.Prefix() + "CustomObjects: ");

        prd.MustBeRemoved = function()
        {
            var cmp_state = prd.State();
            var prd_state = prd.ProductState();
            var act = prd.Action();
            if(act == prd.action_t.remove ||
               (act == prd.action_t.none && (cmp_state == prd.state_t.absent || prd_state == prd.state_t.absent)))
                return true;

            return false;
        }
        //###############################################################
        //
        //###############################################################
        prd.CacheDir = function(){ return prd.IS.TargetDir();}
        //###############################################################
        prd.TopVisible = P(true);
        //###############################################################
        // Returns list of installed product images
        //###############################################################
        var m_images_list = [];
        var m_images_list_defined = false;
        prd.ImagesList = function()
        {
            if(!m_images_list_defined)
            {
                FilterStorageChilds(GetChildsAsStringFromPath(rp, "images"), function(name)
                {
                    m_images_list.push(name);
                });

                m_images_list_defined = true;
            }

            return m_images_list;
        }
        //###############################################################
        //
        //###############################################################
        prd.ImageInstalled = function(_img)
        {
            var image_to_check = _img ? _img : prd.Image();

            if(prd.ImagesList().indexOf(image_to_check) != -1)
            {
                prd.Log(" installed image: " + image_to_check);
                return true;
            }
            return false;
        }
        //###############################################################
        // This function returns state base on the intsalled Product images
        // if the list of the images isn't empty then state is installed (else absent)
        //###############################################################
        prd.ProductState = function()
        {
            prd.Log("Get ProductState");
            if(filter(prd.ImagesList(), function(name)

            {
                prd.Log(" there is installed image: " + name);
                return true;
            }))
            {
                prd.Log("ProductState: installed");
                return prd.state_t.installed;
            }

            prd.Log("ProductState: absent - nothing images of this product are installed");
            return prd.state_t.absent;
        }
        //###############################################################
        // Add product to specified Group
        //###############################################################
        prd.AddToGroup = function (grp_id)
        {
            if(!grp_id)
                return;

            prd.AddGroupIntoGroupsList(grp_id);

            if(prd.ProductState() != prd.state_t.installed)
                return false;

            prd.Log("adding to group " + grp_id);

            if(!ns_installer.Installer.Groups[grp_id])
                ns_installer.Installer.Groups[grp_id] = {};

            var grp = ns_installer.Installer.Groups[grp_id];
            grp[prd.Id()] = prd;

            prd.Groups().Add(grp_id, grp_id);

            return true;
        }
        //###############################################################
        prd.CheckForUpgrade = function ()
        {
            if(prd.Disabled() == prd.disabled_t.yes)
            {
                prd.Log("CheckForUpgrade: product is fully disabled -> check isn't required");
                return;
            }

            prd.Log("CheckForUpgrade: begin");

            if(prd.ProductState() == prd.state_t.installed)
            {
                prd.Log("CheckForUpgrade: product is installed -> check for own upgrade isn't required but check for childs will perform");
            }
            else
            {
                prd.Upgrade().Check();
            }

            prd.Features().Apply(function(el){el.CheckForUpgrade(); return true;});
            prd.Components().Apply(function(el){el.CheckForUpgrade(); return true;});

            prd.Log("CheckForUpgrade: completed");
        }
        //###############################################################
        // DoApplyUpgrade method targeted to be redefinded by descendants
        //###############################################################
        prd.Configurator().Apply.Upgrade.SubscribeOnBegin(function()
        {
            if(prd.ProductState() == prd.state_t.absent)
                prd.Upgrade().Apply();
        });
        //###############################################################
        prd.InstallMode.Subscribe(function(mode)
        {
            // Setting Action for features and components
            if(mode == prd.install_mode_t.install)
            {
                if(prd.MICL)
                    prd.MICL.State(prd.state_t.absent);

                prd.Action(prd.action_t.install);
            }
            else if(mode == prd.install_mode_t.repair)
            {
                prd.Action(prd.action_t.repair);
            }
            else if(mode == prd.install_mode_t.modify)
            {
                if(prd.MICL)
                    prd.MICL.State(prd.state_t.installed);
                prd.Action(prd.action_t.none);
            }
            else if(mode == prd.install_mode_t.remove)
            {
                if(prd.MICL)
                    prd.MICL.State(prd.state_t.installed);
                prd.Action(prd.action_t.remove);
            }

            prd.Refresh();
        });
        prd.InstallMode.Filter(function(mode){if(!mode) return false;});
        //###############################################################
        prd.LoadContent = function ()
        {
            if(prd.LoadContent.Done())
            {
                prd.Log("Load of content was already done. Skipped");
                return;
            }

            prd.Log("LoadContent begin");
            prd.ContentLoaders().Apply(function(el){el.call(prd); return true;});
            prd.Log("LoadContent completed. Checking product state");
            if(prd.ProductState() == prd.state_t.installed)
            {
                prd.Log("Setting state = installed for ARP, MICL & IS components");
                prd.IS.State(prd.state_t.installed);
                prd.ARP.State(prd.state_t.installed);
                prd.MICL.State(prd.state_t.installed);
            }
            prd.LoadContent.Done(true);
            
        };

        prd.LoadContent.Done = PBool(false);
        //###############################################################
        prd.SetRelations = function ()
        {
            if(prd.SetRelations.Done())
            {
                prd.Log("Setting of relations was already done. Skipped");
                return;
            }

            prd.Log("Relations set begin");
            prd.RelationSetters().Apply(function(el){el.call(prd); return true;});
            prd.Log("Relations set completed");

            prd.SetRelations.Done(true);
        };
        prd.SetRelations.Done = PBool(false);
        //###############################################################
        prd.GenerateNodes = function ()
        {
            prd.Log("GenerateNodes");

            var node_from_feature = function(n,f)
            {
                var self = arguments.callee;

                if(!f.Visible())
                    return;

                var nf = n;

                var hidden_prop = f.Info().Property("hidden");

                if(String(hidden_prop) !== "true") //do not create node only if this property is 'true'
                {
                    nf = new Node();

                    f.SetNode(nf);

                    if(n)
                      n.AddChild(nf.guid);
                }
                f.Features().Apply(function(el){self(nf, el); return true;});
            }

            if(prd.TopVisible())
                node_from_feature(null, prd);
            else
                prd.Features().Apply(function(el){node_from_feature(null, el); return true;});

            prd.Refresh();

            prd.Log("GenerateNodes complete");
        }
        //###############################################################
        if(prd.ARP)
        {
            prd.InstallDir.Cascade(prd.ARP.InstallDir);
            prd.Disabled.Cascade(prd.ARP.Disabled);
        }

        if(prd.IS)
        {
            prd.InstallDir.Cascade(prd.IS.InstallDir);
            prd.Disabled.Cascade(prd.IS.Disabled);
        }

        if(prd.MICL)
            prd.Disabled.Cascade(prd.MICL.Disabled);
        //###############################################################
        prd.Action.Subscribe( function (act)
        {
            var ract = (act == prd.action_t.mix) ? prd.action_t.install : act;
            prd.DoSetAction(ract);
        });
        //###############################################################
        prd.DoSetAction = function (act)
        {
            if(prd.ARP)
            {
                if(prd.Action() != prd.action_t.remove && prd.ARP.State() == prd.ARP.state_t.installed)
                {
                    prd.Log("Reinstall ARP component.");
                    prd.ARP.Action(prd.action_t.reinstall);
                }
                else
                {
                    prd.ARP.Action(act);
                }
            }

            if(prd.IS)
                prd.IS.Action(act);

            if(prd.MICL)
                prd.MICL.Action(act);

            return true;
        };
        //###############################################################
        // ApplyResolveSrc method definition
        //###############################################################
        prd.Configurator().Apply.ResolveSrc.SubscribeOnEnd(function(dmp)
        {
            prd.Log("Do required actions by the end of DoApplyResolveSrc");
            if(!prd.MustBeRemoved())
            {
                prd.Log("There is feature/component installed or targeted for installation, therefore product will be asked for sources resolving ...");
                if(prd.ARP && !prd.ARP.ApplyResolveSrc(dmp))
                    return false;

                if(prd.IS && !prd.IS.ApplyResolveSrc(dmp))
                    return false;

                if(prd.MICL && !prd.MICL.ApplyResolveSrc(dmp))
                    return false;
            }
            prd.Log("Do required actions by the end of DoApplyResolveSrc complete");

            return true;
        });
        //###############################################################
        // if product doesn't have not empty feature/component then its action will stay as 'none'
        // therefore TestRemove should allow to go next to have the ARP, IS and MICL removed
        var prev_TestRemove = prd.Configurator().TestRemove;
        prd.Configurator().TestRemove = function()
        {
            if(prd.MustBeRemoved())
                return true;

            return prev_TestRemove();
        }
        //###############################################################
        prd.Configurator().Apply.Remove.SubscribeOnEnd(function(dmp)
        {
            prd.Log("Do required actions by the end of DoApplyRemove");

            if(prd.MustBeRemoved())
            {
                prd.Log("There isn't any feature/component installed or targeted for installation, therefore product will be removed...");
                prd.Action(prd.action_t.remove);
                // if product doesn't have not empty feature/component then its action will stay as 'none' (subscritpion will not be called)
                // therefore we need to set remove for the auxiliary coponents directly via prd.DoSetAction
                prd.DoSetAction(prd.action_t.remove);

                if(prd.ARP && !prd.ARP.ApplyRemove(dmp))
                    return false;

                if(prd.IS && !prd.IS.ApplyRemove(dmp))
                    return false;

                if(prd.MICL && !prd.MICL.ApplyRemove(dmp))
                    return false;

                if(dmp && dmp.IsDumper)
                    dmp.AddAction(prd.dumper,"dmpr_" + prd.Name());
                else
                    prd.Log("ApplyRemove: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");

                //ns_installer.Installer.Dumper.AddAction(prd.dumper);
            }
            prd.Log("Do required actions by the end of DoApplyRemove complete");

            return true;
        });
        //###############################################################
        prd.Configurator().Apply.Install.SubscribeOnEnd(function(dmp)
        {
            prd.Log("Do required actions by the end of DoApplyInstall");
            if(!prd.MustBeRemoved())
            {
                prd.Log("There is feature/component installed or targeted for installation, therefore product will be installed..");

                if(prd.ARP)
                {
                    var size = Math.ceil(prd.GetActualSize()/1024); // In ARP size can be pointed only in KB
                    prd.ARP.Properties().Value("EstimatedSize", size);

                    if(!prd.ARP.ApplyInstall(dmp))
                        return false;
                }

                if(prd.IS && !prd.IS.ApplyInstall(dmp))
                    return false;

                if(prd.MICL && !prd.MICL.ApplyInstall(dmp))
                    return false;

                if(dmp && dmp.IsDumper)
                    dmp.AddAction(prd.dumper,"dmpr_" + prd.Name());
                else
                    prd.Log("ApplyInstall: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");

                //ns_installer.Installer.Dumper.AddAction(prd.dumper);
            }
            prd.Log("Do required actions by the end of DoApplyInstall complete");

            return true;
        });

        prd.Configurator().Apply.Repair.SubscribeOnEnd(function(dmp)
        {
          prd.Log("Do required actions by the end of DoApplyRepair");

          if(prd.IS && !prd.IS.ApplyRepair(dmp))
            return false;

          if(prd.MICL && !prd.MICL.ApplyRepair(dmp))
            return false;

          if(dmp && dmp.IsDumper)
            dmp.AddAction(prd.dumper,"dmpr_" + prd.Name());
          else
            prd.Log("ApplyInstall: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");

          prd.Log("Do required actions by the end of DoApplyRepair complete");

          return true;
        });

        //###############################################################
        prd.PreAction = function () { return prd.dumper.PreAction(); }
        //###############################################################
        prd.PostAction = function () { return prd.dumper.PostAction(); }
        //###############################################################
        prd.Configurator().Commit.SubscribeOnEnd(function()
        {
            prd.Log("Do required actions by the end of DoCommit");

            if(prd.MustBeRemoved())
            {
                prd.Log("will be removed");
                Storage("*").Write(rp_hive + prd.Id());
            }
            else
            {
                prd.Log("will be saved");

                var images = rp("images");
                images(prd.Image()).value = prd.Image();
                prd.RestorePoint(rp);
                rp.Write(rp_hive + prd.Id());

                prd.Log("Saved successful");
            }
            prd.Log("Do required actions by the end of DoCommit complete");

            return true;
        });
        //###############################################################
        var ftr_get_size = prd.get_size;
        prd.get_size = function ()
        {
            var size = ftr_get_size();

            if(prd.ARP)
                size += prd.ARP.Size();

            if(prd.IS)
                size += prd.IS.Size();

            if(prd.MICL)
                size += prd.MICL.Size();

            return size;
        };
        //###############################################################
        var orig_rest_p = prd.RestorePoint;
        prd.RestorePoint = function (st)
        {
            var l_rp = st ? st : rp;

            orig_rest_p(l_rp);

            if(prd.ARP)
                prd.ARP.RestorePoint(l_rp("ARP"));

            if(prd.IS)
                prd.IS.RestorePoint(l_rp("IS"));

            if(prd.MICL)
                prd.MICL.RestorePoint(l_rp("MICL"));

            var pps = l_rp("CustomProperties");
            prd.CustomProperties().Filter(function(nm,val){pps(nm).value = val;});

            var rp_images = l_rp("images");

            for(var c in l_rp("images").childs)
            {
                rp_images(l_rp("images").childs[c]).value = l_rp("images").childs[c];
            }

            // storing CustomObjects

            // default RestorePoint function to process simple objects (hash of properties)
            var def_RP = function(st, obj)
            {
                for(var key in obj)
                {
                    if(typeof(obj[key]) == "object")
                        def_RP(st(key), obj[key]);
                    else
                        st(key).value = obj[key];
                }

            }

            var co_rp = l_rp("CustomObjects");
            var items = prd.CustomObjects().Items();

            for(var i in items)
            {
                if(items[i].RestorePoint && typeof(items[i].RestorePoint) == "function")
                    items[i].RestorePoint(co_rp(i));
                else
                    def_RP(co_rp(i),items[i]);
            }

            return l_rp;
        }
        //###############################################################
        // get list of products from DB
        prd.ProductList = function()
        {
            var storage = Storage("ProductList::*");
            storage.Read(rp_hive);

            var res = [];

            var childs = storage.childs;
            for(var i in childs)
            {
                var p = storage(childs[i]);
                res[p.name] = storage2object(p("CustomProperties"));
            }
            storage.Clear(); // clean storage
            return res;
        }
        //###############################################################
        // completed product construction
        // now some initialization can be done
        //###############################################################
        rp.Read(rp_hive + prd.Id());

        // Loading info stored in RP for this product
        LoadFromRP(prd, rp);

        prd.RelationSetters().Add("InstallModeIdentifier", GetInstallModeIdentifier(prd));

        ns_installer.Installer.AddProduct(prd);

        return prd;
    }

    //###############################################################
    // Product constructor
    //###############################################################
    this.Create = function(inf, ex_init)
    {
        if(!inf)
            return null;

        var r_info = inf.GetInfo();
        if(!r_info || !r_info.Id || !r_info.Id())
        {
            Log(Log.l_error, "Attempt to create product with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var prd = ns_installer.Installer.Products[r_info.Id()];

        if(!prd)
        {
            prd = Product(r_info);
            if(!prd)
                return null;

            if(ex_init)
                ex_init.call(prd);
        }
        return prd;
    }
}
