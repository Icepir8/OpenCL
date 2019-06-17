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

/** @file license.js
 *  @brief Basic implementation of license object
 *  @details This module includes implementation of basic license activation methods.
 *    This module wrapup Actions methods implemented by "intel_license" plugin and
 *    represents ISSA API in JScript.
 */

new function()
{
    //###############################################################
    // copy properties of the one object to another
    //###############################################################
    var copy = function(source, target)
    {
        if(!source)
            return;

        var t = typeof(target) != "undefined" ? target : (typeof(this) != "undefined" ? this : {});

        for(var i in source)
           t[i] = source[i];

        return t;
    }
    
    //###############################################################
    //ISSA ERROR CODES
    
    ISSA_WS_ERR_INVALID_SN                          = -2172;
    LICENSE_ERR_FETCH_LIC_FROM_IRC                  = -2;
    ISSA_ERR_LH_FAILED_PREFIX_VALIDATION            = -1112;
    ISSA_ERR_LH_SN_FAILED_VALIDATION                = -1113;
    ISSA_WS_ERR_ACCESS_DENIED                       = -2009;
    ISSA_WS_ERR_CANNOT_ADD_LIC_INFO                 = -2014;
    ISSA_WS_ERR_SN_DOES_NOT_EXIST                   = -2037
    ISSA_WS_ERR_SN_RENEWAL_ANON_REG_NOT_ALLOWED     = -2322
    ISSA_WS_ERR_SN_CANNOT_ANON_REG_EVAL             = -2323;
    ISSA_WS_ERR_SN_NOT_REGISTERED                   = -2388;
    ISSA_ERR_INVALID_ARGUMENT                       = -1022;
    ISSA_ERR_NOT_FILE_OR_DIRECTORY                  = -1030;
    ISSA_ERR_FILE_NOT_FOUND                         = -1002;
    ISSA_ERR_FAILED_TO_OPEN                         = -1040;
    ISSA_ERR_FAILED_TO_READ                         = -1050;
    ISSA_ERR_FAILED_TO_CREATE                       = -1060;
    ISSA_ERR_CANNOT_COPY_LICENSE                    = -1009;
    ISSA_ERR_CANNOT_CREATE_LICENSE_FOLDER           = -1017;
    ISSA_ERR_FAILED_TO_WRITE                        = -1070;
    ISSA_WS_ERR_SN_ANON_REG_NO_LIC_FOR_PACKAGE      = -2325;
    ISSA_ERR_CONNECTION                             = -3;
    ISSA_ERR_LICENSE_NOT_SUPPORTED                  = -1011;
    ISSA_WS_ERR_SN_MAXIMUM_ACTIVATIONS_REACHED      = -2328;
    ISSA_WS_ERR_SN_NF_ANON_REG_NOT_ALLOWED          = -2321;
    ISSA_WS_ERR_LIC_EXPIRED                         = -2049;
    ISSA_WS_ERR_TLL_LIC_EXPIRED                     = -2050;
    ISSA_ERR_SN_BUILD_DATE_AFTER_SUPPORT_DATE       = -1080;
    ISSA_ERR_UNSUPPORTED_BUILD_DATE                 = -1090;
    ISSA_WS_ERR_SN_HAS_NO_USABLE_FEATURES           = -2326;
    ISSA_ERR_SERVER_OLDER                           = -16;
    ISSA_LICENSE_SERVER_DOWN                        = -17;
    
    
    //###############################################################
    var issa_error_message = function(issa_error_code)
    {
        var msg;
        
        switch(issa_error_code)
        {
        case (ISSA_LICENSE_SERVER_DOWN):
            //"Counted licenses can not be checked out because license server is down"
            msg = "[IDS_LICENSE_SERVER_IS_DOWN]"; 
            break;
        case ISSA_WS_ERR_INVALID_SN: // ERROR_INVALID_SN
            //"Activation rights do not allow this software to be installed. This could be due to expired subscription or incompatible serial number."
            msg = "[IDS_INVALID_SN_FOR_PACKAGE]";
            break;
        case LICENSE_ERR_FETCH_LIC_FROM_IRC:
            //"Error fetching license from Intel(R) Registration Center."
            msg = "[IDS_ERROR_IRC_FETCH]";
            break;
        case ISSA_ERR_LH_FAILED_PREFIX_VALIDATION:
        case ISSA_ERR_LH_SN_FAILED_VALIDATION:
            //"The Serial Number provided is invalid"
            msg = "[IDS_INVALID_SN]";
            break;
        case ISSA_WS_ERR_ACCESS_DENIED:
            //"Install program was not allowed to activate this serial number. For your support options, go to www.intel.com/software/products/support/"
            msg = "[IDS_IRC_ACCESS_DENIED]";
            break;
        case ISSA_WS_ERR_CANNOT_ADD_LIC_INFO:
            //"Serial Number could not be verified. Please make sure that the serial entered is correct.\n If you continue to run into this issue after verifying the serial number, go to www.intel.com/software/products/support/ for your support options"
            msg = "[IDS_IRC_CANNOT_ADD_LIC_INFO]";
            break;
        case ISSA_WS_ERR_SN_DOES_NOT_EXIST:
            //"Serial Number is not valid. Please make sure that the serial entered is correct. If you continue to run into this issue after verifying the serial number, go to www.intel.com/software/products/support/ for your support options."
            msg = "[IDS_IRC_SN_DOESNOT_EXIST]";
            break;
        case ISSA_WS_ERR_SN_RENEWAL_ANON_REG_NOT_ALLOWED:
        case ISSA_WS_ERR_SN_CANNOT_ANON_REG_EVAL:
        case ISSA_WS_ERR_SN_NOT_REGISTERED:
            //"This serial number is not registered. Please register the serial number at Intel(R) Software Development Products Registration Center  (http://registrationcenter.intel.com/) and follow the instructions received in the email."
            msg = "[IDS_IRC_ANON_REG_NOT_ALLOWED]";
            break;
        case ISSA_ERR_INVALID_ARGUMENT: //if argument is an invalid path
            //"The license file provided is invalid"
            msg = "[IDS_INVALID_LICENSE_FILE]";
            break;
        case ISSA_ERR_NOT_FILE_OR_DIRECTORY:	//if argument is neither port@host, nor file, nor directory
            //"""%1!s!"" is not a valid license file or directory."
            msg = "[IDS_ERR_NOT_FILE_OR_DIRECTORY]";
            break;
        case ISSA_ERR_FILE_NOT_FOUND:
        case ISSA_ERR_FAILED_TO_OPEN:		//if failed to open file for reading
            //"Failed to open file. Verify that file exists and is readable"
            msg = "[IDS_ERR_FAILED_TO_OPEN]";
            break;
        case ISSA_ERR_FAILED_TO_READ:		//if failed to read from a file
            //"Failed to read file. Verify that file is readable."
            msg = "[IDS_ERR_FAILED_TO_READ]";
            break;
        case ISSA_ERR_FAILED_TO_CREATE:		//if failed to create	
        case ISSA_ERR_CANNOT_COPY_LICENSE:
        case ISSA_ERR_CANNOT_CREATE_LICENSE_FOLDER:
            //"Failed to create file. Please verify that the folder ""%CommonProgramFiles%\\Intel\\Licenses"" is writable."
            msg = "[IDS_ERR_FAILED_TO_CREATE]";
            break;
        case ISSA_ERR_FAILED_TO_WRITE:		//if failed to write
            //"Failed to write to file. Please verify that the folder %CommonProgramFiles%\\Intel\\Licenses"" is writable."
            msg = "[IDS_ERR_FAILED_TO_WRITE]";
            break;
        case ISSA_WS_ERR_SN_ANON_REG_NO_LIC_FOR_PACKAGE:                 
            //"This serial number does not have any license rights associated with it and cannot be used for activating the product. Please provide a product serial number for activating the product."
            msg = "[IDS_ERR_SN_ANON_REG_NO_LIC_FOR_PACKAGE]";
            break;
        case ISSA_ERR_CONNECTION:
            // "Install program failed to establish Internet connection for activation. You will now be taken to offline activation steps."
            msg = "[IDS_USING_OFFLINE_MODE]";
            break;
        case ISSA_ERR_LICENSE_NOT_SUPPORTED:
            msg = "[ISSA_ERR_LICENSE_NOT_SUPPORTED]";
            break;
        case ISSA_WS_ERR_SN_MAXIMUM_ACTIVATIONS_REACHED:
            msg = "[IDS_LICENSE_SN_MAXIMUM_ACTIVATIONS_REACHED]";
            break;
        case ISSA_WS_ERR_SN_NF_ANON_REG_NOT_ALLOWED:
            // "The serial number <S/N> entered is for a floating license.  Please contact your system administrator or refer to https://software.intel.com/en-us/articles/how-to-upgrade-2016-floating-license for more information. "
            msg = "[IDS_ERR_SN_IS_FOR_FLOATING_LICENSE]";
            break;
        case ISSA_WS_ERR_LIC_EXPIRED: 
            // "Your (%product name%) license has expired.  Please refer to https://software.intel.com/en-us/faq/purchasing-renewing-upgrading#support-expiration for more information."
            msg = "[IDS_ERR_LICENSE_HAS_EXPIRED]";
            break;
        case ISSA_WS_ERR_TLL_LIC_EXPIRED: 
            msg = "[IDS_ERR_TLL_LICENSE_HAS_EXPIRED]";
            break;
        case ISSA_ERR_SN_BUILD_DATE_AFTER_SUPPORT_DATE:
            // "Product support for your (%product name%) license has expired.  Please refer to  https://software.intel.com/en-us/faq/purchasing-renewing-upgrading#support-expiration for more information."
            msg = "[IDS_ERR_PRODUCT_SUPPORT_HAS_EXPIRED]";
            break;
        case ISSA_ERR_UNSUPPORTED_BUILD_DATE:
            // "The input Time-Limited SN/License only support the older SW product release. Please make sure you are installing the latest version. Refer to https://software.intel.com/en-us/faq/purchasing-renewing-upgrading#support-expiration for more information."
            msg = "[IDS_ERR_UNSUPPORTED_BUILD_DATE]";
            break;
        case ISSA_WS_ERR_SN_HAS_NO_USABLE_FEATURES:
            // "A license for (%product name%) could not be found.  Please refer to https://software.intel.com/en-us/faq/licensing#invalid-license-error for more information."
            msg = "[IDS_ERR_LICENSE_COULD_NOT_BE_FOUND]";
            break;
        case ISSA_ERR_SERVER_OLDER:
            // "Your current Intel Software License Manager version is older than the installing product and unable to validate the license.  Please upgrade to the latest Intel Software License Manager from https://registrationcenter.intel.com/en/products/download/3116/  and try again"
            msg = "[IDS_ERR_SERVER_OLDER]";
            break;
        default : 
            msg = ""; //default message should be empty, giving an opportunity for high level funcntions to customize the final error message
        }
        
        return msg;
    }
    //###############################################################
    // checks that feature is valid
    // the ret.exit_code can have two values
    //     1 - regular license exists
    //     2 - only tll license exists
    //     therefore in expression  it can be used like feature & 3 - doesn't matter which license found; feature & 1 - only regular license is accepted
    //###############################################################
    var feature_valid = function(_feature_name, builddate, fulfillment_id,license_file, support_code)
    {
        Log("feature_valid: original_feature_name = " + _feature_name);
        var feature_name = String(_feature_name).replace(/_HYPHEN_/g, "-");

        Log("feature_valid: " + feature_name + " builddate = " + builddate + " fulfillment_id = " + fulfillment_id + " license_file = " + license_file + " support_code = " + support_code);

        var check = Activation(feature_name, builddate).Check();

        if( check.SetSupportType )
            check.SetSupportType(support_code ? support_code : 0);

        check.fulfillment_id = fulfillment_id ? fulfillment_id : "";
        

        var ret = {};

        var valid_lic_exists = check.Evaluate(license_file);
        ret.issa_code = check.error_code;

        check.tll_license_exists = valid_lic_exists && check.tll_used ? 1 : 0;
        check.regular_licenses = valid_lic_exists && !check.tll_used ? check.file : "";

        if(valid_lic_exists)
        { // ok, we have at least one license...
            Log("valid license exist");
            ret.exit_code = 1;
           
            if(check.tll_license_exists)
            {
                Log("TLL license exists");
                var days = check.days_remaining;
                Log("Found valid tll license, " + days + " remaining");
                ret.exit_code = 3;
                ret.error_message = StringList.Format("[IDS_TLL_DAYS_REMAINING]", days);
            }

            if(check.regular_licenses)
            { // regular licenses available... (trial is equal to regular)
                Log("Regular license exist");
                ret.exit_code = 1;
                ret.error_message = StringList.Format("[valid_license_file_found]", check.regular_licenses);
            }

        }
        else
        {
            Log("no valid license exist");
            ret.exit_code = 0;
            ret.error_message = StringList.Format("[no_valid_license_found]");
        }

        copy(check, ret);

        return ret;
    }

    //###############################################################
    // activation manager
    // it emulates the work of the Activation().Check() object (i.e. contains the same properties like tll_used ...)
    // to replace the Check object in configure method below
    //###############################################################
    var create_activation_manager = function(_info)
    {
        var activation_info_list = [];
        var features_info = {};
        var features = {};
        var irc_url = "";
        var used_serial_number = "";
        var tried_serial_number = "";
        var used_license_file = "";
        var support_type = "";
        var product_id = "";
        var fulfillment_id = "";
        var platforms = "";
        var media_id = "";
        var activation_type = "";
        var license_type = 0;
        var builddate = "";        

        var mngr = {};

        mngr.activation_type_t = {
            serial_number : "serial_number",
            license_file : "license_file",
            no_license : "no_license"
            /*, trial : "trial"*/}; // activation_type_t enum

        mngr.Log = log_helper("ActivationManager: ");

        // this variables made as properties of the mngr to have consistency with check object
        mngr.file = "";
        mngr.serial_number = "";
        mngr.tll_used = null;
        mngr.tll_only = null;
        mngr.days_remaining = null;
        mngr.last_check_result = null;
        mngr.activation_mode = "";
        mngr.support_code = 0;
        mngr.LastResult = {};

        //###############################################################
        // methods for defining calculative values for tll_used, tll_only and days_remaining
        //###############################################################
        var set_tll_used = function(val)
        {
            //manager tll_used means that one or more features were activatated by tll
            // if any activation used tll considered mngr also used tll
            mngr.tll_used = (mngr.tll_used === null) ? val : (!mngr.tll_used ? val : 1);
        }

        var set_tll_only = function(val)
        {
            // if any activation isn't tll_only then mngr also is not tll_only
            mngr.tll_only = (mngr.tll_only === null) ? val : (mngr.tll_only ? val : 0);
        }

        var set_days_remaining = function(val)
        {
            mngr.Log(" set_days_remaining " + val);
            mngr.days_remaining = (mngr.days_remaining === null) ? val : mngr.days_remaining;
            if(val && mngr.days_remaining > val)
               mngr.days_remaining = val;

            mngr.Log(" mngr.days_remaining = " + mngr.days_remaining);
        }

        //###############################################################
        // method for extracting features from the activation info object
        // extracted features are added into the common features hash
        //###############################################################
        var extract_features = function(info)
        {
            var ftrs = info.feature_name;

            var rgxp = /([\-\w\$]+)/ig;
            var elems =  ftrs.match(rgxp);

            info.features = {};

            for(var i in elems)
            {
                var el = elems[i];

                el = String(el).replace(/-/g,"_HYPHEN_");

                features[el] = 0;

                info.features[el] = el;

                if(!features_info[el])
                    features_info[el] = {};

                copy(info, features_info[el]);
            }
        }

        //#######################################
        var regular_license_exists = function(f_info, expr)
        {
            var regular_lics = {};

            for(var i in f_info)
            {
                // if expr is ftr1 || ftr2 and ftr 1 is trial_only but ftr2 isn't then the resault should be regular lic exists
                regular_lics[i] = f_info[i].regular_licenses ? 1 : 0;
            }

            var ret = 0;
            with(regular_lics)
            {
              ret = eval(expr);
            }
            Log("regular_license_exists = " + ret);
            return ret;
        }
        //#######################################
        //### tll_used property evaluator
        //#######################################
        var evaluate_tll_used = function(f_info, expr)
        {
            var tll = {};

            for(var i in f_info)
            {
                tll[i] = f_info[i].tll_license_exists ? 1 : 0;
            }

            var ret = 0;
            with(tll)
            {
                ret = eval(expr);
            }
            
            Log("evaluate_tll_used = " + ret);
            return ret;
        }

        //###############################################################
        // clears manager properties
        //###############################################################
        var clear_result = function()
        {
            mngr.file = "";
            mngr.serial_number = "";
            mngr.tll_used = null;
            mngr.tll_only = null;
            mngr.days_remaining = null;
            mngr.support_code = 0;
        }
        //###############################################################
        // set activation mode after activation
        //###############################################################
        //TODO: required deep analyze
        var set_activation_mode = function(activation_mode)
        {
            Log("Setting activation mode");
            if(mngr.tll_used)
            {
                if(!mngr.tll_only)
                { // not-tll licenses available...
                    Log("Regular & tll licenses exist");
                    mngr.activation_mode = activation_mode;
                }
                else
                {
                    Log("TLL license exists");
                    mngr.activation_mode = "during_tll";
                }
            }
            else
            {
                Log("Regular license exists");
                mngr.activation_mode = activation_mode;
            }
            
            Log("License: " + mngr.activation_mode + " is set");

        }        
        //###############################################################
        // clears last check result
        //###############################################################
        var clear_last_result = function()
        {
            mngr.LastCheckResult({exit_code : false, error_message : ""});
        }
        //###############################################################
        // IRC URL info
        //###############################################################
        mngr.IRC = function(url)
        {
            if(url)
              irc_url = url;

            return irc_url;
        }
        //###############################################################
        // SerialNumber info (success activation)
        //###############################################################
        mngr.SerialNumber = function(sn)
        {
            if(sn)
              used_serial_number = sn;

            return used_serial_number;
        }
        
        mngr.ActivationMode = function()
        {
            return mngr.activation_mode;
        }
        //###############################################################
        // TriedSerialNumber info
        //###############################################################
        mngr.TriedSerialNumber = function(sn)
        {
            if(sn)
              tried_serial_number = sn;

            return tried_serial_number;
        }
        //###############################################################
        // LicenseFile info (success activation)
        //###############################################################
        mngr.LicenseFile = function(f)
        {
            if(f)
              used_license_file = f;

            return used_license_file;
        }
        //###############################################################
        // Set/Get SupportCode
        //###############################################################
        mngr.SupportCode = function(_support_code)
        {
            if(typeof(_support_code) != "undefined")
              mngr.support_code = _support_code;

            return mngr.support_code;
        }
        //###############################################################
        mngr.SupportType = function(_support_type)
        {
            if(typeof(_support_type) != "undefined")
              support_type = _support_type;

            return support_type;
        }
        //###############################################################
        // Set/Get builddate
        //###############################################################
        mngr.BuildDate = function(_builddate)
        {
            if(_builddate)
              builddate = _builddate;

            return builddate;
        }
        //###############################################################
        // Set/Get LicenseType
        //###############################################################
        mngr.LicenseType = function(_license_type)
        {
            if(typeof(_license_type) != "undefined")
              license_type = _license_type;

            return license_type;
        }
        //###############################################################
        // Set/Get ActivationType
        //###############################################################
        mngr.ActivationType = function(_activation_type)
        {
            if(typeof(_activation_type) != "undefined")
              activation_type = _activation_type;

            return activation_type;
        }
        //###############################################################
        // Set/Get ActivationProductID
        //###############################################################
        mngr.MediaID = function(m_id)
        {
            if(m_id)
              media_id = m_id;

            return media_id;
        }
        //###############################################################
        // Set/Get ActivationProductID
        //###############################################################
        mngr.ProductID = function(p_id)
        {
            if(p_id)
              product_id = p_id;

            return product_id;
        }
        //###############################################################
        // Set/Get FulfillmentID
        //###############################################################
        mngr.FulfillmentID = function(ff_id)
        {
            if(ff_id)
              fulfillment_id = ff_id;

            return fulfillment_id;
        }
        //###############################################################
        // Set/Get Platforms
        //###############################################################
        mngr.Platforms = function(pfms)
        {
            if(pfms)
              platforms = pfms;

            return platforms;
        }
        //###############################################################
        // Adding info to manager
        // manager can store more then one info
        //###############################################################
        mngr.AddInfo = function(info)
        {
            if(!info)
                return;

            activation_info_list.push(info);
            extract_features(info);
        }
        //###############################################################
        // evaluates features expression base on the features hash (it is filled during the mngr.Evaluate method execution)
        //###############################################################
        mngr.EvaluateFeaturesExpression = function(_expression)
        {
            Log("EvaluateFeaturesExpression: original expression = " + _expression);

            var expression = String(_expression).replace(/-/g,"_HYPHEN_");

            mngr.Log("evaluation of \"" + expression + "\"" );

            var ret = 0;
            with(features)
            {
              ret = eval(expression);
            }

            mngr.Log("evaluation of \"" + expression + "\" = " + ret);

            return ret;
        }
        //###############################################################
        // launches provided callback with parameters 1st - features_info object, 2nd - feature_name
        //###############################################################
        mngr.FilterFeaturesInfo = function(cb)
        {
            if(!cb)
                return;

            for(var i in features_info)
               if(cb(features_info[i], i))
                  return true;

            return false;
        }
        //###############################################################
        // returns array of all features used in all added activations
        //###############################################################
        mngr.FeaturesList = function()
        {
            var arr = [];

            for(var i in features)
               arr.push(i);

            return arr;
        }
        //###############################################################
        mngr.UnusedFeaturesList = function()
        {
            var arr = [];

            for(var i in activation_info_list)
               if(activation_info_list[i].unused_flex_code_names)
                  arr.push(activation_info_list[i].unused_flex_code_names);

            return arr;
        }
        //###############################################################
        mngr.BuildDateList = function()
        {
            var arr = [];

            for(var i in features_info)
               arr.push(features_info[i].builddate);

            return arr;
        }
        //###############################################################
        mngr.MapFileDirList = function()
        {
            var arr = [];

            for(var i in features_info)
               if(features_info[i].map_file_dir)
                  arr.push(features_info[i].map_file_dir);

            return arr;
        }
        //###############################################################
        mngr.MediaIDList = function()
        {
            var arr = [];

            for(var i in features_info)
               if(features_info[i].media_id)
                  arr.push(features_info[i].media_id);

            return arr;
        }
        //###############################################################
        // looks for valid license in common store for each activation
        // returns true if any activation is succeed
        //###############################################################
        mngr.Evaluate = function()
        {
            
            var choose_worst = function (code1, code2)
            {
                //consider that less error code value means the worse error
                if (code2 < code1)
                    return code2;
                
                return code1;
            }
            
            clear_result();

            var activation_succeed = false;
            var license_files_list = {};
            var license_sn_list = []; //array
            var license_file = null;

            mngr.Log("Start activations evaluation");

            if(arguments.length && arguments[0])
                license_file = arguments[0];

            var issa_code = 0;
            
            var features_info_size = 0;
            var current_progress = 0;
            for(var fs in features_info){ features_info_size++; };
            var increase_value = parseInt(100 / (features_info_size ? features_info_size : 1));
            for(var i in features_info)
            {
                current_progress += increase_value;
                if(features_info_size > 1)
                    Wizard.StatusBar.SetProgressTitle(StringList.Format("[checking_license_perc]", current_progress));
                else
                    Wizard.StatusBar.SetProgressTitle(StringList.Format("[checking_license_no_perc]"));
                var f_inf = features_info[i];

                // extracting feature_name and feature support_code (if they exist)
                var elems =  i.split("$");

                var feature = elems[0];
                var feature_support_code = elems[1];

                var r = feature_valid(feature, mngr.BuildDate(), mngr.FulfillmentID(), license_file, feature_support_code);
                
                issa_code = choose_worst(issa_code, r.issa_code)

                features[i] = r.exit_code;
                Log("Feature: " + i + " >> support_code: " + r.code + " license_type: " + r.type);
                mngr.support_code = mngr.support_code | parseInt(r.code);
                if(r.type)
                    license_type = r.type;

                copy(r, f_inf);
            }

            mngr.Log("Dump features info ");
            for(var f in features)
            {
                mngr.Log(f + " val = " + features[f]);

                for(var j in features_info[f])
                   mngr.Log(f + "." + j + " = " + features_info[f][j]);

                mngr.Log("##################");
            }

            mngr.Log("Dump features info done");

            // start checking each activation
            for(var k in activation_info_list)
            {
                var info = activation_info_list[k];
                var expression = String(info.feature_name).replace(/-/g,"_HYPHEN_");

                mngr.Log("evaluation of \"" + expression + "\"" );

                var ret = 0;

                if(expression)
                {
                   with(features)
                   {
                     ret = eval(expression);
                   }
                }

                mngr.Log("evaluation of \"" + expression + "\" = " + ret);

                if(evaluate_tll_used(features_info, expression))
                {
                   info.tll_used = 1;
                   set_tll_used(1);

                   var days = null;
                   for(var m in info.features)
                   {
                       if (!features_info[m].tll_used)
                           continue;
                       // the remaining days is defined as the minimal value from the features which are used in expression.
                       days = (days === null) ? features_info[m].days_remaining : days;
                       if(features_info[m].days_remaining && days > features_info[m].days_remaining)
                          days = features_info[m].days_remaining;
                   }
                   days = (days === null) ? 0 : days; 
                   set_days_remaining(days);
                   info.days_remaining = days;
                }

                if(ret)
                {
                    if(regular_license_exists(features_info, expression))
                    {
                        set_tll_only(0);
                    }
                    else
                    {
                        set_tll_only(1);
                        info.tll_only = 1;
                    }
                    for(var n in info.features)
                    {
                        if(features_info[n].file)
                        {
                            license_files_list[features_info[n].file] = features_info[n].file;
                        }
                        if(features_info[n].serial_number)
                        {
                            license_sn_list.push(features_info[n].serial_number);
                        }
                    }
                    
                    license_sn_list.sort(function(a, b)
                    { 
                        var a0 = a.substring(0, 1);
                        var b0 = b.substring(0, 1);
                        //let's follow issa implementation
                        //V - eval, P - TLL
                        var da = a0 == "V" ? 3 : a0 == "P" ? 2 : 1;
                        var db = b0 == "V" ? 3 : b0 == "P" ? 2 : 1;
                        return da - db;
                    });

                    activation_succeed = true;
                }
            }

            mngr.file = "";
            for(var lf in license_files_list)
            {
               mngr.file = mngr.file ? ( mngr.file + "\r\n" + lf) : lf;
            }
            
            mngr.serial_number = "";
            if(license_sn_list.length)
                mngr.serial_number = license_sn_list[0];
            

            if(!activation_succeed)
            {
                mngr.LastCheckResult({exit_code : false, error_message : StringList.Format("[no_valid_license_found]")});
            }
            else
            {
                mngr.LastCheckResult({exit_code : true, error_message : StringList.Format("[valid_license_found]")});
                //store last successful result
                mngr.LastResult.file = mngr.file;
                mngr.LastResult.tll_used = mngr.tll_used;
                mngr.LastResult.tll_only = mngr.tll_only;
                mngr.LastResult.days_remaining = mngr.days_remaining;
                mngr.LastResult.serial_number = mngr.serial_number;
                mngr.LastResult.support_code = mngr.support_code;
            }
            
            var ret = {};
            ret.exit_code = activation_succeed;
            ret.issa_code = issa_code;

            return ret;
        }
        //#######################################
        // Returns result from latest Evaluate execution (object : {exit_code : true/false, error_message : string")} )
        //#######################################
        mngr.LastCheckResult = function(val)
        {
            if(typeof(val) != "undefined")
                mngr.last_check_result = val;

            return mngr.last_check_result;
        }
        //#######################################
        mngr.CheckValidLicenseExists = function()
        {
            mngr.Log("CheckValidLicenseFileExists start");
            clear_last_result();
            if(arguments.length && arguments[0]) //silent mode
                mngr.ActivationType(mngr.activation_type_t.license_file);

            Activation.UpdateListLicenses();
            var eval_ret = mngr.Evaluate();
            var res = mngr.LastCheckResult();

            if(res)
                mngr.Log("CheckValidLicenseFileExists: completed res = " + res.exit_code);
            else
            {
                // Evaluation done but res isn't defined - smth wrong!
                mngr.Log("WARNING: CheckValidLicenseFileExist: completed evaluate returned issa code = " + eval_ret.issa_code + " but LastCheckResult is not defined!");
            }

            return res;
        }
        //#######################################
        mngr.ActivateOnline = function(sn)
        {
            mngr.Log("OnlineActivation start");
            clear_last_result();
            mngr.ActivationType(mngr.activation_type_t.serial_number);
            if (sn)
                mngr.TriedSerialNumber(sn);

            if(!activation_info_list.length)
                return {exit_code : false, issa_code : 0, error_message : "no activation info"};

            var info = "";
            mngr.FilterFeaturesInfo(function(_inf) { info = _inf;});

            var online = Activation(info.feature_name, mngr.BuildDate()).Online();
            online.registration_center_url = info.registration_center_url;
            var check_existing_licenses = typeof(info.check_existing_licenses) != "undefined" ? true : false;

            var r = online.GetLicenseFromIrc(sn);
            if(!r)
                return {exit_code : false, issa_code : online.error_code, error_message : online.error_message};

            var eval_ret;
            if (check_existing_licenses)
            {
                Log("Evaluate licenses using check_existing_licenses tag");
                eval_ret = mngr.Evaluate();
            }
            else
            {
                var license_file = online.GetLicenseFileName();
                eval_ret = mngr.Evaluate(license_file);
            }
            mngr.Log("OnlineActivation completed res = " + eval_ret.exit_code + " issa_code = " + eval_ret.issa_code);

            if(!eval_ret.exit_code)
            {
                var err_msg = issa_error_message(eval_ret.issa_code);
                var gen_err_msg = "[IDS_INVALID_SN_FOR_PACKAGE]";
                return { exit_code: false, issa_code: eval_ret.issa_code, error_message: StringList.Format(err_msg ? err_msg : gen_err_msg) }
            }

            mngr.SerialNumber(sn);
            //mngr.activation_mode = "existing_license";
            set_activation_mode("activated_by_sn");
            //need to refresh internal data
            return {exit_code : true, issa_code: eval_ret.issa_code, error_message : StringList.Format("[valid_license_found]")};
        }
        //#######################################
        mngr.ActivateLicenseFile = function(file, floating_activation)
        {
            mngr.Log("LicenseActivation start");
            clear_last_result();
            mngr.ActivationType(mngr.activation_type_t.license_file);

            if(!activation_info_list.length)
                return {exit_code : false, issa_code: 0, error_message : "no activation info"};

            var info = "";
            mngr.FilterFeaturesInfo(function(_inf) { info = _inf;});

            var licfile = Activation(info.feature_name, mngr.BuildDate()).LicenseFile();
            mngr.Log("processing license file: " + file);
            var check_existing_licenses = typeof(info.check_existing_licenses) != "undefined" ? true : false;

            licfile.file = file;
            var r = licfile.SetLicenseFile();
            mngr.Log("processing license file. SetLicenseFile: " + r);
            if(!r)
                return {exit_code : false, issa_code: licfile.error_code, error_message : licfile.error_message};

            var eval_ret;
            if (check_existing_licenses)
            {
                Log("Evaluate licenses using check_existing_licenses tag");
                eval_ret = mngr.Evaluate();
            }
            else
            {
                eval_ret = mngr.Evaluate(file);
            }
            mngr.Log("LicenseActivation completed res = " + eval_ret.exit_code + " issa_code " + eval_ret.issa_code);
            
            if (!eval_ret.exit_code )
            {
                var err_msg =  issa_error_message(eval_ret.issa_code);
                var gen_err_msg = (floating_activation ? "[IDS_INVALID_FLOATING_LICENSE]" : "[IDS_INVALID_LICENSE_FILE]");
                return { exit_code: false, issa_code : eval_ret.issa_code, error_message: StringList.Format(err_msg ? err_msg : gen_err_msg) }
            }

            mngr.LicenseFile(file);
            //mngr.activation_mode = "existing_license";
            set_activation_mode("activated_by_file");
            return {exit_code : true, issa_code :  eval_ret.issa_code, error_message : StringList.Format("[valid_license_found]")};
        }
        //#######################################

        if(_info)
          mngr.AddInfo(_info);

        return mngr;
    }

    var manager = create_activation_manager();

    var instance = function(activation_info)
    {
        var f_info = activation_info;

        var activation_type_s = "none";
        var silent_activation_type = function(val)
        {
            if(typeof(val) != "undefined")
                activation_type_s = val;
            return activation_type_s;
        }

        var activation_type_g = "none";
        var activation_sn = "";

        var gui_activation_type = function() { return activation_type_g;}

        manager.AddInfo(activation_info);

        var activation_engine = manager;
        var check = manager;

        var activation_type_handler = function(control, action, value)
        {
            Log("Switching activation type, was: " + activation_type_g + " now: " + value);
            activation_type_g = value;
        }

        Wizard.Subscribe("activation/type", "type", activation_type_handler);

        var configure = function(dlg)
        {
            Log("Configuration licensing start");

            var ret = check.Evaluate();

             Log("configure check.file = " + check.file);
             Log("configure check.tll_used = " + check.tll_used);
             Log("configure check.tll_only = " + check.tll_only);
             Log("configure check.days_remaining = " + check.days_remaining);
             Log("configure check.support_code = " + check.support_code);

            if(ret.exit_code)
            { // ok, we have at least one license...
                Log("Valid licenses found");
                if(check.tll_used)
                {
                    Log("TLL licenses exists");
                    var days = check.days_remaining;
                    if(days >= 10) //use constant
                    {
                        check.activation_mode = "during_tll";
                        Log("License: during_tll mode is set");
                    }
                    else
                    {
                        check.activation_mode = "tll_about_to_expire";
                        Log("License: tll_about_to_expire mode is set");
                    }
                }
                //the following few lines
                //are the strange logic
                //TODO: think!

                if(check.tll_only)
                { // only tll license is available.
                    Log("Only tll license exists");
                }
                else
                { // non-trial licenses available...
                    Log("Regular & trial licenses exist");
                    Log("License: existing_license mode is set");
                    check.activation_mode = "existing_license";
                }
            }
            else
            {
                var days = check.days_remaining;
                if(days < 0) //means that tll expired
                {
                    Log("Only expired TLL license found on system");
                }
                else
                {
                    Log("Clean system");
                }
                Log("License: first_time_activation mode is set");
                check.activation_mode = "first_time_activation";

            }
        }

        var check_valid_license_exists = function(silent_mode)
        {
            var r = activation_engine.CheckValidLicenseExists(silent_mode);

            return {exit_code : r.exit_code, error_message : r.error_message};
        }

        var activate_sn_silent = function(sn)
        {
            var r = activation_engine.ActivateOnline(sn);

            return {exit_code : r.exit_code, error_message : r.error_message};
        }

        var activate_licfile_silent = function(file)
        {
            if(!file)
                return { exit_code: false, error_message: StringList.Format("[lic_file_not_defined]")};

            var r = activation_engine.ActivateLicenseFile(file);

            return {exit_code : r.exit_code, error_message : r.error_message};
        }

        return {Manager: manager,
                EvaluateFeaturesExpression: manager.EvaluateFeaturesExpression,
                SerialNumber : manager.SerialNumber,
                configure: configure,
                activation_info: f_info,
                check_valid_license_exists : check_valid_license_exists,
                last_check_result : manager.LastCheckResult,
                activate_sn : activate_sn_silent,
                activate_licfile : activate_licfile_silent,
                add_info : manager.AddInfo,
                gui_activation_type : gui_activation_type,
                silent_activation_type : silent_activation_type,
                ActivationMode : manager.ActivationMode,
                TriedSerialNumber : manager.TriedSerialNumber
                };
    }

    // Return License instance
    return {
        // Get the Singleton instance if one exists or create one if it doesn't
        getInstance: instance,
        //feature_valid: feature_valid
        EvaluateFeaturesExpression : manager.EvaluateFeaturesExpression
        }
};

