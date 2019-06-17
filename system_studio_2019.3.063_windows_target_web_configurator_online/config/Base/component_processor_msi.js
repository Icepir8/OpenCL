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

new function ()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};

    var ns_proc = load("component_processor.js");

    var db_only = function() {return GetOpt.Exists("db-processor");}

    //###################################################################################
    // MSI processor
    //###################################################################################
    this.ProcessorMSI = function()
    {
        if(db_only())
            return ns_proc.ProcessorDB();

        var msi_proc = ns_proc.Processor();
        var self = msi_proc;
        var feature_name = null;

        var feature_map = null;

        msi_proc.InstallDirPropertyName = "INSTALLDIR";

        var orig_owner_func = msi_proc.Owner;
        msi_proc.Owner = function(obj)
        {
            if(obj)
            {
                Log("ProcessorMSI: Register InstallDirPropertyName for: " + obj.Name());
                obj.ConfigurationOptions().Add(msi_proc.InstallDirPropertyName, function(){return obj.InstallDir();});

                feature_name = obj.Info().Property("HeadFeature");
                if(feature_name)
                    Log("ProcessorMSI: Head feature: " + feature_name);
            }
            return orig_owner_func.apply(this, arguments);
        }

        var fea_list = function()
        {
            if(feature_map && feature_map.Get(feature_name))
            {
                var c = feature_name;
                var childs = feature_map.Get(feature_name).Deep.Childs(function(f) {c = c + "," + f.Id(); return false;});
                return c;
            }
            else if(feature_name)
                return feature_name;
        }

        msi_proc.RemoveAct = function ()
        {
            Log(Log.l_debug, "ProcessorMSI: getting RemoveAct");

            msi_proc.Owner().RemoveConfigurationOptions().Add("REBOOT", "ReallySuppress");
            var dunit_msi = null;
            if(feature_name)
            {
                msi_proc.Owner().RemoveConfigurationOptions().Add("REMOVE", fea_list);
                Log("ProcessorMSI-configure: parameters: " + msi_proc.RemoveParams());
                dunit_msi = DumperAction.MSI({ Path: ((msi_proc.Owner().Source() && msi_proc.Owner().Source().File && msi_proc.Owner().Source().File()) ? msi_proc.Owner().Source().File() : ""),
                                                   ProductCode: msi_proc.Owner().Info().Property("ProductCode"),
                                                   Parameters: msi_proc.RemoveParams(),
                                                   Configure: true });
            }
            else
            {
                msi_proc.Owner().RemoveConfigurationOptions().Delete("REMOVE");
                Log("ProcessorMSI-remove: parameters: " + msi_proc.RemoveParams());
                dunit_msi = DumperAction.MSI({ Path: ((msi_proc.Owner().Source() && msi_proc.Owner().Source().File && msi_proc.Owner().Source().File()) ? msi_proc.Owner().Source().File() : ""),
                                                   ProductCode: msi_proc.Owner().Info().Property("ProductCode"),
                                                   Parameters: msi_proc.RemoveParams(),
                                                   Remove: true });
            }


            return dunit_msi;
        }

        var product = function()
        {
            if(msi_proc.Owner() && msi_proc.Owner().Info())
            {
                return WI.Product(msi_proc.Owner().Info().Property("ProductCode"),
                                 (msi_proc.Owner().Source() && msi_proc.Owner().Source().File &&
                                  msi_proc.Owner().Source().File()) ? msi_proc.Owner().Source().File() : "");
            }
            return null;
        }

        msi_proc.InstallAct = function()
        {
            Log(Log.l_debug, "ProcessorMSI: getting InstallAct");

            if(!msi_proc.Owner())
            {
                Log("Could not detect component to process: no owner");
                return null;
            }

            msi_proc.Owner().ConfigurationOptions().Add("REBOOT", "ReallySuppress");

            if(feature_name)
                msi_proc.Owner().ConfigurationOptions().Add("ADDLOCAL", fea_list());
            //else
            //    msi_proc.Owner().ConfigurationOptions().Delete("ADDLOCAL");
            // else branch removed because it doesn't allow to pass ADDLOCAL for to msis

            var cmd_params = msi_proc.InstallParams();

            if(!(msi_proc.Owner().Source() && msi_proc.Owner().Source().File && msi_proc.Owner().Source().File()))
            {
                Log(Log.l_error, "Source is undefined - component can't be installed!");
                return null;
            }

            msi_proc.Owner().RemoveConfigurationOptions().Add("REBOOT", "ReallySuppress");
            // due to the remove parameters will not be empty the REMOVE=ALL will be added below
            // if the remove parameters is not empty the configure product is called instead of remove

            if(feature_name && feature_map && feature_map.Get(feature_name))
            {
                var pro = product();
                if(pro)
                {
                    var fea = "";
                    feature_map.Get(feature_name).Deep.Tree(function(f)
                    {
                        if(f && !pro.IsFeatureInstalled(f.Id()))
                            fea = fea + (fea ? "," : "") + f.Id();
                    });
                    if(fea)
                        msi_proc.Owner().RemoveConfigurationOptions().Add("REMOVE", fea);
                }
            }
            else if(msi_proc.Owner().RemoveConfigurationOptions().String())
                msi_proc.Owner().RemoveConfigurationOptions().Add("REMOVE", "ALL");

            Log("ProcessorMSI: parameters: " + cmd_params);
            Log("ProcessorMSI: rollback parameters: " + msi_proc.Owner().RemoveConfigurationOptions().String());

            var dunit_msi = DumperAction.MSI(
                { Path: msi_proc.Owner().Source().File(),
                  ProductCode: msi_proc.Owner().Info().Property("ProductCode"),
                  Parameters: cmd_params,
                  RollbackParameters: msi_proc.Owner().RemoveConfigurationOptions().String(),
                  EvaluateSignature: msi_proc.Owner().Signed ? msi_proc.Owner().Signed() : false,
                  Install: true
                });

            return dunit_msi;
        }

        msi_proc.RepairAct = function()
        {
            Log(Log.l_debug, "ProcessorMSI: getting RepairAct");

            if(!msi_proc.Owner())
            {
                Log("ProcessorMSI-RepairAct: Could not detect component to process: no owner");
                return null;
            }

            if(!(msi_proc.Owner().Source() && msi_proc.Owner().Source().File && msi_proc.Owner().Source().File()))
            {
                Log(Log.l_error, "ProcessorMSI-RepairAct: Source is undefined - component can't be reinstalled!");
                return null;
            }

            var dunit_msi = DumperAction.MSI({ Path: msi_proc.Owner().Source().File(), Reinstall: true });

            return dunit_msi;
        }

        var installed;

        msi_proc.IsInstalled = function(force)
        {
            if(typeof(installed) == "undefined" || typeof(force) != "undefined")
            {
                installed = false;

                if(!feature_name && msi_proc.Owner().Info().Property("ProductCode") && typeof(WI.ProductInfo) == "function")
                {
                    // only in case if there is ProductCode and no need to check certain feature and there is WI.ProductInfo API
                    // detection via checking available "ProductName" property can be done
                    var p_name = WI.ProductInfo(msi_proc.Owner().Info().Property("ProductCode"), "ProductName");
                    if(p_name)
                        installed = true;
                }
                else
                {
                    var pro = product();
                    if(pro)
                    {
                        if(pro.IsInstalled())
                        {
                            if(!feature_name)
                                installed = true;
                            else if(pro.IsFeatureInstalled(feature_name))
                                installed = true;
                        }
                    }
                }
            }
            return installed;
        }

        msi_proc.InstallDirProperty = function(name)
        {
            if(arguments.length)
            {
                Log("Update: Register InstallDirPropertyName for: " + this.Owner().Name() + " : " + name);
                if(msi_proc.InstallDirPropertyName)
                    msi_proc.Owner().ConfigurationOptions().Delete(msi_proc.InstallDirPropertyName);
                if(name && msi_proc.Owner())
                    msi_proc.Owner().ConfigurationOptions().Add(name, function(){return msi_proc.Owner().InstallDir();});
                msi_proc.InstallDirPropertyName = name;
            }
            return msi_proc.InstallDirPropertyName;
        }

        msi_proc.FeatureName = function(fname)
        {
            if(arguments.length)
                feature_name = fname;
            return feature_name;
        }

        msi_proc.FeatureMap = function(map)
        {
            if(arguments.length)
            {
                feature_map = map;
                Log(Log.l_debug, "FeatureMap: new map obtained");
            }
            return feature_map;
        }

        return msi_proc;
    }
}
