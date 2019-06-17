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
    
    this.TypeName = function(){ return "object_version";}

    this.Version = function(_iver, _delim)
    {
        var obj_type = ns.TypeName();

        var delim;
        var iver;
        
        if(typeof(_delim) == "undefined" || !_delim)
            delim = /\D+/;
        else 
            delim = _delim;

        if(typeof(_iver) == "undefined" || !_iver)
            iver = "0.0.0.0";
        else 
            iver = _iver;

        var version_string = iver;
        var ver = {};

        var major = 0;
        var minor = 0;
        var revision = 0;
        var build = 0;
        var spl;

        if(iver instanceof Array)
            spl = iver;
        else if(typeof(iver) == "string")
            spl = iver.replace(/(^\D+)|(\D+$)/g, "").split(delim, 4);
        else
            return iver;

        if(spl.length > 0)
            major = parseInt(spl[0]);
        if(spl.length > 1)
            minor = parseInt(spl[1]);
        if(spl.length > 2)
            revision = parseInt(spl[2]);
        if(spl.length > 3)
            build = parseInt(spl[3]);

        ver.Major = function() {return major;}
        ver.Minor = function() {return minor;}
        ver.Revision = function() {return revision;}
        ver.Build = function() {return build;}
        ver.Str = function() {return version_string;}
        ver.Array = function() {return [major, minor, revision, build];}

        ver.IsNULL = function()
        {
            return major == 0 && minor == 0 && revision == 0 && build == 0;
        }
        
        ver.ObjType = function() { return obj_type; }

        var to_version = function(v)
        {
            if(!v.ObjType || v.ObjType() != obj_type)
                return ns.Version(v, delim);
            return v;
        }

        ver.gt = function(_v)
        {
            if(!_v) 
                return !ver.IsNull();

            var v = to_version(_v);

            var v1 = ver.Array();

            var v2 = v.Array ? v.Array() : [v.Major(), v.Minor(), v.Revision(), v.Build()];
            
            for(var i = 0; i < v1.length && i < v2.length; i++)
                if(v1[i] > v2[i])
                    return true;
                else if(v1[i] < v2[i])
                    return false;

            return false;
        }

        ver.eq = function(_v)
        {
            if(!_v)
                return ver.IsNull();

            var v = to_version(_v);

            var v1 = ver.Array();
            var v2;
            if(v.Array)
                v2 = v.Array();
            else
                v2 = [v.Major(), v.Minor(), v.Revision(), v.Build()];
            
            for(var i = 0; i < v1.length && i < v2.length; i++)
                if(v1[i] != v2[i])
                    return false;

            return true;
        }

        ver.ge = function(v)
        {
            return ver.gt(v) || ver.eq(v);
        }

        ver.lt = function(v)
        {
            return !ver.eq(v) && !ver.gt(v);
        }

        ver.le = function(v)
        {
            return ver.lt(v) || ver.eq(v);
        }

        ver.Format = function(_concat)
        {
            var concat = _concat ? _concat : ".";
            return major.toString() + concat + minor.toString() + concat + revision.toString() + concat + build.toString();
        }

        if(iver instanceof Array)
            version_string = ver.Format();

        return ver;
    }
}



