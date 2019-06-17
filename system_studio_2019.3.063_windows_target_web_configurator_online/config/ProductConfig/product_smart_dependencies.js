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
    var base_script_dir = Origin.Directory();
    var load = function(name) {return required(FileSystem.MakePath(name, base_script_dir + "/../base"));};

    var ns = this;

    var ns_prop      = load("property.js");
    var ns_enums     = load("enums.js");

    var P = function(val){return ns_prop.Property(val);}

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    //#############################################################
    // components and features should be the functions which returns the required object
    //#############################################################
    var Translator = function(components, features, properties, _expression)
    {
        var expression = _expression.replace("-", "_");
        var context = {};
        var cnn = {};

        ns_enums.BindTo(cnn);

        cnn.OnTrue = function(){};
        cnn.OnFalse = function(){};

        var list_of_objects = function(str)
        {
            var rgxp = /(components\.\w+)|(features\.\w+)|(properties\.\w+)/ig;
            return str.match(rgxp);
        }

        var previous_evaluation_result = null;
        cnn.Evaluate = function()
        {
            //iterate(exe_context, function(obj, key){ Log(" list " + key); iterate(obj, function(v, k){Log("       " + k + " = " + v);});});
            var ret = 0;
            with(context)
            {
              ret = eval(expression);
            }

            Log("evaluation of \"" + expression + "\" = " + ret + " prev_res = " + previous_evaluation_result);

            previous_evaluation_result = ret;

            if(ret)
              cnn.OnTrue();
            else
              cnn.OnFalse();


            return ret;
        };

        var action_subscriber = function(container_name, key, sender)
        {
            return function(act)
            {
                Log("received signal from " + sender.Name() + " act = " + act);
                //var val = (act == sender.action_t.install || act == sender.action_t.mix || (act != sender.action_t.remove && sender.State() == sender.state_t.installed)) ? 1 : 0;
                context[container_name][key] = (act == sender.action_t.install || act == sender.action_t.mix || (act != sender.action_t.remove && sender.State() == sender.state_t.installed));

                cnn.Evaluate();
            };
        };

        var dep_objects = list_of_objects(expression);

        context.components = {};
        context.features = {};
        context.properties = {};

        var process_element = function(container_name, key)
        {
            var obj;
            var act;
            if(container_name == "features")
            {
                obj = features(key);

                if(obj)
                {
                  obj.Action.Subscribe(action_subscriber(container_name, key, obj));
                  act = obj.Action();
                  context.features[key] = (act == obj.action_t.install || act == obj.action_t.mix || (act != obj.action_t.remove && obj.State() == obj.state_t.installed));
                }
                else
                  context.features[key] = 0;
            }
            else if(container_name == "components")
            {
                obj = components(key);

                if(obj)
                {
                  obj.Action.Subscribe(action_subscriber(container_name, key, obj));
                  act = obj.Action();
                  context.components[key] = (act == obj.action_t.install || act == obj.action_t.mix || (act != obj.action_t.remove && obj.State() == obj.state_t.installed));
                }
                else
                  context.components[key] = 0;
            }
            else if(container_name == "properties")
            {
                var val = properties(key);

                properties.Subscribe(function(name, value)
                {
                    Log("received signal from property set, changed property \"" + name + "\", - val = \"" + value + "\"");
                    context.properties[name] = value;
                    cnn.Evaluate();
                });

                context.properties[key] = (typeof(val) == "undefined") ? "" : val;
            }
        }

        iterate(dep_objects, function(elem){ var arr = elem.split("."); process_element(arr[0], arr[1]);});

        return cnn;
    }

    var EqualTranslator = function(components, features, properties, expression)
    {
        var tr = Translator(components, features, properties, expression);
        //tr.OnTrue = function(){ obj.Action(obj.action_t.install);}
        //tr.OnFalse = function(){ obj.Action(obj.action_t.remove);}

        tr.Action = P(tr.action_t.none);
        tr.OnTrue = function(){ tr.Action(tr.action_t.install);};
        tr.OnFalse = function(){ tr.Action(tr.action_t.remove);};
        tr.Evaluate();

        return tr;
    }

    var InstallTranslator = function(components, features, properties, expression)
    {
        var tr = Translator(components, features, properties, expression);
        //tr.OnTrue = function(){ obj.Action(obj.action_t.install);}
        tr.Action = P(tr.action_t.none);
        tr.OnTrue = function(){ tr.Action(tr.action_t.install);};

        tr.Evaluate();

        return tr;
    }

    var RemoveTranslator = function(components, features, properties, expression)
    {
        var tr = Translator(components, features, properties, expression);
        //tr.OnFalse = function(){ obj.Action(obj.action_t.remove);}
        tr.Action = P(tr.action_t.none);
        tr.OnFalse = function(){ tr.Action(tr.action_t.remove);};

        tr.Evaluate();

        return tr;
    }

    var DisableRemoveTranslator = function(components, features, properties, expression)
    {
        var tr = Translator(components, features, properties, expression);
        tr.Disabled = P();
        tr.Disabled.Attributes.Value("Type", tr.disabled_type_t.dependency);

        tr.Action = P(tr.action_t.none);
        //var prev_act = obj.Action();
        //tr.OnTrue = function(){ obj.Disabled(false); obj.Action(prev_act);};
        //tr.OnFalse = function(){ prev_act = obj.Action(); obj.Action(obj.action_t.remove); obj.Disabled(true);};
        //tr.OnTrue = function(){ obj.Disabled(false);};
        //tr.OnFalse = function(){ obj.Disabled(true); obj.Action(obj.action_t.remove);};
        tr.OnTrue = function(){ tr.Disabled(tr.disabled_t.no);};
        tr.OnFalse = function(){ tr.Disabled(tr.disabled_t.yes); tr.Action(tr.action_t.remove);};

        tr.Evaluate();

        return tr;
    }

    var DisableActionByTranslator = function(components, features, properties, expression)
    {
        var tr = Translator(components, features, properties, expression);
        tr.Disabled = P();
        tr.Action = P(tr.action_t.none);
        //var prev_act = obj.Action();
        //tr.OnTrue = function(){ obj.Disabled(false); obj.Action(prev_act);};
        //tr.OnFalse = function(){ prev_act = obj.Action(); obj.Action(obj.action_t.remove); obj.Disabled(true);};
        //tr.OnTrue = function(){ obj.Disabled(false);};
        //tr.OnFalse = function(){ obj.Disabled(true); obj.Action(obj.action_t.remove);};
        tr.OnTrue = function(){ tr.Disabled(tr.disabled_t.no); tr.Action(tr.action_t.install);};
        tr.OnFalse = function(){ tr.Disabled(tr.disabled_t.yes); tr.Action(tr.action_t.remove);};

        tr.Evaluate();

        return tr;
    }

    //##################################################################
    this.Component = function(components)
    {
        ns.Feature = function(features)
        {
            ns.Product = function(product, node)
            {
                Log("Processing smart dependencies");

                var FeatureById = function(id)
                {
                    return product.FilterFeaturesRecursive(function(ftr){ if(ftr.Id() == id) return ftr;});
                }

                var ComponentByAlias = function(alias)
                {
                    return product.FilterComponentsRecursive(function(cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
                }

                // following function returns properties set (instead of the value for certain property), it is required to have an ability to subscribe on the properties changes in the set (no ability to subscribe to one property)
                var ProductProperties = function()
                {
                    return product.CustomProperties();
                }

                var set_dependency = function(obj, expr, type, _node)
                {
                    if(!obj)
                    {
                      Log(Log.l_warning, "an attempt to set dependency for undefined object");
                      return;
                    }

                    if(!expr)
                    {
                      Log(Log.l_warning, "an attempt to set dependency for " + obj.Name() + " with undefined expression");
                      return;
                    }

                    Log("setting " + type + " dependency for " + obj.Name() + " expression = " + expr);
                    var tr;

                    switch(type)
                    {
                    case "action_by":
                        EqualTranslator(ComponentByAlias, FeatureById, ProductProperties(), expr).Action.Cascade(obj.Action);
                        break;
                    case "install_by":
                        InstallTranslator(ComponentByAlias, FeatureById, ProductProperties(), expr).Action.Cascade(obj.Action);
                        break;
                    case "remove_by":
                        RemoveTranslator(ComponentByAlias, FeatureById, ProductProperties(), expr).Action.Cascade(obj.Action);
                        break;
                    case "disable_remove_by":
                    {
                        tr = DisableRemoveTranslator(ComponentByAlias, FeatureById, ProductProperties(), expr);
                        tr.Action.Cascade(obj.Action);
                        obj.Disabled(tr.Disabled);
                        break;
                    }
                    case "disable_action_by":
                    {
                        tr = DisableActionByTranslator(ComponentByAlias, FeatureById, ProductProperties(), expr);
                        tr.Action.Cascade(obj.Action);
                        obj.Disabled(tr.Disabled);
                        break;
                    }
                    default:
                        Log(Log.l_warning, "unknown dependency type");
                        break;
                    }
                }

                var set_dependencies_for = function(object_type, dependency_type)
                {
                    var nodes;
                    var i;
                    var object;
                    if(object_type == "component")
                    {
                        nodes = node.select("components/component[@alias and @" + dependency_type + "]");
                        for(i in nodes)
                        {
                            object = nodes[i];
                            Log("creating dependency for component " + object.attributes.alias);
                            set_dependency(components[object.attributes.alias], object.attributes[dependency_type], dependency_type, object);
                        }
                    }
                    else if(object_type == "feature")
                    {
                        nodes = node.select("//feature[@id and @" + dependency_type + "]");
                        for(i in nodes)
                        {
                            object = nodes[i];
                            Log("creating dependency for feature " + object.attributes.id);
                            set_dependency(features[object.attributes.id], object.attributes[dependency_type], dependency_type, object);
                        }
                    }
                }
                //###############################################################
                var deps_types = [ "action_by", "install_by", "remove_by", "disable_remove_by", "disable_action_by"];

                for(var dt in deps_types)
                {
                    set_dependencies_for("component", deps_types[dt]);
                    set_dependencies_for("feature", deps_types[dt]);
                }
                
                Log("Processing smart dependencies finished");
            }
        }
    }
}
