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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var from_config = function(name) {return FileSystem.MakePath(name, Origin.Directory() + "..");};

    var ns_ecl_inf = base("eclipse_info.js");

    var mkpath = FileSystem.MakePath;

    var fm = StringList.Format;

    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    /*
    var ns_prop      = base("property.js");

    var P = function(val){return ns_prop.Property(val);}


    var ns_inst = Namespace("Root.installer");
    */
    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::default_integration_into_own_eclipse.js: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        if(!ns.EclipseIntegration)
        {
            Log(Log.l_critical, "there isn't action ns.EclipseIntegration");
            return;
        }

        var ecl = ComponentByAlias(prod, "eclipse");
        if(!ecl)
        {
            Log("default_integration_into_own_eclipse.js: component eclipse wasn't found for product - nothing adjustments will be made");
            return;
        }

        ns.EclipseIntegration.WarningInCaseOfNonDefaultEclipse = function()
        {
            //Wizard.Notify("eclipse_integration/info", "set text", format("[eclipse_incorrect_path_file]", reason));
        }

        return ns;
    }
}
