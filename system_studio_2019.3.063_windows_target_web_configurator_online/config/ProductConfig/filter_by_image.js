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
    var pconfig_base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "/Base"));};

    var ns_icfg = pconfig_base("image_config.js");

    var image_config = ns_icfg.ProductImageConfig();

    var iterate = function(str, cb)
    {
        if(str)
        {
            var items = str.split(";");
            for(var i in items)
                if(cb(items[i]))
                 return true;

        }
    }

    var belong_to = function(arr, token)
    {
      for(var i in arr)
      {
        if(arr[i] == token)
          return true;
      }

      return false;
    }
    
    
    var import_product_properties_from_config = function(prod, node)
    {
        Log("import_product_properties_from_config begin");
        for(var i in node.attributes)
        {
          var val = i.match(/name|description|title/i) ? StringList.Format(node.attributes[i]) : node.attributes[i];
          Log("set property " + i + " with " + val);

          prod.Info().Property(i, val);
        }
    }
    
    var import_custom_properties_from_config = function(prod, node)
    {
        Log("import_custom_properties_from_config begin");
        var props = node.select("property[@name]");
        if(props)
        {
            for(var p in props)
            {
                var nm = props[p].attributes.name;
                var val = StringList.Format(props[p].text);
                if(nm)
                {
                    Log("config.xml: Property " + nm + " (value = '" + val + "') added to product " + prod.Name());
                    prod.CustomProperties().Value(nm, val);
                }
            }
        }
    }

    var customize_properties_from_config = function(prod)
    {
        // node attributes also need to be stored
      if(!prod || !image_config.CanBeUsed(prod))
        return;

      var node = image_config.Node();
      if(node)
      {
        if(!prod.LoadMarkers)
            prod.LoadMarkers = {};

        prod.LoadMarkers.ConfigAlreadyLoaded = true;
        
        import_product_properties_from_config(prod, node);
        import_custom_properties_from_config(prod, node);
      }
    }
    
    

    var set_product_image_from_config = function(prod)
    {
      if(!prod)
        return;

      var root = image_config.Node();
      if(root)
      {
          if(root.attributes.image)
          {
            Log("set_product_image_from_config: setting image " + root.attributes.image);
            prod.Image(root.attributes.image);
          }
      }
    }
    /*
    this.Component = function(components, node, prod)
    {
        if(!components || !node || !prod)
           return;

        set_product_image_from_config(prod);

        var cmps = node.select("components/component[@alias and @images]");
        if(cmps)
        {
            Log("Filtering components by image");

            var prod_images = prod.ImagesList();

            if(!belong_to(prod_images, prod.Image()))
               prod_images.push(prod.Image());

            Log("product images = " + prod_images.join(";"));

            for(var i in cmps)
            {
                var alias = cmps[i].attributes.alias;
                var images  = cmps[i].attributes.images;
                if(alias && components[alias])
                {
                    if(!iterate(images, function(cmp_img)
                    {
                       return belong_to(prod_images, cmp_img);
                    }))
                    {
                        Log("Component " + alias + " doesn't belong to current or already installed product images -> remove it from the skope");

                        delete components[alias];
                    }
                }
            }
            Log("Filtering components by image done");
        }
    }

    this.Feature = function(features, node, prod)
    {
        if(!features || !node || !prod)
           return;

        set_product_image_from_config(prod);

        var ftrs = node.select("feature[@id and @images]");
        if(ftrs)
        {
            Log("Filtering features by image");

            var prod_images = prod.ImagesList();

            if(!belong_to(prod_images, prod.Image()))
               prod_images.push(prod.Image());

            for(var i in ftrs)
            {
                var id = ftrs[i].attributes.id;
                Log("Check feature " + id);
                var images  = ftrs[i].attributes.images;
                if(id && features[id])
                {
                    if(!iterate(images, function(ftr_img)
                    {
                       return belong_to(prod_images, ftr_img);
                    }))
                    {
                        Log("Feature " + id + " doesn't belong to current or already installed product images -> remove it from the skope");
                        features[id].Detach();
                    }
                }
            }

            Log("Filtering features by image done");
        }
    }
    */
    this.Product = function(prod, node)
    {
      customize_properties_from_config(prod);
    }
}

