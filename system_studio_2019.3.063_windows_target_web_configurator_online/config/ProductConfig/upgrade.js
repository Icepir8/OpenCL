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
    /*
    <upgrade type="group" version_min="1.2.3.4" version_max="2.3.4.5" same_dir="false">group name</upgrade>
    <upgrade type="product_id" same_dir="false">product_id from micl db</upgrade>
    <upgrade type="component_id" same_dir="false">component_id from micl db</upgrade>
    <upgrade type="msi_component_code" version_min="1.2.3.4" version_max="2.3.4.5" same_dir="false">guid</upgrade>
    <upgrade type="msi_product_code">guid</upgrade>
    <upgrade type="msi_upgrade_code" version_min="1.2.3.4" version_max="2.3.4.5">guid</upgrade>
    */

    // upgrade code
    // group name
    // product code
    // component code
    // + version min/max, same folder
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir + "/../base"));};

    var ns = this;
    var ns_prop = load("property.js");
    var ns_inst = Namespace("Root.installer");

    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }

    var get_bool = function(string)
    {
        switch (String(string).toLowerCase())
        {
            case "":
            case "false":
            case "0":
            case "no":
            case "n":
                return false;
            default:
                return true;
        }
    }

    this.Component = function(components)
    {
        ns.Feature = function(features)
        {
            ns.Product = function(prod, root)
            {
                if(root)
                {
                    Log("Set upgrade info details");

                    var add_upgrade = function(object, node)
                    {
                        if(!object)
                        {
                            Log(Log.l_warning, "Empty object to add upgrade specified");
                            return;
                        }

                        if(!object.Upgrade)
                        {
                            Log(Log.l_warning, "No Upgrade property exists");
                            return;
                        }

                        if(!node)
                        {
                            Log(Log.l_warning, "Empty descriptor node");
                            return;
                        }

                        if(!node.attributes)
                        {
                            Log(Log.l_warning, "No attributes property found");
                            return;
                        }

                        var vmin = node.attributes.version_min;
                        var vmax = node.attributes.version_max;
                        var sdir = node.attributes.same_dir == "true";
                        var name = node.attributes.name;
                        var opt  = node.attributes.optional == "true";
                        var bmsk = node.attributes.by_mask == "true";

                        var text = node.text;

                        var type = opt ? object.upgrade_type_t.optional : null;
                        var def_act = opt ? object.action_t.none : object.action_t.remove;

                        switch(node.attributes.type)
                        {
                        case "group":
                            object.Upgrade().Group(text, vmin, vmax, sdir, type, def_act, name);
                            break;
                        case "product_id":
                            object.Upgrade().ProductId(text, sdir, type, def_act, name, bmsk);
                            break;
                        case "component_id":
                            object.Upgrade().ComponentId(text, sdir, type, def_act, name);
                            break;
                        case "msi_component_code":
                            object.Upgrade().MSICmpCode(text, vmin, vmax, sdir, type, def_act, name);
                            break;
                        case "msi_product_code":
                            object.Upgrade().MSIProductCode(text, sdir, type, def_act, name);
                            break;
                        case "msi_upgrade_code":
                            object.Upgrade().MSIUpgradeCode(text, vmin, vmax, type, def_act,  name);
                            break;
                        default:
                            Log(Log.l_warning, "Unknown upgrade type: " + node.attributes.type);
                            break;
                        }

                        var downgrade_allowed = get_bool(node.attributes.downgrade_allowed);

                        if(!downgrade_allowed)
                        {
                            var PDowngrade = PForInstall(false);

                            PDowngrade.Attributes.Value("Type", object.disabled_type_t.downgrade);
                            object.Disabled(PDowngrade);

                            object.Upgrade().State.Subscribe(function(new_state)
                            {
                                new_state == object.upgrade_state_t.downgrade || new_state == object.upgrade_state_t.mix ? PDowngrade(true) : PDowngrade(false);
                            });
                        }
                    }

                    var upg = root.select("//upgrade[@type]");
                    for(var i in upg)
                    {
                        if(upg.hasOwnProperty(i))
                        {
                            var p = upg[i].single("..");
                            if(p)
                            {
                                switch(p.name)
                                {
                                case "component":
                                    var alias = p.attributes.alias;
                                    if(alias)
                                    {
                                        if(components[alias]){
                                            add_upgrade(components[alias], upg[i]);
                                        }
                                        else{
                                            Log(Log.l_warning, "Could not find component by alias: " + alias);
                                        }
                                    }
                                    else{
                                        Log(Log.l_warning, "No alias found for component element");
                                    }
                                    break;
                                case "feature":
                                    var id = p.attributes.id;
                                    if(id)
                                    {
                                        if(features[id]){
                                            add_upgrade(features[id], upg[i]);
                                        }
                                        else{
                                            Log(Log.l_warning, "Could not find feature: " + id);
                                        }
                                    }
                                    else{
                                        Log(Log.l_warning, "No id found for feature element");
                                    }
                                    break;
                                case "product":
                                    if(prod){
                                        add_upgrade(prod, upg[i]);
                                    }
                                    else{
                                        Log(Log.l_warning, "Product object is not created");
                                    }
                                    break;
                                default:
                                    Log(Log.l_warning, "Incorrect parent element: " + p.name);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
