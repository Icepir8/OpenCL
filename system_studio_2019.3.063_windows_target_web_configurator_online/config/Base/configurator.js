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

/** @file apply.js
 *  @brief apply.js - basic implementation of Component object
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

    var ns_dump      = load("dumper.js");
    var ns_mthd      = load("method.js");
    var ns_prop      = load("property.js");

    var P = function(val){return ns_prop.Property(val);}
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

    var blank_f = function(){return ""};

    var ns = this;
    //###############################################################
    //class Configurator
    //###############################################################
    this.Configurator = function(owner)
    {
        var cnfg = {};
        var obj = owner;

        //var m_apply_upgrade_done = false;
        //var m_apply_remove_done = false;
        //var m_apply_install_done = false;

        //###############################################################
        cnfg.UpgradeDone = PBool(false);
        cnfg.RemoveDone = PBool(false);
        cnfg.InstallDone = PBool(false);
        cnfg.RepairDone = PBool(false);
        cnfg.CommitDone = PBool(false);
        //###############################################################

        cnfg.Apply = function (action, dmp)
        {
        /*
            if(action == obj.apply_t.resolve)
            {
                return cnfg.ResolveSrc(dmp);
            }
            else if(action == obj.apply_t.upgrade)
            {
                return cnfg.Upgrade();
            }
            else if(action == obj.apply_t.remove)
            {
                return cnfg.Remove();
            }

            else if(action == obj.apply_t.install)
            {
                return cnfg.Install();
            }
            */
        }
        //###############################################################
        cnfg.Apply.Upgrade = function()
        {
            obj.Log("DoApplyUpgrade begin");

            if(cnfg.UpgradeDone())
            {
                obj.Log("ApplyUpgrade: was already done -> skip");
                return true;
            }

            if(!cnfg.TestUpgrade())
            {
                obj.Log("ApplyUpgrade: it isn't applicable as TestInstall is failed");
                return true;
            }

            var res = cnfg.Apply.DoUpgrade();

            cnfg.UpgradeDone(true);

            return res;

        }
        //###############################################################
        cnfg.Apply.ResolveSrc = function(dmp)
        {
            obj.Log("DoApplyResolveSrc begin");

            if(cnfg.InstallDone())
            {
                obj.Log("ApplyResolveSrc: was already done -> skip");
                return true;
            }

            if(!cnfg.TestInstall())
            {
                obj.Log("ApplyResolveSrc: it isn't applicable as TestInstall is failed");
                return true;
            }

            return cnfg.Apply.DoResolveSrc(dmp);
        }

        //###############################################################
        cnfg.Apply.Install = function(dmp)
        {
            obj.Log("DoApplyInstall begin");

            if(cnfg.InstallDone())
            {
                obj.Log("ApplyInstall: was already done -> skip");
                return true;
            }

            if(!cnfg.TestInstall())
            {
                obj.Log("ApplyInstall: it isn't applicable as TestInstall is failed");
                return true;
            }

            var res = cnfg.Apply.DoInstall(dmp);

            cnfg.InstallDone(true);

            return res;

        }
        //###############################################################
        cnfg.Apply.Repair = function(dmp)
        {
            obj.Log("DoApplyRepair begin");

            if(cnfg.RepairDone())
            {
                obj.Log("ApplyRepair: was already done -> skip");
                return true;
            }

            if(!cnfg.TestRepair())
            {
                obj.Log("ApplyRepair: it isn't applicable as TestRepair is failed");
                return true;
            }

            var res = cnfg.Apply.DoRepair(dmp);

            cnfg.RepairDone(true);

            return res;

        }
        //###############################################################
        cnfg.Apply.Remove = function(dmp)
        {
            obj.Log("ApplyRemove begin");

            if(cnfg.RemoveDone())
            {
                obj.Log("ApplyRemove: was already done -> skip");
                return true;
            }

            if(!cnfg.TestRemove())
            {
                obj.Log("ApplyRemove: it isn't applicable as TestRemove is failed");
                return true;
            }

            var res = cnfg.Apply.DoRemove(dmp);

            cnfg.RemoveDone(true);

            return res;

        }
        //###############################################################
        cnfg.Commit = function ()
        {
            obj.Log("Commit begin");

            if(cnfg.CommitDone())
            {
                obj.Log("Commit: was already done -> skip");
                return true;
            }

            //Commit should be done for all components due to disabled can be set by dependency

            /*
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                obj.Log("Commit: component is disabled -> can't commit");
                return true;
            }
             */

            var res = cnfg.DoCommit();

            cnfg.CommitDone(true);

            return res;
        }
        //###############################################################
        cnfg.Apply.DoUpgrade = ns_mthd.Method(function () { obj.Log("Configurator: DoUpgrade: it is base empty function - done"); return true;});
        //###############################################################
        cnfg.Apply.DoRemove = ns_mthd.Method(function (dmp) { obj.Log("Configurator: DoRemove: it is base empty function - done"); return true;});
        //###############################################################
        cnfg.Apply.DoRepair = ns_mthd.Method(function (dmp) { obj.Log("Configurator: DoRepair: it is base empty function - done"); return true;});
        //###############################################################
        cnfg.Apply.DoInstall = ns_mthd.Method(function (dmp) { obj.Log("Configurator: DoInstall: it is base empty function - done"); return true;});
        //###############################################################
        cnfg.Apply.DoResolveSrc = ns_mthd.Method(function (dmp) { obj.Log("Configurator: DoResolveSrc: it is base empty function - done"); return true;});
        //###############################################################
        //this.PreAction = function () { return obj.Dumper().PreAction(); }
        //###############################################################
        //this.PostAction = function () { return obj.Dumper().PostAction(); }
        //###############################################################
        cnfg.DoCommit = ns_mthd.Method(function () { obj.Log("Configurator: DoCommit: it is base empty function - done"); return true;});
        //###############################################################
        cnfg.AdjustEvents = function()
        {
            cnfg.Apply.Upgrade.SubscribeOnBegin = cnfg.Apply.DoUpgrade.SubscribeOnBegin;
            cnfg.Apply.Upgrade.SubscribeOnEnd = cnfg.Apply.DoUpgrade.SubscribeOnEnd;

            cnfg.Apply.Remove.SubscribeOnBegin = cnfg.Apply.DoRemove.SubscribeOnBegin;
            cnfg.Apply.Remove.SubscribeOnEnd = cnfg.Apply.DoRemove.SubscribeOnEnd;

            cnfg.Apply.Install.SubscribeOnBegin = cnfg.Apply.DoInstall.SubscribeOnBegin;
            cnfg.Apply.Install.SubscribeOnEnd = cnfg.Apply.DoInstall.SubscribeOnEnd;

            cnfg.Apply.Repair.SubscribeOnBegin = cnfg.Apply.DoRepair.SubscribeOnBegin;
            cnfg.Apply.Repair.SubscribeOnEnd = cnfg.Apply.DoRepair.SubscribeOnEnd;

            cnfg.Apply.ResolveSrc.SubscribeOnBegin = cnfg.Apply.DoResolveSrc.SubscribeOnBegin;
            cnfg.Apply.ResolveSrc.SubscribeOnEnd = cnfg.Apply.DoResolveSrc.SubscribeOnEnd;

            cnfg.Commit.SubscribeOnBegin = cnfg.DoCommit.SubscribeOnBegin;
            cnfg.Commit.SubscribeOnEnd = cnfg.DoCommit.SubscribeOnEnd;
        }

        obj.ApplyUpgrade = cnfg.Apply.Upgrade;
        obj.ApplyRemove = cnfg.Apply.Remove;
        obj.ApplyInstall = cnfg.Apply.Install;
        obj.ApplyRepair = cnfg.Apply.Repair;
        obj.ApplyResolveSrc = cnfg.Apply.ResolveSrc;
        obj.Commit  = cnfg.Commit;

        return cnfg;
    }//end for this.Configurator