//###############################################################



/** @fn Activation(string feature, string builddate)
 *  @brief Creates Activation object with pre-defined attributes
 *  @param string feature feature list
 *  @param string builddate date of the build
 */

/** @class Activation
 *  @brief Constructor for product activation and evaluation objects
 *  @details During installation some licensing info should be delivered to target system
 *    and evaluate for existing license files.
 *  @attr number error_code readonly, last operation error code
 *  @attr string error_message readonly, last operation error message
 *  @see Evaluate LicenseFile Trial Offline Online
 */

/** @method Activation Online
 *  @brief Create Online activation object
 *  @usage
 *    var online = Activation.Online();
 *  @see Online
 */

/** @method Activation Offline
 *  @brief Create Offline activation object
 *  @usage
 *    var offline = Activation.Offline();
 *  @see Offline
 */

/** @method Activation Trial
 *  @brief Create Trial activation object
 *  @usage
 *    var trial = Activation.Trial();
 *  @see Trial
 */

/** @method Activation LicenseFile
 *  @brief Create LicenseFile activation object
 *  @usage
 *    var lic_file = Activation.LicenseFile();
 *  @see LicenseFile
 */

/** @method Activation Check
 *  @brief Create licenses evaluation object
 *  @usage
 *    var eval = Activation.Evaluate();
 *  @see Check
 */


