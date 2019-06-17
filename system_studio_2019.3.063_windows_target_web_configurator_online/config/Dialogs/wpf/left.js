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
    var load = function(name) {return required(FileSystem.AbsPath(Origin.Directory(), name));};
    var base = function(name) {return load("../../Base/" + name);};

    var format = StringList.Format;

    var wpf      = base("wpf.js");
    var ns_event = base("event.js");

    var itemwidth = 28;
    var radius0 = 4;
    var radius1 = 5;
    var radius2 = 2;

    var filter = function(coll, cb)
    {
        for(var i in coll)
            if(cb(coll[i], i))
                return true;
        return false;
    }

    var _left =
    {
        control: "Grid",
        columns: [{width: 162}],
        rows: [{minHeight: 412, height: "*"}],
        children: [
            {
                control: "Image",
                uri: FileSystem.AbsPath(Origin.Directory(), "../../Banners/b_norm.png"),
                stretch: "fill",
                name: "m_image"
            },
            {
                control: "Grid",
                rows: ["*", "auto"],
                children: [
                    {
                        control: "Image",
                        uri: FileSystem.AbsPath(Origin.Directory(), "../../Banners/intel.png"),
                        GridRow: 1,
                        stretch: "none",
                        margin: {all: 30}
                    }
                ]
            },
            {
                control: "Grid",
                columns: [itemwidth, {control: "ColumnDefinition", width: "*", name: "m_stages_column"}],
                margin: {top: 12},
                children: [
                    {
                        control: "StackPanel",
                        GridColumn: 1,
                        margin: {top: 3, right: 5},
                        name: "m_stages"
                    },
                    {
                        control: "Canvas",
                        GridColumn: 0,
                        name: "m_canvas"
                    }
                ]
            }
        ]
    };

    this.Left = function()
    {
        var lft = wpf.BuildControl(_left);

        var stages = []; // string array of stages
        var stagemap = {}; // map of stages ID:number in array
        var stgs = []; // array of objects where stage descriptions saved

        var line = function(y1, y2)
        {
            var l = WPF.Line();
            l.stroke = "white";
            l.strokeThickness = 2;
            l.x1 = 0;
            l.y1 = y1;
            l.x2 = 0;
            l.y2 = y2;

            return l;
        }

        var stline = line(0, 0); // top-left start line
        var line0 = line(0, 0);  // solid line
        var line1 = line(0, 0);  // dotted line

        stline.x1 = 0;
        stline.y1 = 0;
        stline.moveend = function(v)
        {
            var wi = lft.js.m_canvas.actualWidth;
            stline.x2 = wi / 2 - (!v ? (radius1 / 2) : 0);
            stline.y2 = wi / 2 - (!v ? (radius1 / 2) : 0);
            return {x: wi / 2, y: wi / 2}; // return start point
        }

        line1.strokeDashArray = [2, 2];
        line1.strokeLineJoin = "round";

        var resizing = false;
        var set_stages_positions = function()
        {
            try
            {
                if(resizing)
                    return; // disable second entrance

                resizing = true;

                var y = 0;

                filter(stgs, function(st, r)
                {
                    var hei = st.box.actualHeight;
                    var wi = lft.js.m_canvas.actualWidth;
                    if(st.ellipse)
                    {
                        st.x = (wi / 2);
                        st.y = (wi / 2) + y - st.box.padding.top;

                        st.Stage();
                    }

                    y += hei;
                });

                if(stgs.length)
                {
                    line0.x1 = stgs[0].x;
                    line0.y1 = stgs[0].y;
                    line0.x2 = stgs[0].x;

                    line1.x1 = stgs[stgs.length - 1].x
                    line1.x2 = stgs[stgs.length - 1].x
                    line1.y2 = stgs[stgs.length - 1].y;
                }
            }
            catch(e)
            {
                Log("Exception: " + e);
            }

            resizing = false;

        }

        var build_stages = function()
        {
            stgs = [];

            lft.js.m_canvas.children.Clear();
            lft.js.m_stages.children.Clear();

            lft.js.m_canvas.children.Add(stline);
            lft.js.m_canvas.children.Add(line0);
            lft.js.m_canvas.children.Add(line1);

            filter(stages, function(st, r)
            {
                var tb = WPF.TextBlock();
                tb.text = st;
                tb.foreground = "white";
                tb.fontSize = 14;
                tb.padding.bottom = 10;
                tb.wrap = "wrap";
                tb.borderThickness = 0;
                lft.js.m_stages.children.Add(tb);

                var ell = WPF.Ellipse();
                ell.stroke = "white";
                ell.width = radius1 * 2;
                ell.height = radius1 * 2;
                ell.strokeThickness = 2;

                lft.js.m_canvas.children.Add(ell);

                var stg = {box:tb, ellipse: ell, x: 0, y: 0, state: "before"};

                // Set stage specific attributes
                stg.Stage = function(s)
                {
                    if(arguments.length)
                        stg.state = s;

                    var deactivate = function(rad)
                    {
                        ell.width = rad * 2;
                        ell.height = rad * 2;

                        WPF.SetCanvasLeft(ell, stg.x - rad);
                        WPF.SetCanvasTop(ell, stg.y - rad);
                        tb.fontWeight = "normal";
                        ell.fill = "white";
                        if(stg.first)
                            stline.moveend(true);
                    }

                    switch(stg.state)
                    {
                        case "before":
                            deactivate(radius0);
                            break;
                        case "after":
                            deactivate(radius2);
                            break;
                        case "active":
                            tb.fontWeight = "bold";
                            WPF.SetCanvasLeft(ell, stg.x - radius1);
                            WPF.SetCanvasTop(ell, stg.y - radius1);
                            ell.width = radius1 * 2;
                            ell.height = radius1 * 2;
                            ell.fill = "transparent";

                            if(stg.first)
                                line0.visible = false;
                            else
                                line0.visible = true;

                            if(stg.last)
                                line1.visible = false;
                            else
                                line1.visible = true;

                            line0.y2 = stg.y - radius1;
                            line1.y1 = stg.y + radius1;

                            if(stg.first)
                                stline.moveend(false);

                            break;
                    }
                };

                stg.Activate = function() {stg.Stage("active");}

                stg.Deactivate = function(l) {stg.Stage(l ? "after" : "before");}

                stgs.push(stg);
                tb.resized = set_stages_positions;
            });

            if(stgs.length)
            {
                stgs[0].first = true;
                stgs[stgs.length - 1].last = true;
            }
        };

        lft.Activate = ns_event.FEvent();

        lft.Activate.Connect(function(id)
        {
            var changeline = function(n)
            {
                filter(stgs, function(s, pos)
                {
                    if(pos != n)
                        stgs[pos].Deactivate(pos > n);
                    else
                        stgs[pos].Activate();
                });
            };

            if(id in stagemap)
                changeline(stagemap[id]);
            else
            { // check if here is "special" stage: canceled or failed
                var abort = function(text)
                {
                    var uri = FileSystem.AbsPath(Origin.Directory(), "../../Banners/b_failed.png");
                    stgs[stgs.length - 1].box.text = text;
                    lft.js.m_image.uri = uri;
                    changeline(stgs.length - 1);
                };

                if(id == "canceled" || (id ||"").match(/canceled\:\:.+/i)) // mask caneled::... allows to set arbitrary failed state
                    abort(format("[left_canceled]"));
                else if(id == "failed" || (id ||"").match(/failed\:\:.+/i))
                    abort(format("[left_failed]"));
            }
        });

        lft.Stages = function(s)
        {
            stages = [];
            stagemap = {};
            stgs = [];
            filter(s, function(st)
            {
                if(st.id)
                {
                    stagemap[st.id] = stages.length;
                    stages.push(st.name);
                }
            });
            build_stages();
            set_stages_positions();
            if(s.length)
                lft.Activate(s[0].id);
        }

        return lft;
    }
}



