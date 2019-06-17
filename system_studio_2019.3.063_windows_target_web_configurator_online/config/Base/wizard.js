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

/** @file wizard.js
 * @brief Binding for Wizard infrastructure.
 * @details Wizard infrastructure provides basic interface to manipulate
 *   GUI (subscriptions, notifications)
 */

/** @class Wizard
 *  @brief Wizard - binding to Wizard infrastructure
 *  @details Wizard object is singletone JScript object which attached to
 *    C++ Wizard infrastructure
 *
 *  @attr Wizard_Button Next   - Next button control
 *  @attr Wizard_Button Prev   - Prev button control
 *  @attr Wizard_Button Cancel - Cancel button control
 */

/** @method Wizard Notify(string id, string message, data value)
 *  @brief Notify - send notification to control
 *  @details Most of GUI controls have notification ability to provide
 *    communication between controls and installation logic (script).
 *    Every notification message includes 3 items:<br>
 *      id      - control id, string, represents id of control<br>
 *      message - message name, string, for example "hide", "show", etc. See 
 *                sources (wizard.h) to find list of available messages<br>
 *      value   - optional value passed to control<br>
 *  @param string id - control id
 *  @param string message - message id
 *  @param data value - optional, value to pass to control, it may be any simple
 *    value, like integer, string
 *  @return data Function returns result of processing notification by handler function.
 *    For details see Subscribe method
 *  @usage
 *    Wizard.Notify("next", "set text", "Next");
 *    // this code sends "set text" notification to "next" (Next button) control
 *    // to set caption text to "Next"
 *  @see Subscribe Filesystem::ReadFileUTF8
 */

/** @method Wizard Subscribe(string id, string message, function handler)
 *  @brief Subscribe - subscribe for notifications from GUI control
 *  @details In some cases script program need to be notified from UI control
 *    about some events, for example in case if text in editbox is changed
 *    script program should execute any actions (update another UI control).
 *    To provide this ability script program should register own handler to
 *    catch notification from UI controls.<br>
 *    Every notification message includes 3 items:<br>
 *      id      - control id, string, represents id of control<br>
 *      message - message name, string, for example "hide", "show", etc. See 
 *                sources (wizard.h) to find list of available messages<br>
 *      value   - optional value passed to control<br>
 *    When script program subscribes for notification is should pass to
 *    Subscribe function what kind of notifications it want to catch
 *    (arguments id & message), and specify handler function.
 *    Handler function should have format:
 *      <pre>
 *      var handler = function(id, message, value)
 *      {
 *          // make here something
 *          return result;
 *      }
 *      </pre>
 *    Returning result is optional. Returned value is passed to notification
 *    initiator and may be processed.
 *    Additional arguments passed to handler:<br>
 *      id      - id of control who initiated notification<br>
 *      message - message id.<br>
 *    These two arguments are same as passed to Notify method.
 *    Same handler function may be used for several notofocations. Analyzing
 *    input arguments 'id' and 'message' function handler may apply different
 *    logic for different controls and messages
 *  @param string id        - control id
 *  @param string message   - message id
 *  @param function handler - function handler.
 *  @usage
 *    var handler = function(id, message, value)
 *    {
 *        Log("Catched notification from " + id + ": " + message);
 *        return 0;
 *    }
 *
 *    Wizard.Subscribe("my control", "OnClicked", handler);
 *  @note
 *    For every control may be registered only one handler for specific message.
 *    It means that you can not register two different handlers for
 *    control "my control" & message "my message". Source code below is <b>incorrect</b>:
 *    <pre>
 *      var handler1 = function(id, message, value)
 *      {
 *          Log("Handler1: Catched notification from " + id + ": " + message);
 *          return 0;
 *      }
 *
 *      var handler2 = function(id, message, value)
 *      {
 *          Log("Handler2: Catched notification from " + id + ": " + message);
 *          return 0;
 *      }
 *
 *      Wizard.Subscribe("my control", "my message", handler1);
 *      Wizard.Subscribe("my control", "my message", handler2);
 *    </pre>
 *    will be called only handler2 function on notification from "my control"
 *    control and "my message" message
 *  @see Notify
 */

/** @method Wizard Canceled
 *  @brief Canceled - check if used pressed Cancel button
 *  @details During installation any action may failed to execute: it may fail due to
 *    system error or may be canceled by user. Canceled method provides
 *    simple way to detect why action was not finished properly.
 *  @return boolean true  - user canceled action
 *  @return boolean false - system error happened
 *  @usage
 *    if(Wizard.Canceled())
 *        DialogCanceled("User canceled installation");
 *    else
 *        DialogError("Something wrong");
 */

/** @class Wizard_Button
 *  @brief Binding to Next, Prev & Cancel buttons controls
 *  @details This attribute provides binding to Next, Prev & Cancel buttons controls
 */

/** @method Wizard_Button Enable
 *  @brief Enable - Enable control
 *  @details Enable control. If control is enabled user is able to push button
 *  @see Disable
 */

/** @method Wizard_Button Disable
 *  @brief Disable - Disable control
 *  @details Disable control. If control is disabled it cannot process any input from user
 *  @see Enable
 */

// implementation Notification wrapper in Wizard object
// added 2 functions: Subscribe & OnNotify

// Subscribe(id, notify, callback) - add notifier callback
//  id - control ID
//  notify - notification string
//  callback - function to call when notification arrives. function should have format:
//    cb(id, notify, value)

// OnNotify(id, notify, value) - function called by binding to notify
// for internal use only

var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
var base = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
var dialogs = function(name) {return load("../Dialogs/wpf/" + name);};

var ns_wpf = base("wpf.js");
var ns_prop = base("property.js");
var P = function(val){return ns_prop.Property(val);}

if(typeof(Wizard) != "undefined")
{ // add Subscribe & OnNotify methods to Wizard object
    var notifications = new Object;

    Wizard.Subscribe = function(id, notify, callback)
    {
        if(id && notify && Wizard._Subscribe)
        {
            if(!notifications[id])
                notifications[id] = new Object;

            notifications[id][notify] = callback;
            Wizard._Subscribe(id, notify);
        }
    }

    Wizard.OnNotify = function(id, notify, value)
    {
        if(id && notify)
        {
            if(notifications && notifications[id] && notifications[id][notify])
                return notifications[id][notify](id, notify, value);
        }
    }
    //collections of classes
    Wizard.ControlCollection = {};
    Wizard.WidgetCollection = {};
    Wizard.DialogCollection = {};
    
    Wizard.ActiveDialog = P();
    Wizard.ActiveModalDialog = P();
    Wizard.FirstDialog = P();
    
    //Theme allows to customize installer's look
    Wizard.Theme = P();
    Wizard.BuildControl = function(template)
    {
        return ns_wpf.BuildControl(template, Wizard.Theme());
    }

    Wizard.ShowDialog = function(d)
    {
        //here is an unbundling
        var ns_dlg = dialogs("win_dialog.js");
        var dlg_ctrl = d.Control();
        var dlg = ns_dlg.Dialog(dlg_ctrl);
        return dlg();
    }

}

// this function used in wizard binding: it is called during notification callback
function WizardNotificatorCallback(id, notify, value)
{
    if(typeof(Wizard) != "undefined" && Wizard.OnNotify)
        return safecall(function(){return Wizard.OnNotify(id, notify, value);},
                        function(){this.Log(Log.l_error, "Notification failed: exception catched."); return null;});
}