/** @class Online
 *  @brief Online object provides ability to deliver license file from IRC by Serial Number
 *  @details Online object provides ability to deliver license file from IRC by Serial Number
 *  @attr string feature_name read/write, feature specification string
 *  @attr string builddate read/write, date of the build
 *  @attr string registration_center_url read/write property to specify IRC registration url
 *  @attr number error_code readonly, last operation error code
 *  @attr string error_message readonly, last operation error message
 *  @see Evaluate LicenseFile Trial Offline Activation
 */

/** @method Online GetLicenseFromIrc(string sn)
 *  @brief Get license file from IRC
 *  @param string sn serial number to process
 *  @return boolean
 *    - true on success
 *    - false on failure
 *  @usage
 *    var online = Activation.Online();
 *    online.registration_center_url = "http://intel.com";
 *    if(online.GetLicenseFromIrc("1234-567890"))
 *    {
 *        // ok, license is delivered
 *    }
 *  @see Write
 */

/** @method Online IsIrcReachable
 *  @brief Check if IRC available
 *  @return boolean
 *    - true IRC is available
 *    - false IRC is not available
 *  @usage
 *    var online = Activation.Online();
 *    online.registration_center_url = "http://intel.com";
 *    if(online.IsIrcReachable())
 *    {
 *        // ok, IRC is available
 *    }
 *  @see Write
 */


