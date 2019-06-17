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

/** @file db_info_component.js
 *  @brief db_info_component.js - basic implementation of DBInfoComponent object
 *  @details this module includes basic implementation of DBInfoComponent object.
 *    it provides and access to component properties stored in DB
 *    it doesn't have any action or dumper or configurator.
 *    its main target is provide info about installed component in suitable way
 */
new function()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

    var ns_installer = load("installer.js");
    var ns_event     = load("event.js");
    var ns_enums     = load("enums.js");
    var ns_version   = load("version.js");
    var ns_dir       = load("cascade_dir.js");
    var ns_prop_set  = load("property_set.js");
    var ns_prop      = load("property.js");
    var ns_cont      = load("container.js");

    var blank_f = function(){return ""};

    var P = function(val){return ns_prop.Property(val);}
    var TP = function(val){return ns_prop.TProperty(val);}
    var PCollector = function(val){return ns_prop.Collector(val);}
    var ConstP = function(val){return ns_prop.Constant(val);}
    var PBool = function(val)
    {
      var p = ns_prop.Property(val);
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
    // function to restore component members from RP
    //###############################################################
    var LoadFromRP = function(cmp, rp)
    {
        cmp.Log("Load From RP");
        //Log(JSON.stringify(rp, null, "  "));
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
        //var props = rp.GetChildsAsStringFromPath("CustomProperties");

        FilterStorageChilds(GetChildsAsStringFromPath(rp, "CustomProperties"), function(name, val)
        {
            cmp.CustomProperties().Value(name, val);
        });

        Log("cmp state from db = " + childs("state"));

        //var info = cmp.Info().Properties();
        //cmp.Log("CustomProperties assigned");
        //cmp.Log("Load CustomObjects start");
        var objs = rp("CustomObjects");
        FilterStorageChilds(objs, function(name, val)
        {
            var res = storage2object_rec(objs(name));
            cmp.CustomObjects().Add(name, res);
        });
        //cmp.Log("Load CustomObjects done");

        cmp.Log("Load From RP done");
    }

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

        var r_info = _in.Info.GetInfo();
        if(!r_info || !r_info.Id || !r_info.Id())
        {
            Log(Log.l_error, "Attempt to create component with undefined Id - input info isn't defined or doesn't have Id or Id() is empty");
            return null;
        }

        var cmp = ns_installer.Installer.DBInfo.Components[r_info.Id()];

        var args = {};

        for(var i in _in)
            args[i] = _in[i];

        args.Info = r_info;

        if(!cmp)
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
       //###############################################################
        obj.IsOriginal = function(){return obj.Original() == obj;}
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
            {
                return (obj.StateManager() && obj.StateManager().State) ? obj.StateManager().State() : obj.state_t.absent;
            }
            //    return obj.state_t.absent;

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
        // Add component to specified Group
        //###############################################################
        obj.AddToGroup = function (grp_id)
        {
            //if(!grp_id || obj.State() != obj.state_t.installed)
            if(!grp_id)
                return false;

            obj.Log("adding to group " + grp_id);

            if(!ns_installer.Installer.Groups[grp_id])
                ns_installer.Installer.Groups[grp_id] = {};

            var grp = ns_installer.Installer.Groups[grp_id];
            grp[obj.Id()] = obj.Original ? obj.Original() : obj;

            obj.Groups().Add(grp_id, grp_id);

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
                if( cln.Parent() && cln.State() == obj.state_t.installed )
                {
                    obj.Log("HasClients: there is client - clone " + i + " state = " + cln.State());
                    return true; // component can't be removed
                }
                else
                {
                    if(!cln.Parent())
                        obj.Log("HasClients: clone " + i + " is orphaned (parent is undefined)!");
                    else
                        obj.Log("HasClients: clone " + i + " state = " + cln.State() + " - not a client (not installed)!");
                }
            }

            return false;
        }
    }
    //###############################################################
