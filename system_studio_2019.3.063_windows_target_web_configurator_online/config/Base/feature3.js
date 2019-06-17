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
//Namespace("Root.feature", function ()
new function ()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    //var ns_component = Namespace("Root.component");
    var ns_installer = Namespace("Root.installer");
    var ns_component = load("component3.js");
    var ns_ftr_gui   = load("feature_gui.js");
    var ns_container = load("container.js");
    var ns_event     = load("event.js");
    var ns_enums     = load("enums.js");
    var ns_upgrade   = load("upgrade3.js");
    var ns_version   = load("version.js");
    var ns_dumper    = load("dumper.js");
    var ns_dir       = load("cascade_dir.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");
    var ns_cnfg      = load("configurator.js");

    ns_ftr_gui.CustomizeDownloadOnly(function() {return ns_installer.Installer.DownloadOnly();});

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    //###############################################################
    var P = function(val){return ns_prop.Property(val);}
    var PCollector = function(val){return ns_prop.Collector(val);}

    var attribute_type = "Type";
    var attribute_description = "Description";
    // following sort functions are required for sorting items in property Disabled
    var SortAscendingByAttributeType = function(a,b)
    {
        var a_priority = (a.Attributes && typeof(a.Attributes.Value(attribute_type)) != "undefined") ? a.Attributes.Value(attribute_type) : 100;
        var b_priority = (b.Attributes && typeof(b.Attributes.Value(attribute_type)) != "undefined") ? b.Attributes.Value(attribute_type) : 100;

        return a_priority - b_priority;
    }

    var SortDescendingByAttributeType = function(a,b)
    {
        var a_priority = (a.Attributes && typeof(a.Attributes.Value(attribute_type)) != "undefined") ? a.Attributes.Value(attribute_type) : 0;
        var b_priority = (b.Attributes && typeof(b.Attributes.Value(attribute_type)) != "undefined") ? b.Attributes.Value(attribute_type) : 0;

        return b_priority - a_priority;
    }

    var PDisabled = function(val, sort_func)
    {
        var cont = ns_prop.Collector(val);

        cont.SubscribeBeforeSet(function(_val)
        {
           //var description = "Description";
           var type = attribute_type;

           if(_val)
           cont.FilterItems(function(obj)
           {
               if(obj())
               {
                   Log("setting " + attribute_description + " from disabled indicator: " + (obj.Attributes ? obj.Attributes.Value(attribute_description) : ""));
                   cont.Attributes.Value(attribute_description, obj.Attributes ? obj.Attributes.Value(attribute_description) : "");

                   if(obj.Attributes && obj.Attributes.Value(attribute_type))
                   {
                       Log("setting " + attribute_type + " : " + obj.Attributes.Value(attribute_type));
                       cont.Attributes.Value(attribute_type, obj.Attributes.Value(attribute_type));
                   }

                   return true;
               }
           }, sort_func);
        });

        return cont;
    }
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

    var blank_f = function(){return ""};

    var ns = this;
    //###############################################################
    // Feature class
    //###############################################################
    var Feature = function(inf)
    {
        var ftr = {};
        ns_enums.BindTo(ftr);
        ns_ftr_gui.BindTo(ftr);

        ftr.Info = ConstP(inf);

        var m_size = 0;
        var m_error = ""; // error description
        //var m_prev_act = ftr.action_t.none;

        var m_action_update_in_prgrs = false; // for preventing cicle call of SetAction.
        var m_action_to_set = null;           // store info regarding new action to set

        //###############################################################
        ftr.ErrorHandler = P(function(){return false;})
        ftr.ErrorHandler.Filter = FilterNotEmpty;

        var p_action = P(ftr.action_t.none); // just for identifying implicit action change (i.e. when one of sub features' action was changed)
        var p_own_action = P(ftr.action_t.none); // just for identifying implicit action change (i.e. when one of sub features' action was changed)

        ftr.Dependencies = ConstP(ns_container.Container());
        //ftr.CustomObjects = ConstP(ns_container.Container());
        ftr.Parent = P();
        ftr.Type = P("feature");
        //var m_cnfg_opts = ns_prop_set.PropertySet();
        ftr.ConfigurationOptions = ConstP(ns_prop_set.PropertySet());

        ftr.Components = ConstP(ns_container.Container());
        ftr.Components().Add.Subscribe(function(cmp)
            {
                if(ftr.InstallDir())
                {
                    cmp.InstallDir.Base(ftr.InstallDir());
                }

                ftr.InstallDir.Cascade(cmp.InstallDir);
                ftr.InstallDir.Lock.Cascade(cmp.InstallDir);
                ftr.SelfDisabled.Cascade(cmp.Disabled);
                ftr.ChildsDisabled(cmp.Disabled);

                if(cmp.Permanent)
                {
                    ftr.SelfPermanent.Cascade(cmp.Permanent);
                    ftr.ChildsPermanent(cmp.Permanent);
                }
                else
                {
                    ftr.Log(Log.l_warning, " cmp " + cmp.Name() + "/" + cmp.Id() + " doesn't have method Permanent. Ignore");
                }

                ftr.ConfigurationOptions().Cascade(cmp.ConfigurationOptions());
                cmp.Parent(ftr);
                cmp.Action.Subscribe(ftr.ProcessChildActionChange);
            });

        ftr.Features = ConstP(ns_container.Container());
        ftr.Features().Add.Subscribe(function(iftr)
            {
                if(ftr.InstallDir())
                {
                    iftr.InstallDir.Base(ftr.InstallDir());
                }

                ftr.InstallDir.Cascade(iftr.InstallDir);
                ftr.InstallDir.Lock.Cascade(iftr.InstallDir);
                ftr.ConfigurationOptions().Cascade(iftr.ConfigurationOptions());

                ftr.SelfDisabled.Cascade(iftr.Disabled);
                ftr.ChildsDisabled(iftr.Disabled);

                if(iftr.Permanent)
                {
                    ftr.SelfPermanent.Cascade(iftr.Permanent);
                    ftr.ChildsPermanent(iftr.Permanent);
                }
                else
                {
                    ftr.Log(Log.l_warning, " ftr " + iftr.Name() + " doesn't have method Permanent. Ignore");
                }

                iftr.Parent(ftr);
                if(iftr.Visible() && !ftr.Visible())
                    iftr.Visible(false);
                ftr.Visible.Cascade(iftr.Visible);
                iftr.Action.Subscribe(ftr.ProcessChildActionChange);
            });

        ftr.Log            = log_helper("Feature name/id = " + (ftr.Info().Name ? ftr.Info().Name() : ftr.Info().Id()) + ": ");
        ftr.Components().Log = log_helper(ftr.Log.Prefix() + "Components: ");
        ftr.Features().Log   = log_helper(ftr.Log.Prefix() + "Features: ");
        ftr.Dependencies.Log = log_helper(ftr.Log.Prefix() + "Dependencies: ");
        //ftr.CustomObjects().Log = log_helper(ftr.Log.Prefix() + "CustomObjects: ");

        ftr.Id          = ftr.Info().Id;
        ftr.Name        = ftr.Info().Name;
        ftr.Version     = function(){return ns_version.Version(ftr.Info().Version());};
        ftr.Description = ftr.Info().Description;
        ftr.ErrorDescription = P(ftr.Info().ErrorDescription ? ftr.Info().ErrorDescription() : "");

        ftr.CustomObjects = ConstP(ns_container.Container());

        ftr.Upgrade  = ConstP(new ns_upgrade.Upgrade(ftr));

        // groups_list_to_register_in list of groups where product can be registered, filled by AddToGroup function
        // was created to store list of groups to register in db
        var groups_list_to_register_in = {};
        ftr.Groups   = ConstP(ns_container.Container()); // list of groups where product is registered

        ftr.Configurator = ConstP(ns_cnfg.FeatureConfigurator(ftr));
        ftr.InstallDir = ns_dir.Directory();
        //###############################################################
        ftr.Mandatory = PBool(inf.Property("required") == "true" ? true : false);
        ftr.Priority = PNumber(inf.Property("priority") || 0);
        ftr.Order = PNumber(inf.Property("order") || 100);

        ftr.Offline = PBool(false);
        ftr.Offline.Filter = function(val){if(val) return true;};
        ftr.Offline.Subscribe(function(val)
        {
            if(val)
            {
                ftr.Components().Apply(function(el){el.Offline(true); return true;});
                ftr.Features().Apply(function(el){el.Offline(true); return true;});
            }
        });
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
        //###############################################################
        // add group into list of groups where product can be registered, then it will be saved into db
        //###############################################################
        ftr.AddGroupIntoGroupsList = function(grp_id)
        {
            if(!grp_id || !groups_list_to_register_in)
                return;

            // add group into list of groups where product can be registered, then it will be saved into db
            groups_list_to_register_in[grp_id] = grp_id;
        }
        //###############################################################
        // Add feature to specified Group
        //###############################################################
        ftr.AddToGroup = function (grp_id)
        {
            if(!grp_id)
                return;

            ftr.AddGroupIntoGroupsList(grp_id);

            if(ftr.State() != ftr.state_t.installed)
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
        //###############################################################
        ftr.Refresh = function ()
        {
            ftr.Features().Apply(function(el){el.Refresh(); return true;});

            ftr.RefreshNode();
        }
        //###############################################################
        // Disabled to store/receive disabled property
        //##############################################################

        // responsible for tracking situations when all childs are disabled
        // it is collector property
        ftr.ChildsDisabled = PDisabled(ftr.disabled_t.no, SortDescendingByAttributeType);
        ftr.ChildsDisabled.Log = GetOpt.Exists("childs-disabled-log") ? log_helper(ftr.Log.Prefix() + "ChildsDisabled: ") : function(){};

        // responsible for tracking only own feature disabled state (all set actions will be redirected here)
        ftr.SelfDisabled = PDisabled(ftr.disabled_t.no, SortAscendingByAttributeType);
        ftr.SelfDisabled.Log = GetOpt.Exists("self-disabled-log") ? log_helper(ftr.Log.Prefix() + "SelfDisabled: ") : function(){};

        // responsible for providing calculative disabled state from SelfDisabled and ChildsDisabled
        ftr.Disabled = PDisabled(ftr.disabled_t.no, SortAscendingByAttributeType);
        ftr.Disabled.Log = GetOpt.Exists("disabled-log") ? log_helper(ftr.Log.Prefix() + "Disabled: ") : function(){};

        // redirecting all set actions into SelfDisabled
        ftr.Disabled.Set = ftr.SelfDisabled.Set;

        // as all set goes to SelfDisabled directly add SelfDisabled and ChildsDisabled into Disabled
        ftr.Disabled.Add(ftr.SelfDisabled);
        ftr.Disabled.Add(ftr.ChildsDisabled);

        ftr.Disabled.Subscribe(function(val)
        {
            if(val)
            {
                // disabled_type_description_t contains default descriptions for desabled types +
                // some descriptions are redifined during intialization from configs
                // if it is undefined then Description received from disab;ed indicators will be used
                var descr = ftr.disabled_type_description_t[ftr.Disabled.Attributes.Value(attribute_type)];
                descr = descr ? descr : ftr.Disabled.Attributes.Value(attribute_description);
                ftr.ErrorDescription(descr);
            }
        })
        // Calculates feature child elements disabled state
        // if all disabled -> common state = disabled
        // if any one is disabled false -> common is false
        ftr.ChildsDisabled.ValueEvaluator = function()
        {
            var res = null;
            ftr.Components().Filter(function(cmp)
            {
              if(cmp.Disabled() != cmp.disabled_t.yes)
              {
                res = false;
                return true;
              }
            });

            if(res !== null)
            {
               return res;
            }

            ftr.Features().Filter(function(_ftr)
            {
              if(_ftr.Disabled() != _ftr.disabled_t.yes)
              {
                res = false;
                return true;
              }
            });

            if(res !== null)
            {
               return res;
            }

            return true;
        }
        //###############################################################
        // Permanent to store/receive permanent property
        //##############################################################

        // responsible for tracking situations when all childs are Permanent
        ftr.ChildsPermanent = PCollector();
        ftr.ChildsPermanent.Log = log_helper(ftr.Log.Prefix() + "ChildsPermanent: ");

        // responsible for tracking only own feature Permanent state (all set actions will be redirected here)
        ftr.SelfPermanent = PCollector(ftr.permanent_t.no);
        ftr.SelfPermanent.Log = log_helper(ftr.Log.Prefix() + "SelfPermanent: ");

        // responsible for providing calculative Permanent state from SelfPermanent and ChildsPermanent
        ftr.Permanent = PCollector(ftr.permanent_t.no);
        ftr.Permanent.Log = log_helper(ftr.Log.Prefix() + "Permanent: ");

        // redirecting all set actions into SelfPermanent
        ftr.Permanent.Set = ftr.SelfPermanent.Set;

        // as all set goes to SelfPermanent directly add SelfPermanent and ChildsPermanent into Permanent
        ftr.Permanent.Add(ftr.SelfPermanent);
        ftr.Permanent.Add(ftr.ChildsPermanent);
        ftr.Arch = P(ftr.arch_t.none); //this property will be defined in "component_arch.js" if feature has "arch=" in product.xml

        // Calculates feature child elements Permanent state
        // if all Permanent -> common state = Permanent
        // if any one is Permanent false -> common is false
        ftr.ChildsPermanent.ValueEvaluator = function()
        {
            var res = null;
            ftr.Components().Filter(function(cmp)
            {
              if(!cmp.Permanent || cmp.Permanent() != cmp.permanent_t.yes)
              {
                res = false;
                return true;
              }
            });

            if(res !== null)
            {
               return res;
            }

            ftr.Features().Filter(function(_ftr)
            {
              if(!_ftr.Permanent || _ftr.Permanent() != _ftr.permanent_t.yes)
              {
                res = false;
                return true;
              }
            });

            if(res !== null)
            {
               return res;
            }

            return true;
        }
        //###############################################################
        ftr.OwnAction = function (act)
        {
            if(act)
                return ftr.SetOwnAction(act);

            return ftr.GetOwnAction();
        }
        ftr.OwnAction.Subscribe = p_own_action.Subscribe;
        //###############################################################
        ftr.SetOwnAction = function (act)
        {
            // in case of setting own action to remove it should be done by common way for all childs
            if(act == ftr.action_t.remove || (act == ftr.action_t.none && ftr.OwnState() == ftr.state_t.absent))
            {
                ftr.Log("SetOwnAction: request for setting 'remove' action (or 'none' with current own state absent) -> it will be done for all childs");
                return ftr.Action(act);
            }

            if(act && act != ftr.action_t.remove && ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("SetOwnAction: only 'remove' action can be set for disabled component -> action '" + act + "' can't be set");
                return ftr.action_t.none;
            }

            // act is action from ftr.action_t enum
            if (!act)
            {
                ftr.Log("SetOwnAction: input is undefined -> return GetAction()");
                return ftr.GetOwnAction();
            }

            if(m_action_update_in_prgrs)
            {
                if(act == m_action_to_set)
                {
                    ftr.Log("SetOwnAction: setting action to " + act + " is already in progress");
                    return act;
                }
                else
                {
                    ftr.Log(Log.l_error, "SetOwnAction: setting action to " + m_action_to_set + " is in progress, but received the concurent request to set act into " + act);
                    return m_action_to_set;
                }
            }

            var curr_act = ftr.GetAction();

            if( curr_act == act)
            {
                ftr.Log("SetOwnAction: current feature full action \"" + curr_act + "\" will not be changed due to it is already the same as input act = \""+ act +"\"");
                return act;
            }

            ftr.Log("SetOwnAction act = \"" + act + "\"");

            m_action_update_in_prgrs = true;
            m_action_to_set = act;

            var curr_own_act = ftr.GetOwnAction();

            ftr.Components().Apply(function(el){el.Action(act); return true;});

            var new_own_act = ftr.GetOwnAction();
            if(curr_own_act == new_own_act)
            {
                ftr.Log("SetOwnAction: current feature own action \"" + act + "\" wasn't changed!");
            }
            else
                p_own_action(new_own_act);

            var new_act = ftr.GetAction();
            if(curr_act == new_act)
            {
                ftr.Log("SetOwnAction: action \"" + act + "\" was applied for own components only, full feature action remain \""+ curr_act +"\"");
            }
            else
                p_action(new_act);

            m_action_update_in_prgrs = false;

            return act;
        }
        //###############################################################
        ftr.PaticipateObject = function(obj)
        {
            if (obj.Disabled() == ftr.disabled_t.yes && obj.Permanent() == ftr.permanent_t.yes)
            {
                return false;
            }
            return true;
        }
        //###############################################################
        //ftr.DoSetOwnAction = function(act) { return true; }
        //###############################################################
        ftr.GetOwnAction = function ()
        {
            var none_installed = false;
            var none_absent    = false;
            var install  = false;
            var remove   = false;

            var m_components = ftr.Components().Items();
            for (var key in m_components)
            {
                if(!ftr.PaticipateObject(m_components[key]))
                    continue;

                var act = m_components[key].Action();
                var state = m_components[key].State();

                if(act == ftr.action_t.install || act == ftr.action_t.reinstall)
                    install = true;
                else if(act == ftr.action_t.remove)
                    remove = true;
                else if(act == ftr.action_t.none && state == ftr.state_t.installed)
                    none_installed = true;
                else if(act == ftr.action_t.none && state == ftr.state_t.absent)
                    none_absent = true;
            }

            var curr_act = ftr.action_t.none;

            if((install && remove) || (none_installed && remove) || (none_absent && install))
                curr_act = ftr.action_t.mix;
            else if(install || (install && none_installed))
                curr_act = ftr.action_t.install;
            else if(remove || (remove && none_absent))
                curr_act = ftr.action_t.remove;
            else //if(none_installed || none_absent)
                curr_act = ftr.action_t.none;

            return curr_act;
        }
        //###############################################################
        ftr.Action = function (act)
        {
            if(act)
                return ftr.SetAction(act);

            return ftr.GetAction();
        }
        ftr.Action.Subscribe = p_action.Subscribe;
        //###############################################################
        //
        //##############################################################
        ftr.ProcessChildActionChange = function (chld)
        {
            if(m_action_update_in_prgrs)
            {
                ftr.Log("ProcessChildActionChange: child changed action, action update is in progress - > process it after action update completed");
                return true;
            }

            ftr.Log("ProcessChildActionChange: begin");

            var curr_act = ftr.Action();

            if(p_action() != curr_act)
            {
                ftr.Log("ProcessChildActionChange: previous ftr action was " + p_action() + ", new " + curr_act);

                m_action_update_in_prgrs = true;

                m_action_to_set = curr_act;

                //p_action() is responsible for storing action before current change
                //sub components should be marked for install only in cases
                // 1. prev_act == remove && state == installed incoming action is install | mix | none
                // 2. prev_act == none && state == absent incoming action is install | mix | remove -> remove should be skip

                var st = ftr.State();

                if((p_action() == ftr.action_t.remove && st == ftr.state_t.installed)||
                    (p_action() == ftr.action_t.none && st == ftr.state_t.absent && curr_act != ftr.action_t.remove))
                {
                    m_action_to_set = ftr.action_t.install;

                    ftr.Components().Apply(function(el){el.Action(ftr.action_t.install); return true;});
                    ftr.Features().Apply(function(el){if(el.Mandatory()) el.Action(ftr.action_t.install); return true;});
                }

                var new_own_act = ftr.GetOwnAction();
                if(p_own_action() != new_own_act)
                    p_own_action(new_own_act);

                p_action(ftr.Action());

                m_action_update_in_prgrs = false;
            }
            ftr.Log("ProcessChildActionChange: end");
        }
        //###############################################################
        ftr.SetAction = function (act)
        {
            if(act && act != ftr.action_t.remove && ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("SetAction: only 'remove' action can be set for disabled component -> action '" + act + "' can't be set");
                return ftr.action_t.none;
            }

            // act is action from ftr.action_t enum
            if (!act)
            {
                ftr.Log("SetAction: input is undefined -> return GetAction()");
                return ftr.GetAction();
            }

            if(m_action_update_in_prgrs)
            {
                if(act == m_action_to_set)
                {
                    ftr.Log("SetAction: setting action to " + act + " is already in progress");
                    return act;
                }
                else
                {
                    ftr.Log(Log.l_error, "SetAction: setting action to " + m_action_to_set + " is progress, but received the concurent request to set act into " + act);
                    DumpTrace(50);
                    return m_action_to_set;
                }
            }

            var curr_act = ftr.GetAction();

            if( curr_act == act)
            {
                //ftr.Log("SetAction: current action \"" + curr_act + "\" will not be changed due to it is already the same as input act = \""+ act +"\"");
                return act;
            }

            ftr.Log("SetAction act = \"" + act + "\"");

            m_action_update_in_prgrs = true;
            m_action_to_set = act;

            var curr_own_act = ftr.GetOwnAction();

            ftr.Components().Apply(function(el){el.Action(act); return true;});
            ftr.Features().Apply(function(el){el.Action(act); return true;});

            //ftr.DoSetAction(act);

            var new_own_act = ftr.GetOwnAction();

            if(curr_own_act != new_own_act)
                p_own_action(new_own_act);

            var new_act = ftr.GetAction();
            if(curr_act == new_act)
            {
                ftr.Log("SetAction: action \"" + act + "\" was applied for all child elements but real action remain \""+ curr_act +"\"");
            }
            else
                p_action(new_act);


            m_action_update_in_prgrs = false;

            return act;
        }
        //###############################################################
        ftr.ClearAction = function()
        {
            var changed = false;
            do
            {
                changed = false;
                ftr.FilterComponentsRecursive(function(cmp)
                {
                    cmp.Action(ftr.action_t.none)
                });
                changed =  (!(ftr.Action() == ftr.action_t.none));
            }while(changed);
        }
        //###############################################################
        ftr.GetAction = function ()
        {
            /*
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("GetAction: feature is fully disabled -> action_t.none");
                return ftr.action_t.none;
            }
            */
            var none_installed = false;
            var none_absent    = false;
            var install  = false;
            var repair  = false;
            var remove   = false;

            var m_features = ftr.Features().Items();
            for (var fkey in m_features)
            {
                //if(m_features[fkey].Disabled() == ftr.disabled_t.yes)
                //    continue;

                var fact = m_features[fkey].Action();
                var fstate = m_features[fkey].State();

                if(fact == ftr.action_t.mix)
                    return ftr.action_t.mix;
                else if(fact == ftr.action_t.install || fact == ftr.action_t.reinstall)
                    install = true;
                else if(fact == ftr.action_t.repair)
                {
                    repair = true;
                    none_installed = true;
                }
                else if(fact == ftr.action_t.remove)
                    remove = true;
                else if(fact == ftr.action_t.none && fstate == ftr.state_t.installed)
                    none_installed = true;
                else if(fact == ftr.action_t.none && fstate == ftr.state_t.absent &&
        m_features[fkey].Disabled() != ftr.disabled_t.yes)
                    none_absent = true;
            }

            var m_components = ftr.Components().Items();
            for (var ckey in m_components)
            {
                //if(m_components[ckey].Disabled() == ftr.disabled_t.yes)
                //    continue;

                var cact = m_components[ckey].Action();
                var cstate = m_components[ckey].State();

                if(cact == ftr.action_t.install || cact == ftr.action_t.reinstall)
                    install = true;
                if(cact == ftr.action_t.repair)
                {
                    repair = true;
                    none_installed = true;
                }
                else if(cact == ftr.action_t.remove)
                    remove = true;
                else if(cact == ftr.action_t.none && cstate == ftr.state_t.installed)
                    none_installed = true;
                else if(cact == ftr.action_t.none && cstate == ftr.state_t.absent &&
        m_components[ckey].Disabled() != ftr.disabled_t.yes)
                    none_absent = true;
            }

            var curr_act = ftr.action_t.none;

            //if((install && remove) || (none_installed && none_absent) || (none_installed && remove) || (none_absent && install))
            if((install && remove) || (none_installed && remove) || (none_absent && install))
                curr_act = ftr.action_t.mix;
            else if(install || (install && none_installed))
                curr_act = ftr.action_t.install;
            else if(remove || (remove && none_absent))
                curr_act = ftr.action_t.remove;
            else if(repair)
                curr_act = ftr.action_t.repair;
            else //if(none_installed || none_absent)
                curr_act = ftr.action_t.none;

            return curr_act;
        }
        //###############################################################
        ftr.StateConsistent = function ()
        {
            var state = null;

            var m_components = ftr.Components().Items();
            for (var ckey in m_components)
            {
                if(!ftr.PaticipateObject(m_components[ckey]))
                    continue;

                if(!state)
                    state = m_components[ckey].State();
                else if(m_components[ckey].State() != state)
                    return false;
            }

            var m_features = ftr.Features().Items();
            for (var fkey in m_features)
            {
                if(!ftr.PaticipateObject(m_features[fkey]))
                    continue;

                if(!m_features[fkey].StateConsistent())
                    return false;
                else if(!state)
                    state = m_features[fkey].State();
                else if(m_features[fkey].State() != state)
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
                if(!ftr.PaticipateObject(m_components[key]))
                    continue;

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

            for (var ckey in m_components)
            {
                if(!ftr.PaticipateObject(m_components[ckey]))
                    continue;

                if(m_components[ckey].State() == ftr.state_t.installed)
                    return ftr.state_t.installed;
            }

            var m_features = ftr.Features().Items();
            for (var fkey in m_features)
            {
                if(!ftr.PaticipateObject(m_features[fkey]))
                    continue;

                if(m_features[fkey].State() == ftr.state_t.installed)
                    return ftr.state_t.installed;
            }
            return ftr.state_t.absent;
        }
        //###############################################################
        ftr.CheckForUpgrade = function ()
        {
            /*
            //feature can be disabled due to newer version exists -> therefore removed this check
            //due to there should be an abilti yto check upgrade for disabled features
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("CheckForUpgrade: feature is fully disabled -> check isn't required");
                return;
            }
            */
            ftr.Log("CheckForUpgrade: begin");

            if(ftr.State() == ftr.state_t.installed)
            {
                ftr.Log("CheckForUpgrade: feature is installed -> check for own upgrade isn't required but check for childs will perform");
            }
            else
            {
                ftr.Upgrade().Check();
            }

            ftr.Features().Apply(function(el){ el.CheckForUpgrade(); return true;});
            ftr.Components().Apply(function(el){ el.CheckForUpgrade(); return true;});

            ftr.Log("CheckForUpgrade: completed");
        }
        //###############################################################
        ftr.UpgradeState = function ()
        {
            /*
            //feature can be disabled because there is a newer one, but we need to know the UpgradeState
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("UpgradeState: feature is fully disabled -> upgrade_state_t.none");
                return ftr.upgrade_state_t.none;
            }
            */
            var act = ftr.Action();

            /*
            // It is very useful to have the update state even if the feature is deleted or not installed
            // due to it provides info about previous or newer versions for such feature
            // therefore this section was removed
            if(act == ftr.action_t.none || act == ftr.action_t.remove)
            {
                ftr.Log("UpgradeState: feature action is none/remove -> upgrade_state_t.none");
                return ftr.upgrade_state_t.none;
            }
            */
            var curr_state = ftr.Upgrade().State();

            var t_state = curr_state;

            var m_features = ftr.Features().Items();
            for (var fkey in m_features)
            {
                if(!ftr.PaticipateObject(m_features[fkey]))
                    continue;

                t_state = m_features[fkey].UpgradeState();

                if(t_state == ftr.upgrade_state_t.none)
                    continue;

                if(curr_state != ftr.upgrade_state_t.none && t_state != curr_state)
                {
                    curr_state = ftr.upgrade_state_t.mix;
                    return curr_state;
                }
                else
                    curr_state = t_state;
            }

            var m_components = ftr.Components().Items();
            for (var ckey in m_components)
            {
                if(!ftr.PaticipateObject(m_components[ckey]))
                    continue;

                t_state = m_components[ckey].UpgradeState();

                if(t_state == ftr.upgrade_state_t.none)
                    continue;

                if(curr_state != ftr.upgrade_state_t.none && t_state != curr_state)
                {
                    curr_state = ftr.upgrade_state_t.mix;
                    return curr_state;
                }
                else
                    curr_state = t_state;
            }

            return curr_state;
        }
        //###############################################################
        ftr.Size = function ()
        {
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("Size: feature is fully disabled -> size = 0");
                return 0;
            }

            return ftr.get_size();
        }
        //###############################################################
        ftr.get_size = function ()
        {
            var size = 0;

            ftr.Components().Apply(function(el)
            {
                if( el.State() == ftr.state_t.absent &&
                    el.Action() == ftr.action_t.install)
                    size += el.Size();

                return true;
            });

            ftr.Features().Apply(function(el){size += el.Size(); return true;});

            return size;
        }

        ftr.GetActualSize = function ()
        {
            var size = 0;
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("Actual size: feature is fully disabled -> size = 0");
                return size;
            }

            // already instaled components also occupy disk space. Disk space = installed components + absent components to be installed.
            ftr.Components().Apply(function(el)
            {
                if((el.State() == ftr.state_t.absent && el.Action() == ftr.action_t.install) ||
                    (el.State() == ftr.state_t.installed && el.Action() == ftr.action_t.none))
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

        //###############################################################
        // RestorePoint method definition
        //###############################################################
        ftr.RestorePoint = function (st)
        {
            var rp = st ? st : Storage("*");

            rp("id").value = ftr.Id();
            rp("name").value = ftr.Name();
            rp("description").value = ftr.Description();
            rp("visible").value = ftr.Visible() ? 1 : 0;
            rp("obj_type").value = ftr.Type();
            rp("install_dir_base").value = ftr.InstallDir.Base();
            rp("install_dir_own").value = ftr.InstallDir.Own();
            rp("version").value = ftr.Version().Str();

            var ftr_rp = rp("Features");
            var cmp_rp = rp("Components");

            ftr.Components().Apply(function(el){el.RestorePoint(cmp_rp(el.Id())); return true;});
            ftr.Features().Apply(function(el){el.RestorePoint(ftr_rp(el.Id())); return true;});

            var groups = rp("groups");

            //var grps_list = ftr.Groups().Items();
            for(var i in groups_list_to_register_in)
                groups(i).value = groups_list_to_register_in[i];

            var cnfg_opts = rp("ConfigurationOptions");
            ftr.ConfigurationOptions().Filter(function(nm,val){cnfg_opts(nm).value = val;});

            var pinfo = rp("Info");

            filter(ftr.Info().Properties(), function(value, name)
            {
                pinfo(name).value = value;
            });

            return rp;
        }
        //###############################################################
        // Setting of dependencies processor
        //###############################################################
        ftr.ProcessDependency = function(o){return true;}
        //###############################################################
        // Dependencies setting
        //###############################################################
        ftr.Depend = function (alias, o)
        {
            o.Action.Subscribe(function(){ return ftr.ProcessDependency(o);});
            ftr.Dependencies().Add(alias, o);
        }

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

/** @class Node
 *  @brief Binding to Feature infrastructure
 *  @details Feature is C++ handled object with has set of predefined attributes,
 *    most of them are read/write, additionaly it includes methods to operate with
 *    content of feature selection dialog.
 *  @attr string id          feature id, read/write
 *  @attr string name        feature name, this value will be displayed on feature tree, read/write
 *  @attr string description deature description, this value will be displayed on feature
 *                           description pane, read/write
 *  @attr string error       error message, in case if feature is disabled - this value
 *                           will be displayed on feature description pane, read/write
 *  @attr integer size       feature size, this value will be displayed on feature
 *                           size column, read/write
 *  @attr integer priority   feature priority, features on same level are sorted
 *                           according this value (this value doesn't affect to
 *                           installation sequence), read/write
 *  @attr string icon        icon id to display feature on tree, read/write
 *  @attr integer disabled   non-zero value means that feature is disabled (default: false), read/write
 *  @attr integer expanded   non-zero value means that feature is expanded (default: true), read/write
 *  @attr string guid        guild of feature element, this value is automatically generated
 *                           on object creation and should be used as argument for AddChild
 *                           method, readonly
 *  @attr function hit       callback function to be called when user click on feature, see
 *                           notes for details, read/write
 *  @note
 *    Feature is bi-directional element: on one side it represents data available from script
 *    engine, on second side - feature selection dialog uses feature objects to display
 *    tree-based information on tree control and provide feedback to script on any user's
 *    actions: for example call callback function when user click on feature icon. To catch
 *    click on feature element developer should create callback function, like
 *    <pre>
 *      var feature_hit = function()
 *      {
 *          return 0;
 *      }
 *    </pre>
 *    and initialize <code>hit</code> attribute by this function:
 *    <pre>
 *      var n = Node();
 *      n.hit = feature_hit;
 *    </pre>
 *    During feature selection dialog processing when user click on element <code>n</code>
 *    function <code>feature_hit</code> will be called
 *  @see AddChild Menu
 */

/** @fn Node
 *  @brief Constructor for Node object
 *  @return Node - new created Node object
 */

/** @method Node AddChild(string guid)
 *  @brief Append child node to current node
 *  @details Features may be organized on tree-based manner on feature selection dialog.
 *    To do this method AddChild should be used - this method adds link to child node
 *    for current object.
 *  @param string guid - guid of child node to add, see guid attribute
 *  @usage
 *    // example below demonstrates how one node may be linked as child to another node
 *      var n_parent = Node();
 *      n_parent.name = "parent";
 *      var n_child = Node();
 *      n_child = "child";
 *      n_parent.AddChild(n_child.guid);
 */

/** @method Node Menu(array menu_items)
 *  @brief Show pop-up menu
 *  @details When user clicks on feature element on feature selection dialog ayn action may be
 *    processed, for example pop-up menu may be diaplayed to provide user choice to
 *    install/remove any component.
 *  @param array menu_items - array of menu items to display on pop-up menu, see notes
 *    for details
 *  @return data <code>id</code> of element selected by user or empty value
 *  @usage
 *    // example below demonstrates displaing menu on clicking to feature
 *      var node = Node(); // create and initialize node
 *      node.name = "my example node";
 *
 *      var node_hit = function()
 *      {
 *          var menu_items = [];
 *          menu_items.push({name:"menu item 1", icon:"install_icon", id:"install"});
 *          menu_items.push({name:"menu item 2", icon:"uninstall_icon", id:"uninstall"});
 *          var result = node.Menu(menu_items);
 *          if(!result)
 *          { // user canceled menu
 *          }
 *          else if(result == "install")
 *          { // user selected item "menu item 1"
 *          }
 *          else if(result == "uninstall")
 *          { // user selected item "menu item 2"
 *          }
 *      }
 *
 *      // here should be code to display feature selection dialog
 *  @note
 *    Method Menu accepts array of menu elements to display. Menu element is object
 *    which should have attributes:<br>
 *    name - string, text of element to display on pop-up menu<br>
 *    icon - string, icon name to display<br>
 *    id - value to return from Menu method if user select this specific element<br>
 *    To demonstrate how it can be used let's look at example. Let's assume that we created
 *    and initialized Node element:
 *    <pre>
 *      var node = Node();
 *      node.name = "example node";
 *      node.description = "example node description";
 *    </pre>
 *    Now create and initialize callback function:
 *    <pre>
 *      node.hit = function()
 *      {
 *          var menu_items = []; // create array
 *          menu_items.push({name:"menu item 1", icon:"install_icon", id:"install"}); // append menu item
 *          menu_items.push({name:"menu item 2", icon:"uninstall_icon", id:"uninstall"}); // append menu item
 *          var result = node.Menu(menu_items); // call Menu method
 *          if(!result) // process return value
 *          { // user canceled menu
 *          }
 *          else if(result == "install")
 *          { // user selected item "menu item 1"
 *          }
 *          else if(result == "uninstall")
 *          { // user selected item "menu item 2"
 *          }
 *      }
 *    </pre>
 *    As you can see usage of this function is simple
 *  @see Refresh
 */

/** @method Node Refresh
 *  @brief Refresh feature element on feature selection dialog
 *  @details After Node element is updated (for example updated text or icon) corresponding
 *    element on feature selection dialog should be refreshed. Refresh method initiate
 *    re-drawing tree control.
 *  @usage
 *      var node = Node();
 *      node.icon = "install";
 *      node.hit = function()
 *      {
 *          node.icon = "uninstall"; // this action will not affect to GUI
 *          node.Refresh(); // redraw element
 *      }
 *  @see Menu
 */