/** @class Offline
 *  @brief Offline object provides ability to activate product by activation code
 *  @details Offline object provides ability to activate product by activation code
 *  @attr string feature_name read/write, feature specification string
 *  @attr string builddate read/write, date of the build
 *  @attr string unused_flex_code_names read/write, unused features enumeration
 *  @attr string media_id read/write, media id string
 *  @attr string map_file_dir read/write, path to map file
 *  @attr number error_code readonly, last operation error code
 *  @attr string error_message readonly, last operation error message
 *  @see Evaluate LicenseFile Trial Online Activation
 */

/** @method Offline GetActivationCode(string sn)
 *  @brief Get activation code to pass it to IRC
 *  @param string sn serial number to process
 *  @return string activation code to pass to IRC or null on failure
 *  @note Prior to call this function properties feature_name, unused_flex_code_names,
 *    media_id and map_file_dir must be initialized
 *  @usage
 *    var offline = Activation.Offline();
 *    offline.feature_name = "feature";
 *    offline.unused_flex_code_names = "unused_feature";
 *    offline.media_id = "my_media_id";
 *    offline.map_file_dir = "c:\\program files\\map_file.txt";
 *    online.registration_center_url = "http://intel.com";
 *    var code = offline.GetActivationCode("1234-567890");
 *    if(code)
 *    {
 *        // ok, code is generated
 *    }
 *  @see Write
 */

