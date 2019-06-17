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
    var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory() + "../Base"));};

    this.ExInit = function(root, node)
    {
        return function()
        {
            ns_installer = Namespace("Root.installer");

            var cmp = this;

            var c = root.single("/component[@alias and @type]");
            if(!c)
            {
                Log("ExInit: Can't get component[@alias and @type] from the XML description for the component id = " + cmp.Name());
                return false;
            }

            var preu = cmp.Info().Property("PreUninstalls");
            if(!preu)
            {
              return true;
            }

            Log("component " + cmp.Name() + " require preuninstall of msi component clients " + preu);

            var add_preu_to_dmp = function(dmp)
            {

               Log("component " + cmp.Name() + ": remove clients of the msi component(s) \"" + preu + "\"");

               if(dmp && dmp.IsDumper)
               {
                   var cmps = preu.split(";");
                   for(var k in cmps)
                   {
                      var arr = WI.ClientsInstalledComponent(cmps[k]);
                      for(var i in arr)
                      {
                        var rm_msi = DumperAction.MSI({ Path: "",
                                                         ProductCode: arr[i].Id,
                                                         Parameters: "",
                                                         Remove: true });
                        dmp.AddAction(rm_msi, "Remove of " + arr[i].Name + " which depends on " + cmp.Name());
                      }
                   }
               }
            }

            var set_remove_action_for_preuninstalls_component = function()
            {
                   if(!cmp || (cmp && cmp.Action() != cmp.action_t.remove))
                       return;

                   Log("component " + cmp.Name() + ": will set remove action for clients of the msi component(s) \"" + preu + "\" if they are registered in Installer.Components");

                   var cmps = preu.split(";");

                   for(var k in cmps)
                   {
                      var arr = WI.ClientsInstalledComponent(cmps[k]);
                      for(var i in arr)
                      {
                          var cmp_to_remove = ns_installer.Installer.Components[arr[i].Id];

                          if(cmp_to_remove)
                          {
                              cmp_to_remove.Action(cmp_to_remove.action_t.remove);
                          }
                      }
                   }

                   Log("component " + cmp.Name() + ": setting remove action done");
            }

            cmp.Configurator().Apply.Remove.SubscribeOnBegin(add_preu_to_dmp);

            ns_installer.Installer.Apply.SubscribeOnBegin(set_remove_action_for_preuninstalls_component);
            return true;
        }
    }
}
