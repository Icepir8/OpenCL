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


/*
 * script attach current product to anpther one and/or attach
 * another product to current as feature. to use script just copy it
 * to ProductConfig folder.
 * processed data:
 * - to attach current product to another one - define "parent" attribute
 *   of product tag by id of target product
 * - to attach another product to current product add root tag:
  <attach>
    <product id="child_product_id"/>
  </attach>
 *
 *
 */

new function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../Base/" + name);};

    var NA = function(v) { return typeof(v) == "undefined" || v == null;}
    var FM = function(v) { return StringList.Format(v);}

    var ns_prop      = base("property.js");
    var ns_enums     = base("enums.js");

    var P = function(val){return ns_prop.Property(val);}

    var ns = this;

    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    var ComponentById = function(product, id)
    {
        if(!id)
            return null;

        return product.FilterComponentsRecursive(function (cmp) { return cmp.Id() == id ? true : false; });
    }

    var FeatureById = function(product, id)
    {
        if(!id)
            return null;

        return product.FilterFeaturesRecursive(function (ftr) { return ftr.Id() == id ? true : false; });
    }

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

    var action_semafor = function()
    {
        var items = [];
        var sem = {};
        var prev_val = false;

        sem.Action = P(ns_enums.action_t.none);

        var item_exists = function(obj)
        {
            return iterate(items, function(el){ return el == obj;});
        }

        var item_val = function(obj)
        {
            var act = obj.Action();
            return (act == obj.action_t.install || act == obj.action_t.mix || (act != obj.action_t.remove && obj.State() == obj.state_t.installed)) ? true : false;
        }

        var update_value = function()
        {
            var res = iterate(items, function(el){return item_val(el);}); // if any item is true then returns it will be true;

            if(res === prev_val)
                   return;

            if(res)
                sem.Action(ns_enums.action_t.install);
            else
                sem.Action(ns_enums.action_t.remove);
        }

        sem.Add = function(obj)
        {
            if(!obj || !obj.Action || typeof(obj.Action) != "function")
            {
                Log("action_semafor: incoming object isn't defined or doesn't contain method Action. Ignore.");
                return;
            }

            if(!item_exists(obj))
            {
                obj.Action.Subscribe(update_value);
                items.push(obj);
                update_value();
            }
        }

        return sem;
    }

    var load_config = function(config)
    {
        if(config && FileSystem.Exists(config))
        {
            var src = XML.Parse(FileSystem.ReadFileUTF8(config));
            if(src)
              return src.single("/product");
        }

        return null;
    }

    var update_expanded_required = function(prod, root)
    {
        if(!NA(root.attributes.expanded))
        {
            Log("setting expanded with " + root.attributes.expanded);
            (root.attributes.expanded == "true") ? prod.Expanded(true) : prod.Expanded(false);
        }
        if(!NA(root.attributes.required))
        {
            Log("setting required with " + root.attributes.required);
            (root.attributes.required == "true") ? prod.Mandatory(true) : prod.Mandatory(false);
        }
    }

    var update_activation = function(prod, root)
    {
        var upgrade = function(source, target)
        {
            for(var i in source)
                target[i] = source[i];
        }

        var upgrade_activation_object = function(object, node)
        {
            if(!object)
            {
                Log(Log.l_warning, "Empty object to add activation specified");
                return;
            }

            if(!node)
            {
                Log(Log.l_warning, "No activation node specified");
                return;
            }

            var actv = node.select("*");

            if(actv && actv.length)
            {
                StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));
                // ConfigDir can be used in activation info files paths

                var actv_attr = {};
                for(var i in actv)
                {
                    var a = actv[i];
                    Log("Activation entry: " + a.name + " : " + a.text);
                    if(a.attributes.type == "number")
                        actv_attr[a.name] = parseInt(a.text);
                    else
                        actv_attr[a.name] = StringList.Format(a.text);

                    Log("Activation entry after formatting: " + a.name + " : " + actv_attr[a.name]);
                }

                var orig_activation = object.CustomObjects().Item("Activation");

                if(orig_activation)
                    upgrade(actv_attr, orig_activation);
                else
                    orig_activation = actv_attr;

                object.CustomObjects().Remove("Activation");
                object.CustomObjects().Add("Activation", orig_activation);
            }
        }

        var extract_activations = function(node, _prod)
        {
           if(!_prod)
           {
               Log(Log.l_warning, "No product node specified");
               return;
           }

           if(!node)
           {
               Log(Log.l_warning, "No source node specified");
               return;
           }

           var activation = node.select("//activation");

           for(var i in activation)
           {
               var p = activation[i].single("..");
               if(p)
               {
                   switch(p.name)
                   {
                   case "component":
                       var alias = p.attributes.alias;
                       if(alias)
                       {
                           var cmp = ComponentByAlias(_prod, alias);
                           if(cmp)
                               //add_activation(components[alias], activation[i]);
                               upgrade_activation_object(cmp, activation[i]);
                               //ihash(components[alias], activation[i]);
                           else
                               Log(Log.l_warning, "Could not find component by alias: " + alias);
                       }
                       else
                           Log(Log.l_warning, "No alias found for component element");
                       break;

                   case "feature":
                       var id = p.attributes.id;
                       if(id)
                       {
                           var ftr = _prod.Features().Item(id);
                           if(ftr)
                               upgrade_activation_object(ftr, activation[i]);
                           else
                               Log(Log.l_warning, "Could not find feature: " + id);
                       }
                       else
                           Log(Log.l_warning, "No id found for feature element");
                       break;
                   case "product":
                       if(_prod)
                           //add_activation(prod, activation[i]);
                           upgrade_activation_object(_prod, activation[i]);
                       else
                           Log(Log.l_warning, "Product object is not defined");
                       break;
                   default:
                       Log(Log.l_warning, "Incorrect parent element: " + p.name);
                       break;
                   }
               }
           }
        }

        extract_activations(root, prod);
    }

    var update_product_image = function(prod, root)
    {
        if(!NA(root.attributes.image))
        {
            Log("setting image for product with " + root.attributes.image);
            prod.Image(root.attributes.image);
        }
    }

    var update_default_action = function(obj, node)
    {
        if(!obj || !node)
            return;

        Log("Update action for object " + obj.Name() + " with act = " + node.attributes.default_act);

        var act = obj.action_t[node.attributes.default_act];
        if(!act)
        {
            Log("There isn't action type " + node.attributes.default_act);
            return;
        }

        obj.Action(act);
    }

    var update_feature_by_config = function(feature, node, root_product)
    {
        if(!feature || !node)
            return;

        update_expanded_required(feature, node);

        if(!NA(node.attributes.order) && node.attributes.order)
        {
            feature.Order(parseInt(node.attributes.order));
        }

        if(!NA(node.attributes.priority) && node.attributes.priority)
        {
            feature.Priority(parseInt(node.attributes.priority));
        }

        if(!NA(node.attributes.visible) && node.attributes.visible)
        {
            feature.Visible(node.attributes.visible == "false" ? false : true);
        }

        if(feature.ARP && typeof(feature.ARP.CreateArp) == "function" && node.attributes.suppress_arp == "true")
        {
            feature.ARP.CreateArp(false);
            feature.ARP.Disabled.DisabledByBundle = P(true);
            feature.ARP.Disabled(feature.ARP.Disabled.DisabledByBundle);
        }

        var info = feature.Info();

        for(var i in node.attributes)
        {
            if(typeof(info.Property(i)) == "undefined")
            {
                //Log("Add attribute " + i + " as property into Info val = " + node.attributes[i]);
                info.Property(i, node.attributes[i]);
            }
            else
                Log("Can't add attribute '" + i + "' as property into Info due to property with the same name already exists");
        }

        if(root_product.InstallMode() == root_product.install_mode_t.install)
            update_default_action(feature, node);
    }

    var update_component_by_config = function(component, node, root_product)
    {
        if(!component || !node)
            return;

        if(!NA(node.attributes.order) && node.attributes.order)
            component.Order(parseInt(node.attributes.order));

        if(root_product.InstallMode() == root_product.install_mode_t.install)
            update_default_action(component, node);
    }

    var update_product_by_config = function(prod, cnfg, parent)
    {
        var product = prod;
        var config = cnfg;

        //Log("updating product " + product.Name() + " by config " + config);
        var root = load_config(config);
        if(!root)
        {
            Log("can't load product config = " + config);
            return;
        }

        product.ContentLoaders().Add(Guid(), function()
        {
            update_product_image(product, root);
            return true;
        });

        parent.ProductPostProcess.Connect(function()
        {
            if(product.ProductPostProcess)
                product.ProductPostProcess.Call();

             Log("updating product " + product.Name() + " by config " + config);

            //var features = root.select("feature[@name and @id]");

            update_feature_by_config(product, root, parent);

            // update_activation performs update for all elements (product, feature, component)
            StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));
            update_activation(product, root);


            Log("updating features ");
            iterate(root.select("feature[@id]"), function(f_node)
            {
                var ftr = FeatureById(product, f_node.attributes.id);

                if(!ftr)
                {
                    Log("can't find feature with id " + f_node.attributes.id);
                    return false;
                }

                update_feature_by_config(ftr, f_node, parent);
            });
            Log("updating features done");

            Log("updating components ");
            iterate(root.select("components/component[@alias]"), function(c_node)
            {
                var cmp = ComponentByAlias(product, c_node.attributes.alias);

                if(!cmp)
                {
                    Log("can't find component with alias " + c_node.attributes.alias);
                    return false;
                }

                update_component_by_config(cmp, c_node, parent);
            });
            Log("updating components done");

            Log("updating product " + product.Name() + " by config done");

            return true;
        });
    }

    var IS_clones = [];

    this.Component = function(components, root, prod)
    {
        var ns_inst = base("installer.js").Installer;

        var childs = root.select("attach/product[@id]");

        if(!childs)
            return;

        // sub products should set their relations in certain order only:
        // first all non start child products
        // second bundle (if it isn't start)
        // third = start product
        // the goal is to have childs initialized before bundle
        // for example for install dir if bundle is first then installdir for all will be locked (if it is modify mode for bundle)
        // and the childs which where not installed first time will not be able to initialize their own installdir
        // names of the variables were left as is intentionaly (like ...inst_mode_cb) to escape potential regressions

        var inst_mode_cb = [];
        var bundle_inst_mode_cb = null;
        var start_inst_mode_cb = null;

        var done = false;

        var install_mode_identifier = function()
        {
            if(done)
                return;

            done = true;

            Log("arr of inst identifiers");
            iterate(inst_mode_cb, function(cb){ cb(); });
            Log("bundle inst ");
            if(bundle_inst_mode_cb)
                bundle_inst_mode_cb();
            Log("start inst ");
            if(start_inst_mode_cb)
                start_inst_mode_cb();
        }

        install_mode_identifier.Order = function(){ return 1; }

        if(!prod.start)
        {
            /*
            bundle_inst_mode_cb = prod.RelationSetters().Item("InstallModeIdentifier");
            prod.RelationSetters().Remove("InstallModeIdentifier");
            prod.RelationSetters().Add("InstallModeIdentifier", install_mode_identifier);
            */
            var bundle_inst_mode_identifier = prod.RelationSetters().Item("InstallModeIdentifier");
            prod.RelationSetters().Remove("InstallModeIdentifier");
            // if the bundle isn't start product then it shouldn't lock its installdir due to prevent locked dir for child product (lock is performed in InstallModeIdentifier in case fo modify mode)
            // when it wasn't installed from bundle but later is installed as standalone (if the dir is locked then it will not be set right).
            // in that case standalone should identify if the installdir should be locked by itself (via msi component codes for example)
            var new_inst_mode_ident = function(){bundle_inst_mode_identifier(); prod.InstallDir.Lock(false);};
            new_inst_mode_ident.Order = function(){ return 1; }
            prod.RelationSetters().Add("InstallModeIdentifier", new_inst_mode_ident);

            bundle_inst_mode_cb = prod.SetRelations;
            prod.SetRelations = install_mode_identifier;
        }
        else
        {
            var bundle_inst_mode_identifier = prod.RelationSetters().Item("InstallModeIdentifier");
            prod.RelationSetters().Remove("InstallModeIdentifier");

            // bundle install mode definition is performed after all child products
            // as the install dir for not installed one was set as default
            // it is required to reset the dir for bundle to have it waterfalled to the childs again
            // therefore prod.InstallDir.Base(prod.InstallDir.Base()); prod.InstallDir.Own(prod.InstallDir.Own()); were added before it will be locked by bundle_inst_mode_identifier

            var new_inst_mode_ident = function(){prod.InstallDir.Base(prod.InstallDir.Base()); prod.InstallDir.Own(prod.InstallDir.Own()); bundle_inst_mode_identifier();};
            new_inst_mode_ident.Order = function(){ return 1; }

            prod.RelationSetters().Add("InstallModeIdentifier", new_inst_mode_ident);
            /*
            start_inst_mode_cb = prod.RelationSetters().Item("InstallModeIdentifier");
            prod.RelationSetters().Remove("InstallModeIdentifier");
            prod.RelationSetters().Add("InstallModeIdentifier", install_mode_identifier);
            */
            start_inst_mode_cb = prod.SetRelations;
            prod.SetRelations = install_mode_identifier;
        }

        for(var i in childs)
        {
            var prodnode = childs[i];
            var id = prodnode.attributes.id;
            var config = prodnode.attributes.config;

            Log("Searching product to attach: " + id);
            if(id in ns_inst.Products)
            {
                var pro = ns_inst.Products[id];
                Log("product was found: " + pro.Name());

                var is_clone = (pro.IS && pro.IS.Clone) ? pro.IS.Clone() : null;

                if(is_clone)
                {
                    IS_clones.push(is_clone);
                    is_clone.Action.Subscribe(pro.IS.Action);
                }

                if(pro.MICL && prod.MICL)
                {
                    prod.MICL.Action.Subscribe(pro.MICL.Action);
                }

                if(prod.start && config)
                {
                    StringList.Replace("ConfigDir", FileSystem.AbsPath(Origin.Directory() + ".."));
                    update_product_by_config(pro, FM(config), prod);
                }
                else
                {
                    Log("updating with config wasn't done due to start = " + prod.start + " config = " + config);
                }

                if(pro.start)
                {
                    /*
                    start_inst_mode_cb = pro.RelationSetters().Item("InstallModeIdentifier");
                    pro.RelationSetters().Remove("InstallModeIdentifier");
                    pro.RelationSetters().Add("InstallModeIdentifier", install_mode_identifier);
                    */
                    start_inst_mode_cb = pro.SetRelations;
                    pro.SetRelations = install_mode_identifier;
                }
                else
                {
                    //inst_mode_cb.push(pro.RelationSetters().Item("InstallModeIdentifier"));
                    inst_mode_cb.push(pro.SetRelations);
                    //pro.RelationSetters().Remove("InstallModeIdentifier");
                    //pro.RelationSetters().Add("InstallModeIdentifier", install_mode_identifier);
                    pro.SetRelations = install_mode_identifier;
                }
                //Lock InstalDir for already installed products
                if(pro.ProductState() == pro.state_t.installed)
                {
                    pro.Log("lock installdir from attach_prd");
                    pro.InstallDir.Lock(P(true));
                }
                prod.Features().Add(pro);
            }

            Log("Searching product to attach: " + id + " done");
        }
    }

    this.Product = function(prod, root)
    {
        var ns_inst = base("installer.js").Installer;

        Log("Looking for product to attach");
        if(root.attributes.parent && !prod.start)
        {
            var parent = root.attributes.parent;
            Log("Product to attach: " + parent);

            if(parent in ns_inst.Products)
            {
                var toattach = ns_inst.Products[parent];
                if(toattach)
                    toattach.Features().Add(prod);
            }
        }
        Log("Looking for product to attach done");

        for(var i in IS_clones)
        {
            var sem = action_semafor();

            sem.Action.Subscribe(IS_clones[i].Action);
            prod.Components().Filter(function(cmp){ if(cmp) sem.Add(cmp); });
        }

        for(var i in IS_clones)
        {
            prod.Components().Add(IS_clones[i]); // add installer source component to bundle product
        }
    }
}
