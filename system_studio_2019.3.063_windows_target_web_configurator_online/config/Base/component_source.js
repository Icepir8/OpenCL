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

/** @file source.js
 *  @brief Implementation file aliases
 */

 /*
    Source - is object to handle files
    every Source object has methods:
        Id - get id of element, string
        Resolved - is current Source resolved (file exists), boolean
        Resolve - create DumperAction/Dumper element to resolve
 */

new function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns = this;
    var ns_inst     = Namespace("Root.installer");
    var installer   = ns_inst.Installer;
    var ns_dmp      = load("dumper.js");
    var ns_download = load("dumper_download.js");
    var ns_hash     = load("dumper_hash.js");

    // ***************** helper functions ************
    var abspath = FileSystem.AbsPath;
    var format  = StringList.Format;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    }

    var sleep = function(delay)
    {
      var d_beg = new Date();
      var d_end = null;
      do
      {
        d_end = new Date();
      }
      while(d_end-d_beg < delay);
    }

    var asyncact = function(func, file)
    {// creates pseudo-async action: action has async interface but executes
        var async = false; // in sync mode. action may be called in async thread
        var act = {Async: function(a) {if(arguments.length > 0) async = a; else return async;}};

        act.Apply = function()
        {
            if(async)
            {
                act.complete(func());
                return Action.r_ok;
            }
            else
                return func();
        };

        act.Error = function()
        {
            var err = {message: format("[integrity_failed]"), details: [format("[incorrect_src_file]")]};
            if(file)
                err.details.push(FileSystem.FileName(file));
            return err;
        }

        return act;
    };

    var cb_checkers = null;

    this.UseCheckers = function(_cb_checkers)
    {
        if (typeof(_cb_checkers) != "undefined")
            cb_checkers = _cb_checkers;

        return cb_checkers;
    }


    var Source = function()
    {
        var id = Guid();
        var source = {};
        var dependencies = [];

        source.Id = function(_id)
        {
            if(_id)
                id = _id;
            else
                return id;
        }

        source.Resolved = function() {return !filter(dependencies, function(d) {return !(d && typeof(d.Resolved) == "function" && d.Resolved());});};

        source.Resolve = function(dumper)
        {
            var dmp = dumper || ns_dmp.Dumper(id);
            filter(dependencies, function(d) {if(d && typeof(d.Resolve) == "function") d.Resolve(dmp);});

            return (dumper || dmp.IsEmpty()) ? null : dmp; // if dumper passed to function - source dumper filled, else return new dumper
        }

        source.AddDependency = function(dep)
        {
            if(dep && !filter(dependencies, function(d) {return d === dep;}))
                dependencies.push(dep);
        }

        source.Dependencies = function() {return dependencies;};

        source.Serialize = function()
        {
            var ser = [source];
            filter(dependencies, function(d) {if(typeof(d.Serialize) == "function") ser = ser.concat(d.Serialize());});
            return ser;
        }

        source.Filter = function(cb)
        {
            if(cb(source))
                return true;

            for(var i in dependencies)
            {
                var d = dependencies[i];
                if(d && d.Filter)
                    if(d.Filter(cb))
                        return true;
            }

            return false;
        }

        source.MayBeCached = function() {return false;} // predefined method

        return source;
    }

    // ***************** public API ***************

    // ***************** FileSource ****************
    /*  FileSource - is simple source object which only checks for existing file
        _root - path to 'installs' directory
        _rel  - relative path to file in 'installs' directory
    */
    this.FileSource = function(_root, _rel)
    {
        Log("FileSource: " + _root + " : " + _rel);

        var source = Source();

        var root = _root;
        var relative = _rel;
        var file = abspath(root, relative);

        var size = 0;

        var locations = [root];
        var checkers = [];

        var blacklist = []; // list of files that are not correct

        var resolved = false; // valid for current element only

        var sortckeck = function() {checkers.sort(function(a, b) {return a.prio - b.prio;});};
        var refresh = function() {resolved = false; source.Resolved();}; // used when new checker arrived (to be sure that resolved file is still valid)
        var blacklisted = function(f) {filter(blacklist, function(b) {return b === f || FileSystem.Same(f, b);});};
        var rescan = function() {blacklisted.clear(); refresh();}; // used when required completely re-scan all locations & apply all checkers
        var matched = function(l, noblack)
        {
            var p = abspath(l, relative);
            if(noblack || !blacklisted(p))
            {
                if(FileSystem.Exists(p) && !FileSystem.IsDirectory(p))
                {
                    if(!filter(checkers, function(c) {return !(c.disabled || c(p));}))
                    { // ok, file exists & pass all checkers
                        file = p;
                        return true;
                    }
                }
                if(!noblack)
                    blacklist.push(p); // file failed - blacklist it
            }

            //in case if we have, say, debugger in relative path sys_dbg/018/eclipse in both ISD & ISS it will form something like
            //iss/026/eclipse/sys_dbg/018/eclipse/w_eclipse.msi.
            //In order to avoid such behavior, and for compatibility with previous version of component_source.js
            //need to check source built with empty relative part of the path
            var p1 = abspath(l, FileSystem.FileName(p));
            if (noblack || !blacklisted(p1))
            {
                if (FileSystem.Exists(p1) && !FileSystem.IsDirectory(p1))
                {
                    if (!filter(checkers, function (c) { return !(c.disabled || c(p1)); }))
                    { // ok, file exists & pass all checkers
                        file = p1;
                        return true;
                    }
                }
                if (!noblack)
                    blacklist.push(p1); // file failed - blacklist it
            }

            return false;
        }

        source.File = function() {return file;}
        source.Size = function(s) {if(arguments.length > 0) size = parseInt(s); else return size;}

        source.AddLocation = function(loc)
        {
            Log("Request to add location for file: " + relative + " -> " + loc);
            if(!FileSystem.Exists(loc) || !FileSystem.IsDirectory(loc))
            {
                Log("  Directory does not exist or is not directory. Ignore request");
                return;
            }

            if(!filter(locations, function(l) {return l === loc || FileSystem.Same(loc, l);}))
            {
                Log("  Added");
                locations.push(loc);
            }
            else
                Log("Duplicate entry ignored");
            filter(source.Dependencies(), function(d) {if(typeof(d.AddLocation) == "function") d.AddLocation(loc);});
            source.Resolved();
        }

        source.ResetLocations = function()
        {
            locations = [root];
            file = abspath(root, relative);
            refresh();
        }

        source.AddChecker = function(c) {if(c) {checkers.push(c); refresh();}}

        source.CheckerList = function() {return checkers;}

        source.Relative = function(rel)
        {
            if(rel)
                relative = rel;
            return relative;
        }

        source.Root = function(r)
        {
            if(r)
                root = r;
            return root;
        }

        source.MayBeCached = function() {return (checkers.length > 0);}

        var s_resolved = source.Resolved;
        source.Resolved = function()
        {
            if(!resolved)
            { // if not resolved - check current element first
                if(!filter(checkers, function(c) {return !c.disabled}))
                { // if checkers are not defined or all disabled - check only first element
                    resolved = matched(root);
                    if(!resolved)
                        return false;
                }
                else
                {
                    sortckeck();
                    if(filter(locations, matched))
                        resolved = true;
                    else
                    {
                        file = abspath(root, relative); // if not resolved - restore original file
                        return false;
                    }
                }
            }

            return s_resolved();
        };

        source.ForceCheck = function(loc, dmp, attempt)
        { // force check for location. used for interactive checking (in dumper mode), works for current element only
            if(resolved) // function should be used in case if not resolved only
                return;

            file = abspath(loc, relative);
            filter(checkers, function(c)
            {
                if(!c.disabled)
                {
                    if(typeof(c.action) == "function")
                    {
                        var action = c.action(file);
                        action.Skip = function() {return resolved;};
                        dmp.AddAction(action, "ForceCheck: checker: " + c.id + " : " + file + (attempt ? " attempt " + attempt :  ""));
                    }
                    else
                        Log("ForceCheck: checker has no action method. Ignore checker.");
                }
            });

            // ok, added action to check file... if action succeeded - set flag 'resolved' to skip other
            // actions to resolve
            if(filter(checkers, function(c) {return !c.disabled;})) // if there are enabled checkers
            {
                var action = asyncact(function() {resolved = true; return Action.r_ok;}, relative);
                action.Skip = function() {return resolved;}
                dmp.AddAction(action, "ForceCheck: Mark source as 'resolved' if previous action is ok" + (attempt ? " attempt " + attempt :  ""))
            }
        }

        var s_resolve = source.Resolve;
        source.Resolve = function(dumper, bypass)
        { // check if source resolved
            if(bypass)
            {
                return s_resolve(dumper);
            }
            else
            {
                if(source.Resolved())
                    return null;
                var dmp = dumper || ns_dmp.Dumper("Resolve dumper for " + relative);
                // TODO: added error message
                var act = asyncact(function() {return source.Resolved() ? Action.r_ok : Action.r_error;}, relative);
                dmp.AddAction(act, "Resolve action for " + relative);
                return dumper ? null : dmp; // if dumper passed to function - source dumper filled, else return new dumper
            }
        }

        source.DisableChecker = function(id, dis)
        {
            var _dis = dis;
            if(arguments.length < 2)
                _dis = true;
            
            Log(Log.l_debug, "Disabling checker: " + id + " : " + _dis);
            if(id)
            {
                // check if source object has checker with id
                if(id === "all" || filter(checkers, function(c) {return c.id === id;}))
                {
                    filter(checkers, function(c) {if(c.id === id || id === "all") c.disabled = _dis;});
                    if(!_dis)
                    { // checker disabled
                        if(!resolved)
                            rescan(); // TODO should here be complete rescan or check for resolved & do nothing if resolved
                        else
                            blacklist.clear(); // clear all blacklisted elements
                    }
                    else
                        refresh(); // checker enabled
                    Log(Log.l_debug, "Checker disabled: " + _dis + " : " + id + " : " + relative);
                }
                filter(source.Dependencies(), function(d) {if(typeof(d.DisableChecker) == "function") d.DisableChecker(id, _dis);});
            }
        }
        var restore_locations;

        source.ClearLocations = function()
        {
            Log(Log.l_debug, "Clear Locations: Len = " + locations.length);
            restore_locations = locations;
            resolved = false;
            locations = [];
        }

        source.RestoreLocations = function()
        {
            if (!restore_locations.length)
            {
                Log("Restore locations: nothing to restore");
                return;
            }
            if (locations.length)
            {
                Log("Restore locations: locations should be cleared before. Len = " + locations.length);
                return;
            }
            resolved = false;
            locations = restore_locations;
            restore_locations = [];
            Log(Log.l_debug, "Restore Locations: Len = " + locations.length);
        }

        return source;
    }

    // ***************** UrlSource ****************
    /*  UrlSource - source object to download file
        _url - url to download file from
    */
    this.UrlSource = function(_root, _rel, _url)
    {
        var source = ns.FileSource(_root, _rel);
        var url;
        var templates;

        if(_url instanceof(Array))
        {
            url = _url[0];
            templates = [].concat(_url);
        }
        else
        {
            url = _url;
            templates = [url];
        }

        Log(Log.l_debug, "Url source object: " + templates + " : " + source.File());

        source.Url = function()
        {
            if(source.Relative())
            {
                return format(url, source.Relative());
            }

            return url;
        };

        source.AddUrl = function(ur)
        {
            if(ur && !filter(templates, function(u) {return u === ur;})) templates.push(ur);
            filter(source.Dependencies(), function(d) {if(typeof(d.AddUrl) == "function") d.AddUrl(ur);});
        };

        var s_resolve = source.Resolve;
        source.Resolve = function(dumper)
        {
            Log("UrlSource.Resolve: " + source.Relative());
            if(source.Resolved())
            {
                Log("  Already resolved. Ignore");
                return null;
            }

            var err;
            var err_func = function() {return err;};

            var user_choice = function(failed_file)
            {
                Log("Calling user_choice");
                var failed_file_name = typeof(failed_file) == "function" ? failed_file() : source.File();
                var ret;
                var r = Wizard.Notify("installation", "download error", {error : err, filename : failed_file_name});
                Log("user_choice ret = " +r);

                switch(r)
                {
                case "retry":
                    ret = Action.r_ok;
                    break;
                case "ignore":
                    
                    ret = Action.r_ok;
                    break;
                case "cancel":
                    ret = Action.r_error;
                    break;
                 default:
                    ret = Action.r_error;
                    break;
                }

                return ret;
            }


            var d = dumper || ns_dmp.Dumper("UrlSource: Dumper: Resolve for " + source.Relative());

            if(s_resolve) // resolve dependent objects first
                s_resolve(d, true);

            if(url && source.Relative() && templates && templates.length)
            {
                var counted = false;
                var rel = source.Relative();
                var root = source.Root();
                var f = abspath(root, rel);
                var n = 0;
                var attempts = ["auto", "auto", "user", "user"];

                // #######################################################
                // use download-by-list mode 
                if(!GetOpt.Exists("single-file-download"))
                {
                    var get_checker = function(src)
                    {
                        var found_checker = null;
                        if(src && src.CheckerList())
                        {
                            filter(src.CheckerList(), function(checker)
                            {
                                //no need to verify the checker against "disabled"
                                if(checker/* && !checker.disabled*/)
                                {
                                    // looking for the list of supported cksum algorithms
                                    // find the first and return
                                    switch(checker.id)
                                    {
                                        case "sha256":
                                        case "sha1":
                                        case "md5":
                                                 found_checker = checker;
                                                 return true;
                                    }
                                }
                            });
                        }

                        return found_checker;
                    }

                    var checker = get_checker(source);
                    // it means that multithreaded download engine from iss should be used

                    // installer._download_list_action is global action responsible for files downloading
                    // it should be visible for all that all components can add required files to resolve into it
                    // this action is added into dumpers exec sequence only once for first component which requires source resolution
                    // all other components will add their sources into it and shouldn't add new actions into dumpers.

                    if(installer._download_list_action)
                    {
                        // global download_list_action was already created -> we just need to add current file into it
                        filter(templates, function(templ)
                        { // templates is list of urls to download from for issa_download we use the first one only
                          // because issa_download_doesn't support multiple items
                            var u = format(templ, rel);
                            if(typeof(installer._download_list_action.AddFile) == "function")
                            {
                                if(checker)
                                {
                                    installer._download_list_action.AddFile(u, f, source.Size(), checker.reference, checker.id);
                                }
                                else
                                {
                                    installer._download_list_action.AddFile(u, f, source.Size());
                                }
                            }
                            else
                            {
                                Log("UrlSource: trying to add file into DownloadList ERROR: installer._download_list_action.AddFile isn't a function!");
                            }
                            // we take only first url template beacause issa_download supports only one url
                            return true;
                        });
                    }
                    else
                    {
                        // global download_list_action wasn't created yet -> it should be created and added with attempts
                        installer._download_list_action = ns_download.DownloadList();

                        var download_list = installer._download_list_action;

                        if(!download_list)
                        {
                            Log("Error : can't create DownloadList action!");
                            return null;
                        }

                        download_list.Format("[PrgDownloadFilesListMessage]");

                        filter(attempts, function(attempt, attempt_ind)
                        {
                            var attempt_act = null;

                            if (attempt == "user")
                            {
                                //add user choice after 2 attempts
                                attempt_act = d.AddAction({
                                    Apply : function(){ sleep(5000); return user_choice(download_list.FailedFile) },
                                    Error : err_func,
                                    ProgressApplyHeader: download_list.ProgressApplyHeader,
                                    Skip  : download_list.Resolved}, "component.Resolve user choice " + " attempt " + attempt_ind);
                            }
                            else if (attempt_ind > 0)
                            {
                                // no need to add this action for first try

                                attempt_act = d.AddAction({
                                    Apply : function() {sleep(5000); return Action.r_ok;},
                                    ProgressApplyHeader: download_list.ProgressApplyHeader,
                                    Skip  : download_list.Resolved}, "component.Resolve sleep " + " attempt " + attempt_ind);
                            }

                            filter(templates, function(templ)
                            { // templates is list of urls to download from
                                var u = format(templ, rel);
                                var dmp = ns_dmp.Dumper("Download dumper: DownloadList attempt " + attempt_ind);

                                var act = dmp.AddAction(download_list, "Download List of files attempt " + attempt_ind);

                                if (attempt_ind == 0)
                                {   //
                                    if(typeof(download_list.AddFile) == "function")
                                    {
                                        if(checker)
                                        {
                                            Log("checker found ");

                                            download_list.AddFile(u, f, source.Size(), checker.reference, checker.id);
                                        }
                                        else
                                        {

                                            Log("checker not found ");
                                            download_list.AddFile(u, f, source.Size());
                                        }
                                    }
                                    else
                                    {
                                        Log("UrlSource: trying to add file into DownloadList ERROR: download_list.AddFile isn't a function!");
                                    }
                                }
                                else
                                {
                                    // attempt actions should be skipped if previous one was Resolved
                                    act.Skip = download_list.Resolved;
                                }

                                // all download_list actions must return ok to continue execution
                                // in case if fail was downloaded incorrectly - it will be canceled by
                                // checked later
                                if(!counted)
                                { // mark as 'countable' only first element
                                    act.Attribute("countable", true);
                                    act.Attribute("name", "DownloadFilesList");
                                    counted = true;
                                }
                                //source.ForceCheck(root, dmp, attempt_ind);
                                dmp.IgnoreError = function(iter)
                                {
                                    if(iter && typeof(iter.Get) == "function")
                                    {
                                        Log("IgnoreError : error registration");
                                        var item = iter.Get();
                                        if(item && typeof(item.Error) == "function" && item.Error())
                                        {
                                            err = item.Error(); // save error object
                                            GlobalErrors.Clear();
                                            GlobalErrors.Add(err.message);
                                            filter(err.details, function(e) {GlobalErrors.Add(e);});
                                        }
                                    }
                                    else Log("IgnoreError : error registration is Empty");
                                    return true;
                                }; // disable error processing
                                dmp.Group("Download");
                                d.AddAction(dmp);

                                // we take only first url template beacause all issa_download support only one url
                                return true;
                            }); //filter(templates, function(templ)
                        }); //filter(attempts, function(ind)

                        d.AddAction({
                            Apply: function() {return false;},
                            Error: function() {return err;},
                            ProgressApplyHeader: download_list.ProgressApplyHeader,
                            Skip : download_list.Resolved}, "component.Resolve final action");
                    }
                }
                else  //GetOpt.Exists("single-file-download") == true
                {
                    // using regular file by file download
                    filter(attempts, function(attempt, attempt_ind)
                    {
                        if (attempt_ind > 0)
                        {
                            d.AddAction({
                                Apply : function() {sleep(5000); return Action.r_ok;},
                                Skip: source.Resolved}, "component.Resolve sleep " + " attempt " + attempt_ind);

                        }
                        if (attempt == "user")
                        {
                            //add user choice after 2 attempts
                            d.AddAction({
                                Apply : user_choice,
                                Error : err_func,
                                Skip: source.Resolved}, "component.Resolve user choice " + " attempt " + attempt_ind);
                        }
                        filter(templates, function(templ)
                        { // templates is list of urls to download from
                            var download = ns_download.Download();
                            if(download)
                            {
                                var u = format(templ, rel);
                                var dmp = ns_dmp.Dumper("Download dumper: " + u + " attempt " + attempt_ind);

                                download.Url(u);
                                download.File(f);
                                download.Skip = source.Resolved;

                                var act = dmp.AddAction(download, "Download " + source.Relative() + " from " + u + " attempt " + attempt_ind);

                                // all download actions must return ok to continue execution
                                // in case if fail was downloaded incorrectly - it will be canceled by
                                // checked later
                                if(!counted)
                                { // mark as 'countable' only first element
                                    act.Attribute("countable", true);
                                    act.Attribute("name", FileSystem.FileName(f));
                                    counted = true;
                                }
                                source.ForceCheck(root, dmp, attempt_ind);
                                dmp.IgnoreError = function(iter)
                                {
                                    if(iter && typeof(iter.Get) == "function")
                                    {
                                        Log("IgnoreError : error registration");
                                        var item = iter.Get();
                                        if(item && typeof(item.Error) == "function" && item.Error())
                                        {
                                            err = item.Error(); // save error object
                                            GlobalErrors.Clear();
                                            GlobalErrors.Add(err.message);
                                            filter(err.details, function(e) {GlobalErrors.Add(e);});
                                        }
                                    }
                                    else Log("IgnoreError : error registration is Empty");
                                    return true;
                                }; // disable error processing
                                dmp.Group("Download");
                                d.AddAction(dmp);

                            }
                        });
                    });
                    d.AddAction({
                        Apply: function() {return false;},
                        Error: function() {return err;},
                        Skip: source.Resolved}, "component.Resolve final action");
                } // end of if(!GetOpt.Exists("single-file-download"))
            }
            else
                source.ForceCheck(source.Root(), d); // Final check file

            if(d.IsEmpty())
                return null;
            else
                return dumper ? null : d; // if dumper passed to function - source dumper filled, else return new dumper
        };

        return source;
    };

    this.Import = function(node, location, templurl)
    {
        var tmpls = templurl ? [templurl] : [];
        var files = node.single("files");
        if(files)
        {
            if(files.attributes && files.attributes.url)
                tmpls.unshift(files.attributes.url);
            if(GetOpt.Exists("media-url")) // if media url configured from command line - add it first
                tmpls.unshift(GetOpt.Get("media-url"));

            var filesrc = null;
            if(tmpls.length > 0) // creating constructor for source object
                filesrc = function(rel) {Log("UrlSource: " + rel + " : " + tmpls); return ns.UrlSource(location, rel, tmpls);};
            else
                filesrc = function(rel) {Log("FileSource: " + rel); return ns.FileSource(location, rel);};

            var setcheck = function(_node, src) {
                var checker = function(cb, reference, prio, id, action) {

                    var cache = {};

                    var c = function(file) {
                        if(file && FileSystem.Exists(file) && !FileSystem.IsDirectory(file))
                        { // if file exists - try to find data in cache
                            if(filter(cache, function(data, path)
                            {
                                if(FileSystem.Same(file, path)) // ok, path is registered...
                                {
                                    var size = FileSystem.Size(file);
                                    if(size == data.size) // ok, we found file in case which has same size
                                        return data.valid;
                                }
                            }))
                                return true;
                        }
                        // ok, cache is empty or all items there are incorrect
                        var data = cb(file);
                        var res = data == reference;
                        Log("Checker: " + id + " : " + reference + " : " + data + " : " + res + " : " + file);
                        if(data && file && FileSystem.Exists(file) && !FileSystem.IsDirectory(file))
                        { // this is real file... save data about file into cache
                            var size = FileSystem.Size(file);
                            cache[file] = {size: size, valid: res};
                        }
                        //if(!res)
                        //    GlobalErrors.Add(StringList.Format("[install_failed_checksum]", file.replace(/\\/g, "\\\\")));
                        return res;
                    };
                    c.reference = reference;
                    c.prio = prio;
                    c.id = id;
                    if(action)
                        c.action = action;
                    else
                    { // create action maker
                        c.action = function(f)
                        {
                            return asyncact(function() {return cb(f) == reference ? Action.r_ok : Action.r_error;}, f);
                        };
                    }
                    return c;
                };

                var create_act = function(alg, ref)
                { // creates function which creates DumperAction to check hash
                    return function(f)
                    {
                        return ns_hash.Hash(f, alg, ref);
                    };
                };

                var checker_excluded = function(attr)
                {
                    if (cb_checkers === null)
                    {
                        Log("Callback checkers is null");
                        return false;
                    }
                    var chcks = cb_checkers();
                    if (!chcks)
                        return false;
                    if (chcks.indexOf(attr) != -1)
                    {
                        Log(Log.l_debug, "Using preset checker: " + attr);
                        return false;
                    }

                    return true;
                }

                filter(_node.attributes, function(val, attr) {
                    if(val)
                    {
                        if (attr == "size" && typeof(src.Size) == "function")
                            src.Size(val);

                        switch(attr)
                        {
                        case "size":
                            Log("Setting checker: " + attr + " = " + val);
                            src.AddChecker(checker(FileSystem.Size, parseInt(val), 0, attr));
                            break;
                        case "crc32":
                        case "chksum":
                            Log("Setting checker: crc32 = " + val);
                            src.AddChecker(checker(FileSystem.ChkSum, parseInt(val), 100, "crc32"));
                            break;
                        case "md5":
                            Log("Setting checker: " + attr + " = " + val);
                            src.AddChecker(checker(FileSystem.MD5, val, 200, attr, create_act("md5", val)));
                            break;
                        case "sha1":
                            Log("Setting checker: " + attr + " = " + val);
                            src.AddChecker(checker(FileSystem.SHA1, val, 300, attr, create_act("sha1", val)));
                            break;
                        case "sha256":
                            Log("Setting checker: " + attr + " = " + val);
                            src.AddChecker(checker(FileSystem.SHA256, val, 400, attr, create_act("sha256", val)));
                            break;
                        case "signed":
                            Log("Setting checker: " + attr + " = " + val);
                            src.AddChecker(checker(FileSystem.Signed, val == "true" ? true : false, 50, attr));
                            break;
                        case "intel-signed":
                            Log("Setting checker: " + attr + " = " + val);
                            src.AddChecker(checker(FileSystem.IntelSigned, val == "true" ? true : false, 51, attr));
                            break;
                        }
                        if(checker_excluded(attr))
                        {
                            src.DisableChecker(attr);
                        }
                        
                    }
                });
            }

            var key = files.single("key");
            if(key && key.text)
            {
                var keysrc = filesrc(key.text);
                setcheck(key, keysrc);

                filter(files.select("file"), function(f) {
                    if(f.text)
                    {
                        var fsrc = filesrc(f.text);
                        setcheck(f, fsrc);
                        keysrc.AddDependency(fsrc);
                    }
                });
                return keysrc;
            }
        }
        return null;
    }
}
