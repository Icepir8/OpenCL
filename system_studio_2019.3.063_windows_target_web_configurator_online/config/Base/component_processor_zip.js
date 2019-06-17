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

new function ()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns_proc = load("component_processor.js");
    var ns_dmp  = load("dumper.js");
    var ns_fdmp = load("dumper_file.js");
    var ns_ddmp = load("dumper_db.js");

    var abspath = FileSystem.AbsPath;

    var db_only = function() {return GetOpt.Exists("db-processor");};

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    //###################################################################################
    // MSI processor
    //###################################################################################
    this.ProcessorZip = function()
    {
        if(db_only())
            return ns_proc.ProcessorDB();

        var db_key_name = "Component::ZIP"
        var files_key = "Files";

        var proc = ns_proc.Processor();

        var fastremove = function()
        {
            var owner = proc.Owner ? proc.Owner() : null;
            if(owner && owner.SourceNode && filter(owner.SourceNode.select("/component/remove"), function(n){return true;}))
            {
                filter(owner.SourceNode.select("/component/remove"), function(n)
                {
                    var path = abspath(owner.InstallDir(), n.text);
                    if(FileSystem.Exists(path))
                    {
                        Log("ZIP: deleting dir: " + path);
                        FileSystem.Delete(path);
                    }
                });
            }
            else
            {
                Log("ZIP: deleting root dir: " + owner.InstallDir());
                FileSystem.Delete(owner.InstallDir());
            }
            return Action.r_ok;
        };

        proc.InstallAct = function()
        {
            Log("ProcessorZIP: getting InstallAct");

            var dumper_db = ns_ddmp.CreateAction();
            var dumper_zip = DumperAction.Zip();

            var dumper_config = {};

            var storage = Storage("Zip::Processing::*");

            var config_progress = Progress();

            dumper_config.ProgressApply = function() {return config_progress;}

            var owner = proc.Owner ? proc.Owner() : null;

            if(owner && owner.Info().Property("mode") == "fast")
                var fast = true;

            dumper_config.Apply = function()
            {
                Log("dumper_config.Apply started...");
                Log("Opening Zip archive...");
                if(owner)
                {
                    var f = (owner.Source && owner.Source()) ? owner.Source().File() : null;
                    if(f)
                    {
                        Log("  File name: " + f);
                        dumper_zip.Configure({path:f, destination:owner.InstallDir(), fast:fast});
                        if(FileSystem.Exists(f))
                        {
                            var z = Zip(f);
                            if(z && z.Valid())
                            {
                                if(!fast)
                                {
                                    Log("  Opened & valid");
                                    var files = z.FileList();
                                    config_progress.total = files.length;
                                    Log("Total files: " + files.length);
                                    filter(files, function(l)
                                    {
                                        if(l)
                                        {
                                            var path = FileSystem.AbsPath(owner.InstallDir(), l.name);
                                            Log("Zipped file: " + path);
                                            storage("files::*").value = path;
                                        }

                                        config_progress.Step();
                                        config_progress.message = l.name;

                                        return Wizard.Canceled();
                                    });
                                }

                                if(Wizard.Canceled())
                                    return Action.r_canel;

                                storage("installed").value = 1;
                                dumper_db.Save(db_key_name + "::" + proc.Owner().Id(), storage);
                                return Action.r_ok;
                            }
                        }
                    }
                }
                return Action.r_ok;
            }

            if(fast)
                dumper_config.Rollback = fastremove;

            owner = proc.Owner ? proc.Owner() : null;
            if(owner)
            {
                var dumper = ns_dmp.Dumper("ZIP dumper: " + owner.Id());
                var act = dumper.AddAction(dumper_config, "ZIP configuration: " + owner.Id());
                dumper.AddAction(dumper_zip, "ZIP action: " + owner.Id());
                dumper.AddAction(dumper_db, "DB action: " + owner.Id());

                act.Attribute("countable", true);
                dumper.Attribute("name", owner.Name());

                dumper.hidden = true;

                return dumper;
            }

            return null;
        }

        proc.RepairAct = proc.InstallAct;

        proc.RemoveAct = function ()
        {
            Log("ProcessorZIP: getting RemoveAct");

            var dumper_db = ns_ddmp.CreateAction();

            var owner = proc.Owner ? proc.Owner() : null;
            if(owner)
            {
                var dumper = ns_dmp.Dumper("ZIP dumper: " + owner.Id());

                var act = dumper.AddAction(dumper_db, "ZIP action: " + owner.Id());

                act.Attribute("countable", true);
                act.Attribute("name", owner.Name());
                
                var dumper_dir = null;
                var dumper_file = null;

                if(owner.Info().Property("mode") != "fast")
                {
                    dumper_file = ns_fdmp.File();
                    dumper_dir = ns_fdmp.Directory();

                    var storage = Storage("Zip::Processing::*");
                    storage.Read(db_key_name + "::" + owner.Id());

                    var ch = storage("files").childs;
                    filter(storage("files").childs, function(_ch)
                    {
                        var c = storage("files")(_ch).value;
                        if(FileSystem.Exists(c))
                        {
                            if(FileSystem.IsDirectory(c))
                                dumper_dir.Remove(c, true);
                            else
                                dumper_file.Remove(c);
                        }
                    });
                    dumper_dir.Remove(owner.InstallDir(), true);

                    dumper.AddAction(dumper_file, "ZIP file: " + owner.Id());
                    dumper.AddAction(dumper_dir, "ZIP directory: " + owner.Id());
                }
                else
                { // fast mode
                    var progress = Progress();
                    progress.total = -1;
                    progress.message = StringList.Format("[removing]", owner.Name());
                    dumper_dir = {Apply: fastremove, ProgressApply: function() {return progress;}};

                    var dumper_dir_root = ns_fdmp.Directory();
                    dumper_dir_root.Remove(owner.InstallDir(), true);

                    dumper.AddAction(dumper_dir, "ZIP content: " + owner.Id());
                    dumper.AddAction(dumper_dir_root, "ZIP root dir content: " + owner.Id());
                }

                dumper_db.Delete(db_key_name + "::" + owner.Id());

                dumper.hidden = true;

                return dumper;
            }

            return null;
        };

        var installed; //=undefined

        proc.IsInstalled = function(refresh)
        {
            if(typeof(installed) == "undefined" || refresh)
            {
                var owner = proc.Owner ? proc.Owner() : null;
                if(owner)
                {
                    installed = false;
                    var id = owner.Id();

                    if(id)
                    {
                        var stor = Storage("*::" + db_key_name);
                        stor.Read(db_key_name + "::" + id);
                        if(stor("installed").value)
                            installed = true;
                    }
                }
                else // owner not defined???
                    return false;
            }
            return installed;
        };

        return proc;
    };
}


