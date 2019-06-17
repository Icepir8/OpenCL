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

/** @file enums.js
 *  @brief Implementation of enumeration for installable objects states/action/etc
 *  @see product.js component.js
 */
new function()
{
    var ns = this;
    this.BindTo = function (obj)
    {
        if(!obj)
            return false;

        for(var key in ns)
        {
            if(key == "BindTo")
                continue;

            obj[key] = ns[key];
        }

        return true;
    }
    //###############################################################
    this.BelongToEnum = function(val, e)
    {
        if(!e)
            return false;

        for(var i in e)
            if(val == e[i])
                return true;

        return false;
    }
    //###############################################################
    /** @enum action_t
     *  @brief action_t -- actions enumeration
     *  @details Includes set of values to evaluate action applied to
     *    Component or Product object
     *  @item none    - do not apply any action to object
     *  @item install - install Component/Product
     *  @item remove  - uninstall Component/Product
     *  @item mix     - partially install Component/Product, applicable for Feature objects only
     *  @usage
     *    if(component.GetAction() == component.action_t.install)
     *    {
     *        // do something here
     *    }
     *  @see state_t
     */
    this.action_t = this.action_t || new function ()
    {
      this.none             = "none";
      this.install          = "install";
      this.reinstall        = "reinstall";
      this.remove           = "remove";
      this.repair           = "repair";
      this.mix              = "mix"; // for features - which can be partially installed
    }
    //###############################################################
    /** @enum state_t
     *  @brief state_t -- object's state enumeration
     *  @details Includes set of values to evaluate state applied to Component or Product object
     *  @item absent    - object is not installed
     *  @item installed - object is installed
     *  @usage
     *    if(component.GetState() == component.state_t.absent)
     *    {
     *        // do something here
     *    }
     *  @see action_t
     */
    this.state_t = this.state_t || new function ()
    {
      this.absent = "absent";
      this.installed = "installed";
    }
    /**@enum type_progress_t
     *  @brief type_progress_t -- progress type enumeration
     *  @details Includes set of values to specify progress type
     *  @item global_progress - global's type of progress
     *  @item component_progress    - component's type of progress
     */
    this.type_progress_t = this.type_progress_t || new function ()
    {
        this.global_progress = "GlobalProgress";
        this.component_progress = "ComponentProgress";
    }
    //###############################################################
    /** @enum install_scope_t
     *  @brief install_scope_t -- installation type enumeration
     *  @details Includes set of values to specify installation type
     *  @item per_machine - per-machine installation
     *  @item per_user    - per-user installation
     *  @see action_t state_t
     */
    this.install_scope_t = this.install_scope_t || new function ()
    {
        this.per_machine    = "per_machine";
        this.per_user       = "per_user";
    }
    //###############################################################
    /** @enum setup_type_t
     *  @brief setup_type_t -- GUI wizard type
     *  @details Includes set of values to specify GUI wizard type (default or custom)
     *  @item setup_default - default installation wizard
     *  @item setup_custom  - advanced/custom installation wizard
     *  @see action_t state_t
     */
    this.setup_type_t = this.setup_type_t || new function ()
    {
        this.setup_default    = "default";
        this.setup_custom     = "custom";
    }
    //###############################################################
    // enum install_mode_t
    //###############################################################
    /** @enum install_mode_t
     *  @brief install_mode_t -- GUI wizard installation mode
     *  @details Includes set of values to specify GUI wizard installation mode
     *  @item install - install product wizard
     *  @item modify  - modify installed components wizard
     *  @item repair  - repair installed components wizard
     *  @item remove  - remove product wizard
     *  @see action_t state_t
     */
    this.install_mode_t = this.install_mode_t || new function ()
    {
        this.install    = "install";
        this.modify     = "modify";
        this.repair     = "repair";
        this.remove     = "remove";
    }
    //###############################################################
    // enum upgrade_state_t
    //###############################################################
    this.upgrade_state_t = this.upgrade_state_t || new function ()
    {
        this.none      = "nothing_installed";
        this.same      = "same_installed";
        this.upgrade   = "older_installed";
        this.downgrade = "newer_installed";
        this.mix       = "targets_with_diff_state_installed";
    }
    //###############################################################
    // enum upgrade_type_t
    //###############################################################
    this.upgrade_type_t  = this.upgrade_type_t  || new function ()
    {
        this.optional    = "optional_upgrade";
        this.mandatory   = "mandatory_upgrade";
    }
    //###############################################################
    // enum disabled_t
    //###############################################################
    this.disabled_t = this.disabled_t || new function ()
    {
        this.yes = true;
        this.no  = false;
        this.mix = "mix";
    }
    //###############################################################
    // enum permanent
    //###############################################################
    this.permanent_t = this.permanent_t || new function ()
    {
        this.yes = true;
        this.no  = false;
    }
    //###############################################################
    // enum disabled_type_t
    //###############################################################
    this.disabled_type_t = this.disabled_type_t || new function ()
    {
        this.permanent    = 5;
        this.prerequisite = 10;
        this.activation   = 70;
        this.dependency   = 90;
        this.target_arch  = 93;          
        this.downgrade    = 95;
        this.no_sources   = 97;
        this.default      = 99;
    }

    this.disabled_type_description_t = this.disabled_type_description_t || new function ()
    {
        var wpf_msg_modifier = "";
        if(typeof (WPF) != "undefined")
            wpf_msg_modifier = "_msg";
        this[ns.disabled_type_t.permanent]    = StringList.Format("[disabled_by_permanent" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.prerequisite] = StringList.Format("[disabled_by_prerequisite" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.activation]   = StringList.Format("[disabled_by_activation" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.dependency]   = StringList.Format("[disabled_by_dependency" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.downgrade]    = StringList.Format("[disabled_by_downgrade" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.no_sources]   = StringList.Format("[disabled_no_available_source" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.target_arch]  = StringList.Format("[disabled_by_target_arch" + wpf_msg_modifier + "]");
        this[ns.disabled_type_t.default]      = StringList.Format("[disabled_default_description" + wpf_msg_modifier + "]");
    }

    //###############################################################
    // enum locked_type_t
    //###############################################################
    this.locked_type_t = this.locked_type_t || new function ()
    {
        this.modify_mode    = 10;
        this.upgrade_mode   = 70;
        this.same_dir_mode  = 90;
        this.default        = 99;
    }

    this.locked_type_description_t = this.locked_type_description_t || new function ()
    {
        this[ns.locked_type_t.modify_mode]    = "[locked_by_modify_mode]";
        this[ns.locked_type_t.upgrade_mode]   = "[locked_by_upgrade_mode]";
        this[ns.locked_type_t.same_dir_mode]  = "[locked_by_same_dir_mode]";
        this[ns.locked_type_t.default]        = "[locked_default_description]";
    }
    /*
    //###############################################################
    // enum upgrade_action_t
    //###############################################################
    this.upgrade_state_t= this.upgrade_state_t|| new function ()
    {
        this.allowed   = "allowed";
        this.forbidden = "forbidden";
    }
    */
    //###############################################################
    // enum target_path_error_t
    //###############################################################
    this.target_path_error_t = this.target_path_error_t || new function ()
    {
        this.incorrect_path   = "incorrect_path";
        this.no_enough_space  = "no_enough_space";
        this.space_unknown    = "space_unknown";
        this.access_denied    = "access_denied";
        this.path_long = "path_too_long";
        this.unknown_error    = false;
        this.ok               = true;
    }
    //###############################################################
    // enum arch_t
    //###############################################################
    this.arch_t = this.arch_t || new function ()
    {
        this.none    = "none";
        this.ia32    = "ia32";
        this.intel64 = "intel64";
    }
    
    this.exitcode_t = this.exitcode_t || new function ()
    {
        this.success                    = 0;
        this.failed                     = 1;
        this.error                      = 2;
        this.warning                    = 3;
        this.canceled                   = 4;
        this.reboot_required            = 5;
        this.reboot_required_incomplete = 6;        
    }

}
