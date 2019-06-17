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

Namespace("Root.ErrorHandler", function()
{
    var load = function(name) {return required(FileSystem.MakePath(name, Origin.Directory()));};
    var base = function(name) {return load("../../Base/" + name);};

    var ns_wpf   = base("wpf.js");
    var ns_nav   = load("navigator.js");
    var ns_uimod = load("uimode.js");
    var ns_event = base("event.js");

    var fontsize = 12;

    var format = StringList.Format;
    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    };

    var _continue = {
        control: "DockPanel",
        lastFill: true,
        margin: 10,
        children: [
            {
                control: "StackPanel",
                Dock: "top",
                children: [
                    // {
                    //     control: "TextBlock",
                    //     wrap: "wrap",
                    //     fontSize: "22",
                    //     fontWeight: "bold",
                    //     text: format("[title]"),
                    //     name: "m_title"
                    // },
                    {
                        control: "TextBlock",
                        wrap: "wrap",
                        fontSize: "14",
                        fontWeight: "bold",
                        margin: {bottom: 10},
                        text: format("[Error]")
                    }
                ]
            },
            {
                control: "FlowDocumentScrollViewer",
                vscroll: "auto",
                margin: {top: 10},
                document: {
                    name: "m_document",
                    blocks: [
                        {
                            control: "Paragraph",
                            fontSize: fontsize,
                            name: "m_header",
                        },
                        {
                            control: "Section",
                            fontSize: fontsize,
                            name: "m_container",
                        },
                        {
                            control: "Paragraph",
                            inlines: [format("[click_to_continue]")],
                            fontSize: fontsize,
                            name: "m_footer"
                        }
                    ]
                }
            }
        ]
    };

    var ns = this;
    var window = null;
    var errlist = [];
    var toperr = null;

    this.Window = function(w)
    {
        if(arguments.length)
            window = w;
        else
            return window;
    };

    this.Set = function(err) {errlist.push(err);};
    this.SetRoot = function(err) {toperr = err;};
    this.Clear = function() {errlist = []; toperr = null;};
    this.Failed = function() {return errlist.length || toperr;}; // check if there are errors
    this.Error = function()
    {
        var errs = [];
        var add = function(e, fea)
        {
            if(e && e.message)
            {
                var err = {message: e.message};
                if(e.details)
                    err.details = e.details;
                if(fea)
                    err.component = fea.Id();
                errs.push(err);
            }
        };
        add(toperr);
        filter(errlist, function(e) {add(e.error, e.feature);});
        return errs.length ? errs : null;
    };

    this.OnError = ns_event.FEvent();

    var control = Wizard.BuildControl(_continue);
    control.navigator = ns_nav.ContinueCancel();

    var rtf_errorobject = function(list, usebold)
    {
        Log("Building rtf_error from: " + JSON.stringify(list));

        if(!list)
            return {};

        var strings = [].concat(list);
        
        if(strings.length == 1)
            return {control: "RichTextBox", rtfText: "\\line"+strings[0],vscroll: "auto", readOnly: true, borderThickness: 0,documentEnabled: true,clicked: function(uri) {Execute.URL(uri);}};
        else 
            return {control: "RichTextBox", rtfText: format("[unknown_error]"), readOnly: true};
    }

    var errorobject = function(list, usebold)
    { // first element set as header, second element add as bold, other - just text
        Log("Building error from: " + JSON.stringify(list));

        if(!list)
            return {};

        var strings = [].concat(list);
        for(var string in strings){
            // Removing RTF markup from error strings
            if (strings[string])
                strings[string] = strings[string].replace(/\{\*?\\[^{}]+\}|[{}]|[\\\\]+[nr]?[A-Za-z]+\n?(?:-?\d+)?[ ]?/gmi, "").replace(/^\s+|\s+$/gi, "");
        }

        if(strings.length == 1)
            return {control: "Paragraph", inlines: [strings[0]], fontSize: fontsize, fontWeight: "bold"};
        else if(strings.length > 1)
        {
            var header = strings.shift();
            var bold = usebold ? strings.shift() : "";

            var errsec = {control: "StackPanel", children: usebold ? [
                {
                    control: "TextBlock",
                    text: bold,
                    fontWeight: "bold",
                    fontSize: fontsize,
                    margin: {left: 20},
                    wrap: "wrap"
                }
            ] : []};
            filter(strings, function(e)
            {
                if(e)
                    errsec.children.push({control: "TextBlock", wrap: "wrap", fontSize: fontsize, text: e, margin: {left: 20}});
            });
            var ctl = {
                control: "BlockUIContainer",
                child: {
                control: "Expander",
                header: {
                    control: "TextBlock",
                    wrap: "wrap",
                    fontWeight: "bold",
                    fontSize: fontsize,
                    text: header},
                content: errsec
            }};
            Log("Generated control: " + JSON.stringify(ctl));
            return ctl;
        }
        else
            return {control: "Paragraph", inlines: [format("[unknown_error]")], fontSize: fontsize, fontWeight: "bold"};
    };

    var errtoarr = function(err)
    {
        if(typeof(err) == "string")
            return [err];
        else
            return [err.message].concat(err.details ? err.details : []);
    };

    var feaerror = function(fea, err)
    {
        return errorobject([fea].concat(errtoarr(err)), true);
    };

    var tree = function(toplevel, error)
    {
        if(toplevel)
        {
            return rtf_errorobject(errtoarr(toperr));
        }
        else if(error)
        {
            return errorobject(errtoarr(error));
        }
        else
        {
            var section = {control: "Section", blocks: []};
            filter(errlist, function(e)
            {
                var fea = e.feature;
                var err = e.error;
                if(fea && err)
                    section.blocks.push(feaerror(format(fea.Name()), err));
            });
            return section;
        }
    };

    this.Container = function() {return Wizard.BuildControl(tree(toperr));};

    this.Handler = function(fea, optional)
    { // add handler to feature
        var handler = function(iterator)
        {
            Log("handler called");
            var item = iterator.Item();
            var error = (item && typeof(item.Error) == "function") ? item.Error() : null;
            if(!error)
            {
                Log("error object is not defined. Try to read global error container");
                var errs = GlobalErrors.List();
                if(errs && errs.length)
                {
                    error = {message: errs[0]};
                    if(errs.length > 1)
                    {
                        error.details = [];
                        errs.shift();
                        filter(errs, function(e) {error.details.push(e); return;});
                    }
                    GlobalErrors.Clear();
                }
                else
                {
                    Log("Ok, global error container is empty too... so, let's assume that it is internal error");
                    error = {message: format("[internal_error_in_processing]", format(fea.Name()))};
                }
            }

            ns.OnError(fea, error);

            if(optional && window && ns_uimod && ns_uimod.Interactive())
            {
                var dlg = window.Dialog(control);
                control.js.m_container.blocks.Clear();
                control.js.m_container.blocks.Add(Wizard.BuildControl(tree(false, error)));
                control.js.m_header.inlines.Clear();
                control.js.m_header.inlines.Add(ns_wpf.BuildControl({
                    control: "Run",
                    text: format("[feature_failed]", format(fea.Name()))
                }));

                var state = window.Taskbar.State();
                window.Taskbar.State("paused");
                // control.js.m_title.text = format("[title]"); // refresh title
                var res;
                if(window.Spawn(dlg) == Action.r_ok)
                {
                    res = true;
                    errlist.push({feature: fea, error: error});
                }
                else
                {
                    res = false;
                    toperr = error; // save error to top-level error object
                    Wizard.Abort();
                }
                window.Taskbar.State(state);
                return res;
            }

            toperr = error;
            return false;
        };

        fea.ErrorHandler(handler);
        return handler;
    };

    //this.Test = function(fea, error, window)
    //{
        //var dlg = window.Dialog(control);
        //control.js.m_container.blocks.Clear();
        //control.js.m_container.blocks.Add(Wizard.BuildControl(tree(false, error)));
        //control.js.m_header.inlines.Clear();
        //control.js.m_header.inlines.Add(ns_wpf.BuildControl({
            //control: "Run",
            //text: format("[feature_failed]", format(fea.Name()))
        //}));
        //dlg();
    //};

//    this.Cancel = function(window)
//    {
//        if(window)
//        {
//            var cancel = Wizard.BuildControl(_cancel)
//            cancel.navigator = ns_nav.YesNo();
//            return window.Dialog(cancel);
//        }
//        else
//            return _cancel;
//    }
});
