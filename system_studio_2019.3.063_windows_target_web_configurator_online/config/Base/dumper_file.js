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
    this.File = function()
    {
        var act = DumperAction.File();

        act.Upgrade = function(upg)
        {
            if(upg)
                return act.Configure("upgrade");
            else
                return act.Configure("process_all");
        }

        act.Create = function(path)
        {
            return act.Configure({action:"file_create", path:path});
        }

        act.Copy = function(src, dst)
        {
            return act.Configure({action:"file_copy", source:src, target:dst});
        }

        act.Move = function(src, dst)
        {
            return act.Configure({action:"file_move", source:src, target:dst});
        }

        act.Remove = function(path)
        {
            return act.Configure({action:"file_delete", path:path});
        }

        act.Symlink = function(link, target)
        {
            return act.Configure({action:"symlink_create", link:link, target:target});
        }

        act.DelayedRemove = function(path)
        {
            return act.Configure({action:"delete_delayed", path:path});
        }

        act.IgnoreErrors = function(ignore)
        {
            if(ignore)
                return act.Configure("ignore_error");
            else
                return act.Configure("process_error");
        }

        return act;
    }

    this.Directory = function()
    {
        var act = DumperAction.File();

        act.Upgrade = function(upg)
        {
            if(upg)
                return act.Configure("upgrade");
            else
                return act.Configure("process_all");
        }

        act.Copy = function(src, dst)
        {
            return act.Configure({action:"dir_copy", source:src, target:dst});
        }

        act.CopyContent = function(src, dst)
        {
            return act.Configure({action:"dir_copy_content", source:src, target:dst});
        }

        act.Create = function(path)
        {
            return act.Configure({action:"dir_create", path:path});
        }

        act.Remove = function(path, not_empty)
        {
            return act.Configure({action:"dir_delete", path:path, not_empty:not_empty});
        }

        act.Symlink = function(link, target)
        {
            return act.Configure({action:"symlink_create", link:link, target:target});
        }

        act.Junction = function(link, target)
        {
            return act.Configure({action:"junction_create", link:link, target:target});
        }

        act.DelayedRemove = function(path)
        {
            return act.Configure({action:"delete_delayed", path:path});
        }

        act.IgnoreErrors = function(ignore)
        {
            if(ignore)
                return act.Configure("ignore_error");
            else
                return act.Configure("process_error");
        }

        return act;
    }

    var create_access_control_action_helper = function(directories_to_process, groups_to_remove, action)
    {
        var remove_groups_subroutine = function(dir_list, group_list)
        {
            var existing_dirs = [];
            for(var i = 0; i < dir_list.length; i++)
            {
                if(FileSystem.Exists(dir_list[i]))
                {
                    if(FileSystem.IsDirectory(dir_list[i]))
                    {
                        //directories must terminate with slash
                        if(dir_list[i].charAt(dir_list[i].length - 1) != '\\')
                        {
                            dir_list[i] += '\\';
                        }
                    }
                    existing_dirs.push(dir_list[i]);
                }
                else
                {
                    Log("Base::dumper_file: '" + dir_list[i] + "' doesn't exist, excluding");
                }
            }
            Log("Base::dumper_file: processing " + group_list.join(", ") + " from: " + existing_dirs.join(", "));
            var ret_msg = "";
            if(action === "remove_groups")
            {
                ret_msg = GroupManager.RemoveGroups(existing_dirs, group_list);
                Log("Base::dumper_file: RemoveGroups returns: " + ret_msg);
            }
            else if(action === "remove_groups_by_sid")
            {
                ret_msg = GroupManager.RemoveGroupsBySID(existing_dirs, group_list);
                Log("Base::dumper_file: RemoveGroupsBySID returns: " + ret_msg);
            }
            else if(action === "set_read_only_access")
            {
                ret_msg = GroupManager.SetReadOnlyAccessBySID(existing_dirs, group_list);
                Log("Base::dumper_file: SetReadOnlyAccessBySID returns: " + ret_msg);
            }
            return ret_msg;
        }

        var remove_groups_act = {};
        remove_groups_act.Apply = function()
        {
            var ret_msg = remove_groups_subroutine(directories_to_process, groups_to_remove);
            if(ret_msg != "Successful")
            {
                Log(Log.l_warning, "Base::dumper_file failed to remove " + groups_to_remove.join(", ") + " from: " + directories_to_process.join(", "));
            }
            return Action.r_ok;
        }

        remove_groups_act.Rollback = function()
        {
            return Action.r_ok;
        }

        return remove_groups_act;
    }

    /** @fn CreateRemoveGroupsAct(List directories_to_process, List groups_to_remove)
     *  @brief Creates action to remove specified groups from access control list
     *  @details Create action object with two methods: Apply and Rollback.
     *  Apply calls remove_groups_subroutine, Rollback does nothing and is necessary
     *  only to provide the compatibility with dumper interface.
     *  remove_groups_subroutine checks whether directories or files from the specified
     *  list exist. If they do -- subroutine adds terminating slash if it is absent.
     *  It they don't, subroutine removes element from the list. After that,
     *  RemoveGroups routine is called from plug-in GroupManager.
     *  @param List directories_to_process - list of directories to remove groups from
     *  @param List groups_to_remove - list of groups to be removed
     *  @usage
     *      var ns_d_file = load("dumper_file.js");
     *      var dmp = ns_dump.Dumper("my new dumper");
     *      var remove_groups_act = ns_d_file.CreateRemoveGroupsAct(["C:\\Intel\\"], ["Users"]);
     *      dmp.AddAction(remove_groups_act, "Configuring Access Control Lists");
     *  @see component_micl3.js and component_isource3.js
     */
    this.CreateRemoveGroupsAct = function(directories_to_process, groups_to_remove)
    {
        return create_access_control_action_helper(directories_to_process, groups_to_remove, "remove_groups");
    }

    /** @fn CreateRemoveGroupsAct(List directories_to_process, List sids_to_remove)
     *  @brief Creates action to remove specified security IDs from access control list
     *  @details Works like CreateRemoveGroupsAct, except for using security IDs instead
     *  of group names
     *  @param List directories_to_process - list of directories to remove groups from
     *  @param List sids_to_remove - list of security IDs to be removed
     *  @usage
     *      var ns_d_file = load("dumper_file.js");
     *      var dmp = ns_dump.Dumper("my new dumper");
     *      var remove_groups_act = ns_d_file.CreateRemoveGroupsBySIDAct(["C:\\Intel\\"], ["S-1-5-32-545"]);
     *      dmp.AddAction(remove_groups_act, "Configuring Access Control Lists");
     *  @see common_configuration_options.js
     */
    this.CreateRemoveGroupsBySIDAct = function(directories_to_process, sids_to_remove)
    {
        return create_access_control_action_helper(directories_to_process, sids_to_remove, "remove_groups_by_sid");
    }

    /** @fn CreateSetReadOnlyAccessAct(List directories_to_process, List sids_to_remove)
     *  @brief Creates action to set read only access for specified security IDs
     *  @details Create action object with two methods: Apply and Rollback.
     *  Wrapper above create_access_control_action_helper. Does exactly the same
     *  thing as CreateRemoveGroupsAct except for SetReadOnlyAccessBySID routine is called
     *  from plug-in GroupManager instead of RemoveGroups
     *  @param List directories_to_process - list of directories where necessary to adjust access
     *  @param List sids_to_remove - list of security IDs to be removed
     *  @usage
     *      var ns_d_file = load("dumper_file.js");
     *      var dmp = ns_dump.Dumper("my new dumper");
     *      var remove_groups_act = ns_d_file.CreateSetReadOnlyAccessAct(["C:\\Intel\\"], ["S-1-5-32-545"]);
     *      dmp.AddAction(remove_groups_act, "Configuring Access Control Lists");
     *  @see component_micl3.js and component_isource3.js
     */
    this.CreateSetReadOnlyAccessAct = function(directories_to_process, sids_to_remove)
    {
        return create_access_control_action_helper(directories_to_process, sids_to_remove, "set_read_only_access");
    }
}
