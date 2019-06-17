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

new function () {
    var load = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "\\..\\")); };
    var base = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "../Base")); };

    var ns = this;

    this.Id = function () {
        return "Visual Studio prerequisites";
    }

    this.GetVSName = function (vs_version) {
        return StringList.Format("[vs_name]", vs_version);
    }

    this.CheckStage_Second = function (collector, product) {
        Log(ns.Id() + " 'Second' generation begin");

        if (!collector) {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = base("installer.js");
        var ns_vs = base("vs_processing.js").GetVSInfo();

        var product_name = product.Info().Property("title");

        //by install mode
        var im = product.InstallMode();
        switch (im) {
            case product.install_mode_t.install:
                ///////////////////////////////////////////////////////////
                //Install mode
                /////////////////////////////////////////////////////////// 

                // -------> Critical Section <--------

                var description = (ns_inst.Installer.Silent()) ? "[vs_running_description_install_silent]" : "[vs_running_description_install]";
                var description_under_another_user = (ns_inst.Installer.Silent()) ? "[vs_running_description_install_silent_under_another_user]" : "[vs_running_description_install_under_another_user]";

                //Visual Studio Running
                if (ns_vs.RunningUnderAnotherUser && ns_vs.RunningUnderAnotherUser())
                    collector.CriticalExt(StringList.Format("[vs_running_title_under_another_user]"), StringList.Format(description_under_another_user, product_name));
                if (ns_vs.vs_2005.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2005")), StringList.Format(description, ns.GetVSName("2005"), ns.GetVSName("2005"), product_name));
                if (ns_vs.vs_2008.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2008")), StringList.Format(description, ns.GetVSName("2008"), ns.GetVSName("2008"), product_name));
                if (ns_vs.vs_2010.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2010")), StringList.Format(description, ns.GetVSName("2010"), ns.GetVSName("2010"), product_name));
                if (ns_vs.vs_2012.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2012")), StringList.Format(description, ns.GetVSName("2012"), ns.GetVSName("2012"), product_name));
                if (ns_vs.vs_2013.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2013")), StringList.Format(description, ns.GetVSName("2013"), ns.GetVSName("2013"), product_name));
                if (ns_vs.vs_2015.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2015")), StringList.Format(description, ns.GetVSName("2015"), ns.GetVSName("2015"), product_name));
                if (ns_vs.vs_2017.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2017")), StringList.Format(description, ns.GetVSName("2017"), ns.GetVSName("2017"), product_name));

                break;
            case product.install_mode_t.modify:
                ///////////////////////////////////////////////////////////
                //Modify mode
                /////////////////////////////////////////////////////////// 

                // -------> Critical Section <--------

                var description = (ns_inst.Installer.Silent()) ? "[vs_running_description_modify_silent]" : "[vs_running_description_modify]";
                var description_under_another_user = (ns_inst.Installer.Silent()) ? "[vs_running_description_modify_silent_under_another_user]" : "[vs_running_description_modify_under_another_user]";

                //Visual Studio Running
                if (ns_vs.RunningUnderAnotherUser && ns_vs.RunningUnderAnotherUser())
                    collector.CriticalExt(StringList.Format("[vs_running_title_under_another_user]"), StringList.Format(description_under_another_user, product_name));
                if (ns_vs.vs_2005.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2005")), StringList.Format(description, ns.GetVSName("2005"), ns.GetVSName("2005"), product_name));
                if (ns_vs.vs_2008.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2008")), StringList.Format(description, ns.GetVSName("2008"), ns.GetVSName("2008"), product_name));
                if (ns_vs.vs_2010.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2010")), StringList.Format(description, ns.GetVSName("2010"), ns.GetVSName("2010"), product_name));
                if (ns_vs.vs_2012.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2012")), StringList.Format(description, ns.GetVSName("2012"), ns.GetVSName("2012"), product_name));
                if (ns_vs.vs_2013.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2013")), StringList.Format(description, ns.GetVSName("2013"), ns.GetVSName("2013"), product_name));
                if (ns_vs.vs_2015.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2015")), StringList.Format(description, ns.GetVSName("2015"), ns.GetVSName("2015"), product_name));
                if (ns_vs.vs_2017.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2017")), StringList.Format(description, ns.GetVSName("2017"), ns.GetVSName("2017"), product_name));

                break;
            case product.install_mode_t.repair:
                ///////////////////////////////////////////////////////////
                //Repair mode
                /////////////////////////////////////////////////////////// 

                // -------> Critical Section <--------

                var description = (ns_inst.Installer.Silent()) ? "[vs_running_description_repair_silent]" : "[vs_running_description_repair]";
                var description_under_another_user = (ns_inst.Installer.Silent()) ? "[vs_running_description_repair_silent_under_another_user]" : "[vs_running_description_repair_under_another_user]";

                //Visual Studio Running
                if (ns_vs.RunningUnderAnotherUser && ns_vs.RunningUnderAnotherUser())
                    collector.CriticalExt(StringList.Format("[vs_running_title_under_another_user]"), StringList.Format(description_under_another_user, product_name));
                if (ns_vs.vs_2005.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2005")), StringList.Format(description, ns.GetVSName("2005"), ns.GetVSName("2005"), product_name));
                if (ns_vs.vs_2008.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2008")), StringList.Format(description, ns.GetVSName("2008"), ns.GetVSName("2008"), product_name));
                if (ns_vs.vs_2010.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2010")), StringList.Format(description, ns.GetVSName("2010"), ns.GetVSName("2010"), product_name));
                if (ns_vs.vs_2012.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2012")), StringList.Format(description, ns.GetVSName("2012"), ns.GetVSName("2012"), product_name));
                if (ns_vs.vs_2013.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2013")), StringList.Format(description, ns.GetVSName("2013"), ns.GetVSName("2013"), product_name));
                if (ns_vs.vs_2015.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2015")), StringList.Format(description, ns.GetVSName("2015"), ns.GetVSName("2015"), product_name));
                if (ns_vs.vs_2017.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2017")), StringList.Format(description, ns.GetVSName("2017"), ns.GetVSName("2017"), product_name));

                break;
            case product.install_mode_t.remove:
                ///////////////////////////////////////////////////////////
                //Remove mode
                /////////////////////////////////////////////////////////// 

                // -------> Critical Section <--------

                var description = (ns_inst.Installer.Silent()) ? "[vs_running_description_remove_silent]" : "[vs_running_description_remove]";
                var description_under_another_user = (ns_inst.Installer.Silent()) ? "[vs_running_description_remove_silent_under_another_user]" : "[vs_running_description_remove_under_another_user]";

                //Visual Studio Running
                if (ns_vs.RunningUnderAnotherUser && ns_vs.RunningUnderAnotherUser())
                    collector.CriticalExt(StringList.Format("[vs_running_title_under_another_user]"), StringList.Format(description_under_another_user, product_name));
                if (ns_vs.vs_2005.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2005")), StringList.Format(description, ns.GetVSName("2005"), ns.GetVSName("2005"), product_name));
                if (ns_vs.vs_2008.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2008")), StringList.Format(description, ns.GetVSName("2008"), ns.GetVSName("2008"), product_name));
                if (ns_vs.vs_2010.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2010")), StringList.Format(description, ns.GetVSName("2010"), ns.GetVSName("2010"), product_name));
                if (ns_vs.vs_2012.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2012")), StringList.Format(description, ns.GetVSName("2012"), ns.GetVSName("2012"), product_name));
                if (ns_vs.vs_2013.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2013")), StringList.Format(description, ns.GetVSName("2013"), ns.GetVSName("2013"), product_name));
                if (ns_vs.vs_2015.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2015")), StringList.Format(description, ns.GetVSName("2015"), ns.GetVSName("2015"), product_name));
                if (ns_vs.vs_2017.Running())
                    collector.CriticalExt(StringList.Format("[vs_running_title]", ns.GetVSName("2017")), StringList.Format(description, ns.GetVSName("2017"), ns.GetVSName("2017"), product_name));

                break;
        }

        Log(ns.Id() + " 'Second' generated successfully");

        return;
    }
}