/** @method Offline ActivateByUnlockCode(string sn, string unlock_code)
 *  @brief Extract license from map file by unlock code
 *  @param string sn serial number to process
 *  @param string unlock_code unlock code provided by IRC
 *  @return boolean
 *    - true on success
 *    - false on failure
 *  @note Prior to call this function properties feature_name, unused_flex_code_names,
 *    media_id and map_file_dir must be initialized
 *  @usage
 *    var offline = Activation.Offline();
 *    offline.feature_name = "feature";
 *    offline.unused_flex_code_names = "unused_feature";
 *    offline.media_id = "my_media_id";
 *    offline.map_file_dir = "c:\\program files\\map_file.txt";
 *    online.registration_center_url = "http://intel.com";
 *    var code = offline.GetActivationCode("1234-567890");
 *    if(code)
 *    {
 *        // ok, code is generated, pass it to IRC
 *        if(offline.ActivateByUnlockCode("1234-567890", returned_from_irc_code))
 *        {
 *            // activated
 *        }
 *    }
 *  @see Write
 */


/** @class Trial
 *  @brief Activate trial license
 *  @details Trial object provides ability to activate trial period of product usage
 *  @attr number error_code readonly, last operation error code
 *  @attr string error_message readonly, last operation error message
 *  @see Evaluate LicenseFile Online Offline Activation
 */



