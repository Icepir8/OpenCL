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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "Base"));};
    var conf = function(name) {return load("ProductConfig/" + name);}

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory());};

    var interface_version = "0.0.0.0";

    var ns = this;

    var ns_version = base("version.js");
    var ns_event   = base("event.js");

    var ns_cmp    = base("component3.js");
    var ns_cmpmsi = base("component_msi3.js");
    var ns_cmpexe = base("component_exe.js");
    var ns_cmpzip = base("component_zip.js");
    var ns_cmpdb  = base("component_db.js");
    var ns_feamap = base("feature_map.js");

    var ns_ftr_inf   = base("feature_info.js");
    var ns_cmp_inf   = base("component_info.js");

    var ns_db_info_product = base("db_info_product.js");
    var ns_db_info_ftr = base("db_info_feature.js");
    var ns_db_info_cmp = base("db_info_component.js");
    var ns_db_info_cmp_micl = base("db_info_component_micl.js");
    var ns_db_info_cmp_is = base("db_info_component_isource.js");
    var ns_db_info_cmp_arp = base("db_info_component_arp.js");
    var ns_cmpcer = base("component_cer.js");
    var ns_json_parser = base("json_parser.js");

    var fm = StringList.Format;
    // path in DB to RestorePoints location
    var rp_hive = "RestorePoint::";

    var current_image;

    var callbacks = {};

    var loaders = {
        msi: function(component_data, node)
        { // create MSI based component
            //var wi_info = ns_info.InfoWI(xml_info.Id());
            //c_info.AddInfo(wi_info); // disabled due to MSI feature processing
            var component = ns_cmpmsi.Create(component_data);
            var pro = component.Processor();
            if(pro && pro.FeatureMap)
            {
                var feamap = ns_feamap.FeatureMap(node);
                if(feamap)
                    pro.FeatureMap(feamap);
            }
            return component;
        },
        exe: function(component_data) {return ns_cmpexe.Create(component_data);},
        zip: function(component_data) {return ns_cmpzip.Create(component_data);},
        db:  function(component_data) {return ns_cmpdb.Create(component_data);},
        cer: function(component_data) {return ns_cmpcer.Create(component_data);}
    };

    //#######################################################
    var pconfig_base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "/ProductConfig/Base"));};

    var ns_icfg = pconfig_base("image_config.js");

    var image_config = ns_icfg ? ns_icfg.ProductImageConfig() : null;

    var FeatureById = function(product, id)
    {
        if(!product || !id)
            return null;

        return product.FilterFeaturesRecursive(function(ftr){ if(ftr.Id() == id) return ftr;});
    }

    var image_from_config = function()
    {
      var node = image_config ? image_config.Node() : null;
      if(node)
      {
          Log("image_from_config " + node.attributes.image);
          return node.attributes.image;
      }
      else
          Log("image_from_config node isn't defined");

      return null;
    }

    var update_root_node_with_config = function(root)
    {
      if(!root)
      {
        Log("update_root_node_with_config: root node isn't defined. Ignore");
        return;
      }

      var node = image_config ? image_config.Node() : null;
      if(node)
      {
        Log("update_root_node_with_config begin");
        for(var i in node.attributes)
        {
          if(!root.attributes[i])
          {
              Log(" setting attr " + i + " with " + node.attributes[i]);
              root.AddAttribute(i, node.attributes[i]);
          }
          else
          {
              Log(" attr " + i + " is already defined in root node. Ignore ");
          }
        }
        Log("update_root_node_with_config done");
      }
    }

    var add_node_attr_into_info = function(node, info)
    {
        // node attributes also need to be stored
        for(var i in node.attributes)
        {
            if(!info.Property(i))
            {
                //Log("Add attribute " + i + " as property into Info val = " + node.attributes[i]);
                info.Property(i, node.attributes[i]);
            }
            else
                Log("Can't add attribute '" + i + "' as property into Info due to property with the same name already exists");
        }
    }

    // load configuration scripts
    var cb_files = FileSystem.FindFiles(FileSystem.AbsPath(Origin.Directory(), "ProductConfig"), "*.js");
    for(var cf in cb_files)
    {
        var cb_file = cb_files[cf];
        Log("Product configuration script: " + cb_file);

        var loader = conf(cb_file);
        if(loader)
        {
            var l_id = loader.Id ? loader.Id() : Guid();
            if(!callbacks[l_id])
            {
                callbacks[l_id] = loader;
                Log(Log.l_debug, "Set product loader: " + l_id);
            }
        }
    }

    var notify = function(attribute, proc)
    {
        for(var i in callbacks)
        {
            if(callbacks[i] && callbacks[i][attribute])
                proc(callbacks[i][attribute]);
        }
    }

    var filter = function(attribute, proc)
    {
        for(var i in callbacks)
        {
            if(callbacks[i] && callbacks[i][attribute])
                if(proc(callbacks[i][attribute]))
                    return true;
        }
        return false;
    }

    var exinit = function(attribute, proc)
    {
        var ev = ns_event.FEvent();
        for(var i in callbacks)
        {
            if(callbacks[i] && callbacks[i][attribute])
            {
                var e = proc(callbacks[i][attribute]);
                if(e)
                    ev.Connect(e);
            }
        }
        return ev.Empty() ? null : ev;
    }

    var iterate = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var load_components = function(dir, prod, node, cache)
    {
        var ns_info = base("component_info.js");
        var ns_src = base("component_source.js");

        ns_src.UseCheckers(prod.UseCheckers);

        var base_url = GetOpt.GetDefault("media-url", node.attributes.url);

        if(base_url)
            Log("Component processing: base url: " + base_url);

        Log("Load component info");
        Log("  media dir: " + dir);
        Log("  cache mode: " + (cache ? "true" : "false"));
        
        var installs = cache ? FileSystem.MakePath("installs", FileSystem.GetTemp()) : FileSystem.MakePath("../installs", Origin.Directory());

        if(cache)
        {
            // create action to clean installs directory after download
            var duf = base("dumper_file.js");
            if(duf)
            {
                var act = duf.Directory();
                act.DelayedRemove(installs);
                act.Skip = function(){return prod.Action() == prod.action_t.remove;};
                var post = prod.PostAction();
                if(post)
                    post.AddAction(act, "Clean installs in Temp");
            }
        }

        filter("Loader", function(cb)
        {
            var ldr = cb(node, prod);
            if(ldr)
            {
                var add = function(l)
                {
                    if(l.type && typeof(l.loader) == "function")
                        loaders[l.type] = l.loader;
                };

                if(ldr instanceof Array)
                    for(var i = 0; i < ldr.length; i++)
                        add(ldr[i]);
                else
                    add(ldr);
            }
        });

        // load XML based information
        var xml_files = {};

        // need to load components from cached folder to cover case when there is another image of this product installed with different components set
        // due to the whole cached product isn't loaded at the installation start any more
        // cached xmls need to be added into xml_files first, then if there is same file in media it will replace the cached one

        if(prod.IS && typeof(prod.IS.TargetDir) == "function")
        {
            var media_cache_folder = FileSystem.MakePath("Media", prod.IS.TargetDir());

            iterate(FileSystem.FindFiles(media_cache_folder, "*.xml"), function(fname)
            {
                if(String(fname).match(/product\.xml/i))
                    return;

                xml_files[fname] = FileSystem.MakePath(fname, media_cache_folder);
            });
        }

        iterate(FileSystem.FindFiles(dir, "*.xml"), function(fname)
        {
            if(String(fname).match(/product\.xml/i))
                return;

            xml_files[fname] = FileSystem.MakePath(fname, dir);
        });

        //var xml_files = FileSystem.FindFiles(dir, "*.xml");
        if(Wizard.Canceled())
            return null;

        Wizard.Notify("splash", "status", StringList.Format("[loading]", "[component_xmls]"));
        var json_enabled = (ns_json_parser && ns_json_parser.IsJSONEnabled());
        if(json_enabled)
            Log("JSON parsing is enabled"); //requested by PV team

        var xml_nodes = []; //here all root nodes of JSON-objects will be stored
        for(var xf in xml_files)
        {
            var n = xml_files[xf];
            Log("loading cmp xml: " + xml_files[xf]);
            if(n) //if this file exists, parse it with JSON or XML
            {
                var parser = json_enabled ? ns_json_parser.JSONParserCreate(n) : XML(n); //depending on whether json is enabled
                xml_nodes.push(parser);
            }
        }

        if(Wizard.Canceled())
            return Action.r_cancel;
        filter("ComponentInfo", function(cb) {cb(xml_nodes, node, prod);}); // allow scripts to modify original components info

        var components = {};
        for(var xn in xml_nodes)
        {
            if(Wizard.Canceled())
                return null;

            var root = xml_nodes[xn]; //JSON object is considered as root node here
            if(root && !filter("FilterInfo", function(cb) {return cb(root, node, prod);}))
            {
                
                var c = root.single("/component[@alias and @type]");
                if(c)
                {
                    var alias = c.attributes.alias;
                    var type = c.attributes.type;
                    var grp = c.attributes.group;
                    var xml_info = null;
                    xml_info = json_enabled ? ns_info.InfoJSONObject(root) : ns_info.InfoXMLNode(root);
                    var name = xml_info.Property("name");
                    var description = xml_info.Property("description");

                    xml_info.Property("name", fm(name));
                    xml_info.Property("description", fm(description));
                    xml_info.Property("from_media", !cache);

                    var component = prod.ComponentsFullSet()[xml_info.Id()];
                    if(!component)
                    {
                        var c_info = ns_info.ComponentInfo();
                        c_info.AddInfo(xml_info);

                        var component_data = {Info: c_info};
                        var exin = exinit("ExInit", function(cb) {return cb(root, node, prod);});
                        if(exin)
                            component_data.ExInit = exin;

                        if(loaders[type])
                            component = loaders[type](component_data, root, node);
                        else
                        { // create EXE or another based component
                            component = ns_cmp.Create(component_data);
                        }

                        // special state processor should be assigned only for components which were created from media
                        // (product.start can't be used due to it will not work for sub products from bundle)
                        // new state manager should be assigned after component creation to have PreviousValue stored for StateManager
                        if(component && prod.LoadMarkers && prod.LoadMarkers.WasCreatedFromMedia && (GetOpt.Exists("download-only") || GetOpt.Exists("download-list")))
                        {
                            Log("create special state manager for download-list and download-only modes");
                            var download_list_state_manager = {};

                            download_list_state_manager.State = function(){ return prod.state_t.absent; };
                            download_list_state_manager.Id = function(){ return "download_list_state_manager";};
                            //component_data.StateManager = download_list_state_manager;
                            //component.
                            component.StateManager(download_list_state_manager);
                        }
                    }

                    if(component)
                    {
                        if(grp)
                            component.AddToGroup(grp);
                        if(!component.SourceNode)
                            component.SourceNode = c;
                        if(component && component.Original() && !component.Original().SourceNode)
                            component.Original().SourceNode = c;
                        
                        var src;

                        if(!component.Source())
                        { // create source object for component
                            src = ns_src.Import(c, installs, base_url);
                            if(src)
                            {
                                Log("Component source created. Attach it to component");
                                component.Source(src);
                                component.SourceFolders().Filter(function(s) {src.AddLocation(s);});
                            }
                            else
                                Log("Can't create component source");
                        }
                        else if(component.Source())
                        {
                            // if componenet was already loaded (for example it is shared component) by another product, need to add additional source location for it.
                            var add_additional_location = function(_dir, _src)
                            {
                                if(_dir && _src && _src.MayBeCached && _src.MayBeCached() && _src.AddLocation)
                                {
                                    _src.Filter(function(source)
                                    {
                                        if(source.AddLocation && typeof(source.AddLocation) == "function")
                                        {
                                            source.AddLocation(_dir);
                                        }
                                    });
                                }
                            }
    
                            var files = c.single("files");
                            if(files)
                            {
                                var locations_list = {};
                                var add_location_to_list = function(nod)
                                {
                                    var n_file = FileSystem.MakePath(nod.text, installs);
                                    var n_dir = FileSystem.Parent(n_file);
                                    locations_list[installs] = 1;
                                    locations_list[n_dir] = 1;
                                }
    
                                src = component.Source();
                                var k = files.single("key");
                                if(k)
                                {
                                    Log("Adding additional component sources location for " + alias + "/" + component.Id());
                                    add_location_to_list(k);
                                    //add_additional_location(k, src);
                                    var s_files = files.select("file");
                                    if(s_files)
                                    {
                                        Log(" Processing other files");
                                        for(var s in s_files)
                                        {
                                            add_location_to_list(s);
                                        }
                                    }
    
                                    for(var loc in locations_list)
                                    {
                                        Log("   Add location " + loc);
                                        add_additional_location(loc, src);
                                        component.SourceFolders().Add(loc);
                                    }
                                }
                                else
                                    Log(Log.l_warning, "Adding additional component sources location: Could not find key file for component: " + component.Id());
                            }
                        }

                        component.SourceFolders().Add(installs);
                        components[alias] = component;
    
                        Log("Component added to scope: alias: " + alias + ", id: " + component.Id());
                    }
                }
            }
        }
        Log("--------------------------------------");
        Log("All components were loaded");
        
        
        for(var cmpnnt in components)
            return components; // in case if at least one element exists in components - return it
        return null; // else return null
    }

    var load_product = function(root, prod, components)
    {
        var ns_prd     = base("product3.js");
        var ns_feature = base("feature3.js");
        var ns_finfo   = base("feature_info.js");

        var import_components = function(feature, node, _components)
        {
            var cmps = node.select("component[@alias]");
            if(cmps && _components)
            {
                for(var c in cmps)
                {
                    var cm = _components[cmps[c].attributes.alias];
                    //if(cm && !cm.Disabled())
                    if(cm)
                    {
                        Log("Component " + cmps[c].attributes.alias + " added to feature " + feature.Name());
                        feature.Components().Add(cm);
                    }
                }
            }
        }

        var import_properties = function(product, node)
        {
            var props = node.select("property[@name]");
            if(props)
            {
                for(var p in props)
                {
                    var nm = props[p].attributes.name;
                    var val = fm(props[p].text);
                    if(nm)
                    {
                        Log("Property " + nm + " (value = '" + val + "') added to product " + product.Name());
                        product.CustomProperties().Value(nm, val);
                    }
                }
            }
        }


        if(root)
        {
            Log("********* Component callback started *************");
            notify("Component", function(cb) {cb(components, root, prod);}); // call callback function to postprocess components
            Log("********* Component callback finished ************");

            import_properties(prod, root);
            import_components(prod, root, components);

            var signed = root.select("components/component[@alias and @signed='true']");
            for(var sg in signed)
            {
                var alias = signed[sg].attributes.alias;
                if(components[alias]) // set attribute to evaluate keyfile signature
                {
                    Log("Signed component: " + alias);
                    if(components[alias].Signed)
                        components[alias].Signed(true);
                }
            }

            var features = root.select("feature[@name and @id]");
            var f_list = {};
            var feat;            
            if(features)
            {
                // create list of features
                for(var _ft in features)
                {
                    var f = features[_ft];
                    var id = f.attributes.id;
                    var name = fm(f.attributes.name);
                    var parent = f.attributes.parent;
                    var prio = f.attributes.priority;
                    var ord = f.attributes.order;
                    var descr = fm(f.attributes.description);
                    var f_version = f.attributes.version ? f.attributes.version : 0;

                    feat = {};
                    var finfo = ns_finfo.InfoPure(id, name, descr, f_version);

                    add_node_attr_into_info(f, finfo);

                    var t_f = FeatureById(prod, id);

                    feat.feature = (typeof(t_f) != "undefined" && t_f) ? t_f : ns_feature.Create(finfo);
                    feat.parent = parent;
                    if(prio)
                        feat.feature.Priority(parseInt(prio));
                    if(ord)
                        feat.feature.Order(parseInt(ord));
                    f_list[id] = feat;
                    Log("Created feature: " + name + " (" + id + "). Parent feature: " + feat.parent);

                    import_components(feat.feature, f, components);
                }

                // link features to product & another features
                for(var _fl in f_list)
                {
                    var F = f_list[_fl];
                    if(F.parent && f_list[F.parent] && f_list[F.parent].feature)
                    {
                        f_list[F.parent].feature.Features().Add(F.feature);
                        Log("Feature " + F.feature.Name() + " was added to parent feature " + F.parent);
                    }
                    else if(F.feature && !F.parent)
                    {
                        prod.Features().Add(F.feature);
                        Log("Feature " + F.feature.Name() + " was added to product");
                    }
                }
            }

            // call callback function to postprocess features
            feat = {};
            for(var j in f_list)
                feat[j] = f_list[j].feature;
            Log("********* Feature callback started *************");
            notify("Feature", function(cb){cb(feat, root, prod);});
            Log("********* Feature callback finished ************");
            
            Log("***********************************************");
            Log("Product " + prod.Id() + " was loaded");
            Log("***********************************************");

            return prod;
        }
    }
    
    var use_checkers = function(prod)
    {
        var online_checkers = prod.Info().Property("online_checkers");
        var offline_checkers = prod.Info().Property("offline_checkers");
        var offline_mode = FileSystem.Exists(FileSystem.MakePath("offline_installation.ind", Origin.Directory()));
        var cb_checkers = function()
        {
            var checkers_array = [];
            //the function returns an array of checkers, only these checkers can be used in check
            //if function returns null - all possible checkers can be used
            if (offline_mode)
            {
                //offline checkers
                if (typeof(offline_checkers) == "undefined") 
                    return null;
                if (String(offline_checkers) == "") 
                    return null;
                checkers_array = offline_checkers.split(",");
                Log(Log.l_debug, "Added offline chekers = " + offline_checkers);
                
            }
            else
            {
                //online checkers
                if (typeof(online_checkers) == "undefined") 
                    return null;
                if (String(online_checkers) == "") 
                    return null;
                checkers_array = online_checkers.split(",");
                Log(Log.l_debug, "Added online chekers = " + online_checkers);
            }    
            return checkers_array;
        }
        return cb_checkers;
    }


    var create_product = function(source, cache)
    {
        Log("Creating product from file: " + source);

        var ns_finfo = base("feature_info.js");
        var ns_prd   = base("product3.js");

        if(FileSystem.Exists(source))
        {
            var json_enabled = (ns_json_parser && ns_json_parser.IsJSONEnabled());
            var src = json_enabled ? ns_json_parser.JSONParserCreate(source) : XML(source);

            if(src)
            {
                var root = src.single("/product[@name and @version and @id]");
                if(root)
                {
                    update_root_node_with_config(root);
                    // get formal product attributes
                    var id = root.attributes.id;
                    var name = fm(root.attributes.name);
                    var arp_name = root.attributes.arp_name ? fm(root.attributes.arp_name) : name;
                    var version = root.attributes.version;
                    var cfg_image = image_from_config();
                    current_image = cfg_image ? cfg_image : (root.attributes.image ? root.attributes.image : id);

                    var descr = fm(root.attributes.description);

                    // create & base configure product
                    var pinfo = ns_finfo.InfoPure(id, name, descr, version);

                    add_node_attr_into_info(root, pinfo);

                    var prod = ns_prd.Create(pinfo);

                    if(!prod.LoadMarkers)
                        prod.LoadMarkers = {};

                    Log("cache = " + cache);
                    if(typeof(cache) == "undefined" || !cache)
                    {
                        prod.LoadMarkers.WasCreatedFromMedia = true;
                        Log("setting image with " + current_image);
                        prod.Image(current_image);
                    }
                    else if(!prod.LoadMarkers.WasCreatedFromMedia)
                    {
                        Log("setting image with " + current_image);
                        prod.Image(current_image);
                    }

                    if(prod.LoadMarkers.WasCreatedFromMedia && (GetOpt.Exists("download-only") || GetOpt.Exists("download-list")))
                    {
                        prod.ProductState = function(){ return prod.state_t.absent; };
                        Log("create special product state manager for download-list and download-only modes");
                    }
                    else
                    {
                        Log("special download-only/download-list state manager is not required");
                    }
                    
                    var installed_display_name = prod.ARP.InstalledProperties().Value("DisplayName");
                    var display_name = installed_display_name ? installed_display_name : arp_name;
                    if (installed_display_name)
                        Log(prod.Name() + ". DisplayName from ARP = " + installed_display_name);

                    prod.IS.AddSource(Origin.Directory());
                    prod.IS.AddSource(Cache.Config());

                    prod.ARP.DisplayName(display_name);
                    prod.ARP.DisplayVersion(version);
                    prod.ARP.Properties().Value("DisplayIcon", FileSystem.MakePath("Icons/micl.ico", prod.IS.TargetDir()));

                    prod.MICL.AddSource(FileSystem.exe_dir + FileSystem.exe_name);
                    prod.MICL.AddSource(FileSystem.exe_dir + "micl.js");

                    var eula_rtf = fm("[eula_rtf]");
                    if(eula_rtf == "")
                        eula_rtf = FileSystem.MakePath("eula.rtf", FileSystem.exe_dir);
                    else
                        eula_rtf = from_config(eula_rtf);

                    prod.MICL.AddSource(eula_rtf);
                    prod.MICL.AddSource(FileSystem.exe_dir, "*.cat");
                    prod.MICL.AddSource(FileSystem.exe_dir, "*.tcat");
                    prod.MICL.AddSource(FileSystem.exe_dir, "*.bin");
                    prod.MICL.AddSource(Cache.Config());
                    prod.MICL.AddSource(Cache.PluginsDir());

                    prod.UseCheckers = use_checkers(prod);
                    Log("Adding image to load: " + current_image);
                    prod.ContentLoaders().Add(current_image, function()
                        {
                            load_product(root, prod, load_components(FileSystem.Directory(source), prod, root, cache));
                            prod.Loaders = callbacks;
                            return true;
                        });
                    // call callback function to postprocess product
                    prod.RelationSetters().Add(current_image, function() 
                    {
                        Log("********* Product callback started *************");
                        notify("Product", function(cb){cb(prod, root, cache);}); 
                        Log("********* Product callback finished ************");
                        return true;
                    });

                    prod.Description(descr);

                    prod.ProductPostProcess = new ns_event.Event();

                    if(root.attributes.visible == "false")
                        prod.TopVisible(false);
                    
                    Log("Product " + prod.Id() + " was created");

                    return prod;
                }
            }
        }
        else
            Log(Log.l_error, "Can't find source file: " + source);
        return null;
    }

    var GetStorageChildsExtractor = function(rp)
    {
        var res = {};
        var func = function(name){ return res[name]; }

        if(!rp)
            return func;

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            childs_string = String(rp.childs_as_string);
        }

        iterate(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                res[arr[0]] = (arr.length > 1) ? arr[1] : null;
        });

        return func;
    }

    var FilterStorageChilds = function(rp, cb)
    {
        var res = {};
        if(!rp || typeof(cb) != "function")
            return;

        var childs_string = "";

        if(typeof(rp) == "string")
        {
            //it is already serialized childs set
            childs_string = rp;
        }
        else
        {
            childs_string = String(rp.childs_as_string);
        }

        iterate(childs_string.split("_child_name_"), function(token)
        {
            if(!token)
                return;

            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                if(cb(arr[0], (arr.length > 1) ? arr[1] : null))
                    return true;
        });
    }

    var load_db_components = function(rp, cb)
    {
        if(!rp)
            return null;

        var cmps = rp("Components");

        FilterStorageChilds(cmps, function(_id)
        {
            //Log("Load db info cmp " + _id);
            var cmp_rp = cmps(_id);
            var db_info = ns_cmp_inf.InfoDB(cmp_rp);

            var cmp_rp_childs = GetStorageChildsExtractor(cmp_rp);

            var cmp = ns_db_info_cmp.Create({Info: db_info});

            if(cmp)
            {
                cmp.StateManager( { State: function(){ return (typeof(cmp_rp_childs("state")) != "undefined" && cmp_rp_childs("state")) ? cmp_rp_childs("state") : cmp.state_t.installed; } } );
            }

            if(typeof(cb) == "function")
            {
                cb(cmp);
            }
        });
    }

    var load_db_features = function(rp, cb)
    {
        if(!rp)
            return null;

        var ftrs = rp("Features");

        FilterStorageChilds(ftrs, function(id)
        {
            var db_info = ns_ftr_inf.InfoDB(ftrs(id));
            var ftr = ns_db_info_ftr.Create(db_info);

            load_db_components(ftr.RestorePointObj(), function(icmp){ if(icmp) ftr.Components().Add(icmp); });
            load_db_features(ftr.RestorePointObj(), function(iftr){ if(iftr) ftr.Features().Add(iftr); });

            if(typeof(cb) == "function")
            {
                cb(ftr);
            }
        });
    }
    //##############################################################
    // CreateProductFromDB
    // Creates DBInfoProduct object base on info stored in DB
    //##############################################################
    var CreateProductFromDB = function(product_id, config_location)
    {
        var prd_db = Storage("*");
        prd_db.Read(rp_hive + product_id);
        /*
        filter("StateManager", function(cb)
        {
            var st_mngr = cb();
            if(st_mngr)
            {
                var add = function(stm)
                {
                    if(stm.type && typeof(stm.) == "function")
                        state_managers[stm.type] = stm.loader;
                };

                if(st_mngr instanceof Array)
                    iterate(st_mngr, function(stm){ add(stm); });
                else
                    add(st_mngr);
            }
        });
        */
        //Log("creating dbinfo product " + product_id);
        var db_info = ns_ftr_inf.InfoDB(prd_db);
        var prd = ns_db_info_product.Create(db_info);

        if(!prd)
        {
            Log("Failed to create DBInfo product " + product_id);
            return;
        }

        var arp_rp = prd_db("ARP");
        if(arp_rp)
        {
            var arp_db_info = ns_cmp_inf.InfoDB(arp_rp);
            prd.ARP = ns_db_info_cmp_arp.Create({Info: arp_db_info});
        }

        var is_rp = prd_db("IS");
        if(is_rp)
        {
            var is_db_info = ns_cmp_inf.InfoDB(is_rp);
            prd.IS = ns_db_info_cmp_is.Create({Info: is_db_info});
        }

        var micl_rp = prd_db("MICL");
        if(micl_rp)
        {
            var micl_db_info = ns_cmp_inf.InfoDB(micl_rp);
            prd.MICL = ns_db_info_cmp_micl.Create({Info: micl_db_info});
        }

        prd.ContentLoaders().Add(Guid(), function()
                        {
                            load_db_components(prd.RestorePointObj(), function(icmp){ if(icmp) prd.Components().Add(icmp); });
                            load_db_features(prd.RestorePointObj(), function(iftr){ if(iftr) prd.Features().Add(iftr); });

                            notify("DBInfoComponent", function(cb){cb(prd.ComponentsFullSet(), prd, prd_db);});

                            return true;
                        });
        prd.RelationSetters().Add(Guid(), function() { notify("DBInfoProduct", function(cb){cb(prd, prd_db);}); /*DumpFeatures(prd);*/ return true;});
    }
    //##############################################################
    this.ProductFromMedia = function(cache)
    {
        Log("product_content::" + (cache ? "ProductFromCache" : "ProductFromMedia"));
        var media = FileSystem.MakePath("Media", Origin.Directory());
        var config = FileSystem.MakePath("product.xml", media);
        Log("Creating product based on config file: " + config);
        return create_product(config, cache);
    }

    this.ProductFromCache = function()
    {
        return ns.ProductFromMedia(true);
    }

    this.ProductFromDB = function(product_id, config_location)
    {
        Log("ProductFromDB start");
        return CreateProductFromDB(product_id, config_location);
    }

    this.SetImage = function(prod)
    {
        prod.Image(current_image ? current_image : prod.Id());
    }
}