//###############################################################
// Props adjustment
//###############################################################
    var BindBase = function(_in)
    {
        var obj = this;

        ns_enums.BindTo(obj);

        obj.Info       = ConstP(_in.Info);
        obj.Id         = ConstP(obj.Info().Id());

        obj.Log         = log_helper("DBInfoComponent id = " + obj.Id());
        //###############################################################
        //Log("read from db");
        //Log(JSON.stringify(obj.rp));

        // Loading info stored in RP for this component

        //obj.Log         = log_helper("DBInfoComponent name/id = " + ((obj.Info().Name) ? obj.Info().Name() : "") + "/" + obj.Info().Id() + ": ");

        obj.RelationSetters  = P(ns_cont.Container());

        obj.IsDBInfoObject = function(){ return true; };

        obj.GetRealObject  = function()
        {
            return ns_installer.Installer.Components[obj.Id()];
        }

        obj.StateManager  = PNotEmpty();
        //###############################################################
        obj.StateManager.Subscribe(function(mng)
        {
            //obj.Log("set new state manager");
            if(mng.Owner)
                mng.Owner(obj);
        });

        obj.Name        = ConstP(obj.Info().Name());
        obj.Version     = ConstP(ns_version.Version(obj.Info().Version()));
        obj.Description = P(obj.Info().Description());
        obj.Type        = P(obj.Info().Property("type") || "component");
        obj.InstallDir  = ns_dir.Directory();

        obj.ConfigurationOptions = ConstP(ns_prop_set.PropertySet());
        obj.InstallConfigurationOptions = obj.ConfigurationOptions;
        obj.RemoveConfigurationOptions = ConstP(ns_prop_set.PropertySet());

        obj.CustomProperties = ConstP(ns_prop_set.PropertySet());
        obj.CustomObjects = ConstP(ns_cont.Container());

        obj.Action = function(){ return obj.action_t.none; }

        var distinct = function(_cnt)
        {
            var cnt = _cnt;
            return function(args)
            {
                //Log("filter distinct args = " + args);
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
                //Log("transform as array args = " + args);
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

        obj.Clones     = ConstP(ns_cont.Container());
        obj.Groups     = ConstP(ns_cont.Container());

        obj.Original   = ConstP(obj);

        obj.Dependencies = ConstP(ns_cont.Container());

        //obj.Source(_in.Source);
        obj.StateManager((_in.StateManager ? _in.StateManager : _in.Processor));

        //###############################################################
        obj.ExInit = _in.ExInit ? _in.ExInit : function() {};

        //var info_rp = _in.DBRestorePoint;

        //Log("info_rp id = " + info_rp("id").value);

        //obj.rp.Read(rp_hive + obj.Id());
        //Log(JSON.stringify(obj.rp));
        //Log("obj.rp id = " + obj.rp("id").value);

        obj.Clone = function()
        {
            var cln = {};

            if(obj.GetRealObject())
            {
                obj.Log("Generating Clone from DBInfo component, real component exists - return Clone from real component.");
                cln = obj.GetRealObject().Clone();
            }
            else
            {

                for(var key in obj)
                    cln[key] = obj[key];

                cln.Log = log_helper("DBInfoClone " + obj.Log.Prefix());
                BindPrivate(cln);

                cln.CloneId(Guid());

                obj.Clones().Add(cln.CloneId(), cln);

                obj.ExInit.call(cln);

                //cln.Clones().Apply(function(el){Log("there is clone id = " + el.CloneId()); return true;});
            }

            return cln;
        }

        //###############################################################
        obj.SetRelations = function ()
        {
            if(obj.SetRelations.Done())
            {
                obj.Log("Setting of relations was already done. Skipped");
                return;
            }

            //obj.Log("Relations set begin");
            obj.RelationSetters().Filter(function(el){el.call(obj);});
            //obj.Log("Relations set completed");

            obj.SetRelations.Done(true);
        };
        obj.SetRelations.Done = PBool(false);

        obj.RelationSetters().Add("GroupsAssignment", function()
        {
            //obj.Log("Groups assignment");
            var groups = GetChildsAsStringFromPath(obj.RestorePointObj(), "groups");

            if(groups && obj.State() == obj.state_t.installed)
            {
                FilterStorageChilds(groups, function(name, val)
                {
                    obj.Log("add to group " + val);
                    obj.AddToGroup(val);
                });
            }
            //}
            //obj.Log("Groups assignment done");
            return true;
        });
    }
    //###############################################################
    // Component class
    //###############################################################
    this.Component = function(_in)
    {
        var cmp = {};
        Log("create cmp start");
        BindBase.call(cmp, _in);
        BindPrivate(cmp);

        cmp.RestorePointObj = TP(typeof(cmp.Info().RestorePointObj) != "undefined" ? cmp.Info().RestorePointObj : Storage("*"));
        LoadFromRP(cmp, cmp.RestorePointObj());
        Log("create cmp complete");

        //cmp.State(typeof(cmp.RestorePoint("state").value) != "undefined" ? cmp.RestorePoint("state").value : cmp.state_t.installed);

        if(ns_installer.Installer.DBInfo)
            ns_installer.Installer.DBInfo.AddComponent(cmp);
        //Log("added into installer");
        return cmp;
    }//Component function
}// namespace Component
