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
//  enum ftr_state_t
//  class Feature
//###############################################################
new function ()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    //var ns_component = Namespace("Root.component");
    var ns_installer = Namespace("Root.installer");
    var ns_db_info_cmp = load("db_info_component.js");
    var ns_ftr_inf   = load("feature_info.js");
    var ns_cmp_inf   = load("component_info.js");
    var ns_container = load("container.js");
    var ns_event     = load("event.js");
    var ns_enums     = load("enums.js");
    var ns_version   = load("version.js");
    var ns_dir       = load("cascade_dir.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");

    var ns = this;
    
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
    // function to transform storage to object
    //###############################################################
    var storage2object = function(stor)
    {
        if(stor)
        {
            var res = {};

            FilterStorageChilds(stor, function(name, val)
            {
                res[name] = val;
            });

            return res;
        }

        return {}; // return empty object
    }
    //###############################################################
    // function to transform storage to object recurs
    //###############################################################
    var storage2object_rec = function(stor)
    {
        if(stor)
        {
            var res = {};
            //var childs = stor.childs;
            var childs_exist = 0;

            FilterStorageChilds(stor, function(name, val)
            {
                res[name] = storage2object_rec(stor(name));
                childs_exist = 1;
            });

            if(!childs_exist)
            {
                //Log("     set val = " + stor.value);
                return stor.value;
            }
            /*
            for(var i in childs)
            {
                var id = childs[i];
                res[id] = storage2object_rec(stor(id));
                //Log("     Load From RP " + id);
            }
            */
            return res;
        }

        return {}; // return empty object
    }

    //###############################################################
    var P = function(val){return ns_prop.Property(val);}
    var TP = function(val){return ns_prop.TProperty(val);}
    var PCollector = function(val){return ns_prop.Collector(val);}

    //#######################
    var ConstP = function(val){return ns_prop.Constant(val);}
    var PBool = function(val)
    {
      var p = ns_prop.Property(val ? true : false);
      p.Transform = function(_val){ return _val ? true : false; }
      return p;
    }

    var FilterNotEmpty = function(val)
    {
        if(typeof(val) == "undefined" || val === null)
            return false;

        return true;
    }

    var PNotEmpty = function(val)
    {
      var p = ns_prop.Property(val);
      p.Filter = FilterNotEmpty;
      return p;
    }

    var PNumber = function(val)
    {
      var p = ns_prop.Property(val);
      p.Filter = function(_val){ return (typeof(_val) == "number" ? true : false); }
      return p;
    }

    /*
    var load_components = function(rp, cb)
    {
        var cmps = rp("Components");
        filter(cmps.childs, function(id)
        {
            var db_info = ns_cmp_inf.InfoDB(cmps(id));
            var cmp = ns_db_info_cmp.Create({Info: db_info});
            Log("Loaded cmp name = " + cmp.Name() + " type = " + cmp.Type());
            if(cb)
                cb(cmp);
        });
    }

    var load_features = function(rp, cb)
    {
        var ftrs = rp("Features");
        filter(ftrs.childs, function(id)
        {
            var db_info = ns_ftr_inf.InfoDB(ftrs(id));
            var ftr = ns.Create(db_info);
            if(cb)
                cb(ftr);
        });
    }
    */
    var blank_f = function(){return ""};

    //###############################################################
    // Feature class
    //###############################################################
    var Feature = function(inf)
    {
        var ftr = {};
        ns_enums.BindTo(ftr);

        ftr.Info = ConstP(inf);

        ftr.IsDBInfoObject  = function(){ return true; };
        ftr.GetRealObject  = function()
        {
            return null;
        }

        var m_size = 0;
        var m_error = ""; // error description
        //###############################################################
        //ftr.ErrorHandler = P(function(){return false;})
        //ftr.ErrorHandler.Filter = FilterNotEmpty;

        //ftr.Dependencies = ConstP(ns_container.Container());
        ftr.CustomObjects    = ConstP(ns_container.Container());
        ftr.CustomProperties = ConstP(ns_prop_set.PropertySet());
        ftr.Parent           = P();
        ftr.Type             = P("feature");

        ftr.ConfigurationOptions = ConstP(ns_prop_set.PropertySet());

        ftr.Components = ConstP(ns_container.Container());
        ftr.Components().Add.Subscribe(function(cmp){ cmp.Parent(ftr); });

        ftr.Features = ConstP(ns_container.Container());
        ftr.Features().Add.Subscribe(function(iftr) { iftr.Parent(ftr); });

        ftr.Log            = log_helper("Feature name/id = " + (ftr.Info().Name ? ftr.Info().Name() : ftr.Info().Id()) + ": ");

        ftr.Id          = ftr.Info().Id;
        ftr.Name        = ftr.Info().Name;
        ftr.Version     = function(){return ns_version.Version(ftr.Info().Version());};
        ftr.Description = ftr.Info().Description;
        //ftr.ErrorDescription = P(ftr.Info().ErrorDescription ? ftr.Info().ErrorDescription() : "");

        ftr.CustomObjects = ConstP(ns_container.Container());

        //ftr.Upgrade  =  ConstP(new ns_upgrade.Upgrade(ftr));
        ftr.Groups = ConstP(ns_container.Container());

        //ftr.Configurator = ConstP(ns_cnfg.FeatureConfigurator(ftr));
        ftr.InstallDir = ns_dir.Directory();
        //###############################################################
        ftr.Mandatory = PBool(inf.Property("required") == "true" ? true : false);
        ftr.Priority = PNumber(inf.Property("priority") || 0);
        ftr.Order = PNumber(inf.Property("order") || 100);

        ftr.Action = function(){ return ftr.action_t.none; };
        //###############################################################
        ftr.FeaturesFullSet = function(_set)
        {
            var set = _set ? _set : {};

            ftr.Features().Apply(function(el)
            {
                set[el.Id()] = el;

                el.FeaturesFullSet(set);

                return true;
            });

            return set;
        }
        //###############################################################
        ftr.ComponentsFullSet = function(_set)
        {
            var set = _set ? _set : {};

            ftr.Components().Apply(function(el){set[el.Id()] = el; return true;});

            ftr.Features().Apply(function(el)
            {
                el.ComponentsFullSet(set);
                return true;
            });

            return set;
        }
        //###############################################################
        // FilterComponentsRecursive
        // Parameters:
        //    root feature
        //    callback to apply
        //     - 0 (default) immediate childs are processed first
        //     - 1 - last level childs are processed first
        //###############################################################
        var filter_components_recursive = function(_ftr, cb, search_type)
        {
            if(!_ftr)
              return null;

            if(!cb)
            {
              _ftr.Log("filter_components_recursive: callback is undefined. Ignore.");
              return null;
            }

            var res = null;

            if(search_type)
            {
                _ftr.Features().Filter(function(f)
                {
                    var r = null;
                    // if product has the FilterComponentsRecursive method the call it, else use current filter_components_recursive
                    if(f.FilterComponentsRecursive)
                        r = f.FilterComponentsRecursive(cb);
                    else
                        r = filter_components_recursive(f, cb);

                    if(r)
                    {
                      res = r;
                      return true;
                    }
                });

                if(res)
                  return res;

                _ftr.Components().Filter(function(cmp)
                {
                    if(cb(cmp))
                    {
                        res = cmp;
                        return true;
                    }
                });
            }
            else
            {
                _ftr.Components().Filter(function(cmp)
                {
                    if(cb(cmp))
                    {
                        res = cmp;
                        return true;
                    }
                });

                if(res)
                  return res;

                _ftr.Features().Filter(function(f)
                {
                    var r = null;
                    // if product has the FilterComponentsRecursive method the call it, else use current filter_components_recursive
                    if(f.FilterComponentsRecursive)
                        r = f.FilterComponentsRecursive(cb);
                    else
                        r = filter_components_recursive(f, cb);

                    if(r)
                    {
                      res = r;
                      return true;
                    }
                });
            }

            return res;
        }
        //###############################################################
        // FilterComponentsRecursive
        // Parameters:
        //    root feature
        //    callback to apply
        //     - 0 (default) immediate childs are processed first
        //     - 1 - last level childs are processed first
        //###############################################################

        ftr.FilterComponentsRecursive = function(cb, search_type) {return filter_components_recursive(ftr, cb, search_type);}

        //###############################################################
        // FilterFeaturesRecursive
        // Parameters:
        //    root feature
        //    callback to apply
        //     - 0 (default) immediate childs are processed first
        //     - 1 - last level childs are processed first
        //###############################################################
        var filter_features_recursive = function(_ftr, cb, search_type)
        {
            if(!_ftr)
              return null;

            if(!cb)
            {
              _ftr.Log("filter_features_recursive: callback is undefined. Ignore.");
              return null;
            }

            var res = null;

            if(search_type)
            {
                _ftr.Features().Filter(function(f)
                {
                    var r = null;
                    // if product has the FilterFeaturesRecursive method the call it, else use current filter_features_recursive
                    if(f.FilterFeaturesRecursive)
                        r = f.FilterFeaturesRecursive(cb, search_type);
                    else
                        r = filter_features_recursive(f, cb, search_type);

                    if(r)
                    {
                      res = r;
                      return true;
                    }
                });

                if(res)
                  return res;

                _ftr.Features().Filter(function(f)
                {
                    if(cb(f))
                    {
                        res = f;
                        return true;
                    }
                });
            }
            else
            {
                _ftr.Features().Filter(function(f)
                {
                    if(cb(f))
                    {
                        res = f;
                        return true;
                    }
                });

                if(res)
                  return res;

                _ftr.Features().Filter(function(f)
                {
                    var r = null;
                    // if product has the FilterFeaturesRecursive method the call it, else use current filter_features_recursive
                    if(f.FilterFeaturesRecursive)
                        r = f.FilterFeaturesRecursive(cb);
                    else
                        r = filter_features_recursive(f, cb);

                    if(r)
                    {
                      res = r;
                      return true;
                    }
                });
            }

            return res;
        }
        //###############################################################
        // FilterFeaturesRecursive
        // Parameters:
        //    callback to apply
        //     - 0 (default) immediate childs are processed first
        //     - 1 - last level childs are processed first
        //###############################################################
        ftr.FilterFeaturesRecursive = function(cb, search_type) {return filter_features_recursive(ftr, cb, search_type ? search_type : 0);}
        //###############################################################
        // Detach
        //###############################################################
        /*
        ftr.Detach = function ()
        {
            ftr.Log("Detaching begin");
            if(ftr.Parent())
            {
                ftr.Parent().Features().Remove(ftr.Id());
                ftr.Parent(null);
            }

            ftr.Components().Apply(function(el){el.Detach(); return true;});
            ftr.Features().Apply(function(el){el.Detach(); return true;});

            ftr.DetachNode();
            ftr.Log("Detaching end");
        }
        */
        //###############################################################
        // Add feature to specified Group
        //###############################################################
        ftr.AddToGroup = function(grp_id)
        {
            if(!grp_id || ftr.State() != ftr.state_t.installed)
                return false;

            ftr.Log("adding to group " + grp_id);

            if(!ns_installer.Installer.Groups[grp_id])
                ns_installer.Installer.Groups[grp_id] = {};

            var grp = ns_installer.Installer.Groups[grp_id];
            grp[ftr.Id()] = ftr;

            ftr.Groups().Add(grp_id, grp_id);

            return true;
        }
        //###############################################################
        // Check that feature belongs to specified Group
        //###############################################################
        ftr.InGroup = function (grp_id)
        {
            if(!grp_id)
                return false;

            if(ftr.State() != ftr.state_t.installed)
                return false;

            if(!ns_installer.Installer.Groups[grp_id])
                ns_installer.Installer.Groups[grp_id] = {};

            if(ns_installer.Installer.Groups[grp_id][ftr.Id()] == ftr)
                return true;

            return false;
        }
        //###############################################################
        ftr.Root = function ()
        {
            var root = ftr;

            for (var parent = ftr.Parent(); parent; root = parent, parent = parent.Parent());

            return root;
        }
        /*
        //###############################################################
        ftr.Refresh = function ()
        {
            ftr.Features().Apply(function(el){el.Refresh(); return true;});

            ftr.RefreshNode();
        }
        */
        //###############################################################
        ftr.StateConsistent = function ()
        {
            var state = null;

            var m_components = ftr.Components().Items();
            for (var key_c in m_components)
            {
                //if(m_components[key_c].Disabled() == ftr.disabled_t.yes)
                //    continue;

                if(!state)
                    state = m_components[key_c].State();
                else if(m_components[key_c].State() != state)
                    return false;
            }

            var m_features = ftr.Features().Items();
            for (var key_f in m_features)
            {
                //if(m_features[key_f].Disabled() == ftr.disabled_t.yes)
                //    continue;

                if(!m_features[key_f].StateConsistent())
                    return false;
                else if(!state)
                    state = m_features[key_f].State();
                else if(m_features[key_f].State() != state)
                    return false;
            }

            return true;
        }
        //###############################################################
        ftr.OwnState = function (st)
        {
            if(st)
                ftr.Log("state can't be assigned to the feature, it can be done for components only");

            var m_components = ftr.Components().Items();

            for (var key in m_components)
            {
                //if(m_components[key].Disabled() == ftr.disabled_t.yes)
                //    continue;

                if(m_components[key].State() == ftr.state_t.installed)
                    return ftr.state_t.installed;
            }
            return ftr.state_t.absent;
        }
        //###############################################################
        ftr.State = function (st)
        {
            if(st)
                ftr.Log("state can't be assigned to the feature, it can be done for components only");

            return ftr.GetState();
        }
        //###############################################################
        ftr.GetState = function ()
        {
            var m_components = ftr.Components().Items();

            for (var key_c in m_components)
            {
                //if(m_components[key_c].Disabled() == ftr.disabled_t.yes)
                //    continue;

                if(m_components[key_c].State() == ftr.state_t.installed)
                    return ftr.state_t.installed;
            }

            var m_features = ftr.Features().Items();
            for (var key_f in m_features)
            {
                //if(m_features[key_f].Disabled() == ftr.disabled_t.yes)
                //    continue;

                if(m_features[key_f].State() == ftr.state_t.installed)
                    return ftr.state_t.installed;
            }
            return ftr.state_t.absent;
        }
        //###############################################################
        ftr.Size = function ()
        {
            /*
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("Size: feature is fully disabled -> size = 0");
                return 0;
            }
            */
            return ftr.get_size();
        }
        //###############################################################
        ftr.get_size = function ()
        {
            var size = 0;
            /*
            ftr.Components().Apply(function(el)
            {
                if( el.State() == ftr.state_t.absent &&
                    el.Action() == ftr.action_t.install)
                    size += el.Size();

                return true;
            });
            */
            ftr.Features().Apply(function(el){size += el.Size(); return true;});

            return size;
        }

        ftr.GetActualSize = function ()
        {
            var size = 0;
            /*
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("Actual size: feature is fully disabled -> size = 0");
                return size;
            }
            */
            // already instaled components also occupy disk space. Disk space = installed components + absent components to be installed.
            ftr.Components().Apply(function(el)
            {
                /*
                if((el.State() == ftr.state_t.absent && el.Action() == ftr.action_t.install) ||
                    (el.State() == ftr.state_t.installed && el.Action() == ftr.action_t.none))
                    size += el.Size();
                */
                if(el.State() == ftr.state_t.installed)
                    size += el.Size();

                return true;
            });

            ftr.Features().Apply(function(el)
            {
                size += el.GetActualSize? el.GetActualSize() : el.Size();
                return true;
            });

            return size;
        }

        ftr.SetRelations = function ()
        {
            ftr.Components().Filter(function(icmp){ if(typeof(icmp.SetRelations) == "function") icmp.SetRelations(); });
            ftr.Features().Filter(function(iftr){ if(typeof(iftr.SetRelations) == "function") iftr.SetRelations(); });

            return true;
        }

        //###############################################################
        // function to restore product members from RP
        //###############################################################
        var LoadFromRP = function(obj, rp)
        {
            obj.Log("Load From RP");
            if(!rp)
            {
                obj.Log("Restore Point isn't defined;");
                return;
            }

            var childs = GetStorageChildsExtractor(rp);

            //obj.Id             = ConstP((rp("id").value));
            //obj.install_dir_base = rp("install_dir_base").value;
            //obj.install_dir_own = rp("install_dir_base").value;
            obj.InstallDir.Base(childs("install_dir_base"));
            obj.InstallDir.Own(childs("install_dir_own"));
            /*
            load_components(rp, function(cmp)
            {
                if(cmp)
                    obj.Components().Add(cmp);
            });

            load_features(rp, function(ftr)
            {
                if(ftr)
                    obj.Features().Add(ftr);
            });
            */
            //obj.State          = P(rp("state").value);

            //obj.Log("installdir assigned");
            //var props = rp("CustomProperties");

            FilterStorageChilds(GetChildsAsStringFromPath(rp, "CustomProperties"), function(name, val)
            {
                obj.CustomProperties().Value(name, val);
            });

            var objs = rp("CustomObjects");

            FilterStorageChilds(objs, function(name, val)
            {
                var res = storage2object_rec(objs(name));
                obj.CustomObjects().Add(name, res);
                //obj.Log("Load From RP add " + name);
                /*
                for(var i in res)
                {
                    obj.Log(" item " + i + " = " + res[i]);
                }
                */
            });


            /*
            var groups = rp("groups");

            filter(groups.childs, function(grp)
            {
                if(obj.State() == obj.state_t.installed)
                    obj.AddToGroup(grp);
            });
            */
            FilterStorageChilds(GetChildsAsStringFromPath(rp, "ConfigurationOptions"), function(name, val)
            {
                obj.ConfigurationOptions().Add(name, val);
            });

            //obj.Log("CustomObjects assigned");

            /*
            var sfds = rp("SourceFolders");

            for(var i in sfds.childs)
                obj.SourceFolders().Add(sfds(sfds.childs[i]).value);
            obj.Log("SourceFolders assigned");
            var sffs = rp("SourceFiles");

            for(var i in sffs.childs)
                obj.SourceFiles().Add(sffs(sffs.childs[i]).value);
            obj.Log("SourceFiles assigned");
            */
            obj.Log("Load From RP done");
        };

        ftr.RestorePointObj = TP(typeof(ftr.Info().RestorePointObj) != "undefined" ? ftr.Info().RestorePointObj : null);
        LoadFromRP(ftr, ftr.RestorePointObj());

        return ftr;
    }//class Feature

    //###############################################################
    // Feature constructor
    //###############################################################
    this.Create = function(inf, ex_init)
    {
        if(!inf)
            return null;

        var r_info = inf.GetInfo();
        if(!r_info || !r_info.Id || !r_info.Id())
        {
            Log(Log.l_error, "Attempt to create feature with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var obj = Feature(r_info);
        if(!obj)
            return null;

        if(ex_init)
            ex_init.call(obj);

        return obj;
    }
} // namespace Root.feature
