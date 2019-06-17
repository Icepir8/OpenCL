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

    var ns_enums    = load("enums.js");
    var ns_prop     = load("property.js");

    var blank_f = function(){return ""};

    var P = function(val){return ns_prop.Property(val);}

    var ns = this;

    var db_only = function() {return GetOpt.Exists("db-processor");}

    this.Processor = function()
    {
        var proc = {};
        var m_owner = null;

        ns_enums.BindTo(proc);

        proc.Owner = function(obj)
        {
            if(obj)
                m_owner = obj;

            return m_owner;
        }
        proc.IsInstalled = function() { return false; }
        proc.InstallParams = function() {return m_owner ? m_owner.InstallConfigurationOptions().String() : "";}
        proc.RemoveParams = function() {return m_owner ? m_owner.RemoveConfigurationOptions().String() : "";}
        proc.State = function ()
        {
            if(proc.IsInstalled())
                return proc.state_t.installed;

            return this.state_t.absent;
        }
        proc.Commit = function(){return true;}
        proc.RemoveAct = function (){return {};}
        proc.InstallAct = function (){return {};}
        proc.RepairAct = function (){return {};}

        proc.InstallActObject = P(); // this property will contain the Install action dumper which is defined only during the ApplyInstall.
        proc.InstallActObject.Set = blank_f; // shouldn't be able to modify it via usual proc.P(val);

        proc.RepairActObject = P(); // this property will contain the Repair action dumper which is defined only during the ApplyRepair.
        proc.RepairActObject.Set = blank_f; // shouldn't be able to modify it via usual proc.P(val);

        proc.RemoveActObject = P(); // this property will contain the Remove action dumper which is defined only during the ApplyRemove.
        proc.RemoveActObject.Set = blank_f; // shouldn't be able to modify it via usual proc.P(val);

        return proc;
    }
    //######################################################################
    var cmp_hive = "ComponentDBStore::";
    this.ProcessorDB = function()
    {
        var db_proc = ns.Processor();
        var self = db_proc;
        var st = Storage(cmp_hive + "*");

        db_proc.IsInstalled = function()
        {
            if(st && st("initialized"))
            {
                try
                {
                    st("initialized").value = 1;
                }
                catch(e)
                {
                    Log("component_processor::IsInstalled failed to set st('initialized').value");
                }
                st.Read(cmp_hive + db_proc.Owner().Id());
                try
                {
                    if(st && st("installed") && st("installed").value == "1")
                        return true;
                }
                catch(e)
                {
                    Log("component_processor::IsInstalled caught the exception, returning false");
                }
            }

            return false;
        }

        db_proc.RemoveAct = function()
        {
            var prg = Progress();
            prg.total = 1;
            prg.message = StringList.Format("[removing]", db_proc.Owner().Info().Name());

            var db = {};

            db.Apply = function()
            {
                Log("RemoveAct: apply, id = " + db_proc.Owner().Id());
                Storage("*").Write(cmp_hive + db_proc.Owner().Id());

                return Action.r_ok;
            }

            db.ProgressApply = function() {return prg;}

            return db;
        }

        db_proc.InstallAct = function()
        {
            var prg = Progress();
            prg.total = 1;
            prg.message = StringList.Format("[installing]", db_proc.Owner().Info().Name());

            var db = {};

            db.Apply = function()
            {
                Log("InstallAct: apply, id = " + db_proc.Owner().Id());
                st("id").value = db_proc.Owner().Id();
                st("name").value = db_proc.Owner().Name();
                st("installed").value = "1";
                st("parameters").value = db_proc.Owner().ConfigurationOptions().String();
                st.Write(cmp_hive + db_proc.Owner().Id());

                return Action.r_ok;
            }

            db.Rollback = function()
            {
                var rmact = self.RemoveAct();
                if(rmact.Apply)
                    return rmact.Apply();

                return Action.r_ok;
            }

            db.ProgressApply = function() {return prg;}

            return db;
        }

        db_proc.RepairAct = function()
        {
            var prg = Progress();
            prg.total = 1;
            prg.message = StringList.Format("[installing]", db_proc.Owner().Info().Name());

            var db = {};

            db.Apply = function()
            {
                Log("RepairAct: apply, id = " + db_proc.Owner().Id());
                st("id").value = db_proc.Owner().Id();
                st("name").value = db_proc.Owner().Name();
                st("installed").value = "1";
                st("repaired").value = "1";
                st("parameters").value = db_proc.Owner().ConfigurationOptions().String();
                st.Write(cmp_hive + db_proc.Owner().Id());

                return Action.r_ok;
            }

            db.Rollback = function()
            {
                return Action.r_ok;
            }

            db.ProgressApply = function() {return prg;}

            return db;
        }

        return db_proc;
    }
}
