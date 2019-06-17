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
    this.Component = function(components, node)
    {
        if(components)
        {
            var cmps = node.select("components/component[@alias and @locale]");
            if(cmps)
            {
                Log("Filtering components by Locale");
                var current_locale = StringList.Locale();
                Log(" Current Locale: " + current_locale);

                //list of components aliases which are not passes filter 
                var componnets_to_remove = []; 
                //list of components aliases which passed filters 
                var componnets_to_keep = []; 
                
                var i;
               
                for(i in cmps)
                {
                    var alias = cmps[i].attributes.alias;
                    var locale = cmps[i].attributes.locale;
                    var locale_default = cmps[i].attributes.locale_default;
                    var locale_group  = cmps[i].attributes.locale_group;
                    if(alias && components[alias])
                    {
                        Log(" Validate: Component=" + alias + ", locale=" + locale + ", locale_default=" + locale_default + ", locale_group=" + locale_group);
                        if(locale)
                        {
                            //skip components which we already look at 
                            if (componnets_to_remove.indexOf(alias) != -1) continue;
                            if (componnets_to_keep.indexOf(alias) != -1) continue;
                        
                            //filtering inside of locale group 
                            if (locale_group)
                            {
                                //get all components from this group
                                var cmps_group = node.select("components/component[@alias and @locale and @locale_group='" + locale_group + "']");
                                if (cmps_group)
                                {
                                    //calculate length of group 
                                    var group_length = 0;
                                    for(i in cmps_group)
                                    {
                                        var alias_0 = cmps_group[i].attributes.alias;
                                        if (alias_0 && components[alias_0])
                                            group_length++;
                                    }
                                    Log("  Group length=" + group_length);
                                
                                    if (group_length == 1)
                                    {
                                        //only one element in group. keep it
                                        componnets_to_keep.push(alias);
                                    }
                                    else
                                    {
                                        //search default element
                                        //search component in group which we need to keep 
                                        var alias_default = "";
                                        var alias_keep = "";
                                        for(i in cmps_group)
                                        {
                                            var alias_1 = cmps_group[i].attributes.alias;
                                            var locale_default_1 = cmps_group[i].attributes.locale_default;
                                            var locale_1 = cmps_group[i].attributes.locale;
                                            if (alias_1 && components[alias_1])
                                            {
                                                Log("  Sub-Validate: Component=" + alias_1 + ", locale=" + locale_1 + ", locale_default=" + locale_default_1 + ", locale_group=" + locale_group);
                                                if (locale_1)
                                                {
                                                    if(locale_1 == current_locale)
                                                    {
                                                        alias_keep = alias_1;
                                                    }
                                                }
                                                if (locale_default_1)
                                                {
                                                    if (locale_default_1 == "true")
                                                    {
                                                        alias_default = alias_1;
                                                    }
                                                }
                                            }
                                        }
                                        if (alias_keep == "")
                                        {
                                            alias_keep = alias_default;
                                        }
                                        
                                        //remove not needed components from group
                                        for(i in cmps_group)
                                        {
                                            var alias_2 = cmps_group[i].attributes.alias;
                                            var locale_2 = cmps_group[i].attributes.locale;
                                            if (alias_2 && components[alias_2])
                                            {
                                                if (alias_2 != alias_keep)
                                                {
                                                    componnets_to_remove.push(alias_2);
                                                    Log("  Component '" + alias_2 + "' will be disabled, Locale mismatch: " + locale_2 + " (required: " + current_locale + ")");
                                                }
                                                else 
                                                {
                                                    componnets_to_keep.push(alias_2);
                                                }
                                            
                                            }
                                        }
                                    }
                                }
                            }
                            else
                            {
                                if(locale != current_locale)
                                {
                                    componnets_to_remove.push(alias);
                                    Log("  Component '" + alias + "' will be disabled, Locale mismatch: " + locale + " (required: " + current_locale + ")");
                                }
                                else 
                                {
                                    componnets_to_keep.push(alias);
                                }
                            }
                        }
                    }
                }

                for(i=0; i<componnets_to_keep.length; i++)
                {
                    Log(" + Component '" + componnets_to_keep[i] + "' passed Locale filtering.");
                }
                for(i=0; i<componnets_to_remove.length; i++)
                {
                    delete components[componnets_to_remove[i]];
                    Log(" - Component '" + componnets_to_remove[i] + "' disabled, Not passed Locale filtering.");
                }
                
                Log("Filtering components by Locale ... Finished");
            }

        }
    }

}
