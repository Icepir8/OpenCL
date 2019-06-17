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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};

    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::welcome_links: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        var on_click_link = function(id, command, value)
        {
            var link = "";

            Log("Catched click: " + id + " : " + command + " : " + value);

            if(value.match(/installation guide and usage prerequisites/i))
            {
                Log("im = " + prod.InstallMode());
                if(prod.InstallMode() == prod.install_mode_t.install)
                {
                    //StringList.Replace("EXELOCATION", FileSystem.exe_dir);
                    link = StringList.Format("[getting_started_guide_and_help_link_media]");
                    Log("media link = " + link);
                }
            }
            else if(value.match(/prerequisites guide/i))
            {
                link = StringList.Format("[prerequisite_doc]");
            }
            else if(value.match(/http:\/\//))
                link = value;

            if(link.length)
                Execute.URL(link);
        }

        Wizard.Notify("welcome", "mark link", "Installation Guide and Usage Prerequisites");
        //Wizard.Notify("welcome", "mark link", "Prerequisites Guide");
        Wizard.Subscribe("welcome", "OnClicked", on_click_link);


        Log("Scenario::welcome_links: actions generation completed");
        return ns;
    }
}
