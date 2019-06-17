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

    var fm = StringList.Format;

    var ns_inst = Namespace("Root.installer");

    var ComponentByAlias = function(product, alias)
    {
        return product.FilterComponentsRecursive(function (cmp) { return String(cmp.Info().Property("alias")).toLowerCase() == String(alias).toLowerCase() ? true : false; });
    }

    this.Actions = function(prod)
    {
        var ns = this;

        Log("Scenario::dal_configuration_options: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        //########################################################################
        //  AddingNDKAndEclipseConfigurationOptions NDKDIR and ECLIPSEDIR
        //########################################################################
        ns.AddingDALConfigurationOption = function()
        {
            Log("action AddingDALConfigurationOption");

            var dal = ComponentByAlias(prod, "sys_dbg_dal");
            if(dal)
                prod.ConfigurationOptions().Add("DALDIR", dal.InstallDir());

            Log("action AddingDALConfigurationOption done");
        }

        if(ns.ConfigureOptions)
          ns.ConfigureOptions.Add(ns.AddingDALConfigurationOption);
        else
          Log("Scenario::dal_configuration_options: ns.ConfigureOptions isn't defined -> ignore");

        Log("Scenario::dal_configuration_options: actions generation completed");
        return ns;
    }
}
