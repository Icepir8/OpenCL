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
    var ns_enums;
    var ns_installer;
    var ns_version;
    var ns_cmp_msi;
    var ns_info;
    var ns_prop;

    var P = function(val){return ns_prop.Property(val);}

    //var ProductToUpgrade_id = "_aux_product_contains_cmps_for_upgrade";
    //var ProductToUpgrade = null;

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    var is_initialized = false;

    this.Init = function()
    {
        if(is_initialized)
            return;

        ns_installer = Namespace("Root.installer");

        var base_script_dir = Origin.Directory();
        var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};

        ns_enums     = load("enums.js");
        ns_version   = load("version.js");

        ns_cmp_msi   = load("component_msi3.js");
        ns_info      = load("component_info.js");

        ns_prop      = load("property.js");

        is_initialized = true;
    }

    var ns = this;
    //###############################################################
    //class UpgradeTarget
    //###############################################################
    this.UpgradeTarget = this.UpgradeTarget || function(obj, type, act, st, entry_ref)
    {
        ns_enums.BindTo(this);

        this.m_target_obj = obj;
        this.m_action = act;
        this.m_type = type;
        this.m_state = st;
        this.m_entry_ref = entry_ref ? entry_ref : null;
    }
    //###############################################################
    this.UpgradeTarget.prototype.Object = function() { return this.m_target_obj; }
    //###############################################################
    this.UpgradeTarget.prototype.Entry = function() { return this.m_entry_ref; }
    //###############################################################
    this.UpgradeTarget.prototype.Action = function(act)
    {
        if(act)
            this.m_action = act;

        return this.m_action;
    }
    //###############################################################
    this.UpgradeTarget.prototype.Type = function() { return this.m_type; }
    this.UpgradeTarget.prototype.State = function() { return this.m_state; }
    //###############################################################
    this.UpgradeTarget.prototype.Apply = function()
    {
        var object_to_upgrade = this.m_target_obj;
        // if target object is the DBInfo Object then need to request the real one
        if(typeof(this.m_target_obj.IsDBInfoObject) == "function" &&
           this.m_target_obj.IsDBInfoObject() &&
           typeof(this.m_target_obj.GetRealObject) == "function")
        {
            object_to_upgrade = this.m_target_obj.GetRealObject();
        }

        //apply upgrade -> removing targets
        if(object_to_upgrade && object_to_upgrade.Action && this.m_action == this.action_t.remove)
        {
            object_to_upgrade.Action(this.action_t.remove);

            if(ns_installer.Installer.AddObjectToUpgrade)
                ns_installer.Installer.AddObjectToUpgrade(object_to_upgrade);
        }

        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class UpgradeEntry
    //###############################################################
    this.UpgradeEntry = this.UpgradeEntry || function(owner, type, act, entry_type, name)
    {
        ns_enums.BindTo(this);
        this.Log = this.Log || log_helper("Upgrade Entry: ");

        this.owner = owner;

        if(!this.owner.Version)
            Log("UpgradeEntry Initialization: Attention: owner with id "+this.owner.Id()+" doesn't have method \"Version\"");

        this.m_v_min = ns_version.Version();
        this.m_v_max = ns_version.Version();
        this.m_same_dir = false;
        this.m_type  = type ? type : this.upgrade_type_t.mandatory;
        this.m_action  = (this.m_type == this.upgrade_type_t.mandatory) ? this.action_t.remove : (act ? act : this.action_t.remove);
        this.m_entry_type = entry_type ? entry_type : "upgrade_entry";
        this.m_name = name ? name : "no_name";

        this.m_targets = [];
        this.m_processor = null;
    }
    //###############################################################
    this.UpgradeEntry.prototype.Type = function (type) { if(type) this.m_type = type; return this.m_type; }
    //###############################################################
    this.UpgradeEntry.prototype.EntryType = function (etype) { if(etype) this.m_entry_type = etype; return this.m_entry_type; }
    //###############################################################
    this.UpgradeEntry.prototype.Name = function (name) { if(name) this.m_name = name; return this.m_name; }
    //###############################################################
    // VMin
    //###############################################################
    this.UpgradeEntry.prototype.VMin = function (str) { this.m_v_min = ns_version.Version(str);}
    //###############################################################
    // VMax
    //###############################################################
    this.UpgradeEntry.prototype.VMax = function (str) { this.m_v_max = ns_version.Version(str);}
    //###############################################################
    // SameDirOnly
    //###############################################################
    this.UpgradeEntry.prototype.SameDirOnly = function (v)
    {
        if(typeof(v) == "undefined")
            return this.m_same_dir;

        if(v)
            this.m_same_dir = true;
        else
            this.m_same_dir = false;
    }
    //###############################################################
    // Checks for upgrade
    //###############################################################
    this.UpgradeEntry.prototype.Check = function () { return true; }
    //###############################################################
    // Reset
    //###############################################################
    this.UpgradeEntry.prototype.Reset = function ()
    {
        //this.m_state = this.upgrade_state_t.none;
        this.m_targets = [];
        //this.m_state = this.upgrade_state_t.allowed;
        return true;
    }
    //###############################################################
    // returns array of targets for upgrade
    //###############################################################
    this.UpgradeEntry.prototype.Targets = function () { return this.m_targets; }
    //###############################################################
    this.UpgradeEntry.prototype.OlderExists = function ()
    {
        for(var i in this.m_targets)
            if(this.m_targets[i].State() == this.upgrade_state_t.upgrade)
                return true;

        return false;
    }
    //###############################################################
    this.UpgradeEntry.prototype.NewerExists = function ()
    {
        for(var i in this.m_targets)
            if(this.m_targets[i].State() == this.upgrade_state_t.downgrade)
                return true;

        return false;
    }
    //###############################################################
    this.UpgradeEntry.prototype.SameExists = function ()
    {
        for(var i in this.m_targets)
            if(this.m_targets[i].State() == this.upgrade_state_t.same)
                return true;

        return false;
    }
    //###############################################################
    // add obj to targets for upgrade
    //###############################################################
    this.UpgradeEntry.prototype.AddTarget = function (obj)
    {
        var state = this.DefineUpgradeState((obj.Version ? obj.Version() : ""));

        this.Log("add object: " + obj.Id() + " to targets for upgrade with state = " + state);
        var act = this.m_action;

        if(state == this.upgrade_state_t.same || state == this.upgrade_state_t.downgrade)
            act = this.action_t.none;

        this.m_targets.push(new ns.UpgradeTarget(obj, this.m_type, act, state, this));
    }
    //###############################################################
    // Type
    //###############################################################
    //this.UpgradeEntry.prototype.Type = function () { return this.m_state; }
    //###############################################################
    // State
    //###############################################################
    this.UpgradeEntry.prototype.State = function ()
    {
        var c_state = this.upgrade_state_t.none;

        for(var i in this.m_targets)
        {
            if(c_state == this.upgrade_state_t.mix)
                break;

            //if(this.m_targets[i].State() == this.upgrade_state_t.none)
            //    continue;

            if(c_state == this.upgrade_state_t.none)
                c_state = this.m_targets[i].State();
            else if(c_state != this.m_targets[i].State())
                c_state = this.upgrade_state_t.mix;
        }

        return c_state;
    }
    //###############################################################
    //VerifyVersionRange checks that version match the required conditions
    //###############################################################
    this.UpgradeEntry.prototype.VerifyVersionRange = function (ver)
    {
        this.Log("VerifyVersionRange");
        if(this.m_v_min.IsNULL() && this.m_v_max.IsNULL())
        {
            this.Log("version range is undefined, therefore any version is acceptable");
            return true;
        }

        if(!ver)
        {
            this.Log("ver = \"" +ver +"\" doesn't belong to required range");
            return false;
        }

        var iver = ns_version.Version(ver);

        if( iver.IsNULL() ||
            (!this.m_v_min.IsNULL() && iver.lt(this.m_v_min)) ||
            (!this.m_v_max.IsNULL() && iver.gt(this.m_v_max))
            )// input version isn't defined or doesn't belong to required range
        {
            this.Log("ver = \"" +ver +"\" doesn't belong to required range");
            return false;
        }

        return true;
    }
    //###############################################################
    //VerifyVersion checks that version match the required conditions
    //###############################################################
    this.UpgradeEntry.prototype.DefineUpgradeState = function (ver)
    {
        if(!ver || !this.owner.Version)
            return this.upgrade_state_t.upgrade;

        var iver = ns_version.Version(ver);

        if(iver.eq(this.owner.Version()))
            return this.upgrade_state_t.same;
        else if(iver.lt(this.owner.Version()))
            return this.upgrade_state_t.upgrade;
        //else //if(iver.gt(this.owner.Version()))

        return this.upgrade_state_t.downgrade;
    }
    //###############################################################
    //VerifyVersion checks that version match the required conditions
    //###############################################################
    this.UpgradeEntry.prototype.VerifyInstallDir = function (path)
    {
        if( !this.SameDirOnly()  )
            return true;

        if(!path || path == "")
            return false;

        this.Log("VerifyInstallDir: owner.id = "+this.owner.Id()+": input path = " + path + " owner path = " + this.owner.InstallDir() );

        if(FileSystem.MakePath(path) == FileSystem.MakePath(this.owner.InstallDir()))
            return true;

        return false;
    }
    //###############################################################
    //Apply method targets all found elements to remove
    //###############################################################
    this.UpgradeEntry.prototype.Apply = function ()
    {
        this.Log("Upgrade Entry: Apply begin");

        if(this.m_state == this.upgrade_state_t.none)
            return false;

        for(var i in this.m_targets)
            this.m_targets[i].Apply();

        this.Log("Upgrade Entry: Apply end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class GroupUpgradeEntry
    //###############################################################
    this.GroupUpgradeEntry = this.GroupUpgradeEntry || function(owner, id, type, act, name)
    {
        arguments.callee.superclass.constructor.call(this, owner, type, act, "GroupUpgradeEntry", name);
        this.Log = log_helper("GroupUpgradeEntry \"" + (name ? name : id) + "\": ");
        this.m_group_id = id;
    }
    //###############################################################
    // GroupUpgradeEntry is inheritted from UpgradeEntry
    extend(this.GroupUpgradeEntry, ns.UpgradeEntry);
    //###############################################################
    // Check verifies each object from group for upgrade ability
    //###############################################################
    this.GroupUpgradeEntry.prototype.Check = function ()
    {
        this.Reset();
        this.Log("Check");
        var grp = ns_installer.Installer.Groups[this.m_group_id];
        if(!grp)
            return false;

        var obj = null;

        for(var i in grp)
        {
            obj = grp[i];

            this.Log("Check object with id " + obj.Id());

            if(obj == this.owner)
            {
                this.Log("It is the same object as upgrade owner - skip from checking");
                continue;
            }

            if(this.VerifyInstallDir((obj.InstallDir ? obj.InstallDir() : "")) &&
               this.VerifyVersionRange((obj.Version ? obj.Version() : ""))
               )
            {
                this.AddTarget(obj);
            }
        }
        this.Log("Check end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class MSIComponentCodeUpgradeEntry
    //###############################################################
    this.MSIComponentCodeUpgradeEntry = this.MSIComponentCodeUpgradeEntry || function(owner, id, type, act, name)
    {
        arguments.callee.superclass.constructor.call(this, owner, type, act, "MSIComponentCodeUpgradeEntry", name);
        this.Log = log_helper("MSIComponentCodeUpgradeEntry \"" + (name ? name : id) + "\": ");
        this.m_msi_cc = id;
    }
    //###############################################################
    // MSIComponentCodeUpgradeEntry is inheritted from UpgradeEntry
    extend(this.MSIComponentCodeUpgradeEntry, ns.UpgradeEntry);
    //###############################################################
    // Check verifies each object from clients for msi component code for upgrade ability
    //###############################################################
    this.MSIComponentCodeUpgradeEntry.prototype.Check = function ()
    {
        this.Reset();
        this.Log("Check");

        var clients = [];

        if(this.SameDirOnly())
            clients = WI.ClientsInstalledComponent(this.m_msi_cc, this.owner.InstallDir());
        else
            clients = WI.ClientsInstalledComponent(this.m_msi_cc);

        var cl = null;

        for(var i in clients)
        {
            cl = clients[i];
            this.Log("Check object with id " + cl.Id);
            if(this.VerifyVersionRange(cl.Version))
            {
                var state = this.DefineUpgradeState(cl.Version);
                if(state != this.upgrade_state_t.none)
                {
                    var cmp = ns_installer.Installer.Components[cl.Id];
                    
                    if (!cmp)
                    {
                        //if it is a cached product, real component isn't created yet
                        //we will take a db version, and when it is processed, it will be replaced with an original one 
                        cmp = ns_installer.Installer.DBInfo.Components[cl.Id];
                    }

                    if(!cmp)
                    {
                        //this is alien component. In order to be able to process it
                        //we'll create a formal wrapper based on msi info
                        var wi_info = ns_info.InfoWIRegistry(cl.Id);
                        var c_info = ns_info.ComponentInfo();
                        c_info.AddInfo(wi_info);

                        cmp = ns_cmp_msi.Create({Info : c_info});

                        //cmp = ns_cmp_msi.Create(cl.Id);
                        //Create returns a clone, but what if someone create another clone?
                        // in that case remove will not have an effect therefore core component should be used
                        // in any case
                        cmp = ns_installer.Installer.Components[cl.Id];
                    }
                    else
                    {
                        this.Log(" Component with id " + cl.Id + " exists in installer");
                    }

                    if(cmp)
                    {
                       this.Log(" found prod id = \"" + cmp.Id() + "\" name = \"" + cmp.Name() + "\" ver = " + cmp.Version().Str() + " this ver =" + this.owner.Version().Str() )

                       this.AddTarget(cmp);
                    }
                    else
                    {
                        this.Log("ERROR: can't load msi with id = \"" + cl.Id + "\" msi is broken seems was incorrectly removed! Ignore.");
                    }
                }
            }
        }

        this.Log("Check end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class MSIProductCodeUpgradeEntry
    //###############################################################
    this.MSIProductCodeUpgradeEntry = this.MSIProductCodeUpgradeEntry || function(owner, id, type, act, name)
    {
        arguments.callee.superclass.constructor.call(this, owner, type, act, "MSIProductCodeUpgradeEntry", name);
        this.Log = log_helper("MSIProductCodeUpgradeEntry \"" + (name ? name : id) + "\": ");
        this.m_msi_pc = id;
    }
    //###############################################################
    // MSIProductCodeUpgradeEntry is inheritted from UpgradeEntry
    extend(this.MSIProductCodeUpgradeEntry, ns.UpgradeEntry);
    //###############################################################
    // Check verifies each object from clients for msi component code for upgrade ability
    //###############################################################
    this.MSIProductCodeUpgradeEntry.prototype.Check = function ()
    {
        this.Reset();
        this.Log("Check for existence of WI product with pcode \"" + this.m_msi_pc + "\"" );

        var cmp = ns_installer.Installer.Components[this.m_msi_pc];
        
        if (!cmp)
        {
            //if it is a cached product, real component isn't created yet
            //we will take a db version, and when it is processed, it will be replaced with an original one 
            cmp = ns_installer.Installer.DBInfo.Components[this.m_msi_pc];
        }

        if(!cmp)
        {
            //this is alien component. In order to be able to process it
            //we'll create a formal wrapper based on msi info
            var wi_info = ns_info.InfoWIRegistry(this.m_msi_pc);
            var c_info = ns_info.ComponentInfo();
            c_info.AddInfo(wi_info);

            cmp = ns_cmp_msi.Create({Info : c_info});

            //cmp = ns_cmp_msi.Create(this.m_msi_pc, this.m_msi_pc);
            //Create returns a clone, but what if someone create another clone?
            // in that case remove will not have an effect therefore core component should be used
            // in any case
            cmp = ns_installer.Installer.Components[this.m_msi_pc];
        }
        else
        {
            this.Log(" Component with id " + this.m_msi_pc + " exists in installer");
        }

        if(!cmp || cmp.State() != this.state_t.installed)
            this.Log("Product isn't installed");
        else
        {
            this.Log("Product is installed.");

            this.AddTarget(cmp);
        }
        this.Log("Check end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class MSIUpgradeCodeUpgradeEntry
    //###############################################################
    this.MSIUpgradeCodeUpgradeEntry = this.MSIUpgradeCodeUpgradeEntry || function(owner, id, type, act, name)
    {
        arguments.callee.superclass.constructor.call(this, owner, type, act, "MSIUpgradeCodeUpgradeEntry", name);
        this.Log = log_helper("MSIUpgradeCodeUpgradeEntry \"" + (name ? name : id) + "\": ");
        this.m_msi_uc = id;
    }
    //###############################################################
    // MSIUpgradeCodeUpgradeEntry is inheritted from UpgradeEntry
    extend(this.MSIUpgradeCodeUpgradeEntry, ns.UpgradeEntry);
    //###############################################################
    // Check verifies each object from clients for msi component code for upgrade ability
    //###############################################################
    this.MSIUpgradeCodeUpgradeEntry.prototype.Check = function ()
    {
        this.Reset();
        this.Log("Check" );

        var prods = WI.RelatedProducts(this.m_msi_uc);
        var wi_prods = [];

        if(prods && prods.length)
        {
            for(var i in prods)
            {
                var cmp = ns_installer.Installer.Components[prods[i]];
                
                if (!cmp)
                {
                    //if it is a cached product, real component isn't created yet
                    //we will take a db version, and when it is processed, it will be replaced with an original one 
                    cmp = ns_installer.Installer.DBInfo.Components[prods[i]];
                }

                if(!cmp)
                {
                    //this is alien component. In order to be able to process it
                    //we'll create a formal wrapper based on msi info
                    var wi_info = ns_info.InfoWIRegistry(prods[i]);
                    var c_info = ns_info.ComponentInfo();
                    c_info.AddInfo(wi_info);

                    cmp = ns_cmp_msi.Create({Info : c_info});
                    //Create returns a clone, but what if someone create another clone?
                    // in that case remove will not have an effect therefore core component should be used
                    // in any case
                    cmp = ns_installer.Installer.Components[prods[i]];
                }
                else
                {
                    this.Log(" Component with id " + prods[i] + " exists in installer");
                }

                if(cmp)
                    wi_prods.push(cmp);
            }
        }

        var prod = null;
        for(var j in wi_prods)
        {
            prod = wi_prods[j];
            if(prod && this.VerifyVersionRange(prod.Version()))
            {
                this.Log(" found prod id = \"" + prod.Id() + "\" name = \"" + prod.Name() + "\" ver = " + prod.Version().Str() + " this ver =" + this.owner.Version().Str() )
                var state = this.DefineUpgradeState(prod.Version());

                if(state != this.upgrade_state_t.none)
                {
                    this.AddTarget(prod);
                }
            }
        }

        this.Log("Check end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class ProductIdUpgradeEntry
    //###############################################################
    this.ProductIdUpgradeEntry = this.ProductIdUpgradeEntry || function(owner, id, type, act, name, by_mask)
    {
        arguments.callee.superclass.constructor.call(this, owner, type, act, "ProductIdUpgradeEntry", name);
        this.Log = log_helper("ProductIdUpgradeEntry \"" + (name ? name : id) + "\": ");
        this.m_product_id = id;
        this.m_product_by_mask = (by_mask ? true : false);
    }
    //###############################################################
    // ProductIdUpgradeEntry is inheritted from UpgradeEntry
    extend(this.ProductIdUpgradeEntry, ns.UpgradeEntry);
    //###############################################################
    // Check verifies each object from group for upgrade ability
    //###############################################################
    this.ProductIdUpgradeEntry.prototype.Check = function ()
    {
        this.Reset();
        this.Log("Check existence of products " +(this.m_product_by_mask ? "by mask " : "by id ")+ this.m_product_id);
        var filter_by = function(cont, m, by_mask)
        {
            var res = [];
            if (by_mask)
                iterate(cont, function(el, id) { if(id.match(RegExp(m))) res.push(el); });
            else if (cont[m])
                res.push(cont[m]);
                
            return res;  
        }
        
        var prds = filter_by(ns_installer.Installer.Products, this.m_product_id, this.m_product_by_mask);
        var prds_db = filter_by(ns_installer.Installer.DBInfo.Products, this.m_product_id, this.m_product_by_mask);
        iterate(prds_db, function(el) {if(prds.indexOf(el) == -1) prds.push(el); }); 
        if(!prds.length)
        {
            this.Log("Products weren't found.");
            return false;
        }
        
        for(var i in prds)
        {
           var prd = prds[i];
           this.Log("Product id = \"" + prd.Id() + "\" name = \"" + prd.Name() + "\" was found");

            if(this.VerifyInstallDir((prd.InstallDir ? prd.InstallDir() : "")) &&
               this.VerifyVersionRange((prd.Version ? prd.Version() : ""))
               )
            {
                this.AddTarget(prd);
            }
        }
        

        this.Log("Check end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class ComponentIdUpgradeEntry
    //###############################################################
    this.ComponentIdUpgradeEntry = this.ComponentIdUpgradeEntry || function(owner, id, type, act, name)
    {
        arguments.callee.superclass.constructor.call(this, owner, type, act, "ComponentIdUpgradeEntry", name);
        this.Log = log_helper("ComponentIdUpgradeEntry \"" + (name ? name : id) + "\": ");
        this.m_component_id = id;
    }
    //###############################################################
    // ComponentIdUpgradeEntry is inheritted from UpgradeEntry
    extend(this.ComponentIdUpgradeEntry, ns.UpgradeEntry);
    //###############################################################
    // Check verifies each object from group for upgrade ability
    //###############################################################
    this.ComponentIdUpgradeEntry.prototype.Check = function ()
    {
        this.Reset();
        this.Log("Check existence of the component " + this.m_component_id);
        var cmp = ns_installer.Installer.Components[this.m_component_id];
        if (!cmp)
        {
            cmp = ns_installer.Installer.DBInfo.Components[this.m_component_id];
        }

        if(!cmp)
        {
            this.Log("Component wasn't found.");
            return false;
        }

        this.Log("Component was found");

        if(this.VerifyInstallDir((cmp.InstallDir ? cmp.InstallDir() : "")) &&
           this.VerifyVersionRange((cmp.Version ? cmp.Version() : ""))
           )
        {
            this.AddTarget(cmp);
        }

        this.Log("Check end");
        return true;
    }
//###################################################################
//###################################################################
    //###############################################################
    //class Upgrade
    //###############################################################
    this.Upgrade = function(_owner)
    {
        var upgr = {};

        ns.Init();
        ns_enums.BindTo(upgr);

        var owner = _owner;
        var p_state = P(upgr.upgrade_state_t.none);
        //this.m_downgrade_forbidden = true;
        var m_entries = {};
        //###############################################################
        upgr.OlderExists = function ()
        {
            for(var i in m_entries)
                if(m_entries[i].OlderExists())
                    return true;

            return false;
        }
        //###############################################################
        upgr.NewerExists = function ()
        {
            for(var i in m_entries)
                if(m_entries[i].NewerExists())
                    return true;

            return false;
        }
        //###############################################################
        upgr.SameExists = function ()
        {
            for(var i in m_entries)
                if(m_entries[i].SameExists())
                    return true;

            return false;
        }
        //###############################################################
        upgr.Targets = function()
        {
            var arr = [];
            for(var i in m_entries)
            {
                arr = arr.concat(m_entries[i].Targets());
            }

            return arr;
        }
        //###############################################################
        upgr.FilterTargets = function(cb)
        {
            return iterate(m_entries, function(entry)
            {
                if(entry)
                    return iterate(entry.Targets(), cb);
            });
        }
        //###############################################################
        upgr.AddEntry = function(id, obj)
        {
            if(!id || !obj || upgr.EntryExist(id))
                return;

            m_entries[id] = obj;
        }
        //###############################################################
        upgr.EntryExist = function(id){ return (typeof(id) != "undefined" && id !== null) ? m_entries[id] : false; }
        //###############################################################
        upgr.FilterEntires = function(cb){ return iterate(m_entries, cb); }
        upgr.FilterEntries = function(cb){ return iterate(m_entries, cb); } // just duplicate with rigth name
        //###############################################################
        upgr.State = function()
        {
            var c_state = upgr.upgrade_state_t.none;

            for(var i in m_entries)
            {
                if(c_state == upgr.upgrade_state_t.mix)
                    break;

                var entry_st = m_entries[i].State();

                if(entry_st == upgr.upgrade_state_t.none)
                    continue;

                if(c_state == upgr.upgrade_state_t.none)
                    c_state = entry_st;
                else if(c_state != entry_st)
                    c_state = entry_st;
            }

            if(p_state() != c_state)
                p_state(c_state);

            return c_state;
        }

        upgr.State.Subscribe = p_state.Subscribe;
        /*
        //###############################################################
        // DowngradeForbidden
        //###############################################################
        upgr.DowngradeForbidden = function ()
        {
            if(arguments.length)
                m_downgrade_forbidden = arguments[0] ? true : false;

            return m_downgrade_forbidden;
        }
        */
        //###############################################################
        // Check
        //###############################################################
        upgr.Check = function ()
        {
            for(var i in m_entries)
                m_entries[i].Check();

            // to refresh state and launch subscribers on State.Subscribe
            upgr.State();
        }
        //###############################################################
        // Apply
        //###############################################################
        upgr.Apply = function ()
        {
            for(var i in m_entries)
                m_entries[i].Apply();

            return true;
        }
        //###############################################################
        // Provide an ability for upgrading by Group
        //###############################################################
        upgr.Group = function (group_id, v_min, v_max, same_dir_only, type, def_act, name)
        {
            if(!group_id)
                return false;

            var id = "group_" + group_id + "_" +
                     (v_min ? v_min : "") + "_" +
                     (v_max ? v_max : "") + "_" +
                     (same_dir_only ? "same_dir" : "any_dir") + "_" +
                     type + "_" +
                     def_act;

            if(upgr.EntryExist(id))
                return true;

            var ue = new ns.GroupUpgradeEntry(owner, group_id, type, def_act, name);
            ue.VMin(v_min);
            ue.VMax(v_max);
            ue.SameDirOnly(same_dir_only);

            upgr.AddEntry(id, ue);

            return true;
        }
        //###############################################################
        // Provide an ability for upgrading by MSI Component Code(Guid)
        //###############################################################
        upgr.MSICmpCode = function (msi_cmp_code, v_min, v_max, same_dir_only, type, def_act, name)
        {
            if(!msi_cmp_code)
                return false;

            var id = "MSICmpCode_" + msi_cmp_code + "_" +
                     (v_min ? v_min : "") + "_" +
                     (v_max ? v_max : "") + "_" +
                     (same_dir_only ? "same_dir" : "any_dir") + "_" +
                     type + "_" +
                     def_act;

            if(upgr.EntryExist(id))
                return true;

            var ue = new ns.MSIComponentCodeUpgradeEntry(owner, msi_cmp_code, type, def_act, name);
            ue.VMin(v_min);
            ue.VMax(v_max);
            ue.SameDirOnly(same_dir_only);

            upgr.AddEntry(id, ue);

            return true;
        }

        //###############################################################
        // Provide an ability for upgrading by MSI Product Code(Guid)
        //###############################################################
        upgr.MSIProductCode = function (msi_pcode, same_dir_only, type, def_act, name)
        {
            if(!msi_pcode)
                return false;

            var id = "MSIPrdCode_" + msi_pcode + "_" +
                     type + "_" +
                     def_act;

            if(upgr.EntryExist(id))
                return true;

            var ue = new ns.MSIProductCodeUpgradeEntry(owner, msi_pcode, type, def_act, name);
            ue.SameDirOnly(false);

            upgr.AddEntry(id, ue);

            return true;
        }
        //###############################################################
        // Provide an ability for upgrading by MSI Upgrade Code(Guid)
        //###############################################################
        upgr.MSIUpgradeCode = function (msi_ucode, v_min, v_max, type, def_act, name)
        {
            if(!msi_ucode)
                return false;

            var id = "MSIUpgrCode_" + msi_ucode + "_" +
                     (v_min ? v_min : "") + "_" +
                     (v_max ? v_max : "") + "_" +
                     type + "_" +
                     def_act;

            if(upgr.EntryExist(id))
                return true;

            var ue = new ns.MSIUpgradeCodeUpgradeEntry(owner, msi_ucode, type, def_act, name);
            ue.VMin(v_min);
            ue.VMax(v_max);
            ue.SameDirOnly(false);

            upgr.AddEntry(id, ue);

            return true;
        }

        //###############################################################
        // Provides an ability for upgrading by Product Id (from micl DB)
        //###############################################################
        upgr.ProductId = function (p_id, same_dir_only, type, def_act, name, by_mask)
        {
            if(!p_id)
                return false;

            var id = "PrdId_" + p_id + "_" +
                     type + "_" +
                     def_act + "_" +
                     (by_mask ? "mask" : "id");

            if(upgr.EntryExist(id))
                return true;

            var ue = new ns.ProductIdUpgradeEntry(owner, p_id, type, def_act, name, by_mask);
            ue.SameDirOnly(false);

            upgr.AddEntry(id, ue);

            return true;
        }

        //###############################################################
        // Provides an ability for upgrading by Component Id (from micl DB)
        //###############################################################
        upgr.ComponentId = function (c_id, same_dir_only, type, def_act, name)
        {
            if(!c_id)
                return false;

            var id = "CmpId_" + c_id + "_" +
                     type + "_" +
                     def_act;

            if(upgr.EntryExist(id))
                return true;

            var ue = new ns.ComponentIdUpgradeEntry(owner, c_id, type, def_act, name);
            ue.SameDirOnly(false);

            upgr.AddEntry(id, ue);

            return true;
        }

        return upgr;
    }
}
//end new function()
