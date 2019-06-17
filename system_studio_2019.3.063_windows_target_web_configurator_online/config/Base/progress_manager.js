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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var ns_dmp  = load("dumper.js");
    var ns_inst   = load("installer.js");
    var ns_global_progress = load("global_progress.js");
    var enums = load("enums.js");
    var ns_mthd  = load("method.js");

    var group_header_template =
    {
        "Install"  :"[PrgInstall]\n[PrgInstallCurrComponent]",
        "Uninstall":"[PrgRemove]\n[PrgRemoveCurrComponent]",
        "Download" : (!GetOpt.Exists("single-file-download") ? "[PrgDownload]\n[PrgDownloadFilesList]" : "[PrgDownload]\n[PrgDownloadCurrComponent]")
    };

    var item_name = function(item)
    {
        if(item && item.Attribute && item.Attribute("name"))
            return item.Attribute("name");

        return null;
    }

    var countable = function(item)
    {
        if(item)
        {
            if(item.Attribute && item.Attribute("countable"))
                return true;
            if(!item.Attribute)
                return true; // for older items - assume that all items are countable
        }

        return false;
    }

    this.adjust_rollback = function(item, current, total)
    {
        var header = StringList.Format("[PrgRollback]\n[PrgRollbackCurrComponent]", current, total);
        if(item_name(item))
            header += ": " + item_name(item);
   
        if(ns_inst.Installer.TypeProgress() == enums.type_progress_t.global_progress)
        {
            ns_global_progress.functor_rollback(item, total, header);				
        }
        else
        {
            Wizard.Notify("Progress1", "header", header);
            var progress = item.ProgressRollback();
            if(progress)
            {
                progress.backward = true;
                Wizard.Notify("Progress1", "connect", progress.id);
            }
        }
    }

    this.adjust_commit = function(item, current, total)
    {
        var header = StringList.Format("[PrgCommit]\n[PrgCommitCurrComponent]", current, total);
        if(item_name(item))
            header += ": " + item_name(item);
        if(ns_inst.Installer.TypeProgress() == enums.type_progress_t.global_progress)
        {
            ns_global_progress.functor_commit(item, header);
        
        }
        else
        {
            Wizard.Notify("Progress1", "header", header);
            var progress = item.ProgressCommit();
            if(progress)
            {
                progress.backward = false;
                Wizard.Notify("Progress1", "connect", progress.id);
            }
        }          
        
    }

    /* creates function which updates progress bar header
     *
     */
    this.create_header = function(dumper)
    {
        Log("Set header for progress bar");
        var groups = {}; // set of groups used later in processing

        var iter = ns_dmp.Iterator(dumper);
        // set filter function - ignore all skipped items
        iter.Filter(function(item){return !item.Skip()});
        while(iter.Next())
        {
            var item = iter.Get();
            if(item && countable(item))
            {
                // get action group
                var group = item.Group();
                if(!group) // in case if group is not defined - assume
                    group = "Install"; // that 'Install' group used
                var g = groups[group];
                if(!g) // group doesn't exist - create it
                {
                    g = {};
                    g.total = 0; // set total/current elements
                    g.current = 0;
                    if(group_header_template[group]) // set message template
                        g.header = group_header_template[group];
                    groups[group] = g;
                }
                g.total++; // increment total elements in group
            }
        }
        /* function used to attach Action progress to dialog progress
         * function is called from Apply functor
         * every group should be attached to particular progress
         */
        var bind_progress = function(progress, _group)
        {
            if(!_group)
                _group = "Install";
            if(groups[_group])
                groups[_group].progress = progress;
        }

        /* progress updated function
         * called from Apply functor
         * incoming argument - item which is currently executing
         */
        var get_grp = function(_item)
        {
            if(_item && _item.Group)
            {
                var _group = _item.Group();
                if(!_group)
                    _group = "Install";
                return (groups[_group] ? groups[_group] : groups["Uninstall"]);
            }
        }

        var header = function(_item)
        {
            if(_item && _item.Group)
            {
                var grp = get_grp(_item);
                if(grp)
                {
                    if(countable(_item))
                        grp.current++;
                    if(grp.current > grp.total)
                        grp.current = grp.total;

                    if((ns_inst.Installer.TypeProgress() == enums.type_progress_t.global_progress) && (grp.progress == "Progress1"))
                    {
                        ns_global_progress.create_header(_item, grp.current, grp.total, grp.header);
                    }
                    else
                    {
                        Log("call another type of progress:" + grp.progress);
                        var p_h = _item.ProgressApplyHeader || ( (typeof(_item.Holder) == "function" && _item.Holder()) ? _item.Holder().ProgressApplyHeader : null);
                        var message = "";
                        if(typeof(p_h) == "function")
                        {
                            message = p_h(grp.current ? grp.current : 1, grp.total);
                        }
                        else
                        {
                            var message = StringList.Format(grp.header, grp.current ? grp.current : 1, grp.total);
                            if(item_name(_item))
                                message += ": " + item_name(_item);
                        }
                        Wizard.Notify(grp.progress, "header", message);

                        var p = _item.ProgressApply();
                        if(p)
                        {
                            p.backward = false;
                            Wizard.Notify(grp.progress, "connect", p.id);
                        }
                    }
                }
            }
        }
        header.bind_progress = bind_progress;
        header.complete = function(_item)
        {
            if(_item && _item.Group)
            {
                var grp = get_grp(_item);
                if(grp)
                {
                    var prog = Progress();
                    if(prog)
                    {
                        //prog.total = -2;
                        //Wizard.Notify(grp.progress, "connect", prog.id);
                    }
                    else
                    {
                        Log(Log.l_error, "prog = Progress(); prog is null");
                    }
                }
            }
        }

        return header;

    }

    this.adjust_apply_functor = ns_mthd.Method(function (){ Log("ProgressManager: adjust_apply_functor: it is base empty function - done"); });
}