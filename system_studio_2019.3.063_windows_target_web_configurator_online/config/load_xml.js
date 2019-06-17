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
    this.LoadConfig = function()
    {
        var load_xml = FileSystem.MakePath("load.xml", Origin.Directory());
        var ret = null;

        if(FileSystem.Exists(load_xml))
        {
            var root = XML(load_xml);
            if(root)
            {
                var group_name_node = root.node("/config/group_name");
                var load_groups_node = root.node("/config/load_groups");
                if(group_name_node)
                {
                    var group_name = group_name_node.text;
                    var load_groups = ((load_groups_node && !load_groups_node.text.match(/^\s*$/)) ? load_groups_node.text + ";" : "") + group_name;

                    ret = {};
                    ret.GroupName = function(){ return group_name;};
                    ret.LoadGroupsList = function(){ return load_groups;};
                    ret.BelongToGroupsList = function(groups_list)
                    {
                        if(!groups_list)
                        {
                            Log("load_xml::LoadConfig::BelongToGroupsList: incoming groups list is undefined");
                            return false;
                        }

                        Log("load_xml::LoadConfig::BelongToGroupsList: incoming groups list = \"" + groups_list + "\" own group = " + ret.GroupName());

                        var arr = groups_list.split(";");

                        for(var i in arr)
                            if(String(arr[i]).toLowerCase() == String(ret.GroupName()).toLowerCase())
                                return true;

                        Log("load_xml::LoadConfig::BelongToGroupsList: it doesn't belong to groups_list");
                        return false;
                    }
                }
            }
        }

        return ret;
    }

    this.Config = function()
    {
        var load_xml = FileSystem.MakePath("load.xml", Origin.Directory());
        var root = null;

        if(FileSystem.Exists(load_xml))
            root = XML(load_xml);

        return root;
    }
}
