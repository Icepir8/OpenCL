
new function()
{
    this.Component = function(components, root)
    {
        var comps = root.select("components/component[@alias and @installdirname]");
        for(var i in comps)
        {
            var alias = comps[i].attributes.alias;
            var dirname = comps[i].attributes.installdirname;

            if(components[alias])
            {
                var comp = components[alias];
                Log("Redefine install dir property name for " + alias);
                if(comp.Processor &&
                   comp.Processor() &&
                   comp.Processor().InstallDirProperty)
                {
                    var proc = comp.Processor();
                    Log("Redefine install dir property name for " + alias);
                    if(dirname && proc && proc.InstallDirProperty)
                    {
                        Log("Redefine install dir property name: " + alias + " : " + dirname);
                        components[alias].Processor().InstallDirProperty(dirname);
                    }
                }
            }
        }
    }
}


