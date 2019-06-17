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

    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns_version = load("version.js");

    var info_log = GetOpt.Exists("log-info") ? (ALog ? ALog : Log) : function(){};

    var transform_code = {
        "ProductCode":"id",
        "DisplayName":"name",
        "ProductName":"name",
        "DisplayVersion":"version",
        "ProductVersion":"version",
        "Description":"description",
        "UpgradeCode":"upgrade"
    };

    var transform_property = function(id)
    {
        if(id)
        {
            if(transform_code[id])
                return transform_code[id];
        }

        return null;
    }

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var Info = function()
    {
        var info = {};

        var properties = {};
        var actual = false;
        var priority = 0;

        info.Property = function(name, value)
        {
            if(name)
            {
                if(arguments.length > 1)
                {
                    properties[name] = value;
                    info_log(Log.l_debug, "  Info: property " + name + " = " + value);
                }
                else
                    return properties[name];
            }
        }

        info.Properties = function() {return properties;}

        info.Actual = function(act)
        {
            if(arguments.length)
                actual = act;
            else
                return actual;
        }

        info.Priority = function(p)
        {
            if(arguments.length)
                priority = p;
            else
                return priority;
        }

        info.Id = function() {return info.Property("id");}
        info.Name = function() {return info.Property("name");}
        info.Version = function() {return info.Property("version");}
        info.Description = function() {return info.Property("description");}
        info.Size = function()
        {
            var s = info.Property("size");
            if(s)
                return parseInt(s);
            return 0;
        }

        info.GetInfo = function(){ return info; }

        info.Copy = function()
        {
            var inf = Info();
            inf.Actual(actual);
            inf.Priority(priority);

            var iproperties = inf.Properties();
            var pro = info.Properties();
            for(var i in pro)
                iproperties[i] = pro[i];

            return inf;
        }

        return info;
    }

    var guid_table = [8, 4, 4, 4, 12];
    var code_table = [8, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2];

    var reverse = function(original)
    {
        var reversed = "";
        for(var i = original.length - 1; i >= 0; i--){
            reversed += original.charAt(i);
        }
        return reversed;
    }

    var encode = function(_guid, format)
    {
        var guid = _guid;
        guid = guid.replace(/[\{\}\-]/g, "");
        var result = "";
        var position = 0;
        for(var i = 0; i < code_table.length; i++)
        {
            var chunk = guid.substr(position, code_table[i]);
            result += reverse(chunk);
            position += code_table[i];
        }

        if(format === true)
        {
            position = 0;
            var _result = [];
            for(var j = 0; j < guid_table.length; j++)
            {
                var _chunk = result.substr(position, guid_table[j]);
                _result.push(_chunk);
                position += guid_table[j];
            }
            result = "{" + _result.join("-") + "}";
        }

        return result;
    }

    var InfoRegistryBased = function(id)
    {
        if(id)
        {
            var product_entry = Registry("HKLM", "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Installer\\UserData\\S-1-5-18\\Products\\" + encode(id) + "\\InstallProperties");
            product_entry.WowRedirect(false);
            if(product_entry.Exists())
            {
                info_log("InfoRegistryBased found entry");
                var info = Info();

                var size_calculated = false;
                var original_size = info.Size;

                info.Size = function()
                {
                    if(!size_calculated)
                    {
                        size_calculated = true;
                        var size = product_entry.Value("EstimatedSize");
                        if(typeof size == "string" && size != "" && size.match(/^\d+$/)){
                            info.Property("size", parseInt(size));
                        }
                        else{
                            info_log("InfoRegistryBased failed to find field EstimatedSize will use 0");
                            info.Property("size", 0);
                        }
                    }

                    return original_size();
                }

                var query = product_entry.Values();

                info.Property("id", id);
                info.Property("ProductCode", id);

                var fields = ["DisplayName", "DisplayVersion", "Publisher"]

                for(var i in fields)
                {
                    info.Actual(true);
                    var name = fields[i];

                    if(query.indexOf(name) == -1){
                        info_log(Log.l_warning, "InfoRegistryBased failed to find field: " + name);
                        return null;
                    }

                    var passed_validation = true;
                    var value = product_entry.Value(name);

                    if(!(typeof value == "string" && value != "")){
                        passed_validation = false;
                    }

                    switch(name)
                    {
                        case "Publisher":
                            if(!value.match(/intel/i)){
                                passed_validation = false;
                            }
                            break;
                        case "DisplayVersion":
                            if(!(value.match(/^(\d+)(\.\d+){2,3}$/) && ns_version.Version(value).gt("0.0.0.0"))){
                                passed_validation = false;
                            }
                            break;
                        default:
                            break;
                    }

                    if(!passed_validation){
                        info_log(Log.l_warning, "InfoRegistryBased failed to validate field: " + name + ", with value: " + value);
                        return null;
                    }

                    info_log(Log.l_info, "InfoRegistryBased name: " + name + " value: " + value);

                    info.Property(name, value);
                    var tr = transform_property(name);
                    if(tr)
                        info.Property(tr, value);
                }
                return info;
            }
            else
            {
                info_log(Log.l_warning, "InfoRegistryBased: could not query info from registry");
            }
        }
        else
        {
            info_log(Log.l_warning, "InfoRegistryBased: bad id passed");
        }

        return null;
    }

    this.InfoPure = function(id, nm, dscr, vr, sz)
    {
        if(!id)
            return null;

        var info = Info();
        var iproperties = info.Properties();

        iproperties["id"] = id;
        iproperties["name"] = nm ? nm : id;
        iproperties["description"] = dscr;
        iproperties["version"] = vr;
        iproperties["size"] = sz;

        return info;
    }

    this.InfoXML = function(path)
    {
        info_log(Log.l_debug, "Processing XML component info file: " + path);
        if(path && FileSystem.Exists(path))
        {
            var xml = XML(path);
            if(xml)
                return ns.InfoXMLNode(xml);
        }
        return null;
    }

    this.InfoXMLNode = function(node)
    {
        if(node)
        {
            var nodes = node.select("property[@name]");
            if(nodes && nodes.length)
            {
                var info = Info();
                info.Priority(100);

                var iproperties = info.Properties();
                for(var i0 in nodes)
                {
                    info.Actual(true);

                    var n = nodes[i0];
                    var name = n.attributes.name;
                    var value = n.text;
                    iproperties[name] = value;
                    var tr = transform_property(name);
                    if(tr && !iproperties[tr])
                        iproperties[tr] = value;
                }

                // node attributes also need to be stored
                for(var i1 in node.attributes)
                {
                    if(!iproperties[i1])
                    {
                        //info_log("Add attribute " + i1 + " as property into Info val = " + node.attributes[i1]);
                        iproperties[i1] = node.attributes[i1];
                    }
                    //else
                        //info_log("Can't add attribute " + i1 + " as property into Info due to proeprty with the same name already exists");
                }
                return info;
            }
            else
                info_log(Log.l_warning, "InfoXML: no info (or incorrect format)");
        }

        return null;
    }

    this.InfoJSONObject = function(node)
    {
        if(node)
        {
            //var nodes = node.select("property[@name]");
            var nodes = node.component.property;
            if(nodes && nodes.length)
            {
                var info = Info();
                info.Priority(100);

                var iproperties = info.Properties();
                for(var i0 in nodes)
                {
                    info.Actual(true);

                    var n = nodes[i0];
                    var name = n.attributes.name;
                    var value = n.text;
                    iproperties[name] = value;
                    var tr = transform_property(name);
                    if(tr && !iproperties[tr])
                        iproperties[tr] = value;
                }

                // node attributes also need to be stored
                for(var i1 in node.component.attributes)
                {
                    if(!iproperties[i1])
                    {
                        //Log("Add attribute " + i1 + " as property into Info val = " + node.component.attributes[i1]);
                        iproperties[i1] = node.component.attributes[i1];
                    }
                    //else
                        //Log("Can't add attribute " + i1 + " as property into Info due to proeprty with the same name already exists");
                }
                return info;
            }
            else
                Log(Log.l_warning, "InfoXML: no info (or incorrect format)");
            /*
            var nodes = node.component.property;
            if(nodes && nodes.length)
            {
                var info = Info();
                info.Priority(100);

                for(var i0 in nodes)
                {
                    info.Actual(true);

                    var n = nodes[i0];
                    var name = n.attributes.name;
                    var value = n.text;
                    info.Property(name, value);
                    var tr = transform_property(name);
                    if(tr && !info.Property(tr))
                        info.Property(tr, value);
                }

                // node attributes also need to be stored
                for(var i1 in node.component.attributes)
                {
                    if(!info.Property(i1))
                    {
                        Log("Add attribute " + i1 + " as property into Info val = " + node.component.attributes[i1]);
                        info.Property(i1, node.component.attributes[i1]);
                    }
                    else
                        info_log("Can't add attribute " + i1 + " as property into Info due to proeprty with the same name already exists");
                }
                return info;
            }
            else
                Log("InfoXML: no info (or incorrect format)");//info_log(Log.l_warning, "InfoXML: no info (or incorrect format)");
            */
        }

        return null;
    }

    var InfoWIBased = function(msi)
    {
        if(msi)
        {
            var query = msi.Query("select * from Property");
            if(query && query.length)
            {
                var info = Info();

                var iproperties = info.Properties();
                var size_calculated = false;
                var original_size = info.Size;

                info.Size = function()
                {
                    if(!size_calculated)
                    {
                        size_calculated = true;
                        var squery = msi.Query("select FileSize from File");
                        if(squery && squery.length)
                        {
                            var size = 0;
                            for(var i in squery)
                                size += parseInt(squery[i].FileSize);
                            iproperties["size"] = size;
                        }
                    }

                    return original_size();
                }

                for(var i in query)
                {
                    info.Actual(true);

                    var record = query[i];

                    var name = record.Property;
                    var value = record.Value;

                    iproperties[name] = value;
                    var tr = transform_property(name);
                    if(tr)
                        iproperties[tr] = value;
                }
                return info;
            }
            else
                info_log(Log.l_warning, "InfoWindowsInstaller: could not execute query");
        }
        else
            info_log(Log.l_warning, "InfoWindowsInstaller: could not process MSI database");

        return null;
    }

    this.InfoMSI = function(path)
    {
        if(path && FileSystem.Exists(path))
        {
            var msi = MSIDatabase(path);
            if(msi)
            {
                var info = InfoWIBased(msi);
                if(info)
                    info.Priority(50);
                return info;
            }
            else
                info_log(Log.l_warning, "InfoMSI: could not open MSI database: " + path);
        }
        else
            info_log(Log.l_warning, "InfoMSI: file doesn't exists: " + path);

        return null;
    }

    this.InfoWI = function(id)
    {
        if(id)
        {
            var msi = WI.Product(id);
            if(msi)
            {
                var info = InfoWIBased(msi);
                if(info)
                    info.Priority(0);
                return info;
            }
            else
                info_log(Log.l_warning, "InfoWI: could not open product database: " + id);
        }

        return null;
    }
    //###############################################################
    var GetStorageChildsExtractor = function(rp)
    {
        var res = {};
        var func = function(name){ return res[name]; }

        if(!rp)
            return func;

        if(typeof(rp.GetChildsAsStringFromPath) != "function")
        {
            func = function(name){ return rp(name).value; }
        }

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

        filter(childs_string.split("_child_name_"), function(token)
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
            if(typeof(rp.GetChildsAsStringFromPath) == "function")
            {
                // storage binding supports childs serialization
                childs_string = String(rp.childs_as_string);
            }
            else
            {
                // storage binding doesn't supports childs serialization
                filter(rp.childs, function(name)
                {
                    if(cb(name, rp(name).value))
                        return true;
                });

                return;
            }
        }

        filter(childs_string.split("_child_name_"), function(token)
        {
            var arr = String(token).split("_child_value_");
            if(arr && arr[0])
                if(cb(arr[0], (arr.length > 1) ? arr[1] : null))
                    return true;
        });
    }
    //###############################################################

    var get_childs_as_string_exists = "undefined";

    var GetChildsAsStringFromPath = function(rp, path)
    {
        if(!rp || !path || typeof(path) == "undefined")
            return "";

        if(get_childs_as_string_exists == "undefined")
            get_childs_as_string_exists = typeof(rp.GetChildsAsStringFromPath) == "function" ? true : false;

        return get_childs_as_string_exists ? rp.GetChildsAsStringFromPath(path) : rp(path);
    }
    //###############################################################
    this.InfoDB = function(db_restore_point)
    {
        var rp = null;
        if(typeof(db_restore_point) == "string")
        {
            //need to load rp
            rp = Storage("*");
            rp.Read(db_restore_point);
        }
        else
        {
            // restore point storage was provided
            rp = db_restore_point;
        }

        if(rp)
        {
            var info = Info();
            info.Priority(100);

            var childs = GetStorageChildsExtractor(rp);
            var iproperties = info.Properties();

            iproperties["id"] = childs("id");
            iproperties["name"] = childs("name");
            iproperties["description"] = childs("description");
            iproperties["version"] = childs("version");
            iproperties["type"] = childs("obj_type");
            iproperties["size"] = 0;

            info.RestorePointObj = rp;

            FilterStorageChilds(GetChildsAsStringFromPath(rp, "Info"), function(name, val)
            {
                //Log("info name = " + name + " val = " + val);
                //info.Property(name, pinfo(name).value);
                iproperties[name] = val;
                //cmp.Info().Property(name, pinfo(name).value);
            });

            //Log("load cmp info from DB done");

            return info;
        }
        return null;
    }

    this.InfoWIRegistry = function(id)
    {
        if(id)
        {
            var info_registry = InfoRegistryBased(id);
            if(info_registry !== null)
            {
                info_registry.Priority(0);
                return info_registry;
            }

            info_log(Log.l_warning, "InfoWIRegistry: failed to find product info in registry for: " + id);

            var msi = WI.Product(id);
            if(msi)
            {
                var info = InfoWIBased(msi);
                if(info)
                    info.Priority(0);
                return info;
            }
            else
                info_log(Log.l_warning, "InfoWIRegistry: could not open product database: " + id);
        }

        return null;
    }

    this.ComponentInfo = function()
    {
        var info = {};
        var sources = [];

        info.AddInfo = function(src)
        {
            if(src)
            {
                info_log("Adding info");
                sources.push(src);
            }
        }

        info.GetInfo = function()
        {
            sources.sort(function(a, b)
                {
                    var p1 = (a && a.Priority) ? a.Priority() : 0;
                    var p2 = (b && b.Priority) ? b.Priority() : 0;
                    return p1 < p2 ? -1 : (p1 > p2 ? 1 : 0);
                });

            for(var i in sources)
            {
                var s = sources[i];
                if(s && s.Actual && s.Actual())
                    return s;
            }

            info_log(Log.l_debug, "ComponentInfo: could not find any actual info object");
            return null;
        }

        return info;
    }
}
