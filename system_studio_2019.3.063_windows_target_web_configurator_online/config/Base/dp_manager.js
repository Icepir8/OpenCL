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
    var _instance;

    const LIMIT_NOT_APPLICABLE = -1;
    const SERIAL_NUMBER_LIMIT = 13;

    var params_limits = { "eula" : { 
                              "min" : Math.min("accept".length, "reject".length),
                              "max" : Math.max("accept".length, "reject".length) 
                          },
                          "update" : {
                              "min" : Math.min("no".length, "always".length, "coexist".length),
                              "max" : Math.max("no".length, "always".length, "coexist".length)
                          },
                          "intel_sw_improvement_program_consent" : {
                              "min" : Math.min("yes".length, "no".length),
                              "max" : Math.max("yes".length, "no".length)
                          },
                          "locale" : {
                              "min" : Math.min("1033".length, "1041".length), 
                              "max" : Math.max("1033".length, "1041".length)
                          },
                          "sn" : {
                              "min" : SERIAL_NUMBER_LIMIT,
                              "max" : SERIAL_NUMBER_LIMIT
                          },
                          "components" : {
                              "min" : LIMIT_NOT_APPLICABLE, 
                              "max" : LIMIT_NOT_APPLICABLE
                          },
                          "finstall" : {
                              "min" : LIMIT_NOT_APPLICABLE, 
                              "max" : LIMIT_NOT_APPLICABLE
                          },
                          "fremove" : {
                              "min" : LIMIT_NOT_APPLICABLE, 
                              "max" : LIMIT_NOT_APPLICABLE
                          } }

    function check_parameter_length(name, value)
    {
        // check maximum and minimum length of parameters passed
        var aMaxLimit = 260; //default max limit for parameters length - MAX_PATH
        var aMinLimit = 0; //default min limit for parameters length

        if (params_limits.hasOwnProperty(name)) //get specific limits if any
        {
            aMinLimit = params_limits[name].min;
            aMaxLimit = params_limits[name].max;
        }

        if (aMaxLimit != LIMIT_NOT_APPLICABLE && value.length > aMaxLimit)
        {
            Log("Property: " + name + " has too long value = " + value + ". The length should not be more than " + aMaxLimit + " symbols. Skip it...");
            return false;
        }
        else if (aMinLimit != LIMIT_NOT_APPLICABLE && value.length < aMinLimit)
        {
            Log("Property: " + name + " has too short value = " + value + ". The length should not be less than " + aMinLimit + " symbols. Skip it...");
            return false;
        }
        else
        {
            return true;
        }
    }
    
    function DPManager(_options)
    {
        var options = _options ? _options : {};
     
        var config_file = options.config_file || FileSystem.MakePath("config.xml" , Origin.Directory() + "/../..");
        var handlers = [];
        
        this.SetConfig = function(config)
        {
            Log("DPManager::SetConfig: " + config);
            var dir = FileSystem.Parent(config);
            var filename = FileSystem.FileName(config);
            if(FileSystem.IsDirectory(dir) && filename)
            {
                config_file = config;
                Log("Set configurtion file: " + config_file);
                return true;
            }
            else if(filename)
            {
                config_file =  FileSystem.MakePath(filename , Origin.Directory() + "/../..");
                Log("Set configurtion file: " + config_file);
                return true;
            }
            return false;
        }
        
        this.AddHandler = function()
        {
            // arguments: id, serialize_cb, deserialize_cb
            if (arguments < 3 || 
                typeof arguments[0] != "string" ||
                typeof arguments[1] != "function" ||
                typeof arguments[2] != "function")
            {
                Log("DPManager:AddHandler: Invalid function parameters");
                return;
            }
            
            for(var v in handlers)
            {
                if (v.id == arguments[0])
                {
                    Log("DPManager::AddHandler: handler with id'" + v.id + "'is already exist.");
                    return;
                }
            }
            var handler = {
                "id": arguments[0],
                "serialize_cb": arguments[1],
                "deserialize_cb": arguments[2]
            };
            
            handlers.push(handler);
            Log("DPManager::AddHandler: added" + JSON.stringify(handler));
            return handler;
        };
        
        this.Serialize = function()
        {
            //Save to config file
            var root = XML.Create("config");
            var json_config = {};
            for(var v in handlers)
            {
                var set = handlers[v].serialize_cb();
                var vend_node = root.AddChild("handler");
                vend_node.AddAttribute("id", handlers[v].id);
                for(var key in set)
                {
                    if (set.hasOwnProperty(key))
                    {
                        var prop = vend_node.AddChild("property");
                        var attr_name = prop.AddAttribute("name", key);
                        var attr_value = prop.AddAttribute("value", set[key]);
                    }
                }
                Log("Serialize: vendor '" + handlers[v].id + "' set = " + JSON.stringify(set));
            }
            return root.Export(config_file);
        }
        
        this.Deserialize = function()
        {
            //Load config file
            Log("Load config from a file: " + config_file);
            if(FileSystem.Exists(config_file))
            {
                var data = XML.Parse(FileSystem.ReadFileUTF8(config_file, true));
                if(data)
                {
                    var nodes = data.select("/config/handler");
                    if(nodes && nodes.length)
                    {
                        for(var i in nodes)
                        {
                            var node = nodes[i];
                            Log("Handler: " + node.attributes.id);
                            if(node)
                            {
                                var properties = node.subnodes("*");
                                var prop_set = {};
                                if(properties && properties.length)
                                {
                                    for(var jp in properties)
                                    {
                                        var name = properties[jp].attributes.name;
                                        var value = properties[jp].attributes.value;
                                        if (check_parameter_length(String(name), String(value)))
                                        {
                                            prop_set[name] = value;
                                            Log("Property: " + name + " = " + value);
                                        }
                                    }
                                }
                                //find handler
                                for(var jh in handlers)
                                {
                                    if (handlers[jh].id.toUpperCase() === node.attributes.id.toUpperCase())
                                    {
                                        //call deserialize callback
                                        handlers[jh].deserialize_cb(prop_set);
                                    }
                                }
                            }
                        }
                    }
                    return true;
                }
            }
            return false;
        }
    }
    
    return function()
    {
        if ( !this._instance ) {
           this._instance = new DPManager();
        }
        return this._instance;
    }();
}