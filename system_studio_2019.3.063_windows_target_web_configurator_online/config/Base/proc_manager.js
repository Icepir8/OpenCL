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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    
    var ns = this;
    
    //proc_name is the executable file with the full path
    this.is_running_under_this_user = function(proc_name)
    {
                       
         Log("is_running_under_this_user started with " + proc_name);
         if(!proc_name)
                return false;

            if(!FileSystem.Exists(proc_name))
                return false;

            var p_list = System.ProcessList();

            for(var i in p_list)
            {
                var proc = p_list[i];
                if(FileSystem.Exists(proc) && FileSystem.Same(proc, proc_name))
                    return true;
            }
            return false;                        
        
    }
    
    this.is_running_under_another_user = function(proc_name)
    {
            Log("is_running_under_another_user started with " + proc_name);
            
            if(!proc_name)
                return false;

            var p_list = System.ProcessList();

            for(var i in p_list)
            {
                var proc = p_list[i];
                Log("Process list under another user " + proc);
                if(FileSystem.FileName(proc_name) == proc)
                   return true;
            }
            return false;
    }
    
    this.is_running = function(proc_name)
    {
        Log("is_running started with " + proc_name);
            
        if(!proc_name)
            return false;

        var p_list = System.ProcessList();

        for(var i in p_list)
        {
            var proc = p_list[i];
            if(FileSystem.FileName(proc_name) == FileSystem.FileName(proc))
               return true;
        }
        return false;
    }
    
    this.WMIProcessList = function()
    {
        var p_list = WMI.Query("SELECT ProcessId, Name, Caption, ExecutablePath FROM Win32_Process");
        return p_list;
    }
    
    this.kill_proc = function(proc)
    {
         Log("Killing process " + proc.Name);
         safecall(function() {CreateProcess(null, FileSystem.SpecialFolder.system + "\\Taskkill.exe /PID "+ proc.ProcessId+ " /T /F"); },
            function(){Log(Log.l_warning, "Exception handled calling kill_proc, " + proc.Name + " ");});
    }
}