/** @class LicenseFile
 *  @brief Activate product by license file or license server
 *  @details LicenseFile object provides ability to activate product by license file or license server
 *  @attr string feature_name read/write, feature specification string
 *  @attr string builddate read/write, date of the build
 *  @attr string file read/write, path to license file or remote license server specification string
 *    in format <code>port\@host</code>
 *  @attr number error_code readonly, last operation error code
 *  @attr string error_message readonly, last operation error message
 *  @see Evaluate Online Trial Offline Activation
 */

/** @method LicenseFile SetLicenseFile
 *  @brief Process license file
 *  @return boolean
 *    - true on success
 *    - false on failure
 *  @note Prior to call this function properties builddate and file must be initialized
 *  @usage
 *    var lic_file = Activation.LicenseFile();
 *    lic_file.file = "c:\\program files\\license.lic";
 *    lic_file.builddate = "2016.12.31";
 *    if(lic_file.SetLicenseFile())
 *    {
 *        // ok, license file processed
 *    }
 */


/** @class Check
 *  @brief Check of feature list on existing licenses (regular or evaluation)
 *  @details LicenseFile object provides ability to activate product by license file or license server
 *  @attr string feature_name read/write, feature specification string
 *  @attr string builddate read/write, date of the build
 *  @attr string fulfillment_id read/write, fulfillment_id specification string, used for evaluation of
 *    trial licenses
 *  @attr string product_id read/write, product_id specification string, used for evaluation of
 *  @attr boolean tll_only readonly, true if detected only tll licenses for specified features,
 *    available only after Evaluate method called
 *  @attr boolean tll_used readonly, true if detected at least one tll license for specified features,
 *    available only after Evaluate method called
 *  @attr number days_remaining readonly, number of days to trial expiration,
 *    available only after Evaluate method called
 *  @attr number type readonly, license type,
 *    available only after Evaluate method called
 *  @attr number code readonly, license support code,
 *    available only after Evaluate method called
 *  @attr string file readonly, license file found for specified feature set,
 *    available only after Evaluate method called
 *
 *  @attr number error_code readonly, last operation error code
 *  @attr string error_message readonly, last operation error message
 *  @see Online LicenseFile Trial Offline Activation
 */

/** @method Evaluate Evaluate
 *  @brief Evaluate available licenses for specified features
 *  @return boolean
 *    - true on success
 *    - false on failure
 *  @note Prior to call this function at least properties builddate and feature_name must be initialized
 *  @usage
 *    var eval = Activation.Evaluate();
 *    eval.builddate = "2016.12.31";
 *    eval.feature_name = "feature1 & feature2";
 *    if(eval.Evaluate())
 *    {
 *        // ok, found valid licenses
 *    }
 */
