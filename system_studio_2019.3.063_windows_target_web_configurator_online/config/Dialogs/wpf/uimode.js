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

/*
   basic interface to manipulate by user interface mode
   based on command line switches script provides set of
   flags to unify & simplify user interface interaction level
   */

new function()
{
    var nsmod = this;

    var uimode_silent  = "uimode";
    var switch_silent  = "silent";
    var switch_quiet   = "quiet";
    var switch_passive = "passive";

    var param_progress = "progress";

    var ui_mode_t = {
        full    : "full",    // normal UI mode
        minimal : "minimal", // progress only, no interaction with user
        silent  : "silent"   // completely silent mode
    };

    var ui_mode_level = {
        full    : 100, // maximum
        minimal : 50,  // middle, progress only or so
        silent  : 1    // completely silent
    };

    var uimode = ui_mode_t.full; // set full mode by default

    var Level = function(mod) {return parseInt(ui_mode_level[mod || uimode]);};
    var Mode = function() {return uimode;};
    var UIAllowed = function() {return Level() >= Level(ui_mode_t.minimal);};
    var Silent = function() {return Level() <= Level(ui_mode_t.silent);};

    this.ui_mode_t     = ui_mode_t;
    this.ui_mode_level = ui_mode_level;

    this.Level     = Level;
    this.Mode      = Mode;
    this.UIAllowed = UIAllowed;
    this.Silent    = Silent;

    this.ForceMode = function(mod) {Log("Forcing mode= " + mod); uimode = mod;};

    this.Attach    = function(obj) {obj.ui_mode_t = ui_mode_t; obj.ui_mode_level = ui_mode_level;};

    this.Above     = function(mod) {return Level() > Level(mod);}; // check if input level is higher that current level
    this.AboveEqu  = function(mod) {return Level() >= Level(mod);}; // check if input level is higher or equal that current level
    this.Below     = function(mod) {return Level() < Level(mod);}; // check if input level is lower that current level
    this.BelowEqu  = function(mod) {return Level() <= Level(mod);}; // check if input level is lower or equal that current level
    this.Equal     = function(mod) {return Level() === Level(mod);}; // check if input level is equal that current level

    this.Interactive = function() {return nsmod.Above(ui_mode_t.minimal);};

    if(GetOpt.Exists(switch_silent))
    {
        var sln = GetOpt.Get(switch_silent);
        Log("Found argument: " + switch_silent + " : " + sln);
        uimode = sln == param_progress ? ui_mode_t.minimal : ui_mode_t.silent;
    }
    else if(GetOpt.Exists(switch_quiet))
    {
        Log("Found argument: " + switch_quiet);
        uimode = ui_mode_t.silent;
    }
    else if(GetOpt.Exists(switch_passive))
    {
        Log("Found argument: " + switch_passive);
        uimode = ui_mode_t.minimal;
    }

    Log("UI Mode based on command line parameters: " + uimode);
}


