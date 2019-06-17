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
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "\\..\\"));};

    var ns = this;
    var ns_inst      = Namespace("Root.installer");

    var P = function(val){return ns_prop.Property(val);}

    var PForInstall = function(val, attributes)
    {
        if (typeof(ns_prop.CollectorByAnd) == "undefined")
            return ns_prop.Property(val, attributes);

        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        c.Attributes(attributes);
        return c;
    }

    this.Id = function ()
    {
        return "ISSWT 2019 core Upgrade prerequisites";
    }

    //get components object by
    this.ComponentByAlias = function (product, alias)
    {
        return product.FilterComponentsRecursive(function(cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    this.Check = function (collector, product)
    {
        Log("Upgrade Pre-requisites generation begin");

        if(!collector)
        {
            Log(Log.l_critical, "input parameter \"pre-requisites collector\" is undefined ");
            return;
        }

        var ns_inst = Namespace("Root.installer");

        var is_newer_or_older_exists = function(cmp)
        {
           if(cmp)
           {
             var act = cmp.Action();
             if(act == cmp.action_t.install)
             {
               var trgs = cmp.Upgrade().Targets();
               for(var i in trgs)
               {
                   // dal and dal_addon have the same upgrade code therefore to prevent removing dal by dal_addon (and vice versa) this filter was added
                   if(trgs[i].State() != cmp.upgrade_state_t.same)
                       trgs[i].Action(cmp.action_t.remove);
               }

               if(cmp.Upgrade().OlderExists() || cmp.Upgrade().NewerExists())
                   return true;

               return false;
             }
           }
        }

        var gpa = ns.ComponentByAlias(product, "gpa_ia32");
        if(!gpa)
            gpa = ns.ComponentByAlias(product, "gpa_intel64");

        var gfa_ogl = ns.ComponentByAlias(product, "gfa_ogl");

        //if(is_newer_or_older_exists(gfa_ogl))

        if(is_newer_or_older_exists(gpa) || is_newer_or_older_exists(gfa_ogl))
        {
               if(gpa.Upgrade().OlderExists())
                   collector.WarningExt(StringList.Format("[gpa_older_installed_title]"), StringList.Format("[gpa_older_installed_description]"));

               else if(gpa.Upgrade().NewerExists())
                   collector.WarningExt(StringList.Format("[gpa_newer_installed_title]"), StringList.Format("[gpa_newer_installed_description]"));
        }

        var sys_dbg_dal = ns.ComponentByAlias(product, "sys_dbg_dal");

        if(sys_dbg_dal && sys_dbg_dal.Action() == sys_dbg_dal.action_t.install)
        {
            var dal_codes_list = ["{00BC3291-8001-43AF-AE23-3758426DC262}", "{8BBA2B5C-3BC9-4D51-9221-75EAE3FE3E6B}", "{1EC767C8-4F75-45AF-B573-34BA62CDBA29}"];
            var ns_version = load("Base\\version.js");
            var ns_info = load("Base\\component_info.js");
            var newer_exists = false;
            for(var code_index in dal_codes_list)
            {
                var wi_info = WI.RelatedProducts(dal_codes_list[code_index]);
                for(var wi_index in wi_info)
                {
                    var info = ns_info.InfoWIRegistry(wi_info[wi_index]);
                    var iver = ns_version.Version(info.Version());
                    if(iver.eq(sys_dbg_dal.Version()))
                    {
                        Log("PreRequisites::upgrade same DAL exists");
                    }
                    else if(iver.lt(sys_dbg_dal.Version()))
                    {
                        Log("PreRequisites::upgrade older DAL exists");
                    }
                    else
                    {
                        Log("PreRequisites::upgrade newer DAL exists");
                        newer_exists = true;
                    }
                }
            }
            if(newer_exists && sys_dbg_dal.Parent().Visible())
                collector.CriticalExt(StringList.Format("[sys_dbg_dal_newer_installed_title]"), StringList.Format("[sys_dbg_dal_newer_installed_description]"));
        }

        var jre_cmp = ns.ComponentByAlias(product, "sys_dbg_jre");
        if(jre_cmp)
        {
            //here's an attempt to fix the unnecessary OpenIPC upgrade
            //JRE checks upgrade code by family GUID, so OpenIPC target
            //is included in jre_upgrade.Targets
            var jre_upgrade = jre_cmp.Upgrade();
            var jre_targets = jre_upgrade.Targets();
            for(var i in jre_targets)
            {
                //here the search for open IPC target is performed
                var alias_prop = jre_targets[i].Object().Info().Property("alias");
                if(alias_prop && String(alias_prop).toLowerCase() == "openipc")
                {
                    //do nothing if found. it must be able to be installed side by side
                    jre_targets[i].Action(jre_cmp.action_t.none);
                }
            }
        }

        //openCL top level feature must be disabled if another openCL is installed
        //otherwise installation routine will end prematurely
        var opencl_cmp_ref = ns.ComponentByAlias(product, "F_OpenCL_PCB");
        if(opencl_cmp_ref.Upgrade().NewerExists())
        {
            var opencl_ftr_ref = product.Features().Item("opencl_toplevel");
            if(opencl_ftr_ref)
            {
                var dis_p = PForInstall(opencl_cmp_ref.disabled_t.yes);
                dis_p.Attributes.Value("Description", StringList.Format("[ocl_newer_installed_title]"));
                opencl_ftr_ref.Disabled(dis_p);
            }
            var gdb_gt_ftr_ref = product.Features().Item("debugger");
            if(gdb_gt_ftr_ref)
            {
                var dis_p = PForInstall(opencl_cmp_ref.disabled_t.yes);
                gdb_gt_ftr_ref.Disabled(dis_p);
            }
        }

        var inst_mode = product.InstallMode();
        if(opencl_cmp_ref && opencl_cmp_ref.Parent().Visible() && opencl_cmp_ref.Disabled())
        {
            if(inst_mode != product.install_mode_t.repair && inst_mode != product.install_mode_t.remove)
            {
                var osinfo = System.WindowsInfo(); //check OS version
                if(osinfo.major == 6 && osinfo.minor == 1)
                {
                    collector.WarningExt("[ocl_unsupported_os_prereq_title]", "[ocl_unsupported_os_prereq_desc]");
                }
                else
                {
                    collector.WarningExt("[ocl_newer_installed_title]", "[ocl_newer_installed_description]");
                }
            }
        }

        var socwatch_cmp_ref = ns.ComponentByAlias(product, "studio_socwatch_target_cmp");
        if(socwatch_cmp_ref && socwatch_cmp_ref.Parent().Visible() && socwatch_cmp_ref.Disabled())
        {
            if(inst_mode != product.install_mode_t.repair && inst_mode != product.install_mode_t.remove)
            {
                collector.WarningExt("[socwatch_unsupported_os_prereq_title]", "[socwatch_unsupported_os_prereq_desc]");
            }
        }
    }
}
