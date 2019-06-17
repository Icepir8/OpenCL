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
    var file_rename = function()
    {
        Log("Check for pending reboot file renaming operations");
        var reg_file = Registry("HKLM", "SYSTEM\\CurrentControlSet\\Control\\Session Manager");
        reg_file.WowRedirect(false);
        if(reg_file.Exists())
        {
            var v = reg_file.Values();
            for(var i in v)
                if(v[i] == "PendingFileRenameOperations")
                {
                    Log("  Found pending file rename operations");
                    return true;
                }
        }
        return false;
    }

    var auto_update = function()
    {
        Log("Check for pending reboot auto udpate");
        var reg_update = Registry("HKLM", "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired");
        reg_update.WowRedirect(false);
        if(reg_update.Exists())
        {
            Log("  Auto Update reboot pending");
            return true;
        }
        return false;
    }

    var base_servicing = function()
    {
        Log("Check for pending reboot base servicing");
        var reg_component = Registry("HKLM", "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending");
        reg_component.WowRedirect(false);
        if(reg_component.Exists())
        {
            Log("  Component Based Servicing reboot pending");
            return true;
        }

        return false;
    }

    var installer = function()
    {
        Log("Check for pending reboot installer");
        Log("  Processing 32-bit keys");
        var reg_installer = Registry("HKLM", "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall");

        var filter = function(collection, cb)
        {
            for(var i in collection)
                if(cb(collection[i]))
                    return true;
        }

        var pro = function(e)
        {
            if(e && e.match(/\.RebootRequired$/i))
            {
                Log("Fount reboot required record: " + e);
                return true;
            }
            return false;
        }

        if(reg_installer.Exists())
        {
            if(filter(reg_installer.Subkeys(), pro))
                return true;
        }

        if(System.ProcessorArch() == System.ProcessorArch.pa_intel64)
        {
            Log("  Processing 64-bit keys");
            reg_installer.WowRedirect(false);
            if(reg_installer.Exists())
            {
                if(filter(reg_installer.Subkeys(), pro))
                    return true;
            }
        }

        return false;
    }

    this.PendingReboot = function()
    {
        return file_rename() || auto_update() || base_servicing() || installer();
    }

    this.PendingReboot.FileRenaming = file_rename;
    this.PendingReboot.AutoUpdate = auto_update;
    this.PendingReboot.BaseServicing = base_servicing;
    this.PendingReboot.Installer = installer;
}