//#######################################################################
// class ComponentConfigurator
//#######################################################################
    this.ComponentConfigurator = function(owner)
    {
        var obj = owner;
        var cnfg = ns.Configurator(owner);

        //###############################################################
        // TestRemove to process shared components
        //###############################################################
        cnfg.TestRemove = function()
        {
            var act = obj.Action();
            if(act != obj.action_t.remove)
            {
                obj.Log("CMP TestRemove: remove isn't applicable as action = " + act + ", component won't be removed;");
                return false;
            }

            obj.Log("TestRemove: check if this component can be removed");

            if(obj.Permanent && obj.Permanent() == obj.permanent_t.yes)
            {
                obj.Log("TestRemove: component is permanent -> can't be removed");
                return false;
            }

            if(obj.IsOriginal())
                return (obj.State() == obj.state_t.installed) ? true : false;

            if(obj.Original().State() == obj.state_t.installed)
            {
                // we should check if there are other clients for this component before removing it
                // we considering only clones with none empty Parent
                /*
                obj.Log("TestRemove: check all clones ...");
                var m_clones = obj.Clones().Order();
                for(var i = 0, cln; cln = m_clones[i]; i++)
                    if( cln.Parent() &&
                        (cln.State() == obj.state_t.installed && cln.Action() != obj.action_t.remove) ||
                        (cln.State() == obj.state_t.absent    && cln.Action() == obj.action_t.install)
                        )
                    {
                        obj.Log("TestRemove: clone " + i + " state = " + cln.State() + " action = " + cln.Action() + " - > can't be removed due to there are other clients!");
                        return false; // component can't be removed
                    }
                    else
                    {
                        if(!cln.Parent())
                            obj.Log("TestRemove: clone " + i + " is orphaned (parent is undefined)!");
                        else
                            obj.Log("TestRemove: clone " + i + " state = " + obj.State() + " action = " + obj.Action() + "!");
                    }
                */
                if(obj.HasClients())
                  return false;
            }
            else
            {
                obj.Log("TestRemove: component isn't installed -> component can't be removed");
                return false;
            }

            obj.Log("TestRemove: there isn't any clients which install or has this component installed -> component can be removed");
            return true;//component can be removed
        }
        //###############################################################
        // TestUpgrade
        //###############################################################
        cnfg.TestUpgrade = function()
        {
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                obj.Log("TestUpgrade: component is disabled -> can't upgrade");
                return false;
            }

            var act = obj.Action();
            if(act != obj.action_t.install)
            {
                obj.Log("CMP ApplyUpgrade: it isn't applicable as action = " + act);
                return false;
            }

            if(obj.Original().State() == obj.state_t.absent)
              return true;

            return false;
        }
        //###############################################################
        // TestInstall to process shared components
        //###############################################################
        cnfg.TestInstall = function()
        {
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                obj.Log("TestInstall: component is disabled -> can't install");
                return false;
            }

            var act = obj.Action();
            if(act != obj.action_t.install && act != obj.action_t.reinstall)
            {
                obj.Log("CMP ApplyInstall: it isn't applicable as action = " + act);
                return false;
            }

            if( (obj.Original().State() == obj.state_t.absent && act == obj.action_t.install)
                ||
                (obj.Original().State() == obj.state_t.installed && act == obj.action_t.reinstall)
              )
              return true;

            return false;
        }
        //###############################################################
        // TestRepair
        //###############################################################
        cnfg.TestRepair = function()
        {
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                obj.Log("TestRepair: component is disabled -> can't repair");
                return false;
            }

            var act = obj.Action();
            if(act != obj.action_t.repair)
            {
                obj.Log("CMP ApplyRepair: it isn't applicable as action = " + act + " and state = " + obj.State());
                return false;
            }
            else if(obj.Original().State() == obj.state_t.absent || obj.State() == obj.state_t.absent)
            {
                obj.Log("CMP ApplyRepair: it isn't applicable as original (or clone) component state is \"absent\" ");
                return false;
            }

            return true;
        }
        //###############################################################
        cnfg.Apply.DoUpgrade = ns_mthd.Method(function ()
        {
            obj.Log("DoUpgrade begin");
            obj.Upgrade().Apply();
            obj.Log("DoUpgrade end");
            return true;
        });
        //###############################################################
        cnfg.Apply.DoRemove = ns_mthd.Method(function (dmp)
        {
            obj.Log("DoRemove: " + obj.Name()  + " will be removed");

            var act = null;

            if(obj.Processor() && obj.Processor().RemoveAct)
            {
                act = obj.Processor().RemoveAct(obj);
                if(!act)
                {
                    obj.Log("DoRemove: component can't be removed due to component processor didn't return any action");
                    return false;
                }
            }
            else
            {
                obj.Log("DoRemove: component can't be removed due to component processor isn't defined or it doesn't has method RemoveAct");
                return false;
            }


            if(dmp && dmp.IsDumper)
            {
                if(obj.Processor())
                    obj.Processor().RemoveActObject.DefaultSet(act); // the usual way is blocked for this property

                var admp = obj.Dumper().AddAction(act, "remove " + obj.Name());
                if(!act.hidden)
                {
                    admp.Attribute("countable", true);
                    admp.Attribute("name", obj.Name());
                }
                dmp.AddAction(obj.Dumper(),"dmpr_" + obj.Name());
            }
            else
            {
                obj.Log("DoRemove: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");
                return false;
            }

            obj.Log("DoRemove end");

            return true;
        });
        //###############################################################
        cnfg.Apply.DoInstall = ns_mthd.Method(function (dmp)
        {
            cnfg.Apply.DoResolveSrc(obj.Dumper());

            obj.Log("DoInstall: " + obj.Name()  + " will be installed");

            var act = null;

            if(obj.Processor() && obj.Processor().InstallAct)
            {
                act = obj.Processor().InstallAct(obj);
                if(!act)
                {
                    obj.Log("DoInstall: component can't be installed due to component processor didn't return any action");
                    return false;
                }
            }
            else
            {
                obj.Log("DoInstall: component can't be installed due to component processor isn't defined or it doesn't has method InstallAct");
                return false;
            }

            if(dmp && dmp.IsDumper)
            {
                if(obj.Processor())
                    obj.Processor().InstallActObject.DefaultSet(act); // the usual way is blocked for this property

                var admp = obj.Dumper().AddAction(act, "install " + obj.Name());
                if(!act.hidden)
                {
                    admp.Attribute("countable", true);
                    admp.Attribute("name", obj.Name());
                }
                dmp.AddAction(obj.Dumper(),"dmpr_" + obj.Name());
            }
            else
            {
                obj.Log("DoInstall: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");
                return false;
            }

            return true;
        });
        //###############################################################
        cnfg.Apply.DoRepair = ns_mthd.Method(function (dmp)
        {
            cnfg.Apply.DoResolveSrc(obj.Dumper());

            obj.Log("DoRepair: " + obj.Name()  + " will be repaired");

            var act = null;

            if(obj.Processor() && obj.Processor().RepairAct)
            {
                act = obj.Processor().RepairAct(obj);
                if(!act)
                {
                    obj.Log("DoRepair: component can't be repaired due to component processor didn't return any action");
                    return false;
                }
            }
            else
            {
                obj.Log("DoRepair: component can't be repaired due to component processor isn't defined or it doesn't has method RepairAct");
                return false;
            }

            if(dmp && dmp.IsDumper)
            {
                if(obj.Processor())
                    obj.Processor().RepairActObject.DefaultSet(act); // the usual way is blocked for this property

                var admp = obj.Dumper().AddAction(act, "repair " + obj.Name());
                if(!act.hidden)
                {
                    admp.Attribute("countable", true);
                    admp.Attribute("name", obj.Name());
                }
                dmp.AddAction(obj.Dumper(),"dmpr_" + obj.Name());
            }
            else
            {
                obj.Log("DoRepair: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");
                return false;
            }

            return true;
        });
        //###############################################################
        cnfg.Apply.DoResolveSrc = ns_mthd.Method(function (dmp)
        {
            obj.Log("Component.DoResolveSrc started: " + obj.Name());
            if(!obj.Source())
            {
                obj.Log(Log.l_error, "DoApplyResolveSrc: Source is undefined - nothing to resolve!");
                return false;
            }

            var pre_build_op = obj.Source().Resolve();

            if(pre_build_op)
            {
                if(dmp && dmp.IsDumper)
                {
                    var d = dmp.AddAction(pre_build_op, "resolving_sources_for" + obj.Name());
                    //d.Attribute("countable", true); //setting countable leads to counting all underlying actions 
                    d.Attribute("name", obj.Name());
                    pre_build_op.Group("Download");
                }
                else
                {
                    obj.Log("DoApplyResolveSrc: Can't schedule actions - input dumper is undefined or not a dumper (!dmp.IsDumper)");
                    return false;
                }
            }
            else
            {
                obj.Log("DoApplyResolveSrc: Nothing actions required for sources resolution");
            }

            return true;
        });
        //###############################################################
        cnfg.DoCommit = ns_mthd.Method(function ()
        {
            obj.Log("DoCommit: " + obj.Name()  + " will be committed");

            if(obj.Processor())
            {
                return obj.Processor().Commit(obj);
            }

            obj.Log("DoCommit: component can't be committed due to component processor isn't defined");
            return false;

        });

        cnfg.AdjustEvents();

        return cnfg;
    }
