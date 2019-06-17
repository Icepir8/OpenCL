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
    var ns = this;

    this.Component = function(components)
    {
        ns.Feature = function(features)
        {
            ns.Product = function(product, root)
            {
                //if(product.InstallMode() != product.install_mode_t.install)
                //    return;

                var do_not_touch_features=[];
                if (GetOpt.Exists("finstall") || GetOpt.Exists("fremove") || GetOpt.Exists("fnone")) {
                    var fnone = GetOpt.Get("fnone");
                    var fremove = GetOpt.Get("fremove");
                    var finstall = GetOpt.Get("finstall");
                    if (fnone) {do_not_touch_features = do_not_touch_features.concat(fnone.split(","));}
                    if (fremove) {do_not_touch_features = do_not_touch_features.concat(fremove.split(","));}
                    if (finstall) {do_not_touch_features = do_not_touch_features.concat(finstall.split(","));}
                }

                var do_not_touch_components=[];
                if (GetOpt.Exists("cinstall") || GetOpt.Exists("cremove") || GetOpt.Exists("cnone")) {
                    var cnone = GetOpt.Get("cnone");
                    var cremove = GetOpt.Get("cremove");
                    var cinstall = GetOpt.Get("cinstall");
                    if (cnone) {do_not_touch_components = do_not_touch_components.concat(cnone.split(","));}
                    if (cremove) {do_not_touch_components = do_not_touch_components.concat(cremove.split(","));}
                    if (cinstall) {do_not_touch_components = do_not_touch_components.concat(cinstall.split(","));}
                }

                var iterate = function(nodes, cb)
                {
                    for(var i in nodes)
                        cb(nodes[i]);
                }


                var evaluate = function(expr)
                {
                    //logging is excessive here. this expression will be shown when eval_expr() is called
                    ALog(Log.l_debug, "incomming expression = \"" + expr + "\""); //save it for debug logging just in case
                    var context = {};
                    context.components = {};
                    context.features = {};
                    context.properties = {};

                    var list_of_objects = function(str)
                    {
                        var rgxp = /(components\.\w+)|(features\.\w+)|(properties\.\w+)/ig;
                        return str.match(rgxp);
                    }

                    var PropertyByName = function(name)
                    {
                        var properties = product.CustomProperties();
                        return properties()(name);
                    }

                    var FeatureById = function(id)
                    {
                        return product.FilterFeaturesRecursive(function(ftr){ if(ftr.Id() == id) return ftr;});
                    }

                    var ComponentByAlias = function(alias)
                    {
                        return product.FilterComponentsRecursive(function(cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
                    }

                    var process_element = function(container_name, key)
                    {
                        var act;
                        var obj;
                        var val;
                        if(container_name == "features")
                        {
                            obj = FeatureById(key);

                            if(obj)
                            {
                              act = obj.Action();
                              context.features[key] = (act == obj.action_t.install || act == obj.action_t.mix || (act != obj.action_t.remove && obj.State() == obj.state_t.installed));
                            }
                            else
                              context.features[key] = 0;
                        }
                        else if(container_name == "components")
                        {
                            obj = ComponentByAlias(key);

                            if(obj)
                            {
                              act = obj.Action();
                              context.components[key] = (act == obj.action_t.install || act == obj.action_t.mix || (act != obj.action_t.remove && obj.State() == obj.state_t.installed));
                            }
                            else
                              context.components[key] = 0;
                        }
                        else if(container_name == "properties")
                        {
                            val = PropertyByName(key);
                            context.properties[key] = (typeof(val) == "undefined") ? "" : val;
                        }
                    }

                    var eval_expr = function()
                    {
                        var ret = 0;
                        with(context)
                        {
                          ret = eval(expr);
                        }

                        Log("evaluation of \"" + expr + "\" = " + ret);
                        return ret;
                    }

                    var dep_objects = list_of_objects(expr);
                    iterate(dep_objects, function(elem){ var arr = elem.split("."); process_element(arr[0], arr[1]);});
                    return eval_expr();
                }

                var proc = function(collection, key_name, do_not_touch_list)
                {
                    return function(item)
                    {
                        var attr = item.attributes.default_act ? item.attributes.default_act : item.attributes.default_act_by;
                        Log("Update action for object " + key_name + " = " + item.attributes[key_name] + " with act = " + attr );

                        var obj = collection[item.attributes[key_name]];
                        if(!obj)
                        {
                            Log("Can't find object with " + key_name + " = " + item.attributes[key_name]);
                            return;
                        }
                        var def_act = item.attributes.default_act;
                        var def_act_by = item.attributes.default_act_by;

                        var act_name = def_act ? def_act : evaluate(def_act_by) ? "install" : "none";

                        var act = obj.action_t[act_name];
                        if (!act)
                        {
                            Log("There isn't action type " + act_name);
                            return;

                        }

                        if(do_not_touch_list.indexOf(item.attributes[key_name]) == -1 && do_not_touch_list.indexOf("all") == -1)
                        {
                            obj.Action(act);
                        }
                    }
                }
                //function is avaliable in all modes, vitally important for download-only mode
                product.DefaultAction = function()
                {
                    Log("Setting default actions for components and features");

                    var cmps = root.select("//component[@alias and (@default_act or @default_act_by)]");
                    iterate(cmps, proc(components, "alias", do_not_touch_components));

                    var ftrs = root.select("//feature[@id and (@default_act or @default_act_by)]");
                    iterate(ftrs, proc(features, "id", do_not_touch_features));

                    Log("Setting default actions for components and features done");
                }
                if(product.InstallMode() == product.install_mode_t.install)
                {
                    product.SetDefaultAct = product.DefaultAction;
                    product.ProductPostProcess.Connect(product.SetDefaultAct);
                }
            }
        }
    }
}
