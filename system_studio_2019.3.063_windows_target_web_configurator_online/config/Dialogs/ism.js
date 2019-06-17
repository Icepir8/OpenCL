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
    var format = StringList.Format;

    this.Init = function()
    {
        var ns = this;

        var init = false;
        var selected = false;

        //###############################################################
        // ISM participate
        //###############################################################
        this.ISMOptIn = function()
        {
            if(!init)
            {
                init = true;
                if(!Ism.OptInAvailable() || !Ism.OptInIsAccepted())
                {
                    Wizard.Notify("ISM agree", "set checked", false);
                    Wizard.Notify("ISM degree", "set checked", false);
                }
            }

            if(selected)
                Wizard.Next.Enable();
            else
                Wizard.Next.Disable();

            ns.DialogHeader("ISMOptIn");
            ns.Buttons("[Next]", "[Prev]", "[Cancel]");
            Wizard.Prev.Enable();
            Wizard.Cancel.Enable();
            ns.Stage("options.png");
            return Action.Dialog({name:"ism", mode:"sync"});
        }

        this.ISMOptIn.Skip = function() {return Ism.OptInAvailable() && Ism.OptInIsAccepted();}

        Wizard.Subscribe("ISM text", "OnClicked", function(control, command, value)
        {
            Execute.URL("http://software.intel.com/en-us/articles/software-improvement-program");
        });

        Wizard.Notify("ISM text", "mark link", "[learn_more]");

        ns.DialogHeader("ISMOptIn", "[subtitle_ismoptin]");

        var on_click = function(agree) {return;}
        var clicked = function(val)
        {
            selected = true;
            on_click(val);
            Wizard.Next.Enable();
        }

        this.ISMOptIn.OnClick = function(cb) {on_click = cb;}
        Wizard.Subscribe("ISM agree", "OnClicked", function(){clicked(true);});
        Wizard.Subscribe("ISM degree", "OnClicked", function(){clicked(false);});
    }
}




