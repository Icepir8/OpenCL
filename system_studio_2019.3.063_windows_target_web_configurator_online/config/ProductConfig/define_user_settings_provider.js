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

    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    var filter = function(coll, cb)
    {
        for(var i in coll)
        {
            var r = cb(coll[i], i);
            if(r)
                return r;
        }

        return null;
    };

    // returns the last (newer by id) installed product which has the required image installed
    var get_last_product = function(collection, image, curr_product)
    {
        var arr = [];

        for(var i in collection)
        {

          if(collection[i] == curr_product)
             continue;

          arr.push(i);
        }

        var prods = arr.sort().reverse();
        var images = String(image).split(/\;|,/);

        return filter(images, function(img)
        {
            return filter(prods, function(prod)
            {
                Log("get_last_product: check prod " + prod + " for image = " + img);
                var found = String(img).match(/all/i) ? collection[prod].ProductState() == curr_product.state_t.installed : collection[prod].ImageInstalled(img);
                if(found)
                  return collection[prod];

                return null;
            });
        });
    }

    // function finds the last installed product with the same image
    // for extracting usre settings from it and assign it to the .Info().Property("UserSettingsProvider");
    var set_user_settings_provider = function(current_product)
    {
        if(!current_product)
        {
            Log("current product isn't defined");
            return null;
        }

        var grp = current_product.Info().Property("inherit_settings_from_group");
        var images = current_product.Info().Property("inherit_settings_from_images");

        if(!grp)
        {
            Log("the group for inheritence external settings isn't provided");
            return null;
        }

        var ns_inst = base("installer.js");

        Log("looking for the last product in the group " + grp + " with installed image(s) " + (images ? images : current_product.Image()));

        var provider = get_last_product(ns_inst.Installer.Groups[grp], images ? images : current_product.Image(), current_product);

        if(!provider)
        {
            Log("nothing object was found");
        }
        else
        {
            Log("Found product = " + provider.Id());
        }
        current_product.Info().Property("UserSettingsProvider", provider);
    }

    ns.Product = function(product, root)
    {
        product.ProductPostProcess.Connect(function()
        {
            Log("=============================================");
            Log("define the product for getting user settings");

            if(product.InstallMode() == product.install_mode_t.install)
               set_user_settings_provider(product);
            else
            {
               Log("product install_mode = "+ product.InstallMode()+", it isn't 'install' -> ignore");
               return;
            }
            Log("define the product for getting user settings done");
            Log("=============================================");
        });
    }
}
