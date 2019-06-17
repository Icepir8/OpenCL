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
    var base = function(name) {return required(FileSystem.AbsPath(Origin.Directory() + "../Base", name));}
    var ns_prop     = base("property.js");
    var ns_inst     = Namespace("Root.installer");
    
    var PForDownload = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.DownloadOnly);
        c(val);
        return c;
    }
    var add_attr_into_info = function(attributes, info)
    {
      // node attributes also need to be stored
      for(var i in attributes)
      {
        if(!info.Property(i))
        {
            //Log("Add attribute " + i + " as property into Info val = " + node.attributes[i]);
            info.Property(i, attributes[i]);
        }
        /*else
            Log("Adding component attributes into Info: Can't add attribute '" + i + "' due to property with the same name already exists");*/
      }
    }

    this.Component = function(components, node, prod)
    {
        var cmps = node.select("components/component[@alias]");
        var i;
        if(cmps)
          for(i in cmps)
          {
            if(cmps[i].attributes.alias && components[cmps[i].attributes.alias])
                add_attr_into_info(cmps[i].attributes, components[cmps[i].attributes.alias].Info());
          }

        // Removing components which are not from current media in case of download-only or download-list modes and for start products only
        if(prod.LoadMarkers && prod.LoadMarkers.WasCreatedFromMedia)
        {
            for(i in components)
            {
                if(!components[i].Info().Property("from_media"))
                {
                    prod.Log("download-only mode: disabling component " + i);
                    //delete components[i];
                    components[i].Disabled(PForDownload(true));
                }
            }
        }
    }
}
