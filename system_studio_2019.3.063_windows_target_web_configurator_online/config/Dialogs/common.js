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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};
    var format = StringList.Format;
    var ns_pb =  base("parse_bool.js");
    var ns_pr =  base("pendingreboot.js");

    this.Init = function()
    {
        var ns = this;

        var stat_pick = base("stat_pick.js").Stat_pick;
        var ns_path_check = base("path_checker.js");

        //###############################################################
        // Welcome
        //###############################################################
        var welcome_template = "[welcome_template]";

        this.Welcome = function()
        {
            ns.DialogHeader("Welcome");
            ns.Welcome.Buttons();

            ns.StageSuite("suite_install");
            ns.Stage("welcome.png");
            Wizard.Notify("welcome", "set rtf text", welcome_template);
            var r = Action.Dialog({name:"Welcome", mode:"sync"});
            Wizard.Prev.Enable();
            return r;
        }

        this.Welcome.Template = function(text)
        {
            if(text)
                welcome_template = text;
            else
                welcome_template = "[welcome_template]";
        }

        this.Welcome.Buttons = function()
        {
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Enable();
        }
        //###############################################################
        // OpenSourceMsg
        //###############################################################
        var open_source_msg_template = "[open_source_msg_template]";

        this.OpenSourceMsg = function()
        {
            ns.DialogHeader("OpenSourceMsg");
            ns.OpenSourceMsg.Buttons();
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();
            ns.Stage("options.png");
            //Wizard.Notify("open_source_msg", "set rtf text", open_source_msg_template);
            var r = Action.Dialog({name:"OpenSourceMsg", mode:"sync"});
            return r;
        }

        this.OpenSourceMsg.Buttons = function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        this.OpenSourceMsg.Template = function(text)
        {
            if(text)
                open_source_msg_template = text;
            else
                open_source_msg_template = "[open_source_msg_template]";
        }

        this.OpenSourceMsg.SetMessage = function(msg)
        {
            Wizard.Notify("open_source_msg", "set rtf text", StringList.Format("[open_source_msg_template]", msg));
        }
        //###############################################################
        // Maintenance
        //###############################################################
        var maintenance_enable_prev = true;

        var maintenance_mode_changed_cb;

        Wizard.Notify("maintenance/modify", "check btn"); // update status only once

        this.Maintenance = function()
        {
            ns.DialogHeader("Maintenance");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            if(!maintenance_enable_prev)
                Wizard.Prev.Disable();
            else
                Wizard.Prev.Enable();

            Wizard.Next.Enable();
            Wizard.Cancel.Enable();

            ns.Stage("welcome.png");
            var r = Action.Dialog({name:"Maintenance", mode:"sync"});
            if(!maintenance_enable_prev)
                Wizard.Prev.Enable();
            return r;
        }

        this.Maintenance.OnModeChange = function(cb) {maintenance_mode_changed_cb = cb;}

        this.Maintenance.EnablePrev = function(enable)
        {
            maintenance_enable_prev = enable;
        }

        this.Maintenance.EnableModify = function(en) {Wizard.Notify("maintenance/modify", en ? "enable" : "disable");}
        this.Maintenance.EnableRepair = function(en) {Wizard.Notify("maintenance/repair", en ? "enable" : "disable");}
        this.Maintenance.EnableRemove = function(en) {Wizard.Notify("maintenance/remove", en ? "enable" : "disable");}

        var maintenance_mode_cb = function(mode)
        {
            if(maintenance_mode_changed_cb)
                safecall(function(){maintenance_mode_changed_cb(mode);},
                         function(){Log(Log.l_error, "Maintenance mode changed callback exception handled.");});
        }

        this.Maintenance.Select = function(opt)
        {
            Wizard.Notify("maintenance/modify", "set checked", false);
            Wizard.Notify("maintenance/repair", "set checked", false);
            Wizard.Notify("maintenance/remove", "set checked", false);
            switch(opt)
            {
            case "modify":
                Wizard.Notify("maintenance/modify", "set checked", true);
                maintenance_mode_cb(ns.Installer().install_mode_t.modify);
                break;
            case "repair":
                Wizard.Notify("maintenance/repair", "set checked", true);
                maintenance_mode_cb(ns.Installer().install_mode_t.repair);
                break;
            default: //case "remove":
                Wizard.Notify("maintenance/remove", "set checked", true);
                maintenance_mode_cb(ns.Installer().install_mode_t.remove);
                break;
            }
        }

        var MaintenanceTypeChanged = function(id, notify, value)
        {
            if(id != "maintenance" || notify != "maintenance type changed")
                return;

            switch(value)
            {
                case "NTF_MODIFY":
                    ns.Installer().InstallMode(ns.Installer().install_mode_t.modify);
                    maintenance_mode_cb(ns.Installer().install_mode_t.modify);
                    break;
                case "NTF_REPAIR":
                    ns.Installer().InstallMode(ns.Installer().install_mode_t.repair);
                    maintenance_mode_cb(ns.Installer().install_mode_t.repair);
                    break;
                case "NTF_REMOVE":
                    ns.Installer().InstallMode(ns.Installer().install_mode_t.remove);
                    maintenance_mode_cb(ns.Installer().install_mode_t.remove);
                    break;
                default:
                    Log("Maintenance mode: unknown mode: " + value);
                    break;
            }
        }

        Wizard.Subscribe("maintenance", "maintenance type changed", MaintenanceTypeChanged);
        //###############################################################
        // Setuptype
        //###############################################################
        this.Setuptype = function()
        {
            ns.DialogHeader("SetupType");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            ns.Stage("options.png");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            if(ns.Installer().SetupType() == ns.Installer().setup_type_t.setup_default)
                Wizard.Notify("setuptype/default", "check btn");
            else
                Wizard.Notify("setuptype/custom", "check btn");

            var r = Action.Dialog({name:"Setuptype", mode:"sync"});
            return r;
        }

        var SetuptypeChanged = function (id, notify, value)
        {
            if(id != "setuptype" || notify != "setuptype_was_changed")
                return;

            switch(value)
            {
                case "NTF_DEFAULT":
                    ns.Installer().SetupType(ns.Installer().setup_type_t.setup_default);
                    break;
                case "NTF_CUSTOM":
                    ns.Installer().SetupType(ns.Installer().setup_type_t.setup_custom);
                    break;
            }
        }

        Wizard.Subscribe("setuptype", "setuptype_was_changed", SetuptypeChanged);
        //###############################################################
        // EULA
        //###############################################################
        var eula_accept_reject = function(control, action)
        {
            if(action == "OnClicked")
            {
                if(control == "eula_rtf/accept_chkbox")
                {
                    if (Wizard.Notify("eula_rtf/accept_chkbox","is checked"))
                        Wizard.Next.Enable();
                    else
                        Wizard.Next.Disable();
                }
            }
        }

        var eula_enable_prev = true;

        this.Eula = function()
        {
            ns.DialogHeader("Eula");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            if(!eula_enable_prev)
            {
                //first dialog
                ns.StageSuite("suite_install");
                ns.Stage("license.png");
                Wizard.Prev.Disable();
            }
            else
            {
                ns.Stage("license.png");
                Wizard.Prev.Enable();
            }
            Wizard.Next.Enable();
            Wizard.Cancel.Enable();

            var res = Action.Dialog({name:"EULA_RTF", mode:"sync"});
            stat_pick.Property("gui_eula_accepted", (res == Action.r_ok));
            if(!eula_enable_prev)
                Wizard.Prev.Enable();
            return res;
        }

        this.Eula.EnablePrev = function(enable)
        {
            eula_enable_prev = enable;
        }

        this.Eula.File = function(file_path)
        {
            if(file_path)
                Wizard.Notify("eula_rtf", "set rtf text", FileSystem.ReadFileUTF8(file_path));
        }

        this.Eula.File(FileSystem.MakePath("../../eula.rtf", Origin.Directory()));

        this.Eula.CustomHandler = function(cb)
        {
            if(cb)
            {
                Wizard.Subscribe("eula_rtf/accept_chkbox", "OnClicked", cb);
            }
            else
            {
                Wizard.Subscribe("eula_rtf/accept_chkbox", "OnClicked", eula_accept_reject);
            }
        }

        this.Eula.CustomHandler();

        Wizard.Subscribe("eula_rtf", "OnClicked", function(c, m, url){Execute.URL(url);});


        this.EulaMultiple = function()
        {
            ns.DialogHeader("Eula");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            ns.Stage("license.png");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            return Action.Dialog({name:"EULA-multiple", mode:"sync"});
        }

        Wizard.Subscribe("eula/multiple", "OnClicked", function(c, m, url){Execute.URL(url);});


        var list_processor = function(id)
        {
            return {
                OnClicked: function(cb) {Wizard.Subscribe(id, "OnClicked", function(_id, command, value) {cb(value);});},
                Add: function(text) {Wizard.Notify(id, "add", text);},
                Clear: function() {Wizard.Notify(id, "clear");},
                Select: function(item) {Wizard.Notify(id, "select", item);},
                Selected: function() {return Wizard.Notify(id, "selected");}
            };
        }

        this.EulaMultiple.Licenses = list_processor("eula/multiple/liclist");
        this.EulaMultiple.Components = list_processor("eula/multiple/complist");
        this.EulaMultiple.Text = function(text) {Wizard.Notify("eula/multiple", "set rtf text", text);}


        //###############################################################
        // Destination
        //###############################################################
        var destination_space_required = null;
        var destination_current_value = "";

        var custom_path_checker = null;

        var update_space_info = function()
        {
            Log("incoming path: " + destination_current_value);

            var pchecker = ns_path_check.PathChecker(destination_current_value);
            pchecker.SpaceRequired(destination_space_required);

            var prod = ns.Product();
            if(custom_path_checker)
                custom_path_checker(pchecker, prod);

            pchecker.IsValid();

            if(pchecker.ErrorCode() == pchecker.target_path_error_t.incorrect_path)
            {
                ns.Destination.SetInfo(pchecker.ErrorMessage() + " \\par\\par " + format("[%f]", destination_current_value));
                Wizard.Notify("destination/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired()));
                Wizard.Next.Disable();
                return false;
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.access_denied)
            {
                ns.Destination.SetInfo(pchecker.ErrorMessage());
                Wizard.Notify("destination/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired()));
                Wizard.Next.Disable();
                return false;
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.no_enough_space)
            {
                Wizard.Notify("destination/space", "set rtf text", format("[space_failed_file]", pchecker.SpaceRequired(), pchecker.SpaceAvailable()));
                Wizard.Next.Disable();
                return false;
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.space_unknown)
            {
                Wizard.Notify("destination/space", "set rtf text", format("[space_unknown_file]", pchecker.SpaceRequired(), "[unknown]"));
            }
            else
                Wizard.Notify("destination/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired(), pchecker.SpaceAvailable()));

            Wizard.Next.Enable();
            return true;
        }

        this.Destination = function()
        {
            ns.DialogHeader("Destination");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            ns.Stage("options.png");

            if(ns.Destination.Refresh)
                ns.Destination.Refresh();

            //update space info shouldn't be a condition for the Destination refresh and should be done in after it.
            //due to in Refresh destination_current_value can be redefined but in case if update_space_info returns false (for example for previous destination) it can not be updated

            update_space_info();

            return Action.Dialog({name:"Destination", mode:"sync"});
        }

        this.Destination.Set = function( folder_path )
        {
            Wizard.Notify("destination/edit_box","set text", folder_path);
            destination_current_value = folder_path;
            update_space_info();
        }

        this.Destination.SetInfo = function( mes )
        {
            var expanded = System.ExpandEnvironmentStr(mes);
            var _mes = expanded ? expanded : mes;
            Wizard.Notify("destination/info","set rtf text", _mes);
        }

        this.Destination.SetHeader = function( mes )
        {
            Wizard.Notify("destination/header","set rtf text", mes);
        }
        this.Destination.Disable = function( )
        {
            Wizard.Notify("destination/edit_box","disable");
            Wizard.Notify("destination/browse","disable");
        }

        this.Destination.Enable = function( )
        {
            Wizard.Notify("destination/edit_box","enable")
            Wizard.Notify("destination/browse","enable");
        }

        this.Destination.SpaceRequired = function(cb)
        {
            destination_space_required = cb;
            update_space_info();
        }

        this.Destination.SetCustomPathChecker = function(cb)
        {
            if(cb && typeof(cb) == "function")
                custom_path_checker = cb;
        }

        var ChangeProcessor = function (id, notify, _value)
        {
            if(id != "destination" || notify != "destination_changed")
                return;
            var value = _value.trim();

            var dirs = value.split(/[\\\/]/g);
            var path = "";
            for(var i in dirs)
            {
                path += dirs[i].trim();
                path += "\\";
            }
            value = path;

            var expanded = System.ExpandEnvironmentStr(value);
            if(expanded && expanded != value)
                value = expanded;

            if(value.length > 4)
                value = value.replace(/\\+$/, "");

            destination_current_value = value;
            if(update_space_info())
                if(ns.Destination.OnChange)
                    ns.Destination.OnChange(destination_current_value);
        }

        Wizard.Subscribe("destination", "destination_changed", ChangeProcessor);
        Wizard.Notify("destination/edit_box", "set text limit", 260);
        Wizard.Notify("destination/info", "disable autolink", true);

        //###############################################################
        // Destination2 - 2 labeled destination dialog
        //###############################################################
        var d2_paths = [];
        var d2_on_change = function(id, value)
        {
            var self = arguments.callee;
            if(self[id])
            {
                d2_paths[id] = {value:value};
                return self[id](value);
            }
        }

        d2_on_change[1] = function(){};
        d2_on_change[2] = function(){};
        d2_on_change.notify = function()
        {
            if(d2_paths[1])
                d2_on_change(1, d2_paths[1].value);
            if(d2_paths[2])
                d2_on_change(2, d2_paths[2].value);
        }

        this.Destination2 = function()
        {
            ns.DialogHeader("Destination2");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();
            d2_on_change.notify();

            ns.Stage("options.png");

            var ret = Action.Dialog({name:"Destination2", mode:"sync"});
            if(ret == Action.r_ok)
            {
                if(ns.Destination2.OnNext)
                    ns.Destination2.OnNext({path1:d2_paths[1].value, path2:d2_paths[2].value});
            }

            return ret;
        }

        this.Destination2.Set = function( id, folder_path )
        {
            Wizard.Notify("destination2/edit_box" + id, "set text", folder_path);
            d2_on_change(id, folder_path);
        }

        this.Destination2.SetLabel = function( id, mes )
        {
            Wizard.Notify("destination2/label" + id, "set rtf text", mes);
        }

        this.Destination2.SetHeader = function( id, mes )
        {
            Wizard.Notify("destination2/header" + id, "set rtf text", mes);
        }

        this.Destination2.SetFooter = function( id, mes )
        {
            Wizard.Notify("destination2/footer" + id, "set rtf text", mes);
        }

        this.Destination2.Disable = function(id)
        {
            Wizard.Notify("destination2/edit_box" + id, "disable");
            Wizard.Notify("destination2/browse" + id, "disable");
        }

        this.Destination2.Enable = function(id)
        {
            Wizard.Notify("destination2/edit_box" + id, "enable");
            Wizard.Notify("destination2/browse" + id, "enable");
        }

        this.Destination2.Subscribe = function(id, cb)
        {
            d2_on_change[id] = cb;
        }

        var ChangeProcessor2 = function (id, notify, value)
        {
            if(notify != "OnChanged")
                return;
            switch(id)
            {
            case "destination2/edit_box1":
                d2_on_change(1, value);
                break;
            case "destination2/edit_box2":
                d2_on_change(2, value);
                break;
            }
        }

        Wizard.Subscribe("destination2/edit_box1", "OnChanged", ChangeProcessor2);
        Wizard.Subscribe("destination2/edit_box2", "OnChanged", ChangeProcessor2);
        Wizard.Notify("destination2/edit_box1", "set text limit", 260);
        Wizard.Notify("destination2/edit_box2", "set text limit", 260);

        //###############################################################
        // EclipseIntegration
        //###############################################################
        var eclipse_dir_current_value= "";

        var eclipse_path_is_valid = function()
        {
            var invalid_path = function(reason)
            {
                Log("Failed path processing: " + reason);
                Wizard.Notify("eclipse_integration/path", "set rtf text", format("[eclipse_incorrect_path_file]", reason));
                Wizard.Next.Disable();
            }
            Log("incoming path: " + eclipse_dir_current_value);

            var path = eclipse_dir_current_value;

            if(!path)
            {
                Wizard.Notify("eclipse_integration/path", "set rtf text", "");
                Wizard.Next.Disable();
                return false;
            }
            else if(path.length < 3 || !FileSystem.IsAbsolute(path))
            {
                invalid_path("Not absolute");
                return false;
            }

            if(path.match(/[<>?*|]/))
            {
                invalid_path("Incorrect symbols");
                return false;
            }

            if(FileSystem.IsNetwork() && path.match(/[:]/))
            {
                invalid_path("Network path contains ':'");
                return false;
            }

            if(path.split(":").length > 2)
            {
                invalid_path("More than one ':'");
                return false;
            }

            if(!(FileSystem.Exists(FileSystem.MakePath("eclipse.exe", path)) && FileSystem.Exists(FileSystem.MakePath(".eclipseproduct", path))))
            {
                invalid_path("It is not an Eclipse directory.");
                return false;
            }

            Wizard.Notify("eclipse_integration/path", "set rtf text", "");

            Wizard.Next.Enable();
            return true;
        }

        this.EclipseIntegration = function()
        {
            ns.DialogHeader("EclipseIntegration");
            typeof(ns.EclipseIntegration.Buttons) == "function" ? ns.EclipseIntegration.Buttons() : ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            ns.Stage("options.png");

            if(ns.EclipseIntegration.IsChecked())
            {
                ns.EclipseIntegration.Enable();
                eclipse_path_is_valid();
            }
            else
            {
                ns.EclipseIntegration.Disable();
            }

            if(ns.EclipseIntegration.Refresh)
                ns.EclipseIntegration.Refresh();

            var ret = Action.Dialog({name:"EclipseIntegration", mode:"sync"});
            if(ret == Action.r_ok)
            {
                if(ns.EclipseIntegration.OnNext)
                    ns.EclipseIntegration.OnNext(eclipse_dir_current_value);
            }

            return ret;
        }

        this.EclipseIntegration.Set = function( folder_path )
        {
            Wizard.Notify("eclipse_integration/edit_box","set text", folder_path);
            eclipse_dir_current_value= folder_path;
            eclipse_path_is_valid();
        }

        this.EclipseIntegration.SetInfo = function( mes )
        {
            Wizard.Notify("eclipse_integration/info","set text", mes);
        }

        this.EclipseIntegration.SetHeader = function( mes )
        {
            Wizard.Notify("eclipse_integration/header","set rtf text", mes);
        }

        this.EclipseIntegration.Disable = function( )
        {
            Wizard.Notify("eclipse_integration/label","hide");
            Wizard.Notify("eclipse_integration/edit_box", "hide");
            Wizard.Notify("eclipse_integration/browse", "hide");
            Wizard.Notify("eclipse_integration/path", "hide");
            Wizard.Next.Enable();
        }

        this.EclipseIntegration.Enable = function( )
        {
            Wizard.Notify("eclipse_integration/label","show");
            Wizard.Notify("eclipse_integration/edit_box","show");
            Wizard.Notify("eclipse_integration/browse","show");
            Wizard.Notify("eclipse_integration/path", "show");
            eclipse_path_is_valid();
        }

        this.EclipseIntegration.SetChecked = function( val )
        {
            Wizard.Notify("eclipse_integration/check_box","set checked", val);
        }

        this.EclipseIntegration.IsChecked = function( )
        {
            return Wizard.Notify("eclipse_integration/check_box","is checked");
        }

        this.EclipseIntegration.TargetPath = function()
        {
            return eclipse_dir_current_value;
        }

        var EclipseChangeProcessor = function (id, notify, value)
        {
            if(id != "eclipse_integration" || notify != "eclipse_dir_changed")
                return;

            eclipse_dir_current_value= value;
            if(eclipse_path_is_valid())
                if(ns.EclipseIntegration.OnChange)
                    ns.EclipseIntegration.OnChange(eclipse_dir_current_value);
        }

        var CheckedChangeProcessor = function (id, notify, value)
        {
            if(id != "eclipse_integration" || notify != "integration_set_checked")
                return;

            if(value)
                ns.EclipseIntegration.Enable();
            else
                ns.EclipseIntegration.Disable();
        }

        Wizard.Subscribe("eclipse_integration", "eclipse_dir_changed", EclipseChangeProcessor);
        Wizard.Subscribe("eclipse_integration", "integration_set_checked", CheckedChangeProcessor);
        Wizard.Notify("eclipse_integration/edit_box", "set text limit", 260);
        //###############################################################
        // NDKIntegration2
        //###############################################################
        var ndk2_dir_current_value= "";

        var ndk2_on_change = function(){};

        var ndk2_check_path = function(){};

        var ndk2_path_is_valid = function()
        {
            var invalid_path = function(reason)
            {
                Log("Failed path processing: " + reason);
                Wizard.Notify("ndk_integration_2/path", "set rtf text", format("[ndk_incorrect_path_file]", reason));
                Wizard.Next.Disable();
            }
            Log("incoming path: " + ndk2_dir_current_value);

            var path = ndk2_dir_current_value;

            if(!path)
            {
                Wizard.Notify("ndk_integration_2/path", "set rtf text", "");
                Wizard.Next.Disable();
                return false;
            }
            else if(path.length < 3 || !FileSystem.IsAbsolute(path))
            {
                invalid_path("Not absolute");
                return false;
            }

            if(path.match(/[<>?*|]/))
            {
                invalid_path("Incorrect symbols");
                return false;
            }

            if(FileSystem.IsNetwork() && path.match(/[:]/))
            {
                invalid_path("Network path contains ':'");
                return false;
            }

            if(path.split(":").length > 2)
            {
                invalid_path("More than one ':'");
                return false;
            }

            var res = ndk2_check_path(path);
            if(typeof(res) != "undefined" && !res)
                return false;

            Wizard.Notify("ndk_integration_2/path", "set rtf text", "");

            Wizard.Next.Enable();
            return true;
        }

        this.NDKIntegration2 = function()
        {
            ns.DialogHeader("NDKIntegration2");
            ns.NDKIntegration2.Buttons();

            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            ns.Stage("options.png");

            if(ns.NDKIntegration2.IsChecked())
            {
                ns.NDKIntegration2.Enable();
                ndk2_path_is_valid();
            }
            else
            {
                ns.NDKIntegration2.Disable();
            }

            if(ns.NDKIntegration2.Refresh)
                ns.NDKIntegration2.Refresh();

            var ret = Action.Dialog({name:"NDKIntegration2", mode:"sync"});
            if(ret == Action.r_ok)
            {
                if(ns.NDKIntegration2.OnNext)
                    ns.NDKIntegration2.OnNext(ndk2_dir_current_value);
            }

            return ret;
        }

        this.NDKIntegration2.Buttons = function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        this.NDKIntegration2.Set = function( folder_path )
        {
            Wizard.Notify("ndk_integration_2/edit_box", "set text", folder_path);
            ndk2_dir_current_value= folder_path;
            ndk2_path_is_valid();
            ndk2_on_change(folder_path);
        }

        this.NDKIntegration2.SetLabel = function( mes )
        {
            Wizard.Notify("ndk_integration_2/label", "set text", mes);
        }

        this.NDKIntegration2.SetHeader = function( mes )
        {
            Wizard.Notify("ndk_integration_2/header", "set rtf text", mes);
        }

        this.NDKIntegration2.SetFooter = function( mes )
        {
            Wizard.Notify("ndk_integration_2/footer", "set rtf text", mes);
        }

        this.NDKIntegration2.SetInfo = function( mes )
        {
            Wizard.Notify("ndk_integration_2/path", "set rtf text", mes);
        }

        this.NDKIntegration2.SetCheckBoxLabel = function( mes )
        {
            Wizard.Notify("ndk_integration_2/check_box", "set text", mes);
        }

        this.NDKIntegration2.SetChecked = function( val )
        {
            Wizard.Notify("ndk_integration_2/check_box","set checked", val);
        }

        this.NDKIntegration2.IsChecked = function( )
        {
            return Wizard.Notify("ndk_integration_2/check_box","is checked");
        }

        this.NDKIntegration2.OnPathCheck = function(cb)
        {
            if(!cb)
              return;

            ndk2_check_path = cb;
        }

        this.NDKIntegration2.Subscribe = function(cb)
        {
            if(!cb)
              return;

            ndk2_on_change = cb;
        }

        this.NDKIntegration2.TargetPath = function()
        {
            return ndk2_dir_current_value;
        }

        this.NDKIntegration2.Disable = function( )
        {
            Wizard.Notify("ndk_integration_2/label","hide");
            Wizard.Notify("ndk_integration_2/edit_box", "hide");
            Wizard.Notify("ndk_integration_2/browse", "hide");
            Wizard.Notify("ndk_integration_2/path", "hide");
            Wizard.Next.Enable();
        }

        this.NDKIntegration2.Enable = function( )
        {
            Wizard.Notify("ndk_integration_2/label","show");
            Wizard.Notify("ndk_integration_2/edit_box","show");
            Wizard.Notify("ndk_integration_2/browse","show");
            Wizard.Notify("ndk_integration_2/path", "show");
            ndk2_path_is_valid();
        }

        var NDK2ChangeProcessor = function (id, notify, value)
        {
            if(id != "ndk_integration_2" || notify != "ndk_dir_changed")
                return;

            ndk2_dir_current_value= value;
            if(ndk2_path_is_valid())
                if(ns.NDKIntegration2.OnChange)
                    ndk2_on_change(ndk2_dir_current_value);
        }

        var NDK2CheckedChangeProcessor = function (id, notify, value)
        {
            if(id != "ndk_integration_2" || notify != "integration_set_checked")
                return;

            if(value)
                ns.NDKIntegration2.Enable();
            else
                ns.NDKIntegration2.Disable();
        }

        Wizard.Subscribe("ndk_integration_2", "ndk_dir_changed", NDK2ChangeProcessor);
        Wizard.Subscribe("ndk_integration_2", "integration_set_checked", NDK2CheckedChangeProcessor);
        Wizard.Notify("ndk_integration_2/edit_box", "set text limit", 260);

        //###############################################################
        // ComponentSelection
        //###############################################################

        var feature_space_available = function() {return null; }
        var feature_space_required = function() {return null; }
        var feature_space_required_32 = function() {return null; }
        var feature_space_required_64 = function() {return null; }
        var feature_select_cb = function() {}
        var feature_initailize = function() {}
        var feature_continue_checkers = {};
        //###############################################################
        // function which performs check if the continue is allowed if any callback returns true then continue is allowed
        // by default it returns true (if there are not any callbacks)
        //###############################################################
        
        var feature_check_continue_is_allowed = function()
        {
            var there_are_checkers = false;
            for(var i in feature_continue_checkers)
            {
              there_are_checkers = true;

              if(feature_continue_checkers[i].Skip && feature_continue_checkers[i].Skip())
                continue;

              if(feature_continue_checkers[i]())
                return true;
            }

            return there_are_checkers ? false : true;
        }
        
        var feature_refresh = function()
        {
            if (ns.Product())
            {
                ns.Product().FilterFeaturesRecursive(function(ftr)
                {
                    ftr.Root().Refresh();
                    return true;
                });
            }
        }

        var feature_on_changed = function()
        {
            var required = feature_space_required();
            var available = feature_space_available();

            if(required > available)
            {
                Wizard.Notify("feature/space_arch", "set rtf text", format("[space_failed_file]", required, available));
                Wizard.Notify("feature/space_regular", "set rtf text", format("[space_failed_file]", required, available));
            }
            else
            {
                Wizard.Notify("feature/space_arch", "set rtf text", format("[space_required_file]", required, available));
                Wizard.Notify("feature/space_regular", "set rtf text", format("[space_required_file]", required, available));
            }

            if(feature_check_continue_is_allowed())
                Wizard.Next.Enable();
            else
                Wizard.Next.Disable();
        }

        var feature_selected = function(control, command, sel)
        {
            if(command == "OnClicked")
            {
                switch(control)
                {
                case "feature/arch_32":
                    feature_select_cb(32, sel);
                    break;
                case "feature/arch_64":
                    feature_select_cb(64, sel);
                    break;
                }
                
                feature_refresh();
            }
        }
        
        var create_filter = function()
        {
            var features;

            return function(control, command, value)
            {
                var foreach = function(collection, func)
                {
                    for(var i in collection)
                        if(func(collection[i], i))
                            return true;
                    return false;
                }

                if(ns.Product())
                {
                    if(!features)
                    {
                        features = {};
                        foreach(ns.Product().FeaturesFullSet(), function(f)
                        {
                            var node = f.GetNode();
                            features[f.Id()] = {node:node, feature:f, expanded:node.expanded, visible:node.visible};
                            return false;
                        });
                    }

                    if(command == "OnChanged")
                    {
                        var filter = value.replace(/^\s+/, "").replace(/\s+$/, "");

                        if(filter)
                        { // setting filter
                            var regexp = RegExp(filter, "i");
                            foreach(features, function(f)
                            { // find matched features
                                if(f.feature.Name().match(regexp) || f.feature.Description().match(regexp) ||
                                foreach(f.feature.Components(), function(c) {if(c.Name().match(regexp)) return true; return false;}))
                                {
                                    Log("Feature matched: " + f.feature.Name());
                                    f.matched = true;
                                }
                                else
                                    f.matched = false;
                                return false;
                            });

                            foreach(features, function(f)
                            { // mark matched features as visible & expanded
                                if(f.matched || foreach(f.feature.FeaturesFullSet(), function(_f, key)
                                {
                                    if(features[key].matched)
                                        return true;
                                    return false;
                                }))
                                {
                                    Log("Feature marked as visible: " + f.feature.Name());
                                    f.node.visible = true;
                                    f.node.expanded = true;
                                }
                                else
                                    f.node.visible = false;
                                return false;
                            });

                            foreach(features, function(f)
                            { // mark child features as visible
                                if(f.matched)
                                {
                                    foreach(f.feature.FeaturesFullSet(), function(_f, key)
                                    {
                                        if(features[_f.Id()])
                                            features[_f.Id()].node.visible = true;
                                        return false;
                                    });
                                }
                            });

                            foreach(features, function(f) {f.node.Refresh(); return false;});
                        }
                        else
                        { // clearing filter
                            foreach(features, function(f)
                            {
                                f.node.visible = f.visible;
                                f.node.expanded = f.expanded;
                                return false;
                            });
                            foreach(features, function(f) {f.node.Refresh(); return false;});
                        }
                    }
                }
            }
        }
        
        var choose_arch_on_click = function(id, command, value)
        {
            Log("Catched click: " + id + " : " + command + " : " + value);
            if(value.match(/https?:\/\//))
                Execute.URL(value);
            else
                Execute.URL(format("[arch_header_link]"));
        }
        
        Wizard.Subscribe("feature/filter", "OnChanged", create_filter());
        Wizard.Subscribe("feature/space_arch", "OnChanged", feature_on_changed);
        Wizard.Subscribe("feature/space_regular", "OnChanged", feature_on_changed);
        Wizard.Subscribe("feature/arch_32", "OnClicked", feature_selected);
        Wizard.Subscribe("feature/arch_64", "OnClicked", feature_selected);
        Wizard.Notify("feature/choose_arch", "set rtf text", format("[feature_choose_arch_template]"));
        Wizard.Notify("feature/choose_arch", "mark link", format("[arch_feature_link_tmpl]"));
        Wizard.Subscribe("feature/choose_arch", "OnClicked", choose_arch_on_click);
        
        var default_feature_dialog_name = function() {return "FeatureTree";} //arch options are not avaliable by default
        var default_feature_dialog_header = function() {return ns.Installer().DownloadOnly() ? "FeaturesDownload" : "Features";}
        
        var feature_dialog_name = default_feature_dialog_name;
        var feature_dialog_header = default_feature_dialog_header;

        var feature_tree_generator = function()
        {
            var f = function()
            {
                ns.DialogHeader(feature_dialog_header());
                ns.Buttons("[Next]", "[Prev]", "[Cancel]");
                ns.Stage("options.png");
                Wizard.Next.Enable();
                Wizard.Prev.Enable();
                Wizard.Cancel.Enable();
                feature_initailize();
                feature_on_changed();

                ns.Product().Refresh();
                var res = Action.Dialog({name:feature_dialog_name(), mode:"sync"});

                return res;
            }

            //###############################################################
            // adding callbacks which called to check if continue is allowed or not
            // if any callback returns true then continue is allowed
            // each callback can have method Skip
            // usage:
            // AllowContinue(callback)
            // AllowContinue(callback, id)
            // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
            //###############################################################
            f.AllowContinue = function()
            {
                var args = arguments;

                var id = null;
                var obj = null;

                if(args.length == 2)
                {
                    obj = args[0];
                    id = args[1];
                }
                else if(args.length == 1)
                {
                    obj = args[0];
                    id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
                }
                else if(args.length > 2)
                {
                    Log("AllowContinue too many arguments for function call (> 2). Ignore.");
                    return;
                }
                else
                {
                    Log("AllowContinue was called without arguments -> need to check that continue is allowed");
                    return feature_check_continue_is_allowed();
                }

                if(!id)
                  id = Guid();

                if(!feature_continue_checkers[id])
                {
                    feature_continue_checkers[id] = obj;
                    Log("AllowContinue: add continue_checker " + id);
                }
            }

            f.AllowContinue.Clear = function(){ feature_continue_checkers = {}; }
            
            f.Initialize = function(cb)
            {
                if (cb)
                {
                    feature_initailize = cb;
                    return;
                }
                return feature_initailize();
            }

            f.SpaceAvailable = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_available = val;
                    else
                        feature_space_available = function() {return val;}
                    return;
                }

                return feature_space_available();
            }

            f.SpaceRequired = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_required = val;
                    else 
                        feature_space_required = function() {return val;}
                    return;
                }
                
                return feature_space_required();
            }
            
            f.SpaceRequired32 = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_required_32 = val;
                    else 
                        feature_space_required_32 = function() {return val;}
                    return;
                }
                
                return feature_space_required_32();
            }
            
            f.SpaceRequired64 = function(val)
            {
                if(val)
                {
                    if (typeof val == "function")
                        feature_space_required_64 = val;
                    else 
                        feature_space_required_64 = function() {return val;}
                    return;
                }
                
                return feature_space_required_64();
            }
            
            f.OnSelected = function(cb)
            {
                if(!cb)
                {
                    Log("Feature Selection Dialog: attempt to assign an undefined callback for the selection processing. Ignore.");
                    return;
                }

                feature_select_cb = cb;

                return feature_select_cb;
            }
            
            var set = function(control, s)
            {
                Wizard.Notify(control, "set checked", s);
                feature_selected(control, "OnClicked", s);
            }
            
            f.Select32 = function(s){set("feature/arch_32", arguments.length ? s : true);}
            f.Select64 = function(s){set("feature/arch_64", arguments.length ? s : true);}

            f.Checked32 = function(s) {return Wizard.Notify("feature/arch_32", "is checked");}
            f.Checked64 = function(s) {return Wizard.Notify("feature/arch_64", "is checked");}
            
            f.SetDialogName = function(_dialog_name)
            {
                if (typeof _dialog_name == "function")
                    feature_dialog_name = _dialog_name;
                else if (typeof _dialog_name != "undefined") 
                    feature_dialog_name = function() {return _dialog_name; }
                else 
                    feature_dialog_name = default_feature_dialog_name;
            }
            
            f.SetDialogHeader = function(_dialog_header)
            {
                if (typeof _dialog_header == "function")
                    feature_dialog_header = _dialog_header;
                else if (typeof _dialog_header != "undefined") 
                    feature_dialog_header = function() {return _dialog_header; }
                else 
                    feature_dialog_header = default_feature_dialog_header;
            }
            
            f.Refresh = function(cb)
            {
                if (cb)
                {
                    if (typeof cb != "function")
                    {
                        Log("Feature Selection Dialog: attempt to assign Refresh a wrong value.");
                        return; 
                    }
                    feature_refresh = cb;
                    return;
                }
                return feature_refresh();
            }

            return f;
        }

        this.FeatureTreeGenerator = feature_tree_generator;
        this.Features = ns.FeatureTreeGenerator();

        //###############################################################
        // Progress
        //###############################################################
        var installation_dlg_name = "";

        var inst_files_in_use = function(id, command, value)
        {
            Log("Files in use notification");
            var header = value[0];

            var message = "";

            for(var i = 1; i < value.length; i += 2)
                if(value[i].length)
                {
                    Log("  Message: " + value[i]);
                    message += "- " + value[i] + "\\par ";
                }

            var text = StringList.Format("[files_in_use_template]", header, message.replace(/\\/g, "\\\\"));

            ns.Buttons("[Retry]", "[Prev]", "[Cancel]");

            var n_e = Wizard.Next.Enable();
            var p_e = Wizard.Prev.Disable();
            var c_e = Wizard.Cancel.Enable();

            Wizard.Notify("prerequisite_text", "set rtf text", text);
            var r = Action.Dialog({name:"Pre_requisite", mode:"sync"});

            ns.Buttons("[Next]", "[Prev]", "[Cancel]");

            if(n_e)
                Wizard.Next.Enable();
            else
                Wizard.Next.Disable();

            if(p_e)
                Wizard.Prev.Enable();
            else
                Wizard.Prev.Disable();

            if(c_e)
                Wizard.Cancel.Enable();
            else
                Wizard.Cancel.Disable();

            var ret = "cancel";

            switch(r)
            {
            case Action.r_ok:
                ret = "retry";
                break;
            case Action.r_back:
                ret = "ignore";
                break;
            case Action.r_cancel:
                ret = "cancel";
                break;
            }
            Action.Dialog({name:installation_dlg_name, mode:"async"}); // restore progress dialog
            return ret;
        }
        
        
        var inst_suspend = function(id, command, value)
        {
            Log("Suspend notification");
            var header = value[0];

            var text = StringList.Format("[suspend_installation_template]", header.replace(/\\/g, "\\\\")); //

            ns.Buttons("[Retry]", "[Prev]", "[Cancel]");

            var n_e = Wizard.Next.Enable();
            var p_e = Wizard.Prev.Disable();
            var c_e = Wizard.Cancel.Enable();

            Wizard.Notify("prerequisite_text", "set rtf text", text);
            var r = Action.Dialog({name:"Pre_requisite", mode:"sync"});

            ns.Buttons("[Next]", "[Prev]", "[Cancel]");

            if(n_e)
                Wizard.Next.Enable();
            else
                Wizard.Next.Disable();

            if(p_e)
                Wizard.Prev.Enable();
            else
                Wizard.Prev.Disable();

            if(c_e)
                Wizard.Cancel.Enable();
            else
                Wizard.Cancel.Disable();

            var ret = "cancel";

            switch(r)
            {
            case Action.r_ok:
                ret = "retry";
                break;
            case Action.r_back:
                ret = "ignore";
                break;
            case Action.r_cancel:
                ret = "cancel";
                break;
            }
            Action.Dialog({name:installation_dlg_name, mode:"async"}); // restore progress dialog
            return ret;
        }

        var download_error_handler_popup = function(id, command, value)
        {
            Log("download popup error notification");
            var filename = FileSystem.FileName(value.filename);
            Log("filename = " + filename);
            var ret = Action.MessageBox({ title: StringList.Format("[download_error_header]"), text: StringList.Format("[download_error_description]", filename), icon: "error", buttons: "retrycancel" });
            Log("ret = " + ret);

            return ret;
        }

        var download_error_handler_dialog = function(id, command, value)
        {
            Log("download error notification");
            var foreach = function(coll, cb)
            {
                for(var i in coll)
                    if(cb(coll[i], i))
                        return true;
                return false;
            }

            var header = value.error.message;
            var details = "";
            foreach(value.error.details, function(e) {details += "\\par" + e;});

            var text = StringList.Format("[download_error_handler_template]", header, details.replace(/\\/g, "\\\\"));

            ns.Buttons("[Retry]", "[Prev]", "[Cancel]");

            var n_e = Wizard.Next.Enable();
            var p_e = Wizard.Prev.Disable();
            var c_e = Wizard.Cancel.Enable();

            Wizard.Notify("prerequisite_text", "set rtf text", text);
            var r = Action.Dialog({name:"Pre_requisite", mode:"sync"});

            ns.Buttons("[Next]", "[Prev]", "[Cancel]");

            if(n_e)
                Wizard.Next.Enable();
            else
                Wizard.Next.Disable();

            if(p_e)
                Wizard.Prev.Enable();
            else
                Wizard.Prev.Disable();

            if(c_e)
                Wizard.Cancel.Enable();
            else
                Wizard.Cancel.Disable();

            var ret = "cancel";

            switch(r)
            {
            case Action.r_ok:
                ret = "retry";
                break;
            case Action.r_back:
                ret = "ignore";
                break;
            case Action.r_cancel:
                ret = "cancel";
                break;
            }
            Action.Dialog({name:installation_dlg_name, mode:"async"}); // restore progress dialog
            return ret;
        }
        
        var hide_file_in_use = ns.Product().Info().Property("hide_file_in_use");

        var inst_files_in_use_rm = function (id, command, value)
        {
            Log("Restart Manager: Files In Use notification");
            var header = value[0];
            var message = "";

            for (var i = 2; i < value.length; i += 2)
                if (value[i].length) {
                    Log("  Message: " + value[i]);
                    message += "- " + value[i] + "\\par ";
                }

            message = message + StringList.Format("\\par [file_in_use]");
            var text = StringList.Format("[files_in_use_template]", header, message.replace(/\\/g, "\\\\"));
            
            if(hide_file_in_use && ["ok", "ignore"].indexOf(hide_file_in_use.toLowerCase()) != -1)
            {
                Log("FileInUse notification is hidden with return code: " + hide_file_in_use);
                return hide_file_in_use.toLowerCase();
            }

            ns.Buttons("[Ok]", "[Ignore]", "[Cancel]");
            var n_e = Wizard.Next.Enable();
            var p_e = Wizard.Prev.Enable();
            var c_e = Wizard.Cancel.Enable();

            Wizard.Notify("prerequisite_text", "set rtf text", text);
            var r = Action.Dialog({ name: "Pre_requisite", mode: "sync" });

            ns.Buttons("[Next]", "[Prev]", "[Cancel]");

            if (n_e)
                Wizard.Next.Enable();
            else
                Wizard.Next.Disable();

            if (p_e)
                Wizard.Prev.Enable();
            else
                Wizard.Prev.Disable();

            if (c_e)
                Wizard.Cancel.Enable();
            else
                Wizard.Cancel.Disable();

            var ret = "cancel";

            switch (r) {
                case Action.r_ok:
                    ret = "ok";
                    break;
                case Action.r_back:
                    ret = "ignore";
                    break;
                case Action.r_cancel:
                    ret = "cancel";
                    break;
            }
            Action.Dialog({ name: installation_dlg_name, mode: "async" }); // restore progress dialog
            return ret;
        }

        this.Installation = function(_prg_num)
        {
            var prg_num = _prg_num ? _prg_num : 1;

            ns.DialogHeader("Installation");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            ns.Stage("installation.png");
            Wizard.Next.Disable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Enable();

            installation_dlg_name = "Progress" + prg_num;

            Wizard.Subscribe("installation", "files in use", inst_files_in_use);
            Wizard.Subscribe("installation", "files in use rm", inst_files_in_use_rm);
            Wizard.Subscribe("installation", "suspend", inst_suspend);
            Wizard.Subscribe("installation", "download error", download_error_handler_popup);

            return Action.Dialog({name:installation_dlg_name, mode:"async"});
        };

        this.Installation.AssignProgress = function( dmpr, _prg_num )
        {
            var prg_num = _prg_num ? _prg_num : 1;

            if(dmpr && dmpr.Progress)
                Wizard.Notify("Progress" + prg_num, "connect", dmpr.Progress().id);
            else
                return false;

            var inst = this;

            dmpr.PrgHeader = function(mes)
            {
                inst.AssignHeader(mes, prg_num);
            }

            dmpr.PrgTitle = function(mes)
            {
                inst.AssignTitle(mes, prg_num);
            }

            return false;
        };

        this.Installation.AssignHeader = function( mes, _prg_num )
        {
            var prg_num = _prg_num ? _prg_num : 1;

            Log("Assing header with mes = " + mes);
            Wizard.Notify("Progress" + prg_num, "header", mes);
            return false;
        };

        this.Installation.AssignTitle = function( mes, _prg_num )
        {
            var prg_num = _prg_num ? _prg_num : 1;

            Log("Assing title with mes = " + mes);
            Wizard.Notify("Progress" + prg_num, "title", mes);
            return false;
        };

        //###############################################################
        var clear_destination = function()
        {
            var dir = ns.Installer().DownloadDir();

            if (!FileSystem.Exists(dir))
                return Action.r_ok;

            var ret = Action.r_ok;

            while (ret == Action.r_ok) //sign of retrying
            {
                FileSystem.Delete(dir);

                if (!FileSystem.Exists(dir))
                    return Action.r_ok;

                var text = StringList.Format("[download_folder_in_use_template]", String(dir).replace(/\\/g, "\\\\"));

                ns.DialogHeader("Downloading");
                ns.Stage("installation.png");
                ns.Buttons("[Retry]", "[Prev]", "[Cancel]");

                Wizard.Next.Enable();
                Wizard.Prev.Disable();
                Wizard.Cancel.Enable();

                Wizard.Notify("prerequisite_text", "set rtf text", text);
                ret = Action.Dialog({name:"Pre_requisite", mode:"sync"});
            }
            return ret;
        }


        this.Downloading = function(_prg_num)
        {
            var prg_num = _prg_num ? _prg_num : 1;
            var ret = clear_destination();
            if (ret != Action.r_ok)
                return ret;

            ns.DialogHeader("Downloading");
            ns.Stage("installation.png");

            installation_dlg_name = "Progress" + prg_num;

            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Disable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Enable();

            Wizard.Subscribe("installation", "download error", download_error_handler_popup);

            return Action.Dialog({name:installation_dlg_name, mode:"async"});
        };
        //###############################################################

        //###############################################################
        // VS Integration
        //###############################################################
        var vs_integration_data;
        var vs_integration_original_data;

        var vs_integration_callback = function(control, command, id)
        {
            Log("VSIntegration: Item " + id + " " + command);

            for(var i in vs_integration_data)
            {
                if(vs_integration_data[i].id == id)
                {
                    if(command == "selected")
                        vs_integration_data[i].selected = true; // save states for every id
                    else
                        vs_integration_data[i].selected = false;
                }
            }

            ns.VSIntegration.AllowContinue() ? Wizard.Next.Enable() : Wizard.Next.Disable();
        }

        Wizard.Subscribe("vs_integration", "selected", vs_integration_callback);
        Wizard.Subscribe("vs_integration", "unselected", vs_integration_callback);

        //Wizard.Subscribe("vs_integration", "selected", vs_integration_on_change);
        //Wizard.Subscribe("vs_integration", "unselected", vs_integration_on_change);

        this.VSIntegration = function()
        {
            ns.DialogHeader("VSIntegration");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();
            ns.Stage("options.png");

            ns.VSIntegration.AllowContinue() ? Wizard.Next.Enable() : Wizard.Next.Disable();

            return Action.Dialog({name:"vs_integration", mode:"sync"});
        }

        this.VSIntegration.Data = function(data)
        {
            if(data)
            {
               Log(" VSIntegration.Data: Setting VS integration data");
               for(var k in data)
               {
                   Log(" title = " + data[k].title);
               }

               vs_integration_data = data;
               VSIntegrationData(data);
               if(typeof vs_integration_original_data == "undefined"){
                   vs_integration_original_data = JSON.parse(JSON.stringify(data));
                   Log("setting vs_integration_original_data: " + JSON.stringify(vs_integration_original_data));
               }
            }
            else
            {
               Log(" VSIntegration.Data: Input data parametr is undefined -> return the current data");

               return vs_integration_data;
            }
        }

        this.VSIntegration.OriginalData = function(){return vs_integration_original_data;}

        // this.VSIntegration.GetState = function()
        // {
        //     return vs_integration_state;
        // }
        //###############################################################
        var vs_integration_continue_checkers = {};

        //###############################################################
        // function which performs check if the continue is allowed if any callback returns true then continue is allowed
        // by default it returns true (if there are not any callbacks)
        //###############################################################
        var vs_integration_check_continue_is_allowed = function()
        {
            var there_are_checkers = false;
            for(var i in vs_integration_continue_checkers)
            {
              there_are_checkers = true;

              if(vs_integration_continue_checkers[i].Skip && vs_integration_continue_checkers[i].Skip())
                continue;

              if(vs_integration_continue_checkers[i]())
                return true;
            }

            return there_are_checkers ? false : true;
        }
        //###############################################################
        // adding callbacks which called to check if continue is allowed or not
        // if any callback returns true then continue is allowed
        // each callback can have method Skip
        // usage:
        // AllowContinue(callback)
        // AllowContinue(callback, id)
        // if callback has method/attribute Id or attribute id then it is used for distinguishing callbacks (just to not call 1 twice)
        //###############################################################
        ns.VSIntegration.AllowContinue = function()
        {
            var args = arguments;

            var id = null;
            var obj = null;

            if(args.length == 2)
            {
                obj = args[0];
                id = args[1];
            }
            else if(args.length == 1)
            {
                obj = args[0];
                id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
            }
            else if(args.length > 2)
            {
                Log("AllowContinue too many arguments for function call (> 2). Ignore.");
                return;
            }
            else
            {
                Log("AllowContinue was called without arguments -> need to check that continue is allowed");
                return vs_integration_check_continue_is_allowed();
            }

            if(!id)
              id = Guid();

            if(!vs_integration_continue_checkers[id])
            {
                vs_integration_continue_checkers[id] = obj;
                Log("AllowContinue: add continue_checker " + id);
            }
        }

        ns.VSIntegration.AllowContinue.Clear = function(){ vs_integration_continue_checkers = {}; }

        //###############################################################

        //###### PreRequisites dialog API ###############################
        var prereq_template = "[prereq_template]";

        var prereq_fatal    = [];
        var prereq_critical = [];
        var prereq_warning  = [];
        var prereq_info     = [];

        var prereq_custom_checker = null;

        var prereq_check = function()
        {
            prereq_fatal    = [];
            prereq_critical = [];
            prereq_warning  = [];
            prereq_info     = [];

            if(prereq_custom_checker)
            {
                return prereq_custom_checker() || prereq_fatal.length || prereq_critical.length || prereq_warning.length;
            }
            else
                return false;
        }

        this.PreRequisites = function()
        {
            ns.DialogHeader("PreRequisites");
            var critical_resolved_but_there_are_others_to_show;
            do
            {
                var message = "";
                var i;
                if(prereq_fatal.length)
                {
                    for(i in prereq_fatal)
                        message += prereq_fatal[i];
                }
                else
                {
                    for(i in prereq_critical)
                        message += prereq_critical[i];
                    for(i in prereq_warning)
                        message += prereq_warning[i];
                    for(i in prereq_info)
                        message += prereq_info[i];
                }

                var txt = StringList.Format(prereq_template, message);
                Log("Pre-req message: " + txt);
                Wizard.Notify("prerequisite_text", "set rtf text", txt);

                if(prereq_fatal.length)
                {
                    Wizard.Notify("title", "no-cancel-confirm");
                    Log("disabling next due to fatal pre-requisite");
                    ns.buttons("[Finish]", "[Prev]", "[Cancel]");
                    ns.Stage("failed.png");
                    Wizard.Next.Enable();
                    Wizard.Prev.Enable(); //moving back should be applicable for online installer
                    Wizard.Cancel.Disable();
                }
                else
                {
                    Wizard.Next.Enable();
                    Wizard.Prev.Enable();
                    Wizard.Cancel.Enable();

                    if(prereq_critical.length)
                        ns.buttons("[Retry]", "[Prev]", "[Cancel]");
                    else
                        ns.buttons("[Next]", "[Prev]", "[Cancel]");
                    //Wizard.Next.Enable();
                }

                var result = Action.Dialog({name:"Pre_requisite", mode:"sync"});
                Log("Pre_requisite result = " + result);

                if(prereq_fatal.length && result == Action.r_ok)
                {
                   return Action.r_abort;
                }

                var there_was_critical_prereq = prereq_critical.length ? true : false;

                if (result != Action.r_ok || !there_was_critical_prereq)
                {
                   Wizard.Next.Enable();
                   return result;
                }

                prereq_check();

                /*
                switch(result)
                {
                case Action.r_ok:
                    prereq_check();
                    break;
                default:
                    Wizard.Next.Enable();
                    return result;
                }
                */

                critical_resolved_but_there_are_others_to_show = false;

                if(there_was_critical_prereq && !prereq_critical.length && (prereq_warning.length || prereq_info.length))
                    critical_resolved_but_there_are_others_to_show = true;

            } while(prereq_fatal.length || prereq_critical.length || critical_resolved_but_there_are_others_to_show)

            return Action.r_ok;
        }

        this.PreRequisites.Skip = function()
        {
            Log("check for pre-requisites");
            if (GetOpt.Exists("noprereq"))
            {
              Log("Prerequsites skipped due to commandline parameter");
              return true;
            }
            var ch = prereq_check();
            if(!ch)
                Log(" no prerequisites detected");
            return !ch;
        }

        this.PreRequisites.File = function(file)
        {
            var path = FileSystem.MakePath(file, Origin.Directory());
            if(FileSystem.Exists(path))
            {
                prereq_template = FileSystem.ReadFileUTF8(path);
            }
            else
                Log(Log.l_error, "failed to load file: " + path + " (no prereq template available)");
        }

        this.PreRequisites.Template = function(tmpl)
        {
            prereq_template = tmpl;
        }

        var prev_prereq_Fatal    = function(msg) {prereq_fatal.push(StringList.Format("{{\\pntext\\f1 [image_error] } \\cf1 [%s]}\\par", msg));}
        var prev_prereq_Critical = function(msg) {prereq_critical.push(StringList.Format("{{\\pntext\\f1 [image_error] } \\cf1 [%s]}\\par", msg));}
        var prev_prereq_Warning  = function(msg) {prereq_warning.push(StringList.Format("{{\\pntext\\f1 [image_warning] }[%s]}\\par", msg));}
        var prev_prereq_Info     = function(msg) {prereq_info.push(StringList.Format("{{\\pntext\\f1 [image_info] } [%s]}\\par", msg));}

        var prev_prereq_FatalExt    = function(header, desc) {prereq_fatal.push(StringList.Format("{{\\pntext\\f1 [image_error] }\\cf1[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}
        var prev_prereq_CriticalExt = function(header, desc) {prereq_critical.push(StringList.Format("{{\\pntext\\f1 [image_error] }\\cf1[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}
        var prev_prereq_WarningExt  = function(header, desc) {prereq_warning.push(StringList.Format("{{\\pntext\\f1 [image_warning] }\\cf2[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}
        var prev_prereq_InfoExt     = function(header, desc) {prereq_info.push(StringList.Format("{{\\pntext\\f1 [image_info] }\\cf3[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}


        this.PreRequisites.Fatal    = function(msg) {
            prev_prereq_Fatal(msg);
            stat_pick.add_prerequisite("fatal", msg);
        }
        this.PreRequisites.Critical = function(msg) {
            prev_prereq_Critical(msg);
            stat_pick.add_prerequisite("critical", msg);
        }
        this.PreRequisites.Warning  = function(msg) {
            prev_prereq_Warning(msg);
            stat_pick.add_prerequisite("warning", msg);
        }
        this.PreRequisites.Info     = function(msg) {
            prev_prereq_Info(msg);
            stat_pick.add_prerequisite("info", msg);
        }

        this.PreRequisites.FatalExt    = function(header, desc) {
            prev_prereq_FatalExt(header, desc);
            stat_pick.add_prerequisite("fatal", header, desc);
        }
        this.PreRequisites.CriticalExt = function(header, desc) {
            prev_prereq_CriticalExt(header, desc);
            stat_pick.add_prerequisite("critical", header, desc);
        }
        this.PreRequisites.WarningExt  = function(header, desc) {
            prev_prereq_WarningExt(header, desc);
            stat_pick.add_prerequisite("warning", header, desc);
        }
        this.PreRequisites.InfoExt     = function(header, desc) {
            prev_prereq_InfoExt(header, desc);
            stat_pick.add_prerequisite("info", header, desc);
        }

        this.PreRequisites.Callback = function(cb) {prereq_custom_checker = cb;}

        //###############################################################

        //###### PostChecks dialog API ###############################
        var postchk_template = "[postchk_template]";

        var postchk_fatal    = [];
        var postchk_critical = [];
        var postchk_warning  = [];
        var postchk_info     = [];

        var postchk_custom_checker = null;

        var postchk_check = function()
        {
            postchk_fatal    = [];
            postchk_critical = [];
            postchk_warning  = [];
            postchk_info     = [];

            if(postchk_custom_checker)
            {
                return postchk_custom_checker() || postchk_fatal.length || postchk_critical.length || postchk_warning.length;
            }
            else
                return false;
        }

        this.PostChecks = function()
        {
            ns.DialogHeader("PostChecks");
            var critical_resolved_but_there_are_others_to_show;
            do
            {
                var message = "";
                var i;
                if(postchk_fatal.length)
                {
                    for(i in postchk_fatal)
                        message += postchk_fatal[i];
                }
                else
                {
                    for(i in postchk_critical)
                        message += postchk_critical[i];
                    for(i in postchk_warning)
                        message += postchk_warning[i];
                    for(i in postchk_info)
                        message += postchk_info[i];
                }

                var txt = StringList.Format(postchk_template, message);
                Log("Post-check message: " + txt);
                Wizard.Notify("postcheck_text", "set rtf text", txt);

                if(postchk_fatal.length)
                {
                    Wizard.Notify("title", "no-cancel-confirm");
                    Log("disabling next due to fatal post-check");
                    ns.buttons("[Finish]", "[Prev]", "[Cancel]");
                    ns.Stage("failed.png");
                    Wizard.Next.Enable();
                    Wizard.Prev.Disable();
                    Wizard.Cancel.Disable();
                }
                else
                {
                    Wizard.Next.Enable();
                    Wizard.Prev.Enable();
                    Wizard.Cancel.Enable();

                    if(postchk_critical.length)
                        ns.buttons("[Retry]", "[Prev]", "[Cancel]");
                    else
                        ns.buttons("[Next]", "[Prev]", "[Cancel]");
                }

                var result = Action.Dialog({name:"Post_check", mode:"sync"});
                Log("Post_check result = " + result);

                if(postchk_fatal.length)
                {
                   return Action.r_abort;
                }

                var there_was_critical_postchk = postchk_critical.length ? true : false;

                if (result != Action.r_ok || !there_was_critical_postchk)
                {
                   Wizard.Next.Enable();
                   return result;
                }

                postchk_check();

                critical_resolved_but_there_are_others_to_show = false;

                if(there_was_critical_postchk && !postchk_critical.length && (postchk_warning.length || postchk_info.length))
                    critical_resolved_but_there_are_others_to_show = true;

            } while(postchk_fatal.length || postchk_critical.length || critical_resolved_but_there_are_others_to_show)

            return Action.r_ok;
        }

        this.PostChecks.Skip = function()
        {
            Log("check for post-checks");
            if (GetOpt.Exists("noprereq")) //single commandline parameter
            {
              Log("PostChecks skipped due to commandline parameter");
              return true;
            }
            var ch = postchk_check();
            if(!ch)
                Log(" no postchecks detected");
            return !ch;
        }

        this.PostChecks.File = function(file)
        {
            var path = FileSystem.MakePath(file, Origin.Directory());
            if(FileSystem.Exists(path))
            {
                postchk_template = FileSystem.ReadFileUTF8(path);
            }
            else
                Log(Log.l_error, "failed to load file: " + path + " (no postchk template available)");
        }

        this.PostChecks.Template = function(tmpl)
        {
            postchk_template = tmpl;
        }

        var prev_postchk_Fatal    = function(msg) {postchk_fatal.push(StringList.Format("{{\\pntext\\f1 [image_error] } \\cf1 [%s]}\\par", msg));}
        var prev_postchk_Critical = function(msg) {postchk_critical.push(StringList.Format("{{\\pntext\\f1 [image_error] } \\cf1 [%s]}\\par", msg));}
        var prev_postchk_Warning  = function(msg) {postchk_warning.push(StringList.Format("{{\\pntext\\f1 [image_warning] }[%s]}\\par", msg));}
        var prev_postchk_Info     = function(msg) {postchk_info.push(StringList.Format("{{\\pntext\\f1 [image_info] } [%s]}\\par", msg));}

        var prev_postchk_FatalExt    = function(header, desc) {postchk_fatal.push(StringList.Format("{{\\pntext\\f1 [image_error] }\\cf1[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}
        var prev_postchk_CriticalExt = function(header, desc) {postchk_critical.push(StringList.Format("{{\\pntext\\f1 [image_error] }\\cf1[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}
        var prev_postchk_WarningExt  = function(header, desc) {postchk_warning.push(StringList.Format("{{\\pntext\\f1 [image_warning] }\\cf2[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}
        var prev_postchk_InfoExt     = function(header, desc) {postchk_info.push(StringList.Format("{{\\pntext\\f1 [image_info] }\\cf3[%s]\\par\\pard\\li280\\cf0[%s]\\par}\\par", header, desc));}

        this.PostChecks.Fatal    = function(msg) {
            prev_postchk_Fatal(msg);
        }
        this.PostChecks.Critical = function(msg) {
            prev_postchk_Critical(msg);
        }
        this.PostChecks.Warning  = function(msg) {
            prev_postchk_Warning(msg);
        }
        this.PostChecks.Info     = function(msg) {
            prev_postchk_Info(msg);
        }

        this.PostChecks.FatalExt    = function(header, desc) {
            prev_postchk_FatalExt(header, desc);
        }
        this.PostChecks.CriticalExt = function(header, desc) {
            prev_postchk_CriticalExt(header, desc);
        }
        this.PostChecks.WarningExt  = function(header, desc) {
            prev_postchk_WarningExt(header, desc);
        }
        this.PostChecks.InfoExt     = function(header, desc) {
            prev_postchk_InfoExt(header, desc);
        }

        this.PostChecks.Callback = function(cb) {postchk_custom_checker = cb;}
        
        //###############################################################
        // Finish
        //###############################################################

        var error_reason = function()
        {
            var errs = GlobalErrors.List();
            if(errs && errs.length)
            {
                var txt = "";
                for(var i in errs)
                {
                    var e = (txt.length ? "\\par" : "") + StringList.Format("{\\cf1 [%s]}", errs[i]);
                    txt += e;
                }
                var dir = Log.GetLogDir();
                txt = txt + "\\par\\par"  +  StringList.Format("{[logs_location]}", String(dir).replace(/\\/g, "\\\\"));
                return txt;
            }

            return null;
        }

        var finish_template = "[finish_template]";
        var finish_notes = "";
        var finish_skip_errors = false;
        var finish_cb = function() {}
        
        
        var check_for_reboot = function()
        {    
            Log("Check ask_for_reboot triggers started.");
            var evaluate = function (expression, context)
            {
                with(context)
                {
                    return safecall(function(){return eval(expression)});
                }
            }

            var auto = ns_pr.PendingReboot();
            Log("Pending reboot status: " + auto);

            var products = ns.Installer().Products;
            
            var filter_prod = function(context)
            {
                return function(prod)
                {
                    var exp = prod.Info().Property("ask_for_reboot");
                    if( exp )
                    {
                        if(exp.match(/auto/) && auto)
                        {
                            return true;
                        }
                        context.action = prod.Action();
                        context.state = prod.State();
                        Log("Evaluate expression for product: '" + exp + "' against context: " +  JSON.stringify(context));
                        return evaluate(exp,context);
                    }
                }
            }
            
            var filter_ftr = function(context) 
            {
                return function(ftr)
                {
                    var res = false;               
                    var exp = ftr.Info().Property("ask_for_reboot");
                    if( exp )
                    {
                        if(exp.match(/auto/) && auto)
                        {
                            return true;
                        }
                        context.action = ftr.Action();
                        context.state = ftr.State();      
                        Log("Evaluate expression for feature: " + ftr.Id() +  " '" + exp + "' against context: " +  JSON.stringify(context));
                        return evaluate(exp, context);
                    }
                }
            }
            
            var filter_cmp = function(context) 
            {
                return function(cmp)
                {
                    var exp = cmp.Info().Property("ask_for_reboot");
                    if( exp )
                    {
                        if(exp.match(/auto/) && auto)
                        {
                            return true;
                        }
                        context.action = cmp.Action();
                        context.state = cmp.State();   
                        Log("Evaluate expression for component: " + cmp.Info().Property("alias") +  " '" + exp + "' against context: " +  JSON.stringify(context));
                        return evaluate(exp, context);
                    }
                }
            }
            
            for(var i in products)
            {
                var product = products[i];
                var context = {install_mode: product.InstallMode()};
                
                var fp = filter_prod(context);
                if (fp(product))
                {
                    return true;
                }
                
                if(product.FilterFeaturesRecursive(filter_ftr(context)))
                {
                    return true;
                }
                
                if(product.FilterComponentsRecursive(filter_cmp(context)))
                {
                    return true;
                }
            }
        }

        this.Complete = function()
        {
            ns.DialogHeader(ns.Installer().DownloadOnly() ? "CompleteDownload" : "Complete");
            ns.Buttons("[Finish]", "[Prev]", "[Cancel]");
            ns.Stage("complete.png");

            if (!finish_skip_errors)
            {
                var errs = error_reason();
                if(errs)
                {
                    finish_notes = finish_notes + "\\par Errors: \\par" + errs;
                }
            }

            Wizard.Notify("finish_text", "set rtf text", StringList.Format(finish_template, finish_notes));
            if(finish_cb)
                finish_cb();
            Wizard.Next.Enable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Disable();
            stat_pick.HPSendStat();
            var ret = Action.Dialog({name:"Finish", mode:"sync"});
            if(ret == Action.r_ok)
            {
                if(check_for_reboot())
                {
                    Log("Ask for reboot.");
                    if(Action.MessageBox({title: StringList.Format("[title]"), text: StringList.Format("[reboot_opt]"), icon: "information", buttons: "yesno"}) == "yes")
                    {
                        System.Reboot();
                    }
                }
            }
            return ret;
        }

        this.Complete.Template = function(tmpl)
        {
            if(tmpl)
                finish_template = tmpl;
            else
                finish_template = "[finish_template]";
        }

        this.Complete.Notes = function(notes)
        {
            finish_notes = notes;
        }
        
        this.Complete.SkipErrors = function(skip_errors)
        {
            finish_skip_errors = skip_errors;
        }

        this.Complete.OnShow = function(cb) {finish_cb = cb;}

        Wizard.Subscribe("finish_text", "OnClicked", function(c, m, url){Execute.URL(url);});

        //###############################################################
        // Finish with launch
        //###############################################################

        var finish_launch_template = "[finish_template]";
        var finish_launch_notes = "";
        var finish_launch_skip_errors = false;
        var finish_launch_checkbox_name = "[launch_after_install]";
        var finish_launch_cb = function() {}
        var finish_launch_after_install = function() {}
        this.CompleteWithCheckbox = function()
        {
            ns.DialogHeader(ns.Installer().DownloadOnly() ? "CompleteDownloadWithCheckbox" : "CompleteWithCheckbox");
            ns.Buttons("[Finish]", "[Prev]", "[Cancel]");
            ns.Stage("complete.png");
            
            if (!finish_launch_skip_errors)
            {
                var errs = error_reason();
                if(errs)
                {
                    finish_launch_notes = finish_launch_notes + "\\par Errors: \\par" + errs;
                }
            }

            if(finish_launch_cb)
                finish_launch_cb();
            Wizard.Next.Enable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Disable();

            var prod = ns.Product();

            var checkbox_name = StringList.Format(finish_launch_checkbox_name);
            var checkbox_visible = (checkbox_name ? true : false) && prod.InstallMode() == prod.install_mode_t.install;

            Wizard.Notify("finish_launch/header", "set rtf text", StringList.Format(finish_launch_template, finish_launch_notes));
            Wizard.Notify("finish_launch/footer", "set rtf text", "");
            if (checkbox_visible)
                Wizard.Notify("finish_launch/box", "show");
            else
                Wizard.Notify("finish_launch/box", "hide");
            Wizard.Notify("finish_launch/box", "set text", checkbox_name);
            Wizard.Notify("finish_launch/box", "set checked", checkbox_visible);
            stat_pick.HPSendStat();
            var ret = Action.Dialog({name:"finish_launch", mode:"sync"});
            if(ret == Action.r_ok && checkbox_visible && Wizard.Notify("finish_launch/box", "is checked"))
            {
                //customize
                if (typeof(finish_launch_after_install) == "function")
                   finish_launch_after_install();
            }

            return ret;
        }

        this.CompleteWithCheckbox.Template = function(tmpl)
        {
            if(tmpl)
                finish_launch_template = tmpl;
            else
                finish_launch_template = "[finish_template]";
        }
        
        this.CompleteWithCheckbox.CheckboxName = function(name)
        {
            if(name)
                finish_launch_checkbox_name = name;
        }

        this.CompleteWithCheckbox.Notes = function(notes)
        {
            finish_launch_notes = notes;
        }
        
        this.CompleteWithCheckbox.SkipErrors = function(skip_errors)
        {
            finish_launch_skip_errors = skip_errors;
        }
        
        this.CompleteWithCheckbox.LaunchAfterInstall = function(cb_lnch)
        {
            if (cb_lnch)
                finish_launch_after_install = cb_lnch;
        }

        this.CompleteWithCheckbox.OnShow = function(cb) {finish_launch_cb = cb;}

        Wizard.Subscribe("finish_launch/header", "OnClicked", function(c, m, url){Execute.URL(url);});        

        
        //###############################################################
        // Cancel
        //###############################################################
        var cancel_template = "[cancel_template]";
        this.Cancel = function()
        {
            ns.Buttons("[Finish]", "[Prev]", "[Cancel]");
            ns.Header("[subtitle_cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Disable();
            ns.Stage("aborted.png");
            Wizard.Notify("finish_text", "set rtf text", cancel_template);
            Wizard.Notify("title", "no-cancel-confirm");
            stat_pick.HPSendStat();
            Log("Sending statistic in case of cancel");
            Action.Dialog({name:"Finish", mode:"sync"});
            return Action.r_cancel;
        }
        this.Cancel.Template = function(tmpl)
        {
            if(tmpl)
                cancel_template = tmpl;
            else
                cancel_template = "[cancel_template]";
        }

        //###############################################################
        // Error
        //###############################################################
        var error_template = "[error_template]";
        this.Error = function()
        {
            ns.Buttons("[Finish]", "[Prev]", "[Cancel]");
            ns.Header("[subtitle_error]");
            Wizard.Next.Enable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Disable();
            ns.Stage("failed.png");
            var c_msg = StringList.Format(error_template, error_reason());
            Wizard.Notify("finish_text", "set rtf text", c_msg);
            Wizard.Notify("title", "no-cancel-confirm");
            //stat_pick.Property("CompleteCode", "Error");
            stat_pick.HPSendStat();
            Log("Sending statistic in case of Error");
            Action.Dialog({name:"Finish", mode:"sync"});
            return Action.r_error;
        }
        this.Error.Template = function(tmpl)
        {
            if(tmpl)
                error_template = tmpl;
            else
                error_template = "[error_template]";
        }

        //###############################################################
        // Architecture
        //###############################################################
        var Architecture = function()
        { // dialog wrapped to function to isolate internal infrastructure
            var space_available = null;
            var space_required = null;
            var space_required_32 = null;
            var space_required_64 = null;

            var arch = null;

            var on_click = function(id, command, value)
            {
                Log("Catched click: " + id + " : " + command + " : " + value);
                if(value.match(/https?:\/\//))
                    Execute.URL(value);
                else
                    Execute.URL(StringList.Format("[arch_header_link]"));
            }
            Wizard.Notify("arch/header", "mark link", "[arch_header_link_tmpl]");
            Wizard.Subscribe("arch/header", "OnClicked", on_click);

            var space_update = function()
            {
                arch.Space32(arch.SpaceRequired32());
                arch.Space64(arch.SpaceRequired64());

                var required = arch.SpaceRequired();
                var available = arch.SpaceAvailable()

                if(required > available)
                {
                    Wizard.Notify("arch/space", "set rtf text", format("[space_failed_file]", required, available));
                    return false;
                }
                else
                    Wizard.Notify("arch/space", "set rtf text", format("[space_required_file]", required, available));
            }

            arch = function()
            {
                ns.DialogHeader("Architecture");
                ns.Buttons("[Next]", "[Prev]", "[Cancel]");
                ns.Stage("options.png");
                Wizard.Notify("arch/64", "set text", "[arch_intel_64]");

                if(arch.Checked32() || arch.Checked64())
                   Wizard.Next.Enable();
                else
                   Wizard.Next.Disable();

                Wizard.Prev.Enable();
                Wizard.Cancel.Enable();

                space_update();

        arch.OnInitialize();

                var r = Action.Dialog({name:"Arch", mode:"sync"});

        return r;
            }

      arch.OnInitialize = function(){};

            var select_cb = function() {}

            var selected = function(control, command, sel)
            {
                if(command == "OnClicked")
                {
                    if(!arch.Checked32() && !arch.Checked64())
                       Wizard.Next.Disable();
                    else
                       Wizard.Next.Enable();

                    switch(control)
                    {
                    case "arch/32":
                        select_cb(32, sel);
                        break;
                    case "arch/64":
                        select_cb(64, sel);
                        break;
                    }

                    space_update();
                }
            }

            arch.OnSelected = function(cb)
            {
                if(!cb)
                {
                    Log("Architecture Dialog: attempt to assign an undefined callback for the selection processing. Ignore.");
                    return;
                }

                select_cb = cb;

                return select_cb;
            }

            Wizard.Subscribe("arch/32", "OnClicked", selected);
            Wizard.Subscribe("arch/64", "OnClicked", selected);

            var set = function(control, s)
            {
                Wizard.Notify(control, "set checked", s);
                selected(control, "OnClicked", s);
            }

            arch.SpaceAvailable = function(val)
            {
                if(val)
                {
                    space_available = val;
                }
                else if(typeof(space_available) == "function")
                    return space_available();

                return space_available;
            }

            arch.SpaceRequired = function(val)
            {
                if(val)
                {
                    space_required = val;
                }
                else if(typeof(space_required) == "function")
                    return space_required();

                return space_required;
            }

            arch.SpaceRequired32 = function(val)
            {
                if(val)
                {
                    space_required_32 = val;
                }
                else if(typeof(space_required_32) == "function")
                    return space_required_32();

                return space_required_32;
            }

            arch.SpaceRequired64 = function(val)
            {
                if(val)
                {
                    space_required_64 = val;
                }
                else if(typeof(space_required_64) == "function")
                    return space_required_64();

                return space_required_64;
            }

            arch.Select32 = function(s){set("arch/32", arguments.length ? s : true);}
            arch.Select64 = function(s){set("arch/64", arguments.length ? s : true);}

            arch.Checked32 = function(s) {return Wizard.Notify("arch/32", "is checked");}
            arch.Checked64 = function(s) {return Wizard.Notify("arch/64", "is checked");}

            //var required = 0;
            //var available = 0;

            //arch.SpaceRequired = function(r) {if(arguments.length) required = r; space_update(); return required;}

            //arch.SpaceAvailable = function(a) {if(arguments.length) available = a; space_update(); return available;}

            arch.Space32 = function(s)
      {
        if(arguments.length)
        {
          var value = s == 0 ? StringList.Format("[%s]", "") : StringList.Format("[%size]", s);

          Wizard.Notify("arch/label/32", "set text", value);
        }
      }

            arch.Space64 = function(s)
      {
        if(arguments.length)
        {
          var value = s == 0 ? StringList.Format("[%s]", "") : StringList.Format("[%size]", s);

          Wizard.Notify("arch/label/64", "set text", value);
        }
      }

            return arch;
        }

        this.Architecture = Architecture();
        //###############################################################
        // Upgrade/SXS dialog
        //###############################################################
        this.Upgrade = function()
        {
            ns.DialogHeader("Upgrade");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            ns.Stage("options.png");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            Wizard.Notify("upgrade/upgrade_dscr", "set text", "[UpgradeInstallDscr]");
            Wizard.Notify("upgrade/sxs_dscr", "set text", "[SXSInstallDscr]");
            var r = Action.Dialog({name:"Upgrade", mode:"sync"});
            return r;
        }

        var select_cb = function() {}

        var select = function(opt)
        {
            Wizard.Notify("upgrade/upgrade", "set checked", false);
            Wizard.Notify("upgrade/sxs", "set checked", false);

            switch(opt)
            {
            case "upgrade":
                Wizard.Notify("upgrade/upgrade", "set checked", true);
                break;
            case "sxs":
                Wizard.Notify("upgrade/sxs", "set checked", true);
                break;
            default: //case "remove":
                break;
            }
        }

        this.Upgrade.OnChange = function(cb)
        {
            if(!cb)
            {
                Log("Upgrade/SXS Dialog: attempt to assign an undefined callback for the selection processing. Ignore.");
                return;
            }

            select_cb = cb;

            return select_cb;
        }

        this.Upgrade.SelectUpgrade = function(){select("upgrade");}
        this.Upgrade.SelectSXS = function(){select("sxs");}

        this.Upgrade.UpgradeChecked = function(){return Wizard.Notify("upgrade/upgrade", "is checked");}
        this.Upgrade.SXSChecked = function(){return Wizard.Notify("upgrade/sxs", "is checked");}

        var UpgradeChanged = function (id, notify, value)
        {
            if(id != "upgrade" || notify != "upgrade_was_changed")
                return;

            switch(value)
            {
                case "NTF_UPGRADE":
                    select_cb("upgrade");
                    break;
                case "NTF_SXS":
                    select_cb("sxs");
                    break;
            }
        }

        Wizard.Subscribe("upgrade", "upgrade_was_changed", UpgradeChanged);

        //###############################################################
        // NDKIntegration
        //###############################################################
        var ndk_dir_current_value= "";
        /*
        var ndk_path = "";
        var ndk_on_change = function(id, value)
        {
            var self = arguments.callee;
            if(self[id])
            {
                d2_paths[id] = {value:value};
                return self[id](value);
            }
        }
        */
        var ndk_on_change = function(){};

        var ndk_check_path = function(){};
        /*
        ndk_on_change.notify = function()
        {
            if(d2_paths[1])
                d2_on_change(1, d2_paths[1].value);
        }
        */
        var ndk_path_is_valid = function()
        {
            var invalid_path = function(reason)
            {
                Log("Failed path processing: " + reason);
                Wizard.Notify("ndk_integration/space", "set rtf text", format("[ndk_incorrect_path_file]", reason));
                Wizard.Next.Disable();
            }
            Log("incoming path: " + ndk_dir_current_value);

            var path = ndk_dir_current_value;

            if(!path)
            {
                Wizard.Notify("ndk_integration/space", "set rtf text", "");
                Wizard.Next.Disable();
                return false;
            }
            else if(path.length < 3 || !FileSystem.IsAbsolute(path))
            {
                invalid_path("Not absolute");
                return false;
            }

            if(path.match(/[<>?*|]/))
            {
                invalid_path("Incorrect symbols");
                return false;
            }

            if(FileSystem.IsNetwork() && path.match(/[:]/))
            {
                invalid_path("Network path contains ':'");
                return false;
            }

            if(path.split(":").length > 2)
            {
                invalid_path("More than one ':'");
                return false;
            }

            var res = ndk_check_path(path);
            if(typeof(res) != "undefined" && !res)
                return false;

            Wizard.Notify("ndk_integration/space", "set rtf text", "");

            Wizard.Next.Enable();
            return true;
        }

        this.NDKIntegration = function()
        {
            ns.DialogHeader("NDKIntegration");
            //ns.Buttons("[Install]", "[Prev]", "[Cancel]");
            ns.NDKIntegration.Buttons();
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            if(ns.NDKIntegration.IsChecked())
            {
                ns.NDKIntegration.Disable();
            }
            else
            {
                ns.NDKIntegration.Enable();
            }

            //ndk_path_is_valid();

            ns.Stage("options.png");

            var ret = Action.Dialog({name:"NDKIntegration", mode:"sync"});
            if(ret == Action.r_ok)
            {
                if(ns.NDKIntegration.OnNext)
                    ns.NDKIntegration.OnNext(ndk_dir_current_value);
            }

            return ret;
        }

        this.NDKIntegration.Buttons = function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        this.NDKIntegration.Set = function( folder_path )
        {
            Wizard.Notify("ndk_integration/edit_box", "set text", folder_path);
            ndk_dir_current_value= folder_path;
            ndk_path_is_valid();
            ndk_on_change(folder_path);
        }

        this.NDKIntegration.SetLabel = function( mes )
        {
            Wizard.Notify("ndk_integration/label", "set rtf text", mes);
        }

        this.NDKIntegration.SetHeader = function( mes )
        {
            Wizard.Notify("ndk_integration/header", "set rtf text", mes);
        }

        this.NDKIntegration.SetFooter = function( mes )
        {
            Wizard.Notify("ndk_integration/footer", "set rtf text", mes);
        }

        this.NDKIntegration.SetInfo = function( mes )
        {
            Wizard.Notify("ndk_integration/space", "set rtf text", mes);
        }

        this.NDKIntegration.HideCheckBox = function( mes )
        {
            // check box is used without label but near to it the footer is placed
            Wizard.Notify("ndk_integration/check_box", "hide");
            Wizard.Notify("ndk_integration/footer", "hide");
        }

        this.NDKIntegration.SetCheckBoxLabel = function( mes )
        {
            Wizard.Notify("ndk_integration/check_box", "set text", mes);
            // for the standard NDKIntegration Check box doesn't have own text but instead of it has footer near to it
            ns.NDKIntegration.SetFooter( mes );
        }

        this.NDKIntegration.SetChecked = function( val )
        {
            Wizard.Notify("ndk_integration/check_box","set checked", val);
        }

        this.NDKIntegration.IsChecked = function( )
        {
            return Wizard.Notify("ndk_integration/check_box","is checked");
        }


        this.NDKIntegration.OnPathCheck = function(cb)
        {
            if(!cb)
              return;

            ndk_check_path = cb;
        }

        this.NDKIntegration.Subscribe = function(cb)
        {
            if(!cb)
              return;

            ndk_on_change = cb;
        }

        this.NDKIntegration.TargetPath = function()
        {
            return ndk_dir_current_value;
        }
        var NDKChangeProcessor = function (id, notify, value)
        {
            if(notify != "OnChanged")
                return;
            switch(id)
            {
            case "ndk_integration/edit_box":
               {
                  ndk_dir_current_value = value;
                  if(ndk_path_is_valid())
                    ndk_on_change(ndk_dir_current_value);
                  break;
                }
            }
        }

        var NDKCheckedChangeProcessor = function (id, notify, value)
        {
            if(id != "ndk_integration" || notify != "ndk_set_checked")
                return;

            if(value)
                ns.NDKIntegration.Disable();
            else
                ns.NDKIntegration.Enable();
        }

        this.NDKIntegration.Disable = function( )
        {
            Wizard.Notify("ndk_integration/edit_box", "disable");
            Wizard.Notify("ndk_integration/browse", "disable");

            ns.NDKIntegration.SetInfo("");

            Wizard.Next.Enable();
        }

        this.NDKIntegration.Enable = function( )
        {
            Wizard.Notify("ndk_integration/edit_box", "enable");
            Wizard.Notify("ndk_integration/browse", "enable");

            ndk_path_is_valid();
        }

        Wizard.Subscribe("ndk_integration", "ndk_set_checked", NDKCheckedChangeProcessor);
        Wizard.Subscribe("ndk_integration/edit_box", "OnChanged", NDKChangeProcessor);
        Wizard.Notify("ndk_integration/edit_box", "set text limit", 260);

        //###############################################################
        // Remove configurations
        //###############################################################
        var remove_configurations_dlg = function()
        {
            var checked_cb = function() {}

            var header = "";
            var footer = "";
            var checkbox = "[remove_configuration_files]";

            var remove_configurations = function()
            {
                ns.DialogHeader("RemoveConfigurations");
                Wizard.Next.Enable();
                Wizard.Prev.Enable();
                Wizard.Cancel.Enable();

                ns.Stage("options.png");
                Wizard.Notify("single_checkbox/header", "set rtf text", header);
                Wizard.Notify("single_checkbox/footer", "set rtf text", footer);
                Wizard.Notify("single_checkbox/box", "set text", checkbox);
                var r = Action.Dialog({name:"single_checkbox", mode:"sync"});
                Wizard.Prev.Enable();
                return r;
            }

            remove_configurations.Header = function(text)
            {
                if(arguments.length)
                    header = text;
            }

            remove_configurations.Footer = function(text)
            {
                if(arguments.length)
                    footer = text;
            }

            remove_configurations.Checkbox = function(text)
            {
                if(arguments.length)
                    checkbox = text;
            }

            remove_configurations.IsChecked = function()
            {
                return Wizard.Notify("single_checkbox/box","is checked");
            }

            return remove_configurations;
        }

        this.RemoveConfigurationFiles = remove_configurations_dlg();

        //###############################################################
        // Optional removal
        //###############################################################
        var optional_removal_data;

        var optional_removal_callback = function(control, command, id)
        {
            Log("OptionalRemoval: Item " + id + " " + command);

            for(var i in optional_removal_data)
            {
                if(optional_removal_data[i].id == id)
                {
                    if(command == "selected")
                        optional_removal_data[i].selected = true; // save states for every id
                    else
                        optional_removal_data[i].selected = false;
                }
            }
        }

        Wizard.Subscribe("optional_removal", "selected", optional_removal_callback);
        Wizard.Subscribe("optional_removal", "unselected", optional_removal_callback);

        this.OptionalRemoval = function ()
        {
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            ns.DialogHeader("OptionalRemoval");
            ns.Stage("options.png");
            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            Wizard.Notify("optional_removal_dlg/header_richedit", "set rtf text", "[previous_version_uninstall_description]");
            Wizard.Notify("optional_removal_dlg/footer_richedit", "set rtf text", "[optional_removal_vs_note]");

            var r = Action.Dialog({ name: "optional_removal", mode: "sync" });
            if(r == Action.r_ok)
            {
                if(ns.OptionalRemoval.OnNext)
                    ns.OptionalRemoval.OnNext();
            }
            return r;
        }

        this.OptionalRemoval.Data = function(data)
        {
            if(data)
            {
               Log(" OptionalRemoval.Data: Setting dialog data");
               for(var k in data)
               {
                   Log(" title = " + data[k].title);
               }
               optional_removal_data = data;
               OptionalRemovalData(data);
            }
            else
            {
               Log(" OptionalRemoval.Data: Input data parameter is undefined -> return the current data");
               return optional_removal_data;
            }
        }
        //###############################################################
        // WBIntegration
        //###############################################################
        var wb_dir_current_value= "";

        var wb_on_change = function(){};

        var wb_check_path = function(){};

        var wb_path_is_valid = function()
        {
            var invalid_path = function(reason)
            {
                Log("Failed path processing: " + reason);
                Wizard.Notify("wb_integration/path", "set rtf text", format("[wb_incorrect_path_file]", reason));
                Wizard.Next.Disable();
            }
            Log("incoming path: " + wb_dir_current_value);

            var path = wb_dir_current_value;

            if(!path)
            {
                Wizard.Notify("wb_integration/path", "set rtf text", "");
                Wizard.Next.Disable();
                return false;
            }
            else if(path.length < 3 || !FileSystem.IsAbsolute(path))
            {
                invalid_path("Not absolute");
                return false;
            }

            if(path.match(/[<>?*|]/))
            {
                invalid_path("Incorrect symbols");
                return false;
            }

            if(FileSystem.IsNetwork() && path.match(/[:]/))
            {
                invalid_path("Network path contains ':'");
                return false;
            }

            if(path.split(":").length > 2)
            {
                invalid_path("More than one ':'");
                return false;
            }

            var res = wb_check_path(path);
            if(typeof(res) != "undefined" && !res)
                return false;

            Wizard.Notify("wb_integration/path", "set rtf text", "");

            Wizard.Next.Enable();
            return true;
        }

        this.WBIntegration = function()
        {
            ns.DialogHeader("WBIntegration");
            ns.WBIntegration.Buttons();

            Wizard.Next.Enable();
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();

            ns.Stage("options.png");

            if(ns.WBIntegration.IsChecked())
            {
                ns.WBIntegration.Enable();
                wb_path_is_valid();
            }
            else
            {
                ns.WBIntegration.Disable();
            }

            if(ns.WBIntegration.Refresh)
                ns.WBIntegration.Refresh();

            var ret = Action.r_ok;

            do
            {
                ret = Action.Dialog({name:"WBIntegration", mode:"sync"});

            }while( (ret == Action.r_ok || ret == Action.r_back) && (ns.WBIntegration.ExitAllowed && typeof(ns.WBIntegration.ExitAllowed) == "function" && ns.WBIntegration.ExitAllowed(wb_dir_current_value) != true));

            if(ret == Action.r_ok)
            {
                if(ns.WBIntegration.OnNext)
                    ns.WBIntegration.OnNext(wb_dir_current_value);
            }

            return ret;
        }

        this.WBIntegration.Buttons = function()
        {
            ns.Buttons("[Install]", "[Prev]", "[Cancel]");
        }

        this.WBIntegration.Set = function( folder_path )
        {
            Wizard.Notify("wb_integration/edit_box", "set text", folder_path);
            wb_dir_current_value= folder_path;
            wb_path_is_valid();
            wb_on_change(folder_path);
        }

        this.WBIntegration.SetLabel = function( mes )
        {
            Wizard.Notify("wb_integration/label", "set text", mes);
        }

        this.WBIntegration.SetHeader = function( mes )
        {
            Wizard.Notify("wb_integration/header", "set rtf text", mes);
        }

        this.WBIntegration.SetFooter = function( mes )
        {
            Wizard.Notify("wb_integration/footer", "set rtf text", mes);
        }

        this.WBIntegration.SetInfo = function( mes )
        {
            Wizard.Notify("wb_integration/path", "set rtf text", mes);
        }

        this.WBIntegration.SetCheckBoxLabel = function( mes )
        {
            Wizard.Notify("wb_integration/check_box", "set text", mes);
        }

        this.WBIntegration.SetChecked = function( val )
        {
            Wizard.Notify("wb_integration/check_box","set checked", val);
        }

        this.WBIntegration.IsChecked = function( )
        {
            return Wizard.Notify("wb_integration/check_box","is checked");
        }

        this.WBIntegration.OnPathCheck = function(cb)
        {
            if(!cb)
              return;

            wb_check_path = cb;
        }

        this.WBIntegration.Subscribe = function(cb)
        {
            if(!cb)
              return;

            wb_on_change = cb;
        }

        this.WBIntegration.TargetPath = function()
        {
            return wb_dir_current_value;
        }

        this.WBIntegration.Disable = function( )
        {
            Wizard.Notify("wb_integration/label","hide");
            Wizard.Notify("wb_integration/edit_box", "hide");
            Wizard.Notify("wb_integration/browse", "hide");
            Wizard.Notify("wb_integration/path", "hide");
            Wizard.Next.Enable();
        }

        this.WBIntegration.Enable = function( )
        {
            Wizard.Notify("wb_integration/label","show");
            Wizard.Notify("wb_integration/edit_box","show");
            Wizard.Notify("wb_integration/browse","show");
            Wizard.Notify("wb_integration/path", "show");
            wb_path_is_valid();
        }

        var WBChangeProcessor = function (id, notify, value)
        {
            if(id != "wb_integration" || notify != "wb_dir_changed")
                return;

            wb_dir_current_value= value;
            if(wb_path_is_valid())
                if(ns.WBIntegration.OnChange)
                    wb_on_change(wb_dir_current_value);
        }

        var WBCheckedChangeProcessor = function (id, notify, value)
        {
            if(id != "wb_integration" || notify != "integration_set_checked")
                return;

            if(value)
                ns.WBIntegration.Enable();
            else
                ns.WBIntegration.Disable();
        }

        Wizard.Subscribe("wb_integration", "wb_dir_changed", WBChangeProcessor);
        Wizard.Subscribe("wb_integration", "integration_set_checked", WBCheckedChangeProcessor);
        Wizard.Notify("wb_integration/edit_box", "set text limit", 260);

        //###############################################################
        // GettingStarted
        //###############################################################
        var getting_started_space_required = null;
        var getting_started_current_value = "";
        var getting_started_download_folder = "";
        var getting_started_custom_path_checker = null;
        var getting_started_eula_template = "[getting_started_eula_template]";
        var getting_started_idc_install_mode = "[getting_started_idc_install_mode]";
        var getting_started_install_text = "[getting_started_install_text]";
        var getting_started_modify_text = "[getting_started_modify_text]";
        var getting_started_download_text = "[getting_started_download_text]";
        var getting_started_download_path = "[getting_started_download_path]";
        var getting_started_eula_file = "[getting_started_eula_file]";
        var getting_started_preset_download = false;


        var get_full_path = function()
        {
            return FileSystem.MakePath(getting_started_download_folder, getting_started_current_value);
        }

        var getting_started_update_space_info = function()
        {
            //need to check installdir in case of install mode and selected path in case of download mode
            var prod = ns.Product();
            var current_path = ns.Installer().DownloadOnly() ? getting_started_current_value : prod.InstallDir.Base();
            Log("incoming path: " + current_path);

            var pchecker = ns_path_check.PathChecker(current_path);
            pchecker.SpaceRequired(getting_started_space_required);

            if(getting_started_custom_path_checker)
                getting_started_custom_path_checker(pchecker, prod);

            pchecker.IsValid();

            if(pchecker.ErrorCode() != pchecker.target_path_error_t.ok
                && !ns.Installer().DownloadOnly())
            {
                //blank message
                ns.GettingStarted.SetInfo("");
                Wizard.Notify("getting_started/space", "set rtf text", "");
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.incorrect_path)
            {
                ns.GettingStarted.SetInfo(pchecker.ErrorMessage() + " \\par\\par " + format("[%f]", current_path));
                Wizard.Notify("getting_started/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired()));
                Wizard.Next.Disable();
                return false;
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.access_denied)
            {
                ns.GettingStarted.SetInfo(pchecker.ErrorMessage());
                Wizard.Notify("getting_started/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired()));
                Wizard.Next.Disable();
                return false;
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.no_enough_space)
            {
                Wizard.Notify("getting_started/space", "set rtf text", format("[space_gs_failed_file]", pchecker.SpaceRequired(), pchecker.SpaceAvailable()));
            }
            else if(pchecker.ErrorCode() == pchecker.target_path_error_t.space_unknown)
            {
                Wizard.Notify("getting_started/space", "set rtf text", format("[space_unknown_file]", pchecker.SpaceRequired(), "[unknown]"));
            }
            else
            {
                Wizard.Notify("getting_started/space", "set rtf text", format("[space_required_file]", pchecker.SpaceRequired(), pchecker.SpaceAvailable()));
            }

            Wizard.Next.Enable();
            return true;
        }

        var getting_started_change_processor = function (id, notify, _value)
        {
            if(id != "getting_started/destination" || notify != "destination_changed")
                return;
            var value = _value.trim();

            var dirs = value.split(/[\\\/]/g);
            var path = "";
            for(var i in dirs)
            {
                path += dirs[i].trim();
                path += "\\";
            }
            value = path;

            var expanded = System.ExpandEnvironmentStr(value);
            if(expanded && expanded != value)
                value = expanded;

            if(value.length > 4)
                value = value.replace(/\\+$/, "");

            getting_started_current_value = value;
            ns.GettingStarted.Refresh();
            if(getting_started_update_space_info())
                if(ns.GettingStarted.OnChange)
                    ns.GettingStarted.OnChange(ns.GettingStarted.GetFullPath());
        }
        
        var getting_started_mode_changed = function (id, notify, value)
        {
            if(id != "getting_started/mode" || notify != "mode_changed")
                return;

            switch(value)
            {
                case "download_and_install":
                    ns.Installer().DownloadOnly(false);
                    ns.StageSuite("suite_install");
                    ns.Stage("welcome.png");
                    //disable-enable controls
                    ns.GettingStarted.Disable();
                    ns.GettingStarted.Refresh();
                    getting_started_update_space_info();
                    break;
                case "download_only":
                    ns.Installer().DownloadOnly(true);
                    ns.StageSuite("suite_download");
                    ns.Stage("welcome.png");
                    //enable-disable controls
                    ns.GettingStarted.Enable();
                    ns.GettingStarted.Refresh();
                    getting_started_update_space_info();
                    break;

            }
        }

        this.GettingStarted = function()
        {
            ns.DialogHeader("GettingStarted");

            ns.GettingStarted.Refresh();
            //update space info shouldn't be a condition for the GettingStarted refresh and should be done in after it.
            //due to in Refresh getting_started_current_value can be redefined but in case if getting_started_update_space_info returns false (for example for previous getting_started) it can not be updated

            getting_started_update_space_info();

            ns.GettingStarted.Buttons();

            //getting_started_update_full_path();

            var res = Action.Dialog({name:"GettingStarted", mode:"sync"});
            stat_pick.Property("gui_eula_accepted", res == Action.r_ok && ns.Installer().DownloadOnly());
            return res;
        }

        this.GettingStarted.SetText = function()
        {
            var prod = ns.Product();
            if (prod.InstallMode() == prod.install_mode_t.install)
                Wizard.Notify("getting_started/install_mode", "set text", StringList.Format(getting_started_install_text));
            else
                Wizard.Notify("getting_started/install_mode", "set text", StringList.Format(getting_started_modify_text));
            Wizard.Notify("getting_started/download_mode", "set text", StringList.Format(getting_started_download_text));

            Wizard.Notify("getting_started/eula", "set rtf text", getting_started_eula_template);
            Wizard.Notify("getting_started/dir_lable", "set text", StringList.Format(getting_started_download_path));
            Wizard.Notify("idd_eula_ro/idc_eula_ro", "set rtf text", getting_started_eula_file);
        }

        this.GettingStarted.Buttons = function()
        {
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Next.Enable();
            Wizard.Prev.Disable();
            Wizard.Cancel.Enable();
        }

        this.GettingStarted.Set = function(folder_path)
        {
            getting_started_current_value = folder_path;
            Wizard.Notify("getting_started/dir_edit","set text", getting_started_current_value);

            ns.GettingStarted.Refresh();
            getting_started_update_space_info();
        }

        this.GettingStarted.SetFolder = function(folder)
        {
            getting_started_download_folder = folder;
            ns.GettingStarted.Refresh();
        }

        this.GettingStarted.GetFullPath = function()
        {
            return FileSystem.MakePath(getting_started_download_folder, getting_started_current_value);
        }
        this.GettingStarted.SetInfo = function( mes )
        {
            var expanded = System.ExpandEnvironmentStr(mes);
            var _mes = expanded ? expanded : mes;
            Wizard.Notify("getting_started/full_path","set rtf text", _mes);
        }

        this.GettingStarted.SetHeader = function( mes )
        {
            Wizard.Notify("getting_started/header","set rtf text", mes);
        }

        this.GettingStarted.Disable = function( )
        {
            Wizard.Notify("getting_started/dir_lable","disable")
            Wizard.Notify("getting_started/dir_button","disable");
            Wizard.Notify("getting_started/dir_edit", "disable");
            Wizard.Notify("getting_started/eula", "disable");
        }

        this.GettingStarted.Enable = function( )
        {
            Wizard.Notify("getting_started/dir_lable","enable")
            Wizard.Notify("getting_started/dir_button","enable");
            Wizard.Notify("getting_started/dir_edit", "enable");
            Wizard.Notify("getting_started/eula", "enable");
        }


        this.GettingStarted.SpaceRequired = function(cb)
        {
            getting_started_space_required = cb;
            getting_started_update_space_info();
        }

        this.GettingStarted.SetCustomPathChecker = function(cb)
        {
            if(cb && typeof(cb) == "function")
                getting_started_custom_path_checker = cb;
        }

        this.GettingStarted.EulaFile = function(file_path)
        {
            if(file_path)
                Wizard.Notify("getting_started/popup_eula", "set rtf text", FileSystem.ReadFileUTF8(file_path));
        }

        this.GettingStarted.PresetDownload = function(preset)
        {
            if (typeof(preset) != "undefined")
            {
                getting_started_preset_download = preset;
                if (!getting_started_preset_download)
                    Wizard.Notify("getting_started/install_mode", "enable");
                Wizard.Notify("getting_started/download_mode", "set checked", getting_started_preset_download);
                Wizard.Notify("getting_started/install_mode", "set checked", !getting_started_preset_download);

                getting_started_mode_changed("getting_started/mode", "mode_changed", (getting_started_preset_download ? "download_only" : "download_and_install"));

                if (getting_started_preset_download)
                    Wizard.Notify("getting_started/install_mode", "disable");
            }
            return getting_started_preset_download;
        }

        this.GettingStarted.Refresh = function()
        {
            ns.GettingStarted.SetInfo(StringList.Format(String(ns.GettingStarted.GetFullPath()).replace(/\\/g, "\\\\")));
        }


        var gs_on_click_link = function(id, command, value)
        {
            var link = "";

            Log("Catched click: " + id + " : " + command + " : " + value);

            if (value == StringList.Format("[getting_started_eula_template_link]"))
            {
                Wizard.Notify("getting_started/EULA", "show EULA", getting_started_eula_file);
            }
        }

        Wizard.Notify("getting_started/eula", "mark link", StringList.Format("[getting_started_eula_template_link]"));

        Wizard.Subscribe("getting_started/eula", "OnClicked", gs_on_click_link);

        Wizard.Subscribe("getting_started/destination", "destination_changed", getting_started_change_processor);
        Wizard.Subscribe("getting_started/mode", "mode_changed", getting_started_mode_changed);
        Wizard.Notify("getting_started/dir_edit", "set text limit", 260);
        Wizard.Notify("getting_started/info", "disable autolink", true);

        //###############################################################
        // InternetCheckConnection
        //###############################################################
        var internet_check_connection_url = null;

        this.InternetCheckConnection = function()
        {
            var on_click = function(id, command, value)
            {
                Log("Catched click: " + id + " : " + command + " : " + value);
                if(value.match(/https?:\/\//))
                    Execute.URL(value);
                else
                    System.ConnectionDialog();
            }
            var check_url = function(url)
            {
                if (!url)
                    return Action.r_ok;

                if (FileSystem.InternetCheckConnection(url))
                    return Action.r_ok;

                var ret = Action.r_ok;

                while (ret == Action.r_ok) //sign of retrying
                {
                    if (FileSystem.InternetCheckConnection(url))
                        return Action.r_ok;

                    var text = StringList.Format("[internet_check_connection_template]", String(url).replace(/\\/g, "\\\\"));

                    ns.DialogHeader("InternetCheckConnection");
                    ns.StageSuite("suite_install");
                    ns.Stage("welcome.png");
                    ns.Buttons("[Retry]", "[Prev]", "[Cancel]");

                    Wizard.Next.Enable();
                    Wizard.Prev.Disable();
                    Wizard.Cancel.Enable();

                    Wizard.Notify("prerequisite_text", "set rtf text", text);
                    Wizard.Notify("prerequisite_text", "mark link", url);
                    Wizard.Notify("prerequisite_text", "mark link", "[system_proxy_settings]");
                    Wizard.Subscribe("prerequisite_text", "OnClicked", on_click);
                    ret = Action.Dialog({name:"Pre_requisite", mode:"sync"});
                }
                return ret;
            }

            var ret = check_url(internet_check_connection_url);
            return ret;
        }

        this.InternetCheckConnection.URL = function(url)
        {
            if (typeof(url) != "undefined")
                internet_check_connection_url = url;

            return internet_check_connection_url;
        }

        //###############################################################
        ns.DialogHeader("Welcome", "[subtitle_welcome]");
        ns.DialogHeader("GettingStarted", "[subtitle_getting_started]");
        ns.DialogHeader("PreRequisites", "[subtitle_prereq]");
        ns.DialogHeader("PostChecks", "[subtitle_postchk]");
        ns.DialogHeader("InternetCheckConnection", "[subtitle_internet_check_connection]");
        ns.DialogHeader("Maintenance", "[subtitle_welcome]");
        ns.DialogHeader("Eula", "[subtitle_eula]");
        ns.DialogHeader("Installation", "[subtitle_install]");
        ns.DialogHeader("Downloading", "[subtitle_download]");
        ns.DialogHeader("Cancel", "[subtitle_cancel]");
        ns.DialogHeader("Error", "[subtitle_error]");
        ns.DialogHeader("SetupType", "[subtitle_setuptype]");
        ns.DialogHeader("VSIntegration", "[subtitle_vsintegration]");
        ns.DialogHeader("Complete", "[subtitle_complete]");
        ns.DialogHeader("CompleteDownload", "[subtitle_complete_download]");
        ns.DialogHeader("CompleteWithCheckbox", "[subtitle_complete]");
        ns.DialogHeader("CompleteDownloadWithCheckbox", "[subtitle_complete_download]");
        ns.DialogHeader("Destination", "[subtitle_destination]");
        ns.DialogHeader("Destination2", "[subtitle_destination]");
        ns.DialogHeader("Features", "[subtitle_features]");
        ns.DialogHeader("FeaturesDownload", "[subtitle_features_to_download]");
        ns.DialogHeader("EclipseIntegration", "[subtitle_eclipse_integration]");
        ns.DialogHeader("OpenSourceMsg", "[subtitle_open_source_msg]");
        ns.DialogHeader("Architecture", "[architecture]");
        ns.DialogHeader("Upgrade", "[subtitle_upgrade]");
        ns.DialogHeader("OptionalRemoval", "[optional_removal_title]");
        ns.DialogHeader("NDKIntegration", "[subtitle_ndk_integration]");
        ns.DialogHeader("NDKIntegration2", "[subtitle_ndk_integration]");
        ns.DialogHeader("WBIntegration", "[subtitle_wb_integration]");
        ns.DialogHeader("RemoveConfigurations", "[subtitle_remove_configs]");
    }
}
