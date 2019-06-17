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
    var base   = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};
    
    var format = StringList.Format;
    

    this.Init = function()
    {
        var ns = this;

        var enums   = base("enums.js");
        var ns_pb   = base("parse_bool.js");

        var get_name = function(fea)
        {
            if(fea)
            {
                if(fea.SName)
                    return fea.SName();
                else
                    return fea.Name();
            }
            else
                return "";
        }
        
        var iterate = function(cont, cb)
        {
            if(!cont || !cb)
            {
                Log(Log.l_warning, "pre_install: container or cb isn't defined - cont = " + cont + " cb = " + cb);
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

        //###############################################################
        // required functions
        //###############################################################
        var sort_by_priority = function(a, b){ return (a.Priority ? a.Priority() : 100) - (b.Priority ? b.Priority() : 100); }

        var fproc_opt_rem = function (ftr, prfx, collector)
        {
            ftr.Upgrade().FilterEntires(function (entry, id)
            {
                if (entry.Type() == entry.upgrade_type_t.optional && entry.Targets().length)
                {
                    var targets = entry.Targets();
                    for(var k in targets)
                    {
                        if(targets[k].Action() == entry.action_t.remove)
                        {
                            collector.push(prfx + entry.Name());
                            break;
                        }
                    }
                }
            });
        }

        var fproc_inst = function (ftr, prfx, collector)
        {
            var self = arguments.callee;

            var check_cmps = function(f)
            {
                var cmps = f.Components().Items();
                for(var i in cmps)
                    if(f.action_t.install == cmps[i].Action() && cmps[i].UpgradeState() != f.upgrade_state_t.upgrade)
                        return true;

                return false;
            }

            var m_prfx = ftr.Info().Property("hidden") ? prfx : prfx + "   ";
            var sftr = ftr.Features().Order(sort_by_priority);

            var meet_req = false;
            for(var i in sftr)
            {
                var act = sftr[i].Action();
                var us = sftr[i].UpgradeState();
                var item;
                if(act == ftr.action_t.install && us != ftr.upgrade_state_t.upgrade)
                {
                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(m_prfx + get_name(sftr[i]));

                    self(sftr[i], m_prfx, collector);
                    meet_req = true;
                }
                else if(act == ftr.action_t.install && us == ftr.upgrade_state_t.upgrade)
                {
                    item = { text : m_prfx + get_name(sftr[i]), inactive : false};

                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(item);

                    if(!self(sftr[i], m_prfx, collector))
                    {
                        if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                            collector.pop();
                    }
                    else
                    {
                        if(!check_cmps(sftr[i])) // features components are not met group's requirements
                            item.inactive = true;

                        meet_req = true;
                    }
                }
                else if(act == ftr.action_t.mix)
                {
                    item = { text : m_prfx + get_name(sftr[i]), inactive : false};

                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(item);

                    if(!self(sftr[i], m_prfx, collector))
                    {
                        if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                            collector.pop();
                    }
                    else
                    {
                        if(!check_cmps(sftr[i])) // features components are not met group's requirements
                            item.inactive = true;

                        meet_req = true;
                    }
                }
            }

            if(meet_req)
                return true;

            if(check_cmps(ftr))
                meet_req = true;

            return meet_req;
        }
        //###############################################################
        var fproc_rem = function (ftr, prfx, collector)
        {
            var self = arguments.callee;

            var check_cmps = function(f)
            {
                var cmps = f.Components().Items();
                for(var i in cmps)
                    if(f.action_t.remove == cmps[i].Action())
                        return true;

                return false;
            }

            var m_prfx = ftr.Info().Property("hidden") ? prfx : prfx + "   ";
            var sftr = ftr.Features().Order(sort_by_priority);

            var meet_req = false;
            for(var i in sftr)
            {
                var act = sftr[i].Action();
                if(act == ftr.action_t.remove)
                {
                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(m_prfx + get_name(sftr[i]));

                    self(sftr[i], m_prfx, collector);
                    meet_req = true;
                }
                else if(act == ftr.action_t.mix)
                {
                    var item = { text : m_prfx + get_name(sftr[i]), inactive : false};

                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(item);

                    if(!self(sftr[i], m_prfx, collector))
                    {
                        if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                            collector.pop();
                    }
                    else
                    {
                        if(!check_cmps(sftr[i])) // features components are not met group's requirements
                            item.inactive = true;

                        meet_req = true;
                    }
                }
            }

            if(meet_req)
                return true;

            if(check_cmps(ftr))
                meet_req = true;

            return meet_req;
        }

        //###############################################################
        var fproc_dest = function (ftr, _list)
        {
            var self = arguments.callee;
            var initial_launch = _list ? false : true;
            var list = _list ? _list : [];

            //if(!ftr.Visible())
            //    return list;

            ftr.Components().Filter(function(obj)
            {
              var install_dir = obj.InstallDir();

              if(list.indexOf(install_dir) == -1)
              {
                var act = obj.Action();
                var st = obj.State();
                //if(act == obj.action_t.install || act == obj.action_t.mix || (st == obj.state_t.installed && act != obj.action_t.remove))
                if(act == obj.action_t.install)
                {
                    Log("push " + install_dir + " name = " + obj.Name());
                    list.push(install_dir);
                }
              }
            });

            var sftrs = ftr.Features().Order(sort_by_priority);

            for(var i in sftrs)
                self(sftrs[i], list);
            
            if (initial_launch && !ns_pb.ParseBoolean(ns.Product().Info().Property("not_delete_subfolders")))
            {
                //remove extended directories, if base directory exists
                //asume that incoming list contains only unique items
                var mark_extended = function(_path, _lst, _del_lst)
                {
                    iterate(_lst, function(_p) {
                        if (_p != _path && _p.length > _path.length)
                        {
                            if (_p.substr(0, _path.length) == _path)
                            {
                                if (_del_lst.indexOf(_p) == -1)
                                {
                                    Log("_del_lst.push " + _p);
                                    _del_lst.push(_p);
                                }
                            }
                        }
                    });
                }
                
                //delete all extended directories
                var d_list = [];
                iterate(list, function(m_path) {mark_extended(m_path, list, d_list); });
                iterate(d_list, function(_d) {list.splice(list.indexOf(_d), 1); });
            }

            // usable for case when all components are installed and the list is empty, - pre install causes an error "Incorrect path"
            // this check is performed in CreateMessage
            //if(initial_launch && list.length < 1)
            //    list.push(ftr.InstallDir());

            return list;
        }

        //###############################################################
        // function for creating list of components which are going to be installed (to pass it to msis for example
        //###############################################################
        var cmps_to_install = function (ftr, _list)
        {
            var self = arguments.callee;
            var list = _list ? _list : [];

            var cmps = ftr.Components().Items();

            for(var c in cmps)
                if(cmps[c].Action() == ftr.action_t.install)
                    list.push(cmps[c].Alias);

            var sftr = ftr.Features().Items();

            for(var f in sftr)
            {
                var act = sftr[f].Action();
                if(act == ftr.action_t.install || act == ftr.action_t.mix)
                    self(sftr[f], list);
            }

            return list;
        }
        //###############################################################
        var ftr_to_update = function (ftr, prfx, collector)
        {
            var self = arguments.callee;

            var check_cmps = function(f)
            {
                var cmps = f.Components().Items();
                for(var i in cmps)
                {
                    var cmp = cmps[i];
                    if( cmp.Action() == cmp.action_t.install && cmp.UpgradeState() == f.upgrade_state_t.upgrade)
                        return true;
                }
                return false;
            }

            var m_prfx = ftr.Info().Property("hidden") ? prfx : prfx + "   ";
            var sftr = ftr.Features().Order(sort_by_priority);

            var meet_req = false;
            for(var i in sftr)
            {
                var sf = sftr[i];
                var fact = sf.Action();
                var us = sftr[i].UpgradeState();
                if((fact == sf.action_t.install || fact == sf.action_t.mix) && us == ftr.upgrade_state_t.upgrade)
                {
                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(m_prfx + get_name(sftr[i]));

                    self(sftr[i], m_prfx, collector);
                    meet_req = true;
                }
                else if(us == ftr.upgrade_state_t.mix)
                {
                    var item = { text : m_prfx + get_name(sftr[i]), inactive : false};

                    if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                        collector.push(item);

                    if(!self(sftr[i], m_prfx, collector))
                    {
                        if(sftr[i].Visible() && !sftr[i].Info().Property("hidden"))
                            collector.pop();
                    }
                    else
                    {
                        if(!check_cmps(sftr[i])) // features components are not met group's requirements
                            item.inactive = true;

                        meet_req = true;
                    }
                }
            }

            if(meet_req)
                return true;

            if(check_cmps(ftr))
                meet_req = true;

            return meet_req;
        }
        //###############################################################

        var create_message = function()
        {
            var msg = {};

            var mode = enums.install_mode_t.install;
            var dnld_only = false;
            var product;
            var to_download_size = 0;
            var prod_size = 0;
            var to_optinal_remove = [];
            var destination = [];
            var to_install  = [];
            var to_remove   = [];
            var to_upgrade  = [];
            var custom      = [];

            msg.Mode = function(m) {if(!arguments.length) return mode; else mode = m;}
            msg.DownloadOnly = function(v) {if(!arguments.length) return dnld_only; else dnld_only = v;}
            msg.Product = function(name) {if(name) product = name; else return product;}
            msg.Destination = function(path) {if(path) destination.push(path); else return destination;}
            msg.ToInstall = function(comp) {if(comp) to_install.push(comp); else return to_install;}
            msg.ToRemove = function(comp) {if(comp) to_remove.push(comp); else return to_remove;}
            msg.ToUpgrade = function(comp) {if(comp) to_upgrade.push(comp); else return to_upgrade;}
            msg.Custom = function(_msg) {if(_msg) custom.push(_msg); else return custom;}
            msg.ToDownload = function(size) {if(size) to_download_size = size; return to_download_size;}
            msg.Size = function(size) {if(size) prod_size = size; return prod_size;}
            msg.ToOptRemove = function(comp) {if(comp) to_optinal_remove.push(comp); else return to_optinal_remove;}

            msg.Compile = function()
            {
                if(msg.Mode() != enums.install_mode_t.remove)
                {
                    var message = "";

                    var add_list = function(header, lst, getter)
                    {
                        if(lst.length)
                        {
                            message += StringList.Format("\\par\\b [%s]\\b0", header);
                            for(var i in lst)
                            {
                                if(getter)
                                    message += StringList.Format("\\line    [%s]", getter(lst[i]));
                                else
                                {
                                    if(typeof(lst[i]) != "string")
                                    {
                                        //if(lst[i].inactive) // need to revise the using of inactive removed for now as unnecessary
                                        //    message += StringList.Format("\\line    {\\cf1 [%s]}", lst[i].text);
                                        //else
                                            message += StringList.Format("\\line    [%s]", lst[i].text);
                                    }
                                    else
                                        message += StringList.Format("\\line    [%s]", lst[i]);
                                }
                            }
                        }
                    }

                    message += StringList.Format("{\\b [%s]}", product);

                    if (dnld_only)
                    {
                        add_list("[destination_folder]", destination, function(p){return p.replace(/\\/g, "\\\\");});
                        add_list("[components_to_download_only]", to_install);
                    }
                    else
                    {
                        add_list("[software_to_optional_remove]", to_optinal_remove);
                        add_list("[destination_folders]", destination, function(p){return p.replace(/\\/g, "\\\\");});
                        add_list("[configuration_options]", custom);
                        if(to_download_size)
                            message += StringList.Format("\\par\\b [components_to_download]\\b0", to_download_size);
                        add_list("[components_to_install]", to_install);
                        add_list("[components_to_update]", to_upgrade);
                        add_list("[components_to_remove]", to_remove);
                    }



                    return message;
                }
                else
                    return StringList.Format("{\\b [%s] [will_be_removed]}", product);
            }
            return msg;
        }

        var ns_path_check = base("path_checker.js");
        var message_generators = {};
        var pre_install_continue_checkers = {};

        var make_preinstall = function(dialog_id, space)
        {
            var enable_customize_button = false;

            Wizard.Notify(dialog_id + "/info", "disable autolink", true);

            var update_space_info = function(msg)
            {
                Log("incoming path: " + msg.Destination()[0]);

                var pchecker = ns_path_check.PathChecker(msg.Destination()[0]);
                pchecker.SpaceRequired(msg.Size());

                var invalid_path = function(reason)
                {
                    Wizard.Notify(dialog_id + "/space", "set rtf text", format("[space_incorrect_path_file]", pchecker.SpaceRequired()));
                    Wizard.Next.Disable();
                }

                pchecker.IsValid();

                if(pchecker.ErrorCode() == pchecker.target_path_error_t.incorrect_path)
                {
                    invalid_path(pchecker.ErrorMessage());
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.access_denied)
                {
                    Wizard.Notify(dialog_id + "/space", "set rtf text", format("[space_access_denied_file]", pchecker.SpaceRequired()));
                    Wizard.Next.Disable();
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.no_enough_space)
                {
                    Wizard.Notify(dialog_id + "/space", "set rtf text", format("[space_failed_file]", pchecker.SpaceRequired(), pchecker.SpaceAvailable()));
                    Wizard.Next.Disable();
                    return false;
                }
                else if(pchecker.ErrorCode() == pchecker.target_path_error_t.space_unknown)
                {
                    Wizard.Notify(dialog_id + "/space", "set rtf text", format("[space_unknown_file]", pchecker.SpaceRequired(), "[unknown]"));
                }
                else
                    Wizard.Notify(dialog_id + "/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired(), pchecker.SpaceAvailable()));

                Wizard.Next.Enable();
                return true;
            }

            var PreInstall = function(msg)
            {
                var download_only = ns.Installer().DownloadOnly();
                ns.DialogHeader(download_only ? "PreDownload" : "PreInstall");
                ns.stage("options.png");

                Wizard.Prev.Enable();
                Wizard.Cancel.Enable();

                if(!space)
                    Wizard.Next.Enable();
                else
                    update_space_info(msg);

                if(msg.Mode() != enums.install_mode_t.remove && msg.Mode() != enums.install_mode_t.repair)
                {
                    if(enable_customize_button)
                    {
                        PreInstall.CustomizeButtons();
                        Wizard.Notify("button4", "set text", "[Prev]");
                        Wizard.Notify("button4", "show");
                    }
                    else
                        PreInstall.Buttons();
                }
                else if(msg.Mode() == enums.install_mode_t.repair)
                {
                    Wizard.Next.Enable();
                    ns.buttons("[Repair]", "[Prev]", "[Cancel]");
                }
                else
                {
                    Wizard.Next.Enable();
                    ns.buttons("[Remove]", "[Prev]", "[Cancel]");
                }

                PreInstall.SetMessage(msg.Compile());

                if((msg.Mode() == enums.install_mode_t.modify || msg.Mode() == enums.install_mode_t.install)
                   &&
                   !msg.ToInstall().length && !msg.ToRemove().length && !msg.ToUpgrade().length && !msg.Custom().length)
                {
                    Wizard.Next.Disable();
                    switch (msg.Mode())
                    {
                        case enums.install_mode_t.install:
                            PreInstall.SetMessage(StringList.Format("{\\b [nothing_to_install]}"));
                            break;
                        case enums.install_mode_t.modify:
                            PreInstall.SetMessage(StringList.Format("{\\b [nothing_to_modify]}"));
                            break;
                    }
                }

                if(!PreInstall.AllowContinue())
                  Wizard.Next.Disable();

                var res = Action.Dialog({name:dialog_id, mode:"sync"});

                if(enable_customize_button)
                {
                    Wizard.Notify("button4", "hide");

                    if(res == Action.r_button4)
                        res = Action.r_back;
                    else if(res == Action.r_back)
                        res = Action.r_button4;
                }

                return res;
             }

            if(space)
              PreInstall.HideSpaceInfo = function(){Wizard.Notify(dialog_id + "/space", "hide");};
            else
              PreInstall.HideSpaceInfo = function(){ return; };

            PreInstall.ShowSpaceInfo = function(state)
            {
                if(typeof state == "undefined" || state == true)
                    Wizard.Notify(dialog_id + "/space", "show");
                else
                    Wizard.Notify(dialog_id + "/space", "hide");
            }

            PreInstall.Buttons = function()
            {
                ns.buttons("[Install]", "[Prev]", "[Cancel]");
            }

            PreInstall.CustomizeButtons = function()
            {
                ns.buttons("[Install]", "[Customize]", "[Cancel]");
            }

            PreInstall.EnableCustomizeButton = function(val){ enable_customize_button = val ? true : false; }

            PreInstall.GetDestinationList = fproc_dest;

            PreInstall.GetDownloadDir = function() { return ns.Installer().DownloadDir();}

            PreInstall.CreateMessage = function(product, download_only)
            {
                var msg = create_message();
                var i;
                if(product)
                {
                    msg.Mode(product.InstallMode());
                    msg.Product(product.Name());
                    msg.DownloadOnly(download_only);

                    var dests = [];
                    var to_opt_rm = [];
                    var to_inst = [];
                    var to_rm = [];
                    var to_updt = [];

                    if (download_only)
                    {
                        dests.push(PreInstall.GetDownloadDir());
                    }
                    else
                    {
                        dests = PreInstall.GetDestinationList(product); //fproc_dest(product, dests);

                        if(dests.length < 1) // there should be at least one install dir in any case, to have the update_space_info passed
                            dests.push(product.InstallDir());
                    }

                    for(i in dests) msg.Destination(dests[i]);

                    fproc_inst(product, " ", to_inst);
                    for(i in to_inst) msg.ToInstall(to_inst[i]);

                    ftr_to_update(product, " ", to_updt);
                    for(i in to_updt) msg.ToUpgrade(to_updt[i]);

                    fproc_rem(product, " ", to_rm);
                    for(i in to_rm) msg.ToRemove(to_rm[i]);

                    if(product.InstallMode() == product.install_mode_t.install)
                    {
                        fproc_opt_rem(product, " ", to_opt_rm);
                        for(i in to_opt_rm) msg.ToOptRemove(to_opt_rm[i]);
                    }

                    var components = product.ComponentsFullSet();

                    var files_to_download = {};

                    for(i in components)
                    {
                        var c = components[i];
                        if(c && (c.Action() == c.action_t.install || c.Action() == c.action_t.repair))
                        {
                            var src = c.Source();
                            if(src && src.Filter)
                            {
                                src.Filter(function(s)
                                {
                                    if(s.File)
                                    {
                                        if(s.Resolved)
                                            s.Resolved();

                                        var file = s.File();
                                        //in download mode we should not check file existence, because the destination folder is going to be deleted
                                        if (s.Size && (download_only || !FileSystem.Exists(file)))
                                        {
                                            files_to_download[file.toLowerCase()] = s.Size();
                                            Log("File going to be downloaded: " + file.toLowerCase() + " : " + s.Size());
                                        }
                                    }
                                });
                            }
                        }

                        //if(c && c.DownloadSize && c.DownloadSize() && (c.Action() == c.action_t.install || c.Action() == c.action_t.repair))
                        //    to_download_size += components[i].DownloadSize();
                    }

                    var download_additional_size = function()
                    {
                        //need to add additional size in download mode - the size of the product without Installs
                        var additional_size = 125829120; //about 120Mb
                        if (product.Info().Property("additional_product_size"))
                            additional_size = product.Info().Property("additional_product_size");

                        return additional_size;
                    }

                    var to_download_size = 0;

                    for(i in files_to_download)
                        to_download_size += files_to_download[i];

                    if (to_download_size)
                        to_download_size += download_additional_size();

                    if(to_download_size)
                        msg.ToDownload(to_download_size);

                    if (download_only)
                        msg.Size(to_download_size);
                    else
                        msg.Size(product.Size());

                }

                for(i in message_generators)
                {
                  Log("check mes gen " + i);
                  if(message_generators[i].Skip && message_generators[i].Skip())
                     continue;
                  Log("call mes gen " + i);
                  message_generators[i](msg);
                }

                return msg;
            }

           //###############################################################
           // adding callbacks which called after default message generation for its adjustment (like callback(msg))
           // usage:
           // AddMessageGenerator(callback)
           // AddMessageGenerator(callback, id)
           // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
           //###############################################################
            PreInstall.AddMessageGenerator = function()
            {
                var args = arguments;

                var id = null;
                var obj = null;

                if(args.length == 2)
                {
                    obj = args[0];
                    id = args[1];
                }
                else if(args.length == 1)
                {
                    obj = args[0];
                    id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
                }
                else
                {
                    Log(Log.l_warning, "PreInstall: can't add undefined MessageGenerator. ignore!");
                    return;
                }

                if(!id)
                  id = Guid();

                if(!message_generators[id])
                {
                    message_generators[id] = obj;
                    Log("PreInstall: add message generator " + id);
                }
            }

            PreInstall.SetMessage = function(msg)
            {
                Wizard.Notify(dialog_id + "/info", "set rtf text", StringList.Format("[preinstall_template]", msg));
            }

            //###############################################################
            // function which performs check if the continue is allowed if any callback returns true then continue is allowed
            // by default it returns true (if there are not any callbacks)
            //###############################################################
            var check_preinstall_continue_is_allowed = function()
            {
                var there_are_checkers = false;
                for(var i in pre_install_continue_checkers)
                {
                  there_are_checkers = true;

                  if(pre_install_continue_checkers[i].Skip && pre_install_continue_checkers[i].Skip())
                    continue;

                  var r = pre_install_continue_checkers[i]();
                  if(typeof(r) != "undefined" && !r)
                    return false;
                }

                return true;
            }
            //###############################################################
            // adding callbacks which called to check if continue is allowed or not
            // if any callback returns true then continue is allowed
            // each callback can have method Skip
            // usage:
            // AllowContinue(callback)
            // AllowContinue(callback, id)
            // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
            //###############################################################
            PreInstall.AllowContinue = function()
            {
                var args = arguments;

                var id = null;
                var obj = null;

                if(args.length == 2)
                {
                    obj = args[0];
                    id = args[1];
                }
                else if(args.length == 1)
                {
                    obj = args[0];
                    id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
                }
                else if(args.length > 2)
                {
                    Log("PreInstall.AllowContinue too many arguments for function call (> 2). Ignore.");
                    return;
                }
                else
                {
                    Log("PreInstall.AllowContinue was called without arguments -> need to check that continue is allowed");
                    return check_preinstall_continue_is_allowed();
                }

                if(!id)
                  id = Guid();

                if(!pre_install_continue_checkers[id])
                {
                    pre_install_continue_checkers[id] = obj;
                    Log("PreInstall.AllowContinue: add continue_checker " + id);
                }
            }

            PreInstall.AllowContinue.Clear = function(){ pre_install_continue_checkers = {}; }

            //###############################################################
            ns.DialogHeader("PreInstall", "[subtitle_preinstall]");
            ns.DialogHeader("PreDownload", "[subtitle_predownload]");

            return PreInstall;
        }

        this.PreInstall = make_preinstall("pre_install");
        this.PreInstallSpace = make_preinstall("pre_install_space", true);
     }
}