//#######################################################################
// class FeatureConfigurator
//#######################################################################
    this.FeatureConfigurator = function(owner)
    {
        var obj = owner;
        var cnfg = ns.Configurator(owner);
        //###############################################################
        // TestRemove checks if the object can be removed
        //###############################################################
        cnfg.TestRemove = function ()
        {
            var act = obj.Action();
            if(act != obj.action_t.remove && act != obj.action_t.mix)
            {
                obj.Log("FTR ApplyRemove: it isn't applicable as action = " + act);
                return false;
            }

            return true;
        }
        //###############################################################
        // TestUpgrade checks if the object's upgrade can be applied
        //###############################################################
        cnfg.TestUpgrade = function ()
        {
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                Log("TestUpgrade: feature is disabled -> can't upgrade");
                return false;
            }

            if(obj.State() == obj.state_t.installed && obj.StateConsistent())
            {
                obj.Log("FTR ApplyUpgrade: it isn't applicable as state = installed and it is consistent for all childs");
                return false;
            }

            var act = obj.Action();
            if(act != obj.action_t.install && act != obj.action_t.mix)
            {
                obj.Log("FTR ApplyUpgrade: it isn't applicable as action = " + act);
                return false;
            }

            return true;
        }

        //###############################################################
        // TestInstall checks if the object can be installed
        //###############################################################
        cnfg.TestInstall = function ()
        {
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                Log("TestInstall: feature is disabled -> can't install");
                return false;
            }

            var act = obj.Action();
            if(act != obj.action_t.install && act != obj.action_t.mix)
            {
                obj.Log("FTR ApplyInstall: it isn't applicable as action = " + act);
                return false;
            }

            return true;
        }
        //###############################################################
        // TestRepair checks if the object can be repaired
        //###############################################################
        cnfg.TestRepair = function ()
        {
            if(obj.Disabled() == obj.disabled_t.yes)
            {
                Log("TestRepair: feature is disabled -> can't repair");
                return false;
            }

            var act = obj.Action();
            if(act != obj.action_t.repair && act != obj.action_t.mix)
            {
                obj.Log("FTR ApplyRepair: it isn't applicable as action = " + act);
                return false;
            }

            return true;
        }
        //###############################################################
        // DoApplyUpgrade method targeted to be redefinded by descendants
        //###############################################################
        cnfg.Apply.DoUpgrade = ns_mthd.Method(function ()
        {
            obj.Log("ApplyUpgrade begin");

            // features own upgrade should be taken only in case if it is absent
            if(obj.State() == obj.state_t.absent)
                obj.Upgrade().Apply();

            if(!obj.Components().Apply(function(el){return el.ApplyUpgrade()}))
            {
                var elc = obj.Components().Apply.FailedItem;
                if(elc) obj.Log("component id = " + elc.Id() + " name = " + elc.Name() + " caused failure during Apply.Upgrade!");
                return false;
            }

            if(!obj.Features().Apply(function(el){return el.ApplyUpgrade()}))
            {
                var elf = obj.Features().Apply.FailedItem;
                if(elf) obj.Log("feature id = " + elf.Id() + " name = " + elf.Name() + " caused failure during Apply.Upgrade!");
                return false;
            }

            obj.Log("ApplyUpgrade end");
            return true;
        });
        //###############################################################
        // DoApplyResolveSrc method targeted to be redefinded by descendants
        //###############################################################
        cnfg.Apply.DoResolveSrc = ns_mthd.Method(function (dmp)
        {
            if(!obj.Components().Apply(function(el){return el.ApplyResolveSrc(dmp)}))
            {
                var elc = obj.Components().Apply.FailedItem;
                if(elc) obj.Log("component id = " + elc.Id() + " name = " + elc.Name() + " caused failure during Apply.ResolveSrc!");
                return false;
            }

            if(!obj.Features().Apply(function(el){return el.ApplyResolveSrc(dmp)}))
            {
                var elf = obj.Features().Apply.FailedItem;
                if(elf) obj.Log("feature id = " + elf.Id() + " name = " + elf.Name() + " caused failure during Apply.ResolveSrc!");
                return false;
            }

            return true;
        });
        //###############################################################
        // DoRemove method targeted to be redefinded by descendants
        //###############################################################
        cnfg.Apply.DoRemove = ns_mthd.Method(function (dmp)
        {
            obj.Log("DoRemove started");

            if(!obj.Features().ApplyReverse(function(el){return el.ApplyRemove(dmp)}))
            {
                var elf = obj.Features().ApplyReverse.FailedItem;
                if(elf) obj.Log("feature id = " + elf.Id() + " name = " + elf.Name() + " caused failure during ApplyRemove!");
                return false;
            }

            if(!obj.Components().ApplyReverse(function(el){return el.ApplyRemove(dmp)}))
            {
                var elc = obj.Components().ApplyReverse.FailedItem;
                if(elc) obj.Log("component id = " + elc.Id() + " name = " + elc.Name() + " caused failure during ApplyRemove!");
                return false;
            }

            obj.Log("DoRemove done");
            return true;
        });
        //###############################################################
        // DoApplyInstall method targeted to be redefinded by descendants
        //###############################################################
        cnfg.Apply.DoInstall = ns_mthd.Method(function (dmp)
        {
            var apply_dumper = ns_dump.Dumper("apply_dumper_for_" + obj.Id());
            dmp.AddAction(apply_dumper);
            apply_dumper.IgnoreError = obj.ErrorHandler.GetRaw();

            if(!obj.Components().Apply(function(el){return el.ApplyInstall(apply_dumper)}))
            {
                var elc = obj.Components().Apply.FailedItem;
                if(elc) obj.Log("component id = " + elc.Id() + " name = " + elc.Name() + " caused failure during Apply.Install!");
                return false;
            }

            if(!obj.Features().Apply(function(el){return el.ApplyInstall(apply_dumper)}))
            {
                var elf = obj.Features().Apply.FailedItem;
                if(elf) obj.Log("feature id = " + elf.Id() + " name = " + elf.Name() + " caused failure during Apply.Install!");
                return false;
            }

            return true;
        });
        //###############################################################
        // DoApplyRepair method targeted to be redefinded by descendants
        //###############################################################
        cnfg.Apply.DoRepair = ns_mthd.Method(function (dmp)
        {
            var apply_dumper = ns_dump.Dumper("apply_dumper_for_" + obj.Id());
            dmp.AddAction(apply_dumper);
            apply_dumper.IgnoreError = obj.ErrorHandler.GetRaw();

            if(!obj.Components().Apply(function(el){return el.ApplyRepair(apply_dumper)}))
            {
                var elc = obj.Components().Apply.FailedItem;
                if(elc) obj.Log("component id = " + elc.Id() + " name = " + elc.Name() + " caused failure during Apply.Repair!");
                return false;
            }

            if(!obj.Features().Apply(function(el){return el.ApplyRepair(apply_dumper)}))
            {
                var elf = obj.Features().Apply.FailedItem;
                if(elf) obj.Log("feature id = " + elf.Id() + " name = " + elf.Name() + " caused failure during Apply.Repair!");
                return false;
            }

            return true;
        });
        //###############################################################
        // DoCommit method targeted to be redefinded by descendants
        //###############################################################
        cnfg.DoCommit = ns_mthd.Method(function ()
        {
            if(!obj.Components().Apply(function(el){return el.Commit()}))
            {
                var elc = obj.Components().Apply.FailedItem;
                if(elc) obj.Log("component id = " + elc.Id() + " name = " + elc.Name() + " caused failure during Commit!");
                return false;
            }

            if(!obj.Features().Apply(function(el){return el.Commit()}))
            {
                var elf = obj.Features().Apply.FailedItem;
                if(elf) obj.Log("feature id = " + elf.Id() + " name = " + elf.Name() + " caused failure during Commit!");
                return false;
            }

            return true;
        });
        //###############################################################

        cnfg.AdjustEvents();

        return cnfg;
    }//end for FeatureConfigurator
}
