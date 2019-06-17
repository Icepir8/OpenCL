
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

(function()
{
    var abspath = FileSystem.AbsPath;

    var load = function(name) {return required(abspath(Origin.Directory(), name));};
    var base = function(name) {return load("../Base/" + name);};

    var ns_download = base("dumper_download.js");
    var ns_info     = base("component_info.js");

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var legaprop = function(alias) {return "dycon.legacy." + alias;};

    var fresh = {};
    var legacy = {};
    var legalias = {};

    if(GetOpt.Get("disable-dycon"))
        return;

    return {ComponentInfo: function(infos, root, prod)
    {
        var dyconpath = GetOpt.Get("dycon-file");
        var res = dyconpath && FileSystem.Exists(dyconpath);
        if(!res)
        {
            var download = ns_download.Download();
            var url = GetOpt.GetDefault("dycon-url", prod.Info().Property("dycon-url"));
            if(url)
            {
                download.Url(url);
                dyconpath = abspath(FileSystem.GetTemp(), Guid());
                download.File(dyconpath);
                //Wizard.Notify("splash", "connect", download.ProgressApply().id);
                res = download.Apply();
                Namespace("Root.dycon").dycon_res = (res === true || res == Action.r_ok);
            }
        }

        if(res === true || res == Action.r_ok)
        {
            var dycon = XML(dyconpath);
            if(dycon)
            {
                Log("dycon xml: " + dycon.xml);
                filter(dycon.select("/components/component[@alias and @type]"), function(n)
                {
                    fresh[n.attributes.alias] = XML.Parse(n.xml);
                    Log("Found fresh node: " + n.attributes.alias + " : " + fresh[n.attributes.alias].xml);
                });
            }
        }

        var legafile = GetOpt.Get('dycon-legacy');
        if(legafile && FileSystem.Exists(legafile))
        { // loading legacy XML from file
            var legaxml = XML(legafile);
            if(legaxml)
                filter(legaxml.select("/components/component[@alias and @type]"), function(n)
                {
                    legacy[n.attributes.alias] = XML.Parse(n.xml);
                    Log("Found legacy node: " + n.attributes.alias + " : " + legacy[n.attributes.alias].xml);
                });
        }
        else
        { // loading legacy XML from product property
            Log("Dycon: Checking Legacy info");
            filter(infos, function(inf)
            {
                var alias = inf.attributes.alias;
                var legastr = prod.CustomProperties().Value(legaprop(alias));
                Log(Log.l_debug, "Dycon: Legacy info: " + alias + " = " + legastr);
                if(legastr)
                {
                    legacy[alias] = XML.Parse(legastr);
                    Log("Found legacy node: " + alias + " : " + legacy[alias].xml);
                }
            });
        }

        if(filter(legacy, function() {return true;}))
            for(var i = 0; i < infos.length; i++) // do not use 'filter' here because here is in-place array modification
            { // replacing static infos by legacy
                var leg = legacy[infos[i].attributes.alias];
                if(leg)
                {
                    var info = ns_info.InfoXMLNode(infos[i]);
                    var linfo = ns_info.InfoXMLNode(leg);
                    if(info.Id() != linfo.Id())
                    {
                        Log("Found legacy component info: " + infos[i].attributes.alias);
                        Log("Replacing original info");
                        infos[i] = legacy[infos[i].attributes.alias];
                    }
                }
            }

        filter(infos, function(j)
        { // replacing original (static or legacy) infos by dynamic
            var dyc = fresh[j.attributes.alias];
            if(dyc)
            {
                var _info = ns_info.InfoXMLNode(j);
                var dinfo = ns_info.InfoXMLNode(dyc);
                if(_info.Id() != dinfo.Id())
                {
                    Log("Found dynamic component _info: " + j.attributes.alias);
                    Log("Replacing original _info");
                    var legal = j.attributes.alias + "_legacy__";
                    legalias[legal] = dyc;
                    j.AddAttribute("alias", legal);
                    ns_info.InfoXMLNode(j);
                }
            }
        });

        filter(fresh, function(f) {infos.push(f);});
    },
    Component: function(components, root, prod)
    {
        //Log("Component callback called:");
        //filter(components, function(c, n) {Log("Component alias: " + n);});
        filter(legalias, function(l, n)
        {
            //Log("legalias: " + n);
            var cmp = components[n];
            if(cmp && cmp.State() == cmp.state_t.installed)
            {
                Log("Adding legacy component to product: " + n + " : " + cmp.Id() + " : " + cmp.Name());
                prod.Components().Add(cmp);
                if(l.attributes.alias in components) // set fresh component to install state
                {
                    var frecmp = components[l.attributes.alias];
                    prod.ProductPostProcess.Connect(function()
                    {
                        Log("Mark fresh component to install: " + frecmp.Id());
                        prod.InstallMode.Subscribe(function(m)
                        {
                            if(m == prod.install_mode_t.modify)
                                frecmp.Action(frecmp.action_t.install);
                        });
                    });
                    frecmp.Dumper().PostAction().AddAction({
                        Apply: function() {
                            if(frecmp.Action() == frecmp.action_t.install)
                            {
                                prod.CustomProperties().Value(legaprop(l.attributes.alias), l.xml);
                                Log("Dycon: Set property: " + legaprop(l.attributes.alias) + " = " + l.xml);
                            }

                            var legastr = prod.CustomProperties().Value(legaprop(l.attributes.alias));
                            Log("Dycon: Legacy info: " + l.attributes.alias + " = " + legastr);

                            return Action.r_ok;
                            }
                        }, "Write Dynamic component info for: " + l.attributes.alias);
                }
            }
        });
    }};
})();



