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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "/Base"));};

    this.Scenario = function(prod, _dir)
    {
        Log("Scenario generation begin");

        if(!prod)
        {
            Log("required parameter \"prod\" is undefined. Abort.");
            return null;
        }
        var scenario = base("scenario3.js").Create("Main");
        scenario.Product(prod);

        Log("Loading scenario scripts");
        
        var dir = _dir ? _dir : FileSystem.MakePath("/Scenario", Origin.Directory());

        Log("Loading scenario scripts, using directory: ", dir);
        //###############################################################
        //Loading scenario actions
        //###############################################################
        Log("Loading scenario actions begin");

        var base_scr = FileSystem.MakePath("base.js", dir);

        if(typeof (WPF) != "undefined")
            base_scr = FileSystem.MakePath("base_wpf.js", dir);

        var base_acts = required(base_scr);

        var acts = {};

        if(base_acts && base_acts.Actions)
            base_acts.Actions.call(acts, prod);

        var files = FileSystem.FindFiles(dir, "*.js");
        
        var item;
        var file;
        var obj;
        var i;
        
        for(i in files)
        {
            if(files[i].match(/base\.js|base_wpf\.js/))
                continue;

            item = files[i];
            file = FileSystem.MakePath(item, dir);
            obj = required(file);

            if(obj && obj.Actions)
                obj.Actions.call(acts, prod);
        }
        Log("Loading scenario actions done");
        //###############################################################
        //Adding actions into scenario
        //###############################################################
        Log("Adding actions into scenario begin");
        
        var main_scr = FileSystem.MakePath("main.js", Origin.Directory());

        var main_scn = required(main_scr);

        var ret = null;

        if(main_scn && main_scn.Main)
            ret = main_scn.Main.call(scenario, acts);

        Log("Loading base scenario done, ret = " + ret );
        // ret defines if loading of the other scenarios required or not
        if(!ret)
        {
           for(i in files)
           {
               if(files[i].match(/base\.js|base_wpf\.js/))
                   continue;

               item = files[i];
               file = FileSystem.MakePath(item, dir);
               obj = required(file);

               if(obj && obj.Scenario)
                   obj.Scenario.call(scenario, acts);
           }
        }
        else
          Log("Loading additional scenarios configurators are not required due to ret = " + ret );

        Log("Adding actions into scenario done");

        return scenario;
    }
}
