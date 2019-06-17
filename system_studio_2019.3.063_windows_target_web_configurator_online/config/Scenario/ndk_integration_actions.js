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

        Log("Scenario::ndk_integration: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        var NDKDLG = ns.NDKIntegration;
        //###############################################################
        // NDKIntegration
        NDKDLG.SetLabel("[ndk_label]");
        NDKDLG.SetCheckBoxLabel(fm("[ndk_check_box_label]"));
        NDKDLG.SetHeader(fm("[ndk_header_file]"));
        //NDKDLG.SetFooter(fm("[ndk_footer_message]"));
        //NDKDLG.HideCheckBox();

        NDKDLG.OnNext = function(path)
        {
            if(NDKDLG.IsChecked())
            {
                prod.FilterComponentsRecursive(function(cmp)
                {
                    var p_ndk_integration = cmp.Info().Property("NDKIntegration");

                    Log("ndk object is required");
                    var NDKInt = prod.CustomObjects().Item("NDKIntegration");

                    if(!NDKInt)
                        prod.CustomObjects().Add("NDKIntegration", {integrate : 1, location : path});
                    else
                    {
                        NDKInt.integrate = 1;
                        NDKInt.location = path;
                    }
                });
            }
        }

        NDKDLG.OnPathCheck(function(path)
        {
            var ndk_path = path;
            var ndk_valid = false;

            Log("ndk path = " + ndk_path);

            if(FileSystem.Exists(ndk_path))
            {
                var toolchains = FileSystem.AbsPath(ndk_path, "toolchains");
                var ndk_build = FileSystem.AbsPath(ndk_path, "ndk-build.cmd");

                if(FileSystem.Exists(toolchains) && FileSystem.IsDirectory(toolchains) &&
                    FileSystem.Exists(ndk_build) && !FileSystem.IsDirectory(ndk_build))
                    ndk_valid = true;
            }

            if(!ndk_valid)
            {
              NDKDLG.SetInfo(StringList.Format("[ndk_location_not_valid_file]"));
              return false;
            }
            else
            {
                var release_txt =  FileSystem.ReadFileUTF8(FileSystem.MakePath("RELEASE.TXT", ndk_path));
                if(!release_txt.match(/r9[\sbcd]/gmi))
                    NDKDLG.SetInfo(StringList.Format("[ndk_not_supported_version_file]"));
            }
        });

        var ndk_dlg_required = function()
        {
            var im = prod.InstallMode();
            if(im != prod.install_mode_t.install && im != prod.install_mode_t.modify)
                  return false;

            return prod.FilterComponentsRecursive(function(cmp)
            {
                var p_ndk_integration = cmp.Info().Property("NDKIntegration");
                var act = cmp.Action();
                var st  = cmp.State();

                if(p_ndk_integration == 1 && act == cmp.action_t.install)
                {
                    Log("ndk_dlg_required is required");
                    return true;
                }
            });
        }

        NDKDLG.Skip = function(){ return !ndk_dlg_required();}

        NDKDLG.PreInstallMessageGenerator = function(msg)
        {
            var ndk_path = NDKDLG.TargetPath();

            if(ndk_path != "")
                msg.Custom(StringList.Format("[integration_with_ndk]", ndk_path.replace(/\\/g,"\\\\")));
        }

        NDKDLG.PreInstallMessageGenerator.Skip = NDKDLG.Skip;

        ns.PreInstall.AddMessageGenerator(NDKDLG.PreInstallMessageGenerator, "NDKIntegrationPreInstallMessage");

        var ndk_dlg_shown_custom = false;

        var show_dlg_ndk_def = function()
        {
            if(NDKDLG.Skip && NDKDLG.Skip())
                return false;

            if(ndk_dlg_shown_custom)
                return false;

            return true;
        }

        ns.NDKIntegrationDefButtonsIdentifier = ns.NDKIntegrationDefButtonsIdentifier ? ns.NDKIntegrationDefButtonsIdentifier : function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        ns.NDKIntegrationDef = function()
        {
            NDKDLG.Buttons = ns.NDKIntegrationDefButtonsIdentifier;
            // this should be removed when the common fix is ready
            //NDKDLG.Refresh = function(){ ns.Buttons("[Install]", "[Prev]", "[Cancel]"); }
            return NDKDLG();
        }
        ns.NDKIntegrationDef.Skip = function(){return !show_dlg_ndk_def();};

        ns.NDKIntegrationCustom = function()
        {
            NDKDLG.Buttons = function(){ ns.Buttons("[Next]", "[Prev]", "[Cancel]"); }

            var ret = NDKDLG();

            if(ret == Action.r_ok)
            {
                ndk_dlg_shown_custom = true;
            }
            else
            {
                ndk_dlg_shown_custom = false;
            }

            return ret;
        }
        ns.NDKIntegrationCustom.Skip = NDKDLG.Skip;

        Log("Scenario::ndk_integration: actions generation completed");
        return ns;
    }
}
