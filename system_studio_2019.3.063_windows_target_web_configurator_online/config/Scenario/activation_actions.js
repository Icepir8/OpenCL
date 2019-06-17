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
    var ns_pb = base("parse_bool.js");
    var ns_lic = base("license.js");
    var ns_prop = base("property.js");

    var Output = function(mes)
    {
        Log(mes);
        ns_inst.Installer.OutputFile().Append(mes);
    }

    var PForInstall = function(val)
    {
        var c = ns_prop.CollectorByAnd();
        c(ns_inst.Installer.NotDownload);
        c(val);
        return c;
    }

    var iterate = function(cont, cb)
    {
        if(!cont || !cb)
        {
            Log(Log.l_warning, "scenario:base:iterate: container or cb isn't defined - cont = " + cont + " cb = " + cb);
            return null;
        }

        for(var key in cont)
        {
            var r1 = cb(cont[key], key);
            if(r1)
                return r1;
        }

        return null;
    }

    this.Actions = function(prod)
    {
        var ns = this;

        var activations_list = [];
        var product_activation = null;
        var features_indicators = {};

        Log("Scenario::activation: actions generation started");

        if(!prod)
        {
            Log(Log.l_critical, "the scn.Product is undefined ");
            return;
        }

        // this function concatenate features expressions for current object and all it's parents
        // it will be used to define feature_name_full property
        var get_full_feature_name = function(obj, ftr_name)
        {
            var _ftr_name = ftr_name ? ftr_name : "";

            if(!obj)
                return _ftr_name;

            if(obj.CustomObjects && typeof(obj.CustomObjects) == "function" && obj.CustomObjects().Item("Activation"))
            {
                var actv = obj.CustomObjects().Item("Activation");

                if(actv.feature_name)
                    _ftr_name = _ftr_name ? ("( " + actv.feature_name + " ) & ( " + _ftr_name + " )") : actv.feature_name;
            }

            if(obj.Parent && typeof(obj.Parent) == "function" && obj.Parent())
            {
               return get_full_feature_name(obj.Parent(), _ftr_name);
            }

            return _ftr_name;
        }

        var find_activation_info = function(i)
        {
            if(i.CustomObjects && i.CustomObjects().Item("Activation"))
            {
                var i_actv = i.CustomObjects().Item("Activation");

                var new_actv = {};

                for(var key in i_actv)
                    new_actv[key] = i_actv[key];

                var full_feature_name = get_full_feature_name(i);
                if(full_feature_name)
                {
                    new_actv.orig_feature_name = new_actv.feature_name;

                    new_actv.feature_name = full_feature_name;
                    //feature_name_full is property which contains feature_expression for current object and all it's parents
                    new_actv.feature_name_full = full_feature_name;
                    i_actv.feature_name_full = full_feature_name;
                }

                // new_actv was added to redefine 'feature_name' with full feature_expression for current object and all it's parents
                // to use the same property in ActivationManager, because it is to complex to migrate to using new property.
                activations_list.push(new_actv);
            }
        }

        var preset_download_mode = (GetOpt.Exists("download-only") || GetOpt.Exists("download-list"));
        
        if(prod.CustomObjects().Item("Activation"))
        {
            product_activation = prod.CustomObjects().Item("Activation");
            //feature_name_full is property which contains feature_expression for current object and all it's parents
            product_activation.feature_name_full = product_activation.feature_name;

            activations_list.push(product_activation);
        }
        prod.FilterComponentsRecursive(find_activation_info);
        prod.FilterFeaturesRecursive(find_activation_info);
        
        var license_manager_init = function()
        {
            if(activations_list.length && !preset_download_mode)
            {
                Log("License initialization start");

                if(product_activation)
                {
                    Activation.SetPlatforms(product_activation.platforms);
                    Activation.SetProductID(product_activation.product_id);
                }
                Activation.Initialize();
                
                ns.ActivationManager = ns_lic.getInstance();

                if(product_activation)
                {
                    ns.ActivationManager.Manager.SupportType(product_activation.support_code);
                    ns.ActivationManager.Manager.FulfillmentID(product_activation.fulfillment_id);
                    ns.ActivationManager.Manager.ProductID(product_activation.product_id);
                    ns.ActivationManager.Manager.MediaID(product_activation.media_id);
                    ns.ActivationManager.Manager.BuildDate(product_activation.builddate);
                    ns.ActivationManager.Manager.IRC(product_activation.registration_center_url);
                    ns.ActivationManager.Manager.Platforms(product_activation.platforms);
                    
                    var url = StringList.Format(product_activation.offline_sn_url ? product_activation.offline_sn_url : "[offline_sn_link]");
                    var rtf_url = "{\\field{*\\fldinst HYPERLINK \\o \"" + url + "\"}{\\fldrslt " + url +"}}";
                    Wizard.Notify("offline_sn", "set text", rtf_url);
                }
                

                iterate(activations_list, function(a){ ns.ActivationManager.add_info(a);});

                Wizard.Notify("splash", "status", fm("[checking_existing_license]"));

                ns.ActivationManager.configure(ns);

                Log("License initialization done");

                var f_expr = prod.CustomObjects().Item("Activation").feature_name_full;

                if(f_expr)
                {
                    if(!features_indicators[f_expr])
                    {
                        features_indicators[f_expr] = PForInstall(prod.disabled_t.no);
                        features_indicators[f_expr].Attributes.Value("Type", prod.disabled_type_t.activation);
                    }

                    prod.Disabled(features_indicators[f_expr]);
                }

                prod.FilterComponentsRecursive(function(cmp)
                {
                    if(cmp.CustomObjects().Item("Activation"))
                    {
                        var f = cmp.CustomObjects().Item("Activation").feature_name_full;

                        if(f)
                        {
                            if(!features_indicators[f])
                            {
                                features_indicators[f] = PForInstall(prod.disabled_t.no);
                                features_indicators[f].Attributes.Value("Type", prod.disabled_type_t.activation);
                            }

                            cmp.Disabled(features_indicators[f]);
                        }
                    }
                });

                prod.FilterFeaturesRecursive(function(ftr)
                {
                    if(ftr.CustomObjects && ftr.CustomObjects().Item("Activation"))
                    {
                        var f = ftr.CustomObjects().Item("Activation").feature_name_full;

                        if(f)
                        {
                            if(!features_indicators[f])
                            {
                                features_indicators[f] = PForInstall(prod.disabled_t.no);
                                features_indicators[f].Attributes.Value("Type", prod.disabled_type_t.activation);
                            }

                            ftr.Disabled(features_indicators[f]);
                        }
                    }
                });
            }
            else
            {
                if (preset_download_mode)
                    Log("License initialization is skipped due to download mode");
                if (!activations_list.length)
                    Log("License initialization is skipped due to lack of activation section");
            }
        }

        ns.FilterComponentsByAvailableLicense = function()
        {
            if(ns.ActivationManager)
            {
                if(ns.ActivationManager.Manager.ActivationType() != ns.ActivationManager.Manager.activation_type_t.no_license)
                {
                    for(var i in features_indicators)
                    {
                        features_indicators[i](ns.ActivationManager.EvaluateFeaturesExpression(i) ? prod.disabled_t.no : prod.disabled_t.yes);
                    }
                }
            }
            else
                Log("FilterComponentsByAvailableLicense: ns.ActivationManager isn't defined. Ignore.");

            return Action.r_ok;
        }

        ns.ConfigureByFlexlmFeatures.Add(ns.FilterComponentsByAvailableLicense);

        var SilentActivation = function()
        {
            var process_ret = function(ret)
            {
                if(!ret.exit_code)
                {
                    Output(fm("[activation_failed]", ret.error_message));
                    return Action.r_error;
                }

                Output(fm("[activation_success]", ret.error_message));
                return Action.r_ok;
            }

            if(GetOpt.Get("sn"))
            {
                Output(fm("[activate_sn]", GetOpt.Get("sn")));
                ns.ActivationManager.silent_activation_type("sn");
                return process_ret(ns.ActivationManager.activate_sn(GetOpt.Get("sn")));
            }

            if(GetOpt.Get("license"))
            {
                Output(fm("[activate_licfile]", GetOpt.Get("license")));
                ns.ActivationManager.silent_activation_type("lic_file");
                return process_ret(ns.ActivationManager.activate_licfile(GetOpt.Get("license")));
            }

            let no_license_check = ns_pb.ParseBoolean(ns.Product().Info().Property("no_license_check"));
            if(no_license_check && GetOpt.Exists("no_license"))
            {
                Output(fm("[silent_activate_without_license]"));
                ns.ActivationManager.silent_activation_type("no_license");
                ns.ActivationManager.Manager.ActivationType(ns.ActivationManager.Manager.activation_type_t.no_license);
                return Action.r_ok;
            }

            ns.ActivationManager.silent_activation_type("use_existent");
            var silent_mode = true;
            return process_ret(ns.ActivationManager.check_valid_license_exists(silent_mode));
        }

        ns.SFlexlmAdjustment = function()
        {
            var ret = Action.r_ok;
            if(!ns.ActivationManager) 
                license_manager_init();
            if(ns.ActivationManager)
            {
                if(prod.InstallMode() == prod.install_mode_t.install)
                    ret = SilentActivation();

                if(ret == Action.r_ok && ns.ActivationManager.Manager.ActivationType() != ns.ActivationManager.Manager.activation_type_t.no_license)
                {
                    ns.ConfigureByFlexlmFeatures();
                }
            }
            return ret;
        }

        ns.FlexlmAdjustment = function(prev_ret)
        {
            var ret = prev_ret;
            if(!ns.ActivationManager)
            {
                Wizard.BusyStart();
                Log("license_manager_init from FlexlmAdjustment");
                license_manager_init();
                if (ns.ActivationManager)
                {
                    //activation section is presented
                    //creating modal license dialogs
                    ns.AltFirstTimeActivation = Wizard.DialogCollection["alt_first_time_activation"]("AltFirstTimeActivation");
                    ns.AltDuringTLL = Wizard.DialogCollection["alt_during_tll"]("AltDuringTLL");
                    ns.AltExistingActivation = Wizard.DialogCollection["alt_existing_activation"]("AltExistingActivation");
                }
                Wizard.BusyStop();
            }

            return ret;
        }
        
        ns.FlexlmConfigure = function(prev_ret)
        {
            var ret = prev_ret;
            if(ns.ActivationManager)
            {
                ns.ConfigureByFlexlmFeatures.Reset();
                ns.ConfigureByFlexlmFeatures();
            }
            
            return ret;
        }
        
        ns.FlexlmAdjustment.Skip = function(){return !activations_list.length || preset_download_mode || String(prod.Info().Property("client_version")) == "23" || prod.InstallMode() == prod.install_mode_t.remove; }
        ns.SFlexlmAdjustment.Skip = function(){ return !activations_list.length || preset_download_mode || String(prod.Info().Property("client_version")) == "23" || prod.InstallMode() == prod.install_mode_t.remove; }
        
        ns.LicenseManagerInit = function()
        {
            if(!ns.ActivationManager)
            {
                Log("license_manager_init from LicenseManagerInit");
                license_manager_init();
            }
            return Action.r_ok;
        }

        Log("Scenario::activation: actions generation finished");

        return ns;
    }
}
