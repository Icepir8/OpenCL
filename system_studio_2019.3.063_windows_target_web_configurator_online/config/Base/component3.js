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

/** @file component.js
 *  @brief component.js - basic implementation of Component object
 *  @details this module includes basic implementation of Component object.
 *    here defined action_t & state_t enumerations, Component object
 *    implementation
 *  @usage
 *    var c = required("component.js");
 *    var comp = c.Component(component_id);
 *  @see product.js
 */
new function()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_installer = load("installer.js");
    var ns_dump      = load("dumper.js");
    var ns_event     = load("event.js");
    var ns_enums     = load("enums.js");
    var ns_upgrade   = load("upgrade3.js");
    var ns_version   = load("version.js");
    var ns_dir       = load("cascade_dir.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");
    var ns_cnfg      = load("configurator.js");
    var ns_cont      = load("container.js");

    var blank_f = function(){return ""};

    var P = function(val){return ns_prop.Property(val);}
    var PCollector = function(val){return ns_prop.Collector(val);}
    var ConstP = function(val){return ns_prop.Constant(val);}
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
    // following sort function is required for sorting items in property Disabled
    var attribute_type = "Type";
    var attribute_description = "Description";
    // following sort functions are required for sorting items in property Disabled
    var SortAscendingByAttributeType = function(a,b)
    {
        var a_priority = (a.Attributes && typeof(a.Attributes.Value(attribute_type)) != "undefined") ? a.Attributes.Value(attribute_type) : 100;
        var b_priority = (b.Attributes && typeof(b.Attributes.Value(attribute_type)) != "undefined") ? b.Attributes.Value(attribute_type) : 100;

        return a_priority - b_priority;
    }

    var PDisabled = function(val)
    {
        var cont = ns_prop.Collector(val);

        cont.SubscribeBeforeSet(function(_val)
        {
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
           }, SortAscendingByAttributeType);
        });

        return cont;
    }
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
                var id = childs[i];
                res[id] = stor(id).value;
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
            {
                //Log("     set val = " + stor.value);
                return stor.value;
            }

            for(var i in childs)
            {
                var id = childs[i];
                res[id] = storage2object_rec(stor(id));
                //Log("     Load From RP " + id);
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
    //###############################################################
    // function to restore component members from RP
    //###############################################################
    var LoadFromRP = function(cmp, rp)
    {
        cmp.Log("Load From RP");

        if(!rp)
        {
            cmp.Log("Restore Point isn't defined;");
            return;
        }

        var childs = GetStorageChildsExtractor(rp);

        //cmp.Id             = ConstP((rp("id").value));
        //cmp.install_dir_base = rp("install_dir_base").value;
        //cmp.install_dir_own = rp("install_dir_base").value;
        cmp.InstallDir.Base(childs("install_dir_base"));
        cmp.InstallDir.Own(childs("install_dir_own"));

        //cmp.Log("installdir assigned");
        FilterStorageChilds(GetChildsAsStringFromPath(rp, "CustomProperties"), function(name, val)
        {
            cmp.CustomProperties().Value(name, val);
        });

        cmp.Log("cmp state from db = " + childs("state"));

        //var info = cmp.Info().Properties();
        //cmp.Log("CustomProperties assigned");
        //cmp.Log("Load CustomObjects start");
        var objs = rp("CustomObjects");
        FilterStorageChilds(objs, function(name, val)
        {
            var res = storage2object_rec(objs(name));
            cmp.CustomObjects().Add(name, res);
            //cmp.Log("Load From RP add " + name);
            //for(var i in res)
            //{
            //    cmp.Log(" item " + i + " = " + res[i]);
            //}
        });
        //cmp.Log("Load CustomObjects done");

        FilterStorageChilds(GetChildsAsStringFromPath(rp, "groups"), function(grp)
        {
            //if(cmp.State() == cmp.state_t.installed)
            if (cmp.AddToGroup) 
                cmp.AddToGroup(grp);
        });

        //cmp.Log("CustomObjects assigned");

        FilterStorageChilds(GetChildsAsStringFromPath(rp, "SourceFolders"), function(name, val)
        {
            cmp.SourceFolders().Add(val);
        });

        cmp.Log("Load From RP done");
    }

    var rp_hive = "RestorePoint::Components::";
    var ns = this;
    //###############################################################
    // Component constructor
    // input hash object has following fields:
    //  Mandatory:
    //      Info
    //  Optional:
    //      Source
    //      Processor
    //      StateManager
    //      ExInit - callback which is called for created component for additional initialization
    //               as ExInit.call(component);
    //###############################################################
    this.Create = function (_in)
    {
        if(!_in)
            return null;

        if(!_in.Info)
            return null;

        var r_info = _in.Info.GetInfo();
        if(!r_info || !r_info.Id || !r_info.Id())
        {
            Log(Log.l_error, "Attempt to create component with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var cmp = ns_installer.Installer.Components[r_info.Id()];

        var args = {};

        for(var i in _in)
            args[i] = _in[i];

        args.Info = r_info;

        if (!cmp)
        {
            cmp = ns.Component(args);

            if(!cmp)
            {
                Log(Log.l_error, "Failed to create component: " + r_info.Id());
                return null;
            }
        }

        var cln = cmp.Clone();

        //if(_in.ExInit)
        //    _in.ExInit.call(cln);

        return cln;
    }
    //###############################################################
    //class Component
    //###############################################################
    /** @class Component
     *  @brief Basic Component functionality
     *  @details This is base implementation of Component functionality & should not be used
     *    in development. This implementation is basis for specific
     *    components implementation (ComponentMSI, ComponentARP, etc.)
     *  @attr string action_t - Component actions
     *  @attr string state_t  - Component states
     *  @see Product
     */

    /** @fn Component(string id)
     *  @brief Constructor for Component object
     *  @details This function creates basic Component object.
     *  @param string id - id of component to create. In case if Component
     *    with same id is created - link to this component is returned
     *  @usage
     *    var c = required("component.js");
     *    var comp = c.Component(component_id);
     *  @see Product
     */

    var BindPrivate = function(obj)
    {
        obj.CloneId = P();
        obj.Configurator = ConstP(ns_cnfg.ComponentConfigurator(obj));
        //###############################################################
        obj.IsOriginal = function(){return obj.Original() == obj;}
        // all clones' configurators should use the same flags for actions to escape doing actions twice (for clone and for original)
        obj.Configurator().UpgradeDone = obj.Original().Configurator().UpgradeDone;
        obj.Configurator().RemoveDone = obj.Original().Configurator().RemoveDone;
        obj.Configurator().InstallDone = obj.Original().Configurator().InstallDone;
        obj.Configurator().RepairDone = obj.Original().Configurator().RepairDone;
        obj.Configurator().CommitDone = obj.Original().Configurator().CommitDone;
        //###############################################################
        obj.Parent = P();
        //###############################################################
        obj.Order = PNumber(100);
        //###############################################################
        // State to store/receive state property
        //###############################################################
        obj.State = P();
        obj.State.Get = function()
        {
            if(typeof(obj.State.DefaultGet()) == "undefined" || obj.State.DefaultGet() === null)
                return (obj.StateManager() && obj.StateManager().State) ? obj.StateManager().State() : obj.state_t.absent;

            return obj.State.DefaultGet();
        }

        obj.State.Filter = function(val)
        {
            if(typeof(val) == "undefined" || val === null
               || !(val == obj.state_t.absent || val == obj.state_t.installed))
            {
                obj.Log("try to set state with incorrect value =\"" + val + "\"");
                return false;
            }

            return true;
        }
        //###############################################################
        // p_action to store/receive action property
        //###############################################################
        obj.p_action = P(obj.action_t.none);
        //###############################################################
        // p_size to store/receive size property
        //###############################################################
        obj.p_size = P();
        obj.p_size.Filter = FilterNotEmpty;
        obj.p_size.Get = function ()
        {
            if(typeof(obj.p_size.DefaultGet()) == "undefined" || obj.p_size.DefaultGet() === null)
                return obj.Info().Size();

            return obj.p_size.DefaultGet();
        }
        //###############################################################
        // Disabled to store/receive disabled property
        //###############################################################
        obj.Disabled = PDisabled(obj.disabled_t.no);
        obj.Disabled.Log = GetOpt.Exists("disabled-log") ? log_helper(obj.Log.Prefix() + "Disabled: ") : function(){};
        obj.Disabled.Transform = function(val){ return typeof(val) == "function" ? val : ((val == obj.disabled_t.mix || val) ? obj.disabled_t.yes : obj.disabled_t.no); }

        var action_before_disabling = null;

        obj.Disabled.Subscribe(function (val)
        {
            var curr_disabled = obj.Disabled.PreviousValue();
            if(curr_disabled == val)
            {
                obj.Log("Current disabled value " + curr_disabled + " is equal to incoming " + val + ". Ignore;");
                return;
            }

            if(val == obj.disabled_t.no)
            {
                if(typeof(action_before_disabling) != "undefined" && action_before_disabling !== null)
                {
                   obj.Log("Return back action which was before disabling: " + action_before_disabling);
                   obj.Action(action_before_disabling);
                   action_before_disabling = null;
                }
            }
            else
            {
                  action_before_disabling = obj.p_action();
                  // added setting of Action into none to have Action subscribers launched
                  if(action_before_disabling != obj.action_t.remove)
                    obj.Action(obj.action_t.none);
            }
            obj.Log("Current disabled value: " + curr_disabled + ", incoming: " + val + " action before disabling: " + action_before_disabling);
        });
        //###############################################################
        // Permanent to store/receive permanent property
        //###############################################################
        obj.Permanent = PCollector(obj.permanent_t.no);
        obj.Permanent.Log = log_helper(obj.Log.Prefix() + "Permanent: ");
        obj.Permanent.Transform = function(val){ return typeof(val) == "function" ? val : (val ? obj.permanent_t.yes : obj.permanent_t.no); }
        //###############################################################
        /** @method Component Size
         *  @brief Component.Size - get Component size
         *  @details request disk space required to process desired action
         *  @return number disk space required to process action, bytes
         *  @usage
         *    var size = Component.Size();
         *  @see GetAction GetState
         */
        obj.Size = function (val)
        {
          if(obj.Disabled() == obj.disabled_t.yes)
          {
            obj.Log("Size: component is disabled therefore size = 0");
            return 0;
          }

          return obj.p_size(val);
        }
        //###############################################################
        obj.Root = function ()
        {
            var root = obj;

            for (var parent = obj.Parent(); parent; root = parent, parent = parent.Parent());

            return root;
        }
        //###############################################################
        obj.ParentProduct = function ()
        {
            var parent = obj.Parent();

            for (; (parent && parent.Type() != "product"); parent = parent.Parent());

            return parent;
        }
        //###############################################################
        // Detach component from parent obj
        //###############################################################
        obj.Detach = function ()
        {
            obj.Log("Detaching begin");

            if(obj.Parent())
            {
                obj.Parent().Components().Remove(obj.Id());
                obj.Parent(null);
            }

            if(obj.IsOriginal())
                obj.Clones().Apply(function(el){el.Detach(); return true;});

            obj.Log("Detaching end");
            return true;
        }
        //###############################################################
        // Checking for already installed previous versions which can be upgraded
        //###############################################################
        obj.CheckForUpgrade = function ()
        {
            /*
            //component can be disabled due to newer version exists -> therefore removed this check
            //due to there should be an ability to check upgrade for disabled component

            if(obj.Disabled() == obj.disabled_t.yes)
            {
                obj.Log("CheckForUpgrade: component is disabled -> check isn't required");
                return true;
            }
            */
            if(obj.State() == obj.state_t.installed)
            {
                obj.Log("CheckForUpgrade: component is installed -> check isn't required");
                return false;
            }

            obj.Log("CheckForUpgrade: begin");

            obj.Upgrade().Check();

            obj.Log("CheckForUpgrade: completed");

            return true;
        }
        //###############################################################
        // Upgrade state for this component
        //###############################################################
        obj.UpgradeState = function ()
        {
            /*
            //component can be disabled because there is a newer one, but we need to know the UpgradeState
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                obj.Log("UpgradeState: component is disabled -> none to upgrade");
                return obj.upgrade_state_t.none;
            }

            if(obj.Action() == obj.action_t.none || obj.Action() == obj.action_t.remove)
            {
                obj.Log("UpgradeState: component action is none/remove -> upgrade_state_t.none");
                return obj.upgrade_state_t.none;
            }
            */
            return obj.Upgrade().State();
        }
        //###############################################################
        // Setting of dependencies processor
        //###############################################################
        obj.ProcessDependency = function (_obj)
        {
            //obj.Log("it is default dependency processor");
            return true;
        }
        //###############################################################
        // Dependencies setting
        //###############################################################
        obj.Depend = function (alias, iobj)
        {
            iobj.Action.Subscribe(function(changed_obj){ return obj.ProcessDependency(changed_obj);});
            obj.Dependencies().Add(alias, iobj);
        }
        //###############################################################
        obj.Action = function (act)
        {
            if(act)
                return obj.SetAction(act);

            if(obj.Disabled() == obj.disabled_t.yes)
                return (obj.p_action() == obj.action_t.remove) ? obj.action_t.remove : obj.action_t.none;

            return obj.p_action();
        }
        obj.Action.Subscribe = obj.p_action.Subscribe;
        //###############################################################
        /** @method Component SetAction(action_t action)
         *  @brief Component.SetAction - set desired action to Component
         *  @details set desired installation action to Component
         *  @param action_t action - property of action_t type
         *  @return boolean true -  if succeed
         *  @return boolean false - if failed
         *  @usage
         *    Component.SetAction(Component.action_t.install);
         *  @see GetAction, action_t
         */
        obj.SetAction = function (act)
        {
          if(!act)
            return false;

          if(act && act != obj.action_t.remove && act != obj.action_t.none && obj.Disabled() == obj.disabled_t.yes)
          {
            obj.Log("SetAction: only 'remove' action can be set for disabled component -> action '" + act + "' can't be set");
            return false;
          }

          if(act == obj.p_action())
          {
                //obj.Log("SetAction: current action \"" + act + "\" will not be changed due to it is already the same as input act = \""+ act +"\"");
                return true;
          }

          if(obj.IsOriginal()) // orig_obj is a link to original obj
          {
            obj.Log("Performing SetAction (act = " + act + ") for original component -> this action will be passed to all clones");
            obj.Clones().Apply(function(el){obj.Log("setting action for clone " + el.CloneId()); el.Action(act); return true;});
          }

          obj.Log("SetAction: act = \"" + act + "\"");

          if( (obj.State() == obj.state_t.installed && act == obj.action_t.install) ||
              (obj.State() == obj.state_t.absent && (act == obj.action_t.remove || act == obj.action_t.repair))
            )
          {
            if(obj.p_action() == obj.action_t.none)
            {
                obj.Log("SetAction: component state = " + obj.State() + ", current action = \"none\" will not be changed");
                return true;
            }

            obj.Log("SetAction: component state = " + obj.State() + " -> action will be set as \"none\"");

            obj.p_action(obj.action_t.none);

            return true;
          }

          obj.p_action(act);

          return true;
        }

        //###############################################################
        // This function checks existence of the not orphaned (with defined Parent) clones which are being installed or not going to be removed
        //###############################################################
        obj.HasClients = function()
        {
            obj.Log("HasClients: check all clones ...");
            var m_clones = obj.Clones().Order();
            for(var i = 0; m_clones[i]; i++)
            {
                var cln = m_clones[i];
                if( cln.Parent() &&
                    (cln.State() == obj.state_t.installed && cln.Action() != obj.action_t.remove) ||
                    (cln.State() == obj.state_t.absent    && cln.Action() == obj.action_t.install)
                    )
                {
                    obj.Log("HasClients: there is client - clone " + i + " state = " + cln.State() + " action = " + cln.Action());
                    return true; // component can't be removed
                }
                else
                {
                    if(!cln.Parent())
                        obj.Log("HasClients: clone " + i + " is orphaned (parent is undefined)!");
                    else
                        obj.Log("HasClients: clone " + i + " state = " + cln.State() + " action = " + cln.Action() + " - not a client (is going to be removed or not going to be installed)!");
                }
            }

            return false;
        }
        //###############################################################
        // This function checks existence of clones Parents which are being installed or not going to be removed
        //###############################################################
        obj.HasPotentialClients = function()
        {
            obj.Log("HasPotentialClients: check all clones ...");
            var m_clones = obj.Clones().Order();
            for(var i = 0; m_clones[i]; i++)
            {
                var cln = m_clones[i];
                var pp = cln.Root();
                var pp_act = pp.Action();
                var pp_st = pp.State();
                if( pp != cln
                    && pp_act != pp.action_t.remove
                    && !(pp_st == pp.state_t.absent && pp_act == pp.action_t.none)
                  )
                {
                    obj.Log("HasPotentialClients: there is potential client - clone " + i + " state = " + cln.State() + " action = " + cln.Action() + ", client name = " + pp.Name() + " state = " + pp_st + " action = " + pp_act );
                    return true;
                }
                else if(pp != cln)
                {
                    obj.Log("HasPotentialClients: there parent for clone " + i + " (state = " + cln.State() + " action = " + cln.Action() + "), name = " + pp.Name() + " state = " + pp_st + " action = " + pp_act + " not a client (is going to be removed or not going to be installed)!" );
                }
            }

            return false;
        }
        //###############################################################
        obj.Configurator().Commit.SubscribeOnEnd(function()
        {
            obj.Log("Do required actions by the end of DoCommit");
            /*
            var pp = null;
            if(!obj.Configurator().TestRemove() ||
                ( (pp = obj.Root()) != obj
                  && pp.Action() != pp.action_t.remove && !(pp.State() == pp.state_t.absent && pp.Action() == pp.action_t.none)))
            */
            if(obj.HasClients() || obj.HasPotentialClients())
            {
                obj.Log("rp will be saved due to there are other clients or potential clients for this component");

                obj.RestorePoint(obj.rp);
                obj.rp.Write(rp_hive + obj.Id());

                obj.Log("rp saved successful");
            }
            else
            {
                obj.Log("rp will be removed");
                Storage("*").Write(rp_hive + obj.Id());
                obj.Log("rp removed successful");
            }

            obj.Log("Do required actions by the end of DoCommit complete");

            return true;
        });

        obj.RestorePoint = function(st)
        {
            var rp = st ? st : Storage("*");

            if((obj.State() == obj.state_t.installed && obj.Action() != obj.action_t.remove) ||
               (obj.State() == obj.state_t.absent    && obj.Action() == obj.action_t.install))
            {
                rp("state").value = obj.state_t.installed;
            }
            else
            {
                rp("state").value = obj.state_t.absent;
            }

            if(typeof(obj.RestorePointBase) == "function")
                obj.RestorePointBase(rp);
        }
    }
    //###############################################################
//###############################################################
// Props adjustment
//###############################################################
    var BindBase = function(_in)
    {
        var obj = this;
        //var base = {};

        ns_enums.BindTo(obj);

        obj.Info       = ConstP(_in.Info);

        obj.Log         = log_helper("Component name/id = " + ((obj.Info().Name) ? obj.Info().Name() : "") + "/" + obj.Info().Id() + ": ");

        obj.Source     = PNotEmpty();
        obj.Processor  = PNotEmpty();
        obj.StateManager  = PNotEmpty();
        //###############################################################
        // Props adjustment
        //###############################################################
        obj.Source.Subscribe(function(src)
        {
            obj.Log("source set: \"" + ((src.File) ? src.File() : "") + "\"");
        });
        //###############################################################
        obj.Processor.Subscribe(function(prc)
        {
            obj.Log(Log.l_debug, "set new processor");
            if(prc.Owner)
                prc.Owner(obj);
        });
        //###############################################################
        obj.StateManager.Subscribe(function(mng)
        {
            obj.Log(Log.l_debug, "set new state manager");
            if(mng.Owner)
                mng.Owner(obj);
        });


        obj.Id          = ConstP(obj.Info().Id());
        obj.Name        = ConstP(obj.Info().Name());
        obj.Version     = ConstP(ns_version.Version(obj.Info().Version()));
        obj.Description = P(obj.Info().Description());
        obj.ErrorDescription = function(){return obj.Info().ErrorDescription ? obj.Info().ErrorDescription : blank_f;}

        obj.Type       = P(obj.Info().Type ? obj.Info().Type() : "component");

        obj.InstallDir = ns_dir.Directory();

        obj.ConfigurationOptions = ConstP(ns_prop_set.PropertySet());
        obj.InstallConfigurationOptions = obj.ConfigurationOptions;
        obj.RemoveConfigurationOptions = ConstP(ns_prop_set.PropertySet());

        obj.CustomProperties = ConstP(ns_prop_set.PropertySet());
        obj.CustomObjects = ConstP(ns_cont.Container());

        var distinct = function(_cnt)
        {
            var cnt = _cnt;
            return function(args)
            {
                var items = cnt.Items();
                for(var i in items)
                {
                    if(items[i] == args[0])
                        return false;
                }

                return true;
            }
        }

        var as_array = function(_cnt)
        {
            var cnt = _cnt;
            return function(args)
            {
                if(args.length == 1)
                    return {id : cnt.Number() + 1, obj : args[0]};

                Log("Container: Transform: incorrect function call - more then 2 input parameters");
                //return undefined;
            }
        }
        // SourceFolders and SourceFiles are required for storing info about locations and files list for this component - for modify and repair from ARP
        obj.SourceFolders = ConstP(ns_cont.Container());
        obj.SourceFolders().Add.Filter = distinct(obj.SourceFolders());
        obj.SourceFolders().Transform = as_array(obj.SourceFolders());
        obj.SourceFiles = ConstP(ns_cont.Container());
        obj.SourceFiles().Add.Filter = distinct(obj.SourceFiles());
        obj.SourceFiles().Transform = as_array(obj.SourceFiles());

        obj.Clones     = ConstP(ns_cont.Container());

        // groups_list_to_register_in list of groups where product can be registered, filled by AddToGroup function
        // was created to store list of groups to register in db
        obj.groups_list_to_register_in = {};

        //###############################################################
        // add group into list of groups where product can be registered, then it will be saved into db
        //###############################################################
        obj.AddGroupIntoGroupsList = function(grp_id)
        {
            if(!grp_id)
                return;

            // add group into list of groups where product can be registered, then it will be saved into db
            obj.groups_list_to_register_in[grp_id] = grp_id;
        }

        obj.Groups     = ConstP(ns_cont.Container());
        obj.Upgrade    = ConstP(new ns_upgrade.Upgrade(obj));
        obj.Dumper     = ConstP(ns_dump.Dumper("dmpr_for_" + (obj.Info().Name ? obj.Info().Name() : obj.Info().Id()), obj));
        //obj.PreAction = function () { return obj.Dumper.PreAction(); }
        //obj.PostAction = function () { return obj.Dumper.PostAction(); }

        obj.Original   = ConstP(obj);

        obj.Dependencies = ConstP(ns_cont.Container());

        obj.Offline = PBool(false);
        obj.Offline.Filter = function(val){if(val) return true;}
        obj.Offline.Subscribe(function(val)
        {
            if(val)
                if(obj.State() == obj.state_t.absent && (!obj.Source() || !obj.Source().Resolved()))
                    obj.Disabled(true);
        });

        obj.Source(_in.Source);
        obj.Processor(_in.Processor);
        obj.StateManager((_in.StateManager ? _in.StateManager : _in.Processor));
        obj.Arch = P(obj.arch_t.none); //this property will be defined in "component_arch.js" if component has "arch=" in product.xml

        //###############################################################
        // These State is defined here because it is required for AddToGroup function
        // It will be redefined in BindPrivate
        //###############################################################
        obj.State = P();
        obj.State.Get = function()
        {
            if(typeof(obj.State.DefaultGet()) == "undefined" || obj.State.DefaultGet() === null)
                return (obj.StateManager() && obj.StateManager().State) ? obj.StateManager().State() : obj.state_t.absent;

            return obj.State.DefaultGet();
        }

        //###############################################################
        // Add component to specified Group
        //###############################################################
        obj.AddToGroup = function (grp_id)
        {
            if(!grp_id)
                return false;

            obj.AddGroupIntoGroupsList(grp_id);

            if(typeof(obj.State) != "function" || obj.State() != obj.state_t.installed)
            {
                return false;
            }

            obj.Log("adding to group " + grp_id);

            if(!ns_installer.Installer.Groups[grp_id])
                ns_installer.Installer.Groups[grp_id] = {};

            var grp = ns_installer.Installer.Groups[grp_id];
            grp[obj.Id()] = obj.Original ? obj.Original() : obj;

            obj.Groups().Add(grp_id, grp_id);

            return true;
        }

        //###############################################################
        obj.ExInit = _in.ExInit ? _in.ExInit : function() {};
        //###############################################################

        obj.rp = Storage("*");
        obj.rp.Read(rp_hive + obj.Id());

        // Loading info stored in RP for this component
        LoadFromRP(obj, obj.rp);

        //###############################################################
        // RestorePoint method definition
        //###############################################################
        obj.RestorePointBase = function(st)
        {
            var rp = st ? st : Storage("*");

            rp("id").value = obj.Id();
            rp("name").value = obj.Name();
            rp("description").value = obj.Description();
            rp("obj_type").value = obj.Type();
            rp("install_dir_base").value = obj.InstallDir.Base();
            rp("install_dir_own").value = obj.InstallDir.Own();

            if(obj.Version().ObjType && obj.Version().ObjType() == ns_version.TypeName())
                rp("version").value = obj.Version().Str();

            Log("save cmp info into RP");
            var pinfo = rp("Info");

            filter(obj.Info().Properties(), function(value, name)
            {
                pinfo(name).value = value;
            });

            var groups = rp("groups");

            for(var _i in obj.groups_list_to_register_in)
                groups(_i).value = obj.groups_list_to_register_in[_i];

            var def_RP = function(_st, _obj)
            {
                for(var key in _obj)
                {
                    if(typeof(_obj[key]) == "object")
                        def_RP(_st(key), _obj[key]);
                    else
                    {
                        //Log("save "+key +" val = " + _obj[key]);
                        _st(key).value = _obj[key];
                    }
                }
            }
            obj.Log("save custom properties ");
            var pps = rp("CustomProperties");
            obj.CustomProperties().Filter(function(nm,val){pps(nm).value = val;});

            obj.Log("save custom objects ");
            var co_rp = rp("CustomObjects");
            var items = obj.CustomObjects().Items();

            for(var itm in items)
            {
                if(items[itm].RestorePoint && typeof(items[itm].RestorePoint) == "function")
                    items[itm].RestorePoint(co_rp(itm));
                else
                    def_RP(co_rp(itm),items[itm]);
            }

            var sfd_rp = rp("SourceFolders");
            var sfds = obj.SourceFolders().Items();
            for(var _sd in sfds)
                sfd_rp(_sd).value = sfds[_sd];

            var sff_rp = rp("SourceFiles");
            var sffs = obj.SourceFiles().Items();
            for(var _sf in sffs)
                sff_rp(_sf).value = sffs[_sf];

            return rp;
        }

        obj.Clone = function()
        {
            var cln = {};

            for(var key in obj)
                cln[key] = obj[key];
            /*
            Log("logging obj version ...");
            var o = obj.Version();
            for(var p in o)
                Log(p + " = " + o[p]);

            Log("logging clone version ...");
            var o = cln.Version();
            for(var p in o)
                Log(p + " = " + o[p]);
            Log("completed ...");
            */
            cln.Log = log_helper("Clone " + obj.Log.Prefix());
            BindPrivate(cln);

            cln.Action(obj.Action());
            cln.Disabled(obj.Disabled()); // clone has own disabled property

            cln.CloneId(Guid());

            obj.Clones().Add(cln.CloneId(), cln);

            obj.ExInit.call(cln);

            //cln.Clones().Apply(function(el){Log("there is clone id = " + el.CloneId()); return true;});
            return cln;
        }

     //###############################################################
     // Create base component part
     //###############################################################
     /*
        for(var key in obj)
            base[key] = obj[key];

        return base;
     */
    }
    //###############################################################
    // Component class
    //###############################################################
    this.Component = function(_in)
    {
        var cmp = {};

        BindBase.call(cmp, _in);
        BindPrivate(cmp);

        ns_installer.Installer.AddComponent(cmp);

        return cmp;
    }//Component function
}// namespace Component
