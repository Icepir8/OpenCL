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

    var fm = StringList.Format;
    var ns_enums     = load("enums.js");
    var ns_pb        = load("parse_bool.js");

    //###############################################################
    // object for validating destination folder
    //###############################################################
    this.PathChecker = function(destination)
    {
        var path = destination;
        var destination_space_required = 0;
        
        var custom_path_checkers = {};

        var f = function(dst){path = dst;}

        ns_enums.BindTo(f);

        var error_mes = "";
        var error_code = f.target_path_error_t.ok;

        f.Log = GetOpt.Exists("path-checker-log") ? log_helper("PathChecker: ") : function() {};
        
        f.AddCustomChecker = function()
        {
            var args = arguments;

            var id = null;
            var obj = null;

            if(args.length == 2)
            {
                obj = args[0];
                id = args[1];
            }
            else if(args.length == 1)
            {
                obj = args[0];
                id = obj.Id ? ( typeof(obj.Id) == "function" ? obj.Id() : obj.Id) : (obj.id ? obj.id : null);
            }
            else if(args.length > 2)
            {
                f.Log("AddCustomChecker: too many arguments for function call (> 2). Ignore.");
                return;
            }
            
            if(!id)
            {
                id = Guid();
                obj.Id = id;
            }

            if(!custom_path_checkers[id])
            {
                custom_path_checkers[id] = obj;
                f.Log("AddCustomChecker: add checker " + id);
            }
        }

        f.ErrorMessage = function(mes)
        {
            if(typeof(mes) == "undefined")
                return error_mes;

            error_mes = mes;
        }

        f.ErrorCode = function(code)
        {
            if(typeof(code) == "undefined")
                return error_code;

            error_code = code;
        }

        var set_error = function(code, mes)
        {
            f.ErrorCode(code);
            f.ErrorMessage(mes);
        }

        f.SpaceRequired = function(val)
        {
            if(val)
            {
                destination_space_required = val;
            }
            else if(typeof(destination_space_required) == "function")
                return destination_space_required();

            return destination_space_required;
        }

        f.SpaceAvailable = function()
        {
            return FileSystem.FreeSpace(path);
        }

        f.IsValid = function()
        {
            f.Log("path to check: " + path);

            if(!path || path.length < 3 || !FileSystem.IsAbsolute(path))
            {
                set_error(f.target_path_error_t.incorrect_path, fm("[path_not_absolute]"));
                return false;
            }

            if(path.match(/[<>"?*|]/))
            {
                set_error(f.target_path_error_t.incorrect_path, fm("[path_contains_incorrect_symbols]"));
                return false;
            }

            if(FileSystem.IsNetwork(path) && path.match(/[:]/))
            {
                set_error(f.target_path_error_t.incorrect_path, fm("[network_path_contains_colon]"));
                return false;
            }

            if(path.split(":").length > 2)
            {
                set_error(f.target_path_error_t.incorrect_path, fm("[path_contains_more_than_one_colon]"));
                return false;
            }

            var required = f.SpaceRequired();

            if(FileSystem.IsNetwork(path))
            {
                set_error(f.target_path_error_t.space_unknown, fm("[space_unknown_plain_message]", required, "[unknown]"));
            }
            else
            {
                if(path.length > 245)
                {    
                    set_error(f.target_path_error_t.path_long, fm("[path_too_long]"));
                    return false;
                }

                else if(!FileSystem.IsWritable(path))
                {
                    set_error(f.target_path_error_t.access_denied, fm("[path_not_writable]"));
                    return false;
                }

                var avail = f.SpaceAvailable();
                if(!avail)
                {
                    set_error(f.target_path_error_t.space_unknown, fm("[space_unknown_plain_message]", required, "[unknown]"));
                    return false;
                }

                if(required > avail)
                {
                    set_error(f.target_path_error_t.no_enough_space, fm("[space_failed_plain_message]", required, avail));
                    return false;
                }
                else
                {
                    set_error(f.target_path_error_t.ok, fm("[space_required_plain_message]", required, avail));
                }
            }

            for(var i in custom_path_checkers)
            {
                var checker = custom_path_checkers[i];
                f.Log("IsValid: run checker " + checker.Id);
                if(!checker(path))
                {
                    var msg = checker.Msg ? ( typeof(checker.Msg) == "function" ? checker.Msg() : checker.Msg) : fm("[incorrect_path]");
                    set_error(f.target_path_error_t.incorrect_path, msg);
                    return false;
                }
            }

            return true;
        }

        return f;
    }
}
