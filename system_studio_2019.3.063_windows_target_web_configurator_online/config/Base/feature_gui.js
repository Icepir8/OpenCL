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

//###############################################################
// This file contains definition for:
// GUI extension for Feature class
//###############################################################
new function ()
{
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir));};
    var ns_prop      = load("property.js");
    var fm = StringList.Format;

    //###############################################################
    var P = function(val){return ns_prop.Property(val);}
    var ConstP = function(val){return ns_prop.Constant(val);}
    var PBool = function(val)
    {
      var p = ns_prop.Property(val);
      p.Transform = function(_val){ return _val ? true : false; }
      return p;
    }

    var FilterNotEmpty = function(val)
    {
        if(typeof(val) == "undefined" || val === null)
            return false;

        return true;
    }

    var PNotEmpty = function(val)
    {
      var p = ns_prop.Property(val);
      p.Filter = FilterNotEmpty;
      return p;
    }

    var PNumber = function(val)
    {
      var p = ns_prop.Property(val);
      p.Filter = function(_val){ return (typeof(_val) == "number" ? true : false); }
      return p;
    }
    
    var download_only = function() {return false;}

    var debug_log_helper = function(ftr, message)
    {
        ALog(Log.l_debug, "Feature name/id = " + (ftr.Info().Name ? ftr.Info().Name() : ftr.Info().Id()) + ": " + message);
    };

    var ns = this;
    
    this.CustomizeDownloadOnly = function(cb)
    {
        Log("Customizing DownloadOnly mode for feature selection dialog");
        if (typeof(cb) == "function")
            download_only = cb;
    }
    
    //###############################################################
    // BindGui
    //###############################################################
    this.BindTo = function(ftr)
    {
        var m_node = null;

        ftr.Visible = PBool(true);
        ftr.Expanded = PBool(false);
        //###############################################################
        ftr.Hit = function ()
        {
            return function () {
                // this presents corresponding Node here

                var menu = ftr.Menu();
                var menu_arr = [];

                for (var i in menu)
                    menu_arr.push(menu[i]);

                var user_choice = ftr.GetNode().Menu(menu_arr);

                ftr.Log("User choice = " + user_choice);

                if(typeof(user_choice) != "undefined" && user_choice !== null && menu[user_choice].act)
                {
                    ftr.Action(menu[user_choice].act);
                    ftr.Root().Refresh();
                }
            }
        }
        //###############################################################
        ftr.SetNode = function (n)
        {
            if(!n)
                return false;

            ftr.DetachNode();

            m_node = n;

            ftr.InitializeNode();

            return true;
        }
        //###############################################################
        ftr.GetNode = function ()
        {
            return m_node;
        }
        //###############################################################
        ftr.InitializeNode = function ()
        {
            if (m_node)
            {
                m_node.id          = ftr.Id();
                m_node.name        = ftr.Name();
                m_node.description = ftr.Description();
                m_node.disabled    = (ftr.Disabled() == ftr.disabled_t.yes) ? true : false;
                m_node.error       = ftr.ErrorDescription();
                m_node.icon        = ftr.Icon();
                m_node.size        = download_only() ? 0 : ftr.Size();
                m_node.hit         = ftr.Hit();
                m_node.expanded    = ftr.Expanded();
                m_node.priority    = ftr.Priority();

                m_node.Refresh();

                return true;
            }

            return false;
        }
        //###############################################################
        ftr.RefreshNode = function ()
        {
            if (m_node)
            {
                m_node.id          = ftr.Id();
                m_node.name        = ftr.Name();
                m_node.description = ftr.Description();
                m_node.disabled    = (ftr.Disabled() == ftr.disabled_t.yes) ? true : false;
                m_node.error       = ftr.ErrorDescription();
                m_node.icon        = ftr.Icon();
                m_node.size        = download_only() ? 0 : ftr.Size();
                m_node.hit         = ftr.Hit();
                //m_node.expanded    = ftr.Expanded();
                m_node.priority    = ftr.Priority();

                m_node.Refresh();

                return true;
            }

            return false;
        }
        //###############################################################
        ftr.ClearNode = function ()
        {
            if (m_node)
            {
                m_node.id          = "";
                m_node.name        = "";
                m_node.description = "";
                m_node.disabled    = false;
                m_node.error       = "";
                m_node.icon        = "";
                m_node.size        = "";
                m_node.hit         = function(){};
                m_node.expanded    = false;
                m_node.priority    = 0;

                m_node.Refresh();

                return true;
            }

            return false;
        }
        //###############################################################
        ftr.DetachNode = function ()
        {
            if (m_node)
            {
                ftr.ClearNode();
                m_node.Detach();
                m_node = null;
                return true;
            }

            return false;
        }
        //###############################################################
        ftr.Icon = function ()
        {
            if(download_only())
            {
                if(ftr.Disabled() == ftr.disabled_t.yes)
                {
                    debug_log_helper(ftr, "Icon: feature is fully disabled -> disabled icon");
                    return Node.icon_broken_menu;
                }
                
                var d_act = ftr.Action();

                debug_log_helper(ftr, "Icon define: download act = " + d_act);
                if(d_act == ftr.action_t.none)
                    return Node.icon_uninstalled_menu;
                else if(d_act == ftr.action_t.install)
                    return Node.icon_install_menu;
                else if (d_act == ftr.action_t.remove)
                    return Node.icon_uninstall_menu;

                return Node.icon_childs_differ_menu;
            }
            
            var attribute_description = "Description";
        
            if(ftr.Permanent() == ftr.permanent_t.yes && ftr.Disabled() == 
            ftr.disabled_t.yes && ftr.Disabled.Attributes.Value("Type") == "5")
            {
                debug_log_helper(ftr, "Icon: feature is permanent and installed -> disabled, set installed_permanent icon");
                
                return "Node.icon_installed_permanent";
            }
            
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                debug_log_helper(ftr, "Icon: feature is fully disabled -> disabled icon");
                return Node.icon_broken_menu;
            }

            var state = ftr.State();
            var consistent = ftr.StateConsistent();
            var act   = ftr.Action();

            debug_log_helper(ftr, "Icon define: state = " + state + " act = " + act);
            if(act == ftr.action_t.none)
            {
                if (state == ftr.state_t.absent)
                    return Node.icon_uninstalled_menu;
                else if (state == ftr.state_t.installed && consistent)
                    return Node.icon_installed_menu;
            }
            else if(act == ftr.action_t.install)
                return Node.icon_install_menu;
            else if (act == ftr.action_t.remove)
                return Node.icon_uninstall_menu;

            return Node.icon_childs_differ_menu;
        }
        //###############################################################
        ftr.Menu = function ()
        {
            ftr.Log("Menu generating start");
            if(ftr.Disabled() == ftr.disabled_t.yes)
            {
                ftr.Log("Menu: feature is fully disabled -> empty menu");
                return {};
            }

            ftr.Log("Menu generating cont");

            var menu = {};

            var item_install =
                {
                    id: "install",
                    name: fm("[menu_item_install]"),
                    icon: Node.icon_install,
                    act: ftr.action_t.install
                };
                
            var item_download =
                {
                    id: "install",
                    name: fm("[menu_item_download]"),
                    icon: Node.icon_install,
                    act: ftr.action_t.install
                };

            var item_do_not_remove =
                {
                    id: "install",
                    name: fm("[menu_item_do_not_remove]"),
                    icon: Node.icon_installed,
                    act: ftr.action_t.install
                };

            var item_remove =
                {
                    id: "remove",
                    name: fm("[menu_item_remove]"),
                    icon: Node.icon_uninstall,
                    act: ftr.action_t.remove
                };

            var item_do_not_install =
                {
                    id: "remove",
                    name: fm("[menu_item_do_not_install]"),
                    icon: Node.icon_uninstalled,
                    act: ftr.action_t.remove
                };
                
            var item_do_not_download =
                {
                    id: "remove",
                    name: fm("[menu_item_do_not_download]"),
                    icon: Node.icon_uninstalled,
                    act: ftr.action_t.remove
                };

            var state = ftr.State();
            var consistent = ftr.StateConsistent();
            var act   = ftr.Action();

            if(download_only())
            {
                menu["install"] = item_download;
                menu["remove"] = item_do_not_download;
            }
            else if(act == ftr.action_t.none)
            {

                if(!consistent)
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_remove;
                }
                else if(state == ftr.state_t.installed)
                {
                    menu["install"] = item_do_not_remove;
                    menu["remove"] = item_remove;
                }
                else
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_do_not_install;
                }
            }
            else if(act == ftr.action_t.mix)
            {
                if(!consistent)
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_remove;
                }
                else if(state == ftr.state_t.installed)
                {
                    menu["install"] = item_do_not_remove;
                    menu["remove"] = item_remove;
                }
                else
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_do_not_install;
                }
            }
            else if(act == ftr.action_t.remove)
            {
                if(!consistent)
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_remove;
                }
                else if(state == ftr.state_t.installed)
                {
                    menu["install"] = item_do_not_remove;
                    menu["remove"] = item_remove;
                }
            }
            else if(act == ftr.action_t.install)
            {
                if(!consistent)
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_remove;
                }
                else if(state == ftr.state_t.absent)
                {
                    menu["install"] = item_install;
                    menu["remove"] = item_do_not_install;
                }
            }

            if(ftr.Mandatory())
                delete menu["remove"];

            return menu;
        }
    }
}
