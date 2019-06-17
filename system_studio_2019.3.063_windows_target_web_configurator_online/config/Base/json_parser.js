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
    var json_enabled = GetOpt.Exists("json");
    //###############################################################
    // Returns if JSON is enabled via command line
    //###############################################################
    ns.IsJSONEnabled = function()
    {
        return json_enabled;
    }

    var perform_eval = function(context, eval_str)
    {
        with(context)
        {
            var eval_result = eval(eval_str);
            return eval_result;
        }
    }

    var process_object_or_array = function(input_object, args, callback_processor)
    {
        var type_of_object = Object.prototype.toString.call(input_object); //get type of object
        if(type_of_object == "[object Array]") //it means that the object is an array
        {
            for(var index in input_object) //iterate through all elements of this array
                callback_processor(input_object[index], args); //and process them
        }
        else if(type_of_object == "[object Object]") //if it is an object
            callback_processor(input_object, args); //run processor here
    }

    var filter_features = function(parent_obj, conditions) //this function will return only features which satisfy conditions
    {
        if(!parent_obj || !conditions) return null; //conditions are the string containing something like "current_obj.attributes.required === 'true'"
        var ret_arr = Array();
        for(var index in parent_obj.feature) //search through the array of features
        {
            var current_obj = parent_obj.feature[index]; //select current feature
            if(eval(conditions)) //evaluate input conditions
                ret_arr.push(current_obj); //if it satisfies conditions, push it to return array
        }
        return ret_arr;
    }
    var filter_objects = function(parent_obj_arr, conditions, parent_itself) //this function takes array as parent object
    {
        if(!parent_obj_arr) return null;
        var ret_arr = Array();
        if(conditions.indexOf("attributes") != -1) //if conditions involve attributes
            conditions = "current_obj.attributes && " + conditions; //need to check if object has them
        if(Object.prototype.toString.call(parent_obj_arr) == "[object Object]") //it means that the object is not an array
        {
            var current_obj = parent_obj_arr;
            var ret_obj = null;
            if(conditions)
            {
                var context = {};
                context.current_obj = current_obj;
                if(perform_eval(context, conditions))
                    ret_obj = current_obj;
            }
            else
                ret_obj = current_obj;

            if(ret_obj)
            {
                ns.JSONParserOverload(ret_obj);
                ret_obj.__parent = parent_itself ? parent_itself : current_obj.__parent; //may be undefined
                ret_arr.push(ret_obj); //if it satisfies conditions, push it to return array
            }
        }
        else if(Object.prototype.toString.call(parent_obj_arr) == "[object Array]")
        {
            for(var index in parent_obj_arr) //search through the array of features
            {
                var current_obj = parent_obj_arr[index]; //select current feature
                var ret_obj = null; //this object will be pushed into return array
                if(conditions) //if conditions were passed, evaluate them
                {
                    var context = {};
                    context.current_obj = current_obj;
                    if(perform_eval(context, conditions))
                        ret_obj = current_obj; //if it satisfies conditions, push it to return array
                }
                else //if there are no conditions
                {
                    ret_obj = current_obj;
                }
                if(ret_obj)
                {
                    ns.JSONParserOverload(ret_obj);
                    ret_obj.__parent = parent_itself ? parent_itself : parent_obj_arr[index].__parent; //may be undefined
                    ret_arr.push(ret_obj); //if it satisfies conditions, push it to return array
                }
            }
        }
        return ret_arr;
    }

    var set_parent = function(the_obj, the_parent)
    {
        process_object_or_array(the_obj, the_parent, function(obj, the_parent) {obj.__parent = the_parent});
    }

    var parse_xpath = function(xpath, root)
    {
        var index_str = ""; //index string
        var nodes_str = ""; //part of xpath for nodes
        var index_start_pos = xpath.lastIndexOf("[");
        if(index_start_pos) //index is always included into []
            index_str = xpath.substring(index_start_pos + 1, xpath.lastIndexOf("]"));
        //if "[" was found in the string, it must be cut by this position, if not, by the end
        nodes_str = xpath.substring(0, (index_start_pos > -1) ? index_start_pos : xpath.length);
        index_str = index_str.replace(/ and /g, " && "); //replace all "and" by "&&"
        index_str = index_str.replace(/ or /g, " || "); //and "or" by "||"
        index_str = index_str.replace(/@/g, "attributes."); //@ stands for attribute
        index_str = index_str.replace(/=/g, "=="); //equality is checked with double 'equals' sign
        index_str = index_str.replace(/(^|\s|\()(\w)/g, "$1current_obj.$2"); //need to add object before each word
        index_str = index_str.replace(/\.(\w*-\w*)/g, "[\"$1\"]"); //if attribute contains dash '-' attribute must be enclosed in braces
        /*if(index_str) //little redesign here
        {
            var attrs_str = "";
            if(index_str.indexOf("attributes") != -1) //if conditions involve attributes
                attrs_str = "attributes && "; //need to check if object has them
            index_str = "if(" + attrs_str + index_str + "){true;}else{false;}"; //should be if-statement, otherwise js just crashes
        }*/
        //now we need to parse xpath for nodes

        var current_obj = root;
        //also we must check if all nodes are present here
        var tree_nodes = nodes_str.split("/");
        var eval_str = "current_obj";
        var skip_first_node = false; //if xpath starts with slash, like in /component/environment[@name]
        var eval_res_objs = null; //array of objects which were get by eval of expression
        if(nodes_str.charAt(0) == '/' && nodes_str.charAt(1) == '/') //it means to get all nodes recursively
        {
            //we can run into this situation only for root, root.components.component and root.feature
            //let's consider only these three situations
            nodes_str = nodes_str.slice(2); //omit double slashes
            eval_str += "." + nodes_str; //here must be "current_obj.disabled_descriptions"
            eval_res_objs = []; //let it be an empty array
            var eval_res_root = null;
            var context = {};
            context.current_obj = current_obj;
            var eval_res_root = perform_eval(context, eval_str);
            if(eval_res_root)
            {
                set_parent(eval_res_root, root);
                process_object_or_array(eval_res_root, eval_res_objs, function(obj, res) {res.push(obj)});
            }
            //now current object must be root.feature[index]
            if(root.feature)
            {
                for(var index in root.feature)
                {
                    current_obj = root.feature[index];
                    eval_str = "current_obj." + nodes_str;
                    var eval_res_ftr = eval(eval_str);
                    if(eval_res_ftr)
                    {
                        set_parent(eval_res_ftr, current_obj);
                        process_object_or_array(eval_res_ftr, eval_res_objs, function(obj, res) {res.push(obj)});
                    }
                }
            }
            //yes, this request also exists //component[@alias]
            if(root.components)
            {
                current_obj = root.components;
                eval_str = "current_obj." + nodes_str;
                var eval_res_cmp = eval(eval_str);
                if(eval_res_cmp) //and it is array, no doubt
                {
                    set_parent(eval_res_cmp, current_obj);
                    for(var i in eval_res_cmp)
                        eval_res_objs.push(eval_res_cmp[i]);
                }
            }
            //finally -- root.components.component[index]
            if(root.components && root.components.component)
            {
                for(var index in root.components.component)
                {
                    current_obj = root.components.component[index];
                    eval_str = "current_obj." + nodes_str;
                    var eval_res_cmp = eval(eval_str);
                    if(eval_res_cmp)
                    {
                        set_parent(eval_res_cmp, current_obj);
                        process_object_or_array(eval_res_ftr, eval_res_objs, function(obj, res) {res.push(obj)});
                    }
                }
            }
        }
        else
        {
            if(nodes_str.charAt(0) == '/') //first node must be skipped in that case
                skip_first_node = true; //because root.component doesn't exist, must be root.environment
            //simply because 'root' is 'component' in that case
            for(var current_tree_node in tree_nodes)
            {
                if(tree_nodes[current_tree_node] == "") continue;
                if(skip_first_node && current_tree_node == 1) continue; //btw, must be the first node, not the zeroth
                //because the zeroth node will be empty if the string starts with slash and is splitted by slashes
                if(tree_nodes[current_tree_node] == "*") //it means, retrieve all elements from this node
                {
                    if(Object.prototype.toString.call(eval_res_objs) == "[object Object]") 
                    {
                        eval_res_objs = ns.JSONSelect("*", eval_res_objs);
                    }
                    else if(Object.prototype.toString.call(eval_res_objs) == "[object Array]")//this need to call this method from all elements if it is array
                    {
                        var return_values = [];
                        for(var i in eval_res_objs)
                        {
                            var ret_val = ns.JSONSelect("*", eval_res_objs);
                            process_object_or_array(eval_res_objs, return_values, function(obj, res){res.push(obj)});
                        }
                        eval_res_objs = return_values;
                    }
                }
                else
                {
                    eval_str += "." + tree_nodes[current_tree_node]; //append each node to current object
                    eval_res_objs = eval(eval_str); //check if such node exists
                    if(!eval_res_objs)
                    {
                        return null; //return null if some node from xpath is absent
                    }
                }
            }
        }
        //var current_obj_prefix = (nodes_str.charAt(0) == '.') ? "current_obj" : "current_obj."; //don't add dot if we already have one
        //nodes_str = current_obj_prefix + nodes_str; //here must be valid for evaluation string
        //var eval_res_objs = eval(eval_str); //array of objects which were get by eval of expression
        var ret_cmp = null;
        if(eval_res_objs)
            ret_cmp = filter_objects(eval_res_objs, index_str);
        else
            ret_cmp = null;

        return ret_cmp;
    }
    //###############################################################
    // Returns single node which corresponds to xpath
    //###############################################################
    ns.JSONSingle = function(xpath)
    {
        var ret_cmp = null; //this component will be returned
        if(xpath === "/component[@alias and @type]") //that's a really common querry
            ret_cmp = (this.component.attributes.alias && this.component.attributes.type) ? this.component : null;
        else if(xpath === "feature[@id]")
            ret_cmp = this.feature.filter(function (cmp) {if(cmp.id) return cmp;});
        else if(xpath === "/product[@name and @version and @id]")
            ret_cmp = this.product;
        else if(xpath === "name") //avoiding collision between node.name and subnode <name>
            ret_cmp = this._node_name;
        else if(xpath === "..")
            return this.__parent;
        else
        {
            var ret_arr = parse_xpath(xpath, this);
            if(ret_arr) //we don't need the whole array which parser returns
                ret_cmp = ret_arr[0]; //only the zeroth element
        }
        if(ret_cmp) //if component is found, overload 'single' method again
            ns.JSONParserOverload(ret_cmp); //we're returning container again

        return ret_cmp;
    }
    //###############################################################
    // Returns all nodes which correspond to xpath
    //###############################################################
    ns.JSONSelect = function(xpath, input_obj) //if the 'input_obj' is determined, use it instead of 'this'
    {
        if(!xpath) return null;
        var request_obj = input_obj ? input_obj : this;
        var ret_cmp = []; //this array will be returned
        if(xpath === "..") //select parent
        {
            return request_obj.__parent;
        }
        else if(xpath === "*") //return all subnodes
        {
            for(var sub_node_index in request_obj)
            {
                if(typeof(request_obj[sub_node_index]) == "function" || sub_node_index == "name" || sub_node_index == "__name" || sub_node_index == "_node_name" || sub_node_index == "__parent") continue;
                if(Object.prototype.toString.call(request_obj[sub_node_index]) == "[object Object]") //it means that the object is not array
                {
                    ret_cmp.push(request_obj[sub_node_index]);
                }
                else if(Object.prototype.toString.call(request_obj[sub_node_index]) == "[object Array]")
                {
                    for(var i in request_obj[sub_node_index])
                    {
                        if(typeof(request_obj[sub_node_index][i]) != "string")
                            ret_cmp.push(request_obj[sub_node_index][i]);
                    }
                }
            }
        }
        else
        {
            ret_cmp = parse_xpath(xpath, request_obj);
        }

        if(ret_cmp)
            for(var i in ret_cmp)
                ns.JSONParserOverload(ret_cmp[i]);

        return ret_cmp;
    }
    //###############################################################
    // Returns all subnodes which correspond to xpath
    //###############################################################
    ns.JSONSubnodes = function(xpath)
    {
        var ret_cmp = []; //this array will be returned
        if(xpath === "*")
        {
            for(var component in this) //need to push all child components
            {
                if(typeof(this[component]) == "function" || component == "name" || component == "__name" || component == "_node_name" || component == "__parent") continue;
                ns.JSONParserOverload(this[component]);
                ret_cmp.push(this[component]);
            }
        }
        else
        {
            for(var component in this[xpath]) //need to push all components from this xpath
            {
                ns.JSONParserOverload(this[xpath][component]);
                ret_cmp.push(this[xpath][component]);
            }
        }

        return ret_cmp;
    }
    //###############################################################
    // Adds attribute to current node
    //###############################################################
    ns.JSONAddAttribute = function(attr_name, attr_value)
    {
        this.attributes[attr_name] = attr_value;
        return;
    }
    //###############################################################
    // Overloading JSON objects methods
    //###############################################################
    ns.JSONParserOverload = function(json_object)
    {
        if(!json_object)
        {
            Log("json_parser::JSONParserOverload: input JSON object is empty");
            return null;
        }
        json_object.single = ns.JSONSingle; //what we need is just overload base JSON object
        json_object.select = ns.JSONSelect;
        json_object.subnodes = ns.JSONSubnodes;
        json_object._node_name = json_object.name; //keep it for case when single("name") is requested
        json_object.name = json_object.__name; //and this should be requested as object.name
        json_object.AddAttribute = ns.JSONAddAttribute;
        return json_object; //with 'single' method and return it to caller
    }
    //###############################################################
    // Constructor of JSON parser
    //###############################################################
    ns.JSONParserCreate = function(path)
    {
        if(!path)
        {
            Log("json_parser::JSONParserCreate: path to XML is not specified");
            return null;
        }
        var json_string = XML.GetJSON(path); //this method will return a valid JSON-string
        var json_object = JSON.parse(json_string); //JSON.parse is a built-in method of v8
        ns.JSONParserOverload(json_object); //after that it will be able to call 'single' method
        return json_object;
    }
}
