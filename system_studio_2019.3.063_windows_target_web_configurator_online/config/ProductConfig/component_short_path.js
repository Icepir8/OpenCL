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
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return coll[i];
        return null;
    };
    
    this.Component = function(components, node)
    {
        var correct_path = function(path)
        {
            return path.replace(/ /g, "_");
        }
        
        var path_is_correct = function(path)
        {
            return (path != "" && correct_path(path) == path);
        }
        
        var get_tmp_folder = function(drive)
        {
            var tmp = FileSystem.GetTemp();
            if (String(drive) == "") 
                return tmp;
            if (FileSystem.GetTemp().substr(0, drive.length) == drive)
                return tmp;
            return drive;
        }
        
        
        var s_paths_are_enabled = {};
        //by partitions
        var short_paths_are_enabled = function(path)
        {
            if (String(path) == "") 
                return false;
            
            var drive = path.substr(0, 1) + ":";
            
            if (typeof(s_paths_are_enabled[drive]) != "undefined")
                return s_paths_are_enabled[drive];
            
            var temp_folder = FileSystem.MakePath("Temp folder with spaces", get_tmp_folder(drive)); //contains spaces
            var f_exists = FileSystem.Exists(temp_folder);
            if (!f_exists)
                FileSystem.CreateDirectory(temp_folder);
            
            var s_path = FileSystem.ShortPath(temp_folder);
            
            if (!f_exists)
                FileSystem.Delete(temp_folder);
            
            s_paths_are_enabled[drive] = path_is_correct(s_path);
            Log("Short paths for " + drive + " are " + s_paths_are_enabled[drive] ? "enabled" : "disabled");
           
            return s_paths_are_enabled[drive];
        }
        
        var make_default_path = function(path, def_path)
        {
           if (String(path) == "")  
               return def_path;
           //if def_path starts with \ - need to add disk letter of the path
           var drive = path.substr(0, 1) + ":";
           if (def_path.length == 0)
               return drive;
           if (def_path.length == 1 && def_path[0] == "\\")
               return drive;
           if (def_path[0] == "\\" && def_path[1] != "\\")
               return FileSystem.MakePath(def_path, drive);
           //this is a net path
           return def_path; 
        }
        
        //choose between path and default path
        //we have not to return the short path
        var choose_valid_path = function(path, def_path)
        {
            //an empty path may be passed (need to return back the same path)
            if (String(path) == "") 
                return path;
            //criterion for applying 8.3 format
            if (path_is_correct(path))
            {
                Log("Path " + path + " already suits 8.3 standard");
                return path;
            }
            
            //if path doesnt exist - need to create it 
            var path_exists = FileSystem.Exists(path);
            if (path_exists)
            {
                var s_path = FileSystem.ShortPath(path);
                if (path_is_correct(s_path))
                {
                    Log("Path " + path + " exists and has 8.3 short version");
                    return path;
                }
            }
            else if (short_paths_are_enabled(path))
            {
                Log("Path " + path + " doesn't exist, but 8.3 standart is enabled for its drive");
                return path;
            }
            //replacing with the default short path
            Log("Path " + path + " doesn't exist, and 8.3 standart is disabled");
            Log("Make alternative path using default short template " + def_path);
            return make_default_path(path, def_path);
        }
        
                
        if(components)
        {
            filter(components, function(cmp, al)
            {
                var prop_path = cmp.Info().Property("default_short_path");
                if(prop_path)
                {
                    var def_path = correct_path(prop_path);
                    if (def_path != prop_path)
                       Log(Log.l_warning, "Incorrect default short path: " + prop_path); 
                    //change Base function for 8.3 format
                    if (cmp.InstallDir && cmp.InstallDir.Base)
                    {
                        var idir_base = cmp.InstallDir.Base;

                        cmp.InstallDir.Base = function(_path)
                        {
                            if(!arguments.length)
                            {
                                //property get
                                return idir_base();
                            }
                            //property set
                            var path = choose_valid_path(_path, def_path);
                            Log("InstallDir.Base for " + al);
                            Log("   Incoming _path =  " + _path);
                            Log("   Incoming def_path =  " + def_path);
                            Log("   Chosen InstallDir.Base path = " + path);
                            return idir_base(path);
                        }
                    }
                    
                    var get_short_path = function(path)
                    {
                        if (!FileSystem.Exists(path))
                            FileSystem.CreateDirectory(path);
                        var s_path = FileSystem.ShortPath(path);
                        Log("Short path for " + path + " is:");
                        Log(s_path);
                        if (!path_is_correct(s_path))
                        {
                            Log(Log.l_error, "Short path contains spaces. It will be replaced with the default path");
                            var d_path = make_default_path(path, def_path);
                            if (!FileSystem.Exists(d_path))
                                FileSystem.CreateDirectory(d_path);
                            return d_path;
                        }
                        return s_path;
                    }
                    
                    cmp.Configurator().Apply.Install.SubscribeOnBegin(function()
                    {
                        Log("assign INSTALLDIR for " + al);
                        cmp.ConfigurationOptions().Value("INSTALLDIR", get_short_path(cmp.InstallDir()));
                    });  

                }
            });

        }
    }
}
