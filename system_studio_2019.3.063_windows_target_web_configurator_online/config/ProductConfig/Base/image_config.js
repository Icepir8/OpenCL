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

//###############################################################
// This file contains definition for:
//  class ProductImageConfig
//###############################################################
new function ()
{
    var default_config = FileSystem.MakePath("config.xml", Origin.Directory() + "..");

    this.ProductImageConfig = function(cfg)
    {
        var config = cfg ? cfg : default_config;

        var root_node = null;

        var load = function()
        {
          if(!root_node && FileSystem.Exists(config))
          {
              var src = XML.Parse(FileSystem.ReadFileUTF8(config));
              if(src)
              {
                  var root = src.single("/product");
                  if(root)
                    root_node = root;
              }
          }

          return root_node;
        }

        var obj = function(){ return root_node;}

        obj.CanBeUsed = function(prod)
        {
            if(!prod.LoadMarkers)
                prod.LoadMarkers = {};

            // only first loaded config should be used to escape situation with ovewriting media config by
            // cache config in case when cached config belong to image which wasn't installed before (for example for psf)
            if(prod.LoadMarkers.ConfigAlreadyLoaded)
            {
                Log("CanBeUsed - some config was already loaded for product -> false");
                return false;
            }

            var root = load();
            if(root)
            {
              if(root.attributes.image && prod && prod.ImageInstalled(root.attributes.image))
              {
                  // image with id mentioned in this config is already installed and product shouldn't be customized for it
                  Log("CanBeUsed - image is installed -> false");
                  return false;
              }
              Log("CanBeUsed - if wasn't taken -> true");
              return true;
            }

            return false;
        }

        obj.Exists = function()
        {
            if(load())
              return true;

            return false;
        }

        obj.File = function()
        {
            return config;
        }

        obj.Node = function(){ return load(); }

        return obj;
    }
}
