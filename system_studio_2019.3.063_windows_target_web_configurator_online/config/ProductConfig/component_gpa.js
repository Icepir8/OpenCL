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
// GPA component on intel64 machine can't be installed into Program Files (x86) therefore special processing for such case is added
new function()
{
    var assigne_sl_dir = function(cmp_main, cmp_sl, dir_name)
    {
        return function()
        {
            if(!cmp_main || !cmp_sl || !dir_name)
                return;

            Log("assigne " + dir_name + " for cmp " + cmp_sl.Name());
            cmp_sl.ConfigurationOptions().Value(dir_name, cmp_main.InstallDir());
        }
    }

    var assigne_target_dir = function(cmp)
    {
        return function()
        {
            if(!cmp)
                return;

            Log("assigne_target_dir for cmp " + cmp.Name());
            cmp.ConfigurationOptions().Value("INSTALLFOLDER", cmp.InstallDir());
        }
    }

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return coll[i];
        return null;
    };

    this.Component = function(components, node)
    {
        if(components)
        {
            var find_component = function(alias)
            {
                return filter(components, function(cmp, al)
                {
                    var reg = new RegExp(alias, 'i');
                    if(al.match(reg))
                        return true;
                });
            }

            var gpa = find_component("gpa_intel64");

            // Symbolic link to GPA folder should be created by the same way on ia32 and intel64 (via GPAINSTALLDIR)
            gpa = gpa ? gpa : find_component("gpa_ia32");
            var sl_gpa = find_component("studio_sl_gpa");

            if(!gpa)
                return;

            if(gpa && gpa.InstallDir && sl_gpa)
            {
                Log("sl_gpa added setting of the GPAINSTALLDIR");
                sl_gpa.Configurator().Apply.Install.SubscribeOnBegin(assigne_sl_dir(gpa, sl_gpa, "GPAINSTALLDIR"));
            }

            // need to pass the location where gpa shortcuts should be installed
            if(gpa.Info().Property("ShortcutsHive") && gpa.InstallConfigurationOptions)
            {
                gpa.InstallConfigurationOptions().Add("APPLICATIONPROGRAMSFOLDER", StringList.Format(gpa.Info().Property("ShortcutsHive")));
                if(!gpa.CustomProperties().Value("APPLICATIONPROGRAMSFOLDER"))
                {
                    gpa.CustomProperties().Value("APPLICATIONPROGRAMSFOLDER", StringList.Format(gpa.Info().Property("ShortcutsHive")));
                }

                if(gpa.RemoveConfigurationOptions)
                {
                    gpa.RemoveConfigurationOptions().Add("APPLICATIONPROGRAMSFOLDER", gpa.CustomProperties().Value("APPLICATIONPROGRAMSFOLDER"));
                }
                Log("gpa shortcuts hive adjustment, APPLICATIONPROGRAMSFOLDER = " + (gpa.CustomProperties().Value("APPLICATIONPROGRAMSFOLDER") || ""));
            }
        }
    }
}
