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

    var failed = function()
    {
        var gui = load("dialogs_base.js");
        gui.Load();

        gui.Title("[load_configuration]");
        gui.Title.BigIcon(FileSystem.MakePath("../Icons/micl.ico", Origin.Directory()));
        gui.Title.SmallIcon(FileSystem.MakePath("../Icons/micl.ico", Origin.Directory()));

        StringList.Replace("title", "[download_configuration]");

        gui.Error();
    }

    var download_file = function(file, url)
    {
        if(!url || !file)
            return false;

        if(FileSystem.Exists(file))
            return true;

        var download = load("dumper_download.js");
        var action = download.Download();
        action.File(file);
        action.Url(url);
        var progress = action.ProgressApply();
        if(progress)
            Wizard.Notify("Progress_Splash", "connect", progress.id);
        if(action.Apply() != Action.r_ok)
            return false;
        return true;
    }

    var process_file = function(path, type)
    {
        if(type)
        {
            switch(type)
            {
            case "localization":
                StringList.Load(path);
                break;
            case "module":
                FileSystem.LoadPlugin(path);
                break;
            case "archive":
                return process_archive(path);
            }
        }
        else
        { // try to detect file by extension
            if(path.match(/.*\.xmc$/i)) // localization file
                StringList.Load(path);
            else if(path.match(/.*\.cat$/i)) // catalog file
                return FileSystem.LoadPlugin(path);
            else if(path.match(/.*\.micl$/i)) // catalog file
                return FileSystem.LoadPlugin(path);
            else if(path.match(/.*\.zip$/i)) // archive file
                return process_archive(path);
        }

        return true;
    }
            
    var process_archive = function(file)
    {
        if(!file || !FileSystem.Exists(file))
            return false;

        var dir = FileSystem.MakePath("../..", Origin.Directory());
        var zip = Zip(file);
        if(!zip)
        {
            Log(Log.l_error, "Failed to open archive file: " + file);
            return false;
        }

        var zip_files = zip.FileList();
        var missed_files = false;
        var z_file;
        for(var z in zip_files)
        {
            z_file = zip_files[z];
            if(!z_file.directory)
            {
                Log("Archived file: " + z_file.name);
                if(!FileSystem.Exists(FileSystem.MakePath(z_file.name, dir)))
                {
                    Log("  missing...");
                    missed_files = true;
                    break;
                }
                else
                    Log("  exists...");
            }
        }

        if(!missed_files)
            return true; // skip decompression in case if all files exist

        var progress = zip.Progress();
        if(progress)
            Wizard.Notify("Progress_Splash", "connect", progress.id);

        if(!zip.Extract(dir))
        {
            Log(Log.l_error, "Failed to extract data from archive file: " + file);
            return false;
        }

        var arc_file = FileSystem.MakePath("arcdata.xml", dir);
        if(FileSystem.Exists(arc_file))
        {
            Log("Processing archive data: " + arc_file);
            var cfg_root = XML(arc_file);
            if(cfg_root)
            {
                var nodes = cfg_root.subnodes("/config/file");
                for(var n in nodes)
                {
                    var name = nodes[n].text;
                    var type = nodes[n].attributes.type;
                    if(!process_file(FileSystem.MakePath(name, dir), type))
                        return false;
                }
            }
        }
        else
        { // process all extracted files
            for(var zf in zip_files)
            {
                z_file = zip_files[zf];
                if(!z_file.directory)
                {
                    var fpath = FileSystem.MakePath(z_file.name, dir);
                    if(FileSystem.Exists(fpath))
                        if(!process_file(fpath))
                            return false;
                }
            }
        }

        return true;
    }

    var process_web = function(file)
    {
        var dir = FileSystem.MakePath("../..", Origin.Directory());
        var download = load("dumper_download.js");
        var cfg_root = XML(file);
        if(cfg_root)
        {
            var base_url = GetOpt.GetDefault("config-url", cfg_root.attributes.url);
            if(!base_url)
            {
                Log(Log.l_error, "Can't find base url node");
                return false;
            }
            Log("base url: " + base_url);

            // load function
            var load_files = function(nodes, process)
            {
                if(!nodes || !nodes.length)
                    return true;

                var node;
                var s_file;
                var s_url;
                var chksum_s;
                var chksum_f;
                var type;
                
                for(var i in nodes)
                {
                    node = nodes[i].text;
                    s_url = StringList.Format(base_url, node);
                    s_file = FileSystem.MakePath(node, dir);
                    chksum_s = nodes[i].attributes.chksum ? parseInt(nodes[i].attributes.chksum) : 0;
                    chksum_f = FileSystem.Exists(s_file) ? FileSystem.ChkSum(s_file) : 0;

                    if(!FileSystem.Exists(s_file) || (chksum_s && chksum_f != chksum_s))
                    {
                        if(!download_file(s_file, s_url))
                            return false;
                    }
                }
                if(process)
                {
                    for(var n in nodes)
                    {
                        node = nodes[n].text;
                        s_file = FileSystem.MakePath(node, dir);
                        type = nodes[n].attributes.type;
                        if(!process(s_file, type))
                            return false;
                    }
                }
                return true;
            }

            Log("Loading files");
            if(!load_files(cfg_root.subnodes("/config/file"), process_file))
            {
                Log(Log.l_error, "Filed to download files");
                return null;
            }
        }
        else
        {
            Log(Log.l_error, "Failed to process file: " + file + ". Empty object returning...");
        }
        return true;
    }

    this.Configure = function(_file, _url)
    {
        Log("Web configuration started");

        if(GetOpt.Exists("offline-mode"))
        {
            Log("Offline mode enabled");
            return true;
        }

        var cfg_file = Cache.Config();
        if(!cfg_file)
        {
            GlobalErrors.Add("[web_config_load_failed]");
            return false;
        }

        var cfg = XML(cfg_file);
        if(!cfg)
        {
            GlobalErrors.Add("[web_config_load_failed]");
            return false;
        }

        var node = cfg.single("/config/web[@url and @target]");
        if(!node || !node.attributes.target || !node.attributes.url)
        {
            Log("  No on-line configuration found");
            return true; // no online processing required
        }

        var file = _file ? _file : FileSystem.MakePath(node.attributes.target, Origin.Directory() + "/../");
        var url = _url ? _url : GetOpt.GetDefault("config-link", node.attributes.url);

        if(!file || !url)
            return false;

        if(!download_file(file, url))
            return false;

        if(FileSystem.Exists(file))
        {
            if(process_web(file))
                return true;
        }
        else
        {
            Log(Log.l_error, "Can't process file: " + file + ". File doesn't exist");
            return null;
        }

        return false;
    }

    this.Failed = function() {failed();}
}

