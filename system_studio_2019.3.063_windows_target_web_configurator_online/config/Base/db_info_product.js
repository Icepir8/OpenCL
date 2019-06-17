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
    var ns_feature   = load("db_info_feature.js");
    var ns_component = load("db_info_component.js");
    var ns_cmp_inf   = load("component_info.js");
    var ns_arp       = load("db_info_component_arp.js");
    var ns_cmp_micl  = load("db_info_component_micl.js");
    var ns_cmp_is    = load("db_info_component_isource.js");
    var ns_enums     = load("enums.js");
    var ns_container = load("container.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");

    var P = function(val){return ns_prop.Property(val);}
    var TP = function(val){return ns_prop.TProperty(val);}
    var PBool = function(val)
    {
      var p = ns_prop.Property(val);
      p.Transform = function(_val){ return _val ? true : false; }
      return p;
    }

    // look for cache.xml file at product directory first
    var rp_hive = "RestorePoint::";

    var ns = this;

    var ConstP = function(val){return ns_prop.Constant(val);}
    var FilterNotEmpty = function(val)
    {
        if(typeof(val) == "undefined" || val === null)
            return false;

        return true;
    }

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

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
    //###############################################################
    // function to restore product members from RP
    //###############################################################
    var LoadFromRP = function(prd, rp)
    {
    /*
        prd.Log(" LoadFromRP begin ");
        prd.InstallDir.Base(rp("install_dir_base").value);
        prd.InstallDir.Own(rp("install_dir_own").value);

        prd.Log(" installdirbase = " + prd.InstallDir.Base());
        prd.Log(" installdirown = " + prd.InstallDir.Own());
        prd.Log(" loading groups for product");

        var cnfg_opts = rp("ConfigurationOptions");
        for(var i in cnfg_opts.childs)
                prd.ConfigurationOptions().Value(cnfg_opts.childs[i], cnfg_opts(cnfg_opts.childs[i]).value);

        var props = rp("CustomProperties");
        for(var i in props.childs)
                prd.CustomProperties().Value(props.childs[i], props(props.childs[i]).value);

        var groups = rp("groups");
        for(var i in groups.childs)
                prd.AddToGroup(groups(groups.childs[i]).value);

        var objs = rp("CustomObjects");
        for(var i in objs.childs)
                prd.CustomObjects().Add(objs.childs[i], storage2object_rec(objs(objs.childs[i])));
    */
    }
    //###############################################################
    // class Product
    //###############################################################
    var Product = function(inf)
    {
        var prd = ns_feature.Create(inf);

        prd.GetRealObject  = function()
        {
            return ns_installer.Installer.Products[prd.Id()];
        }

        prd.RestorePointObj = TP(typeof(prd.Info().RestorePointObj) != "undefined" ? prd.Info().RestorePointObj : Storage("*"));

        prd.Type("product");
        //ns_enums.BindTo(prd);

        prd.Log = log_helper("Product id = " + prd.Id() + ": ");

        prd.Image = P(prd.Id());
        prd.Image.Filter = FilterNotEmpty;

        prd.ContentLoaders = P(ns_container.Container());
        prd.RelationSetters  = P(ns_container.Container());

        //prd.curr_image_id =  prd.Id();
        /*
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
        prd.UninstallParams = ConstP("--product=\"" + prd.Id() + "\"");
        //###############################################################
        // Full command which is used for product uninstall
        //###############################################################
        prd.UninstallString = ConstP("\"" + prd.UninstallExe() + "\"" + " " + prd.UninstallParams());

        prd.ARP = ns_arp.Create({Info : ns_cmp_inf.InfoPure("ARP_cmp_" + prd.Id()), ARPId : "ARP_for_prd_" + prd.Id()});
        prd.ARP.Parent(prd);
        prd.ARP.DisplayName(prd.Id());
        prd.ARP.UninstallString(prd.UninstallString());
        */
        prd.commit_to_remove = true; // flag which is changed during apply to false
                                      // if there is reason to leave this product (one of features isn't removed, ...)
                                      // if this flag is false -> product info is stored into db, else -> removed

        // custom properties
        // custom properties API
        //prd.CustomProperties = ConstP(ns_prop_set.PropertySet());
        //prd.CustomObjects = ConstP(ns_container.Container());
        // define install mode as modify if this product's image was already installed
        //var rp = Storage("*");

        //prd.CustomObjects().Log   = log_helper(prd.Log.Prefix() + "CustomObjects: ");

        //###############################################################
        //
        //###############################################################
        /*
        prd.CacheDir = function(){ return prd.IS.TargetDir();}
        */

        prd.LoadContent = function ()
        {
            if(prd.LoadContent.Done())
            {
                prd.Log("Load of content was already done. Skipped");
                return;
            }

            prd.Log("LoadContent (db) begin");
            prd.ContentLoaders().Filter(function(el){el.call(prd);});
            prd.Log("LoadContent (db) completed");
            prd.LoadContent.Done(true);
        };

        prd.LoadContent.Done = PBool(false);
        //###############################################################
        var prev_set_rel = prd.SetRelations;
        prd.SetRelations = function ()
        {
            if(prd.SetRelations.Done())
            {
                prd.Log("Setting of relations was already done. Skipped");
                return;
            }

            if(typeof(prev_set_rel) == "function")
                prev_set_rel();

            prd.Log("Relations set begin");
            prd.RelationSetters().Filter(function(el){el.call(prd);});
            prd.Log("Relations set completed");

            prd.SetRelations.Done(true);
        };
        prd.SetRelations.Done = PBool(false);

        //###############################################################
        // Returns list of installed product images
        //###############################################################
        var m_images_list = [];
        var m_images_list_defined = false;
        prd.ImagesList = function()
        {
            if(!m_images_list_defined)
            {
                //prd.Log("db_info images list " + prd.RestorePointObj()("images").childs_as_string );
                FilterStorageChilds(GetChildsAsStringFromPath(prd.RestorePointObj(), "images"), function(name)
                {
                    //prd.Log("db_info image = " + name);
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
            //if(!grp_id || prd.ProductState() != prd.state_t.installed)
            if(!grp_id || typeof(grp_id) == "undefined")
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
        /*
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
        */
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
        // completed product construction
        // now some initialization can be done
        //###############################################################
        //prd.Log("rp.Read");

        //rp.Read(rp_hive + prd.Id());

        // Loading info stored in RP for this product
        LoadFromRP(prd, prd.RestorePointObj());

        prd.RelationSetters().Add("GroupsAssignment", function()
        {
            var groups = GetChildsAsStringFromPath(prd.RestorePointObj(), "groups");

            if(groups && prd.ProductState() == prd.state_t.installed)
            {
                FilterStorageChilds(groups, function(name, val)
                {
                    prd.Log("add to group " + val);
                    prd.AddToGroup(val);
                });
            }

            return true;
        });
        //prd.RelationSetters().Add("InstallModeIdentifier", GetInstallModeIdentifier(prd));

        if(ns_installer.Installer.DBInfo)
            ns_installer.Installer.DBInfo.AddProduct(prd);

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
            Log(Log.l_error, "DBInfoProduct: Attempt to create product with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var prd = ns_installer.Installer.DBInfo.Products[r_info.Id()];

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
