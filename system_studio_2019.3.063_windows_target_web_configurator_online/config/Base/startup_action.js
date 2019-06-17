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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));}
    var ns = this;
    var ns_registry = load("dumper_registry.js");

    /** @fn CreateRunOnce(string command, bool systemwide)
     *  @brief Schedules action after reboot
     *  @details This function creates registry string value at
     *  "HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce" or
     *  "HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce" according
     *  to systemwide parameter
     *  @param string command - this command will be run at next system startup
     *  @param bool systemwide - determines if we need "Local Machine" or
     *  "Current User" root key. By default it is "Current User".
     *  @usage
     *    ns_startup_action.CreateRunOnce("cmd /c \"c:/temp/getting_started.html\"");
     *    ns_startup_action.CreateRunOnce("C:\temp\install.exe", true);
     *    ns_startup_action.CreateRunOnce("c:\Program Files (x86)\Intel\test.exe", false);
     *  @see Product
     */
    ns.CreateRunOnce = function(command, systemwide)
    {
        if(!command)
        {
            Log(Log.l_warning, "startup_action.js::CreateRunOnce: command is not specified");
            return;
        }
        var run_once_entry = null;
        var root_key = systemwide ? "HKLM" : "HKCU";
        run_once_entry = Registry(root_key, "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce");
        if(!run_once_entry)
        {
            Log(Log.l_error, "startup_action.js::CreateRunOnce: Failed to open RunOnce entry");
            return;
        }
        
        if (!run_once_entry.Exists())
            run_once_entry.Create();

        var name = "Intel Action After Reboot"; //name of our string value
        var val = command; //input command to run on system startup
        var type = "sz"; //must be string value
        run_once_entry.Value(name, val, type); //create value at run once
    };
}
