/*
    script for logging unit test results
*/
new function()
{
	var testsLogs = [];
	var testLog = {};
	
	testLog.testID;
	testLog.messages = [];
	testLog.statuses = [];
	testLog.steps = [];
	
	function GetLogObj(testId)
	{
		for(var log in testsLogs)
		{
			if(testsLogs[log].testID == testId)
			{
				return testLog = testsLogs[log];
			}
		}

		return null;
	}
	
	this.StoreLogData = function(args)
	{	
		testLog = GetLogObj(args.testID);

		if(testLog == null)
		{
		    testLog = {};
			testLog.testID = args.testID;
			testLog.messages = [];
			testLog.statuses = [];
			testLog.steps = [];
			testsLogs.push(testLog);
		}

		testLog.messages.push(GetFormattedDate() + "  " + args.message);
		testLog.statuses.push(args.status);
		testLog.steps.push(args.step);
	}
	
	this.GetLogData = function () { return testsLogs; }

	function GetFormattedDate()
	{
		var date = new Date();
	
		var formDate = date.getFullYear() + "." +
					     (date.getMonth() + 1) + "." +
					     date.getDate() + "_" +
					     date.getHours() + "." +
					     date.getMinutes() + "." +
					     date.getSeconds() + "." +
					     date.getMilliseconds();
						 
		return formDate;			 
	}

    this.SaveLogData = function (testsLogs) {

        var logInfo;
        
        var tc_format = GetOpt.Get("teamcity_logs");
        
        if(!tc_format)
        {
            logInfo = CreatePlainTextLog(testsLogs);
        }
        else
        {
            logInfo = CreateTeamCityLog(testsLogs);
        }
        
		WriteLogToFile(logInfo);
 	} 

    function CreatePlainTextLog(testsLogs) {
    
        var stepsPassed = [];
		var stepsFailed = [];
		var fullInfo = new String();
		var resultInfo = new String();
		var testNum = 0;

        var unitTestsLogSeparator = "#########################################################################################################################################\n" +
                                    "#########################################################################################################################################\n" +
                                    "########################################################### UNIT TESTS LOG ##############################################################\n" +
                                    "#########################################################################################################################################\n" +
                                    "#########################################################################################################################################\n";
		for(var log in testsLogs)
		{
				testsLogs[log].messages.forEach(function(value, i) 
				{		
					fullInfo = fullInfo + value + "\r\n";
				});	
				fullInfo = fullInfo + "---------------------------------------------------------------------------------------------------" + "\r\n";
		
				var stepStatus = null;

				testsLogs[log].statuses.forEach(function(value, i) 
				{		
					if(value)
					{
						stepsPassed.push(testsLogs[log].steps[i]);
					}
					else
					{
						stepsFailed.push(testsLogs[log].steps[i]);

						if(i != testsLogs[log].statuses.length-1)
						{
							stepStatus = stepStatus + testsLogs[log].steps[i] + ", ";
						}
						else
						{
							stepStatus = stepStatus + testsLogs[log].steps[i];
						}
					}
				});
				
				testNum++;

				if(stepStatus != null)
					stepStatus = ". FAILED steps: " + stepStatus;
				else
					stepStatus = ". PASSED";
				
				resultInfo = resultInfo + testNum + ". " + testsLogs[log].testID + stepStatus + "\r\n";
		}

		var headInfo = "##############################################Results##############################################" +
		"\r\n" + "Tests executed" + "\r\n";

		var summaryInfo = "\r\n" + "Summary: " + stepsPassed.length + " Steps passed, " + stepsFailed.length + " Steps failed ";
		var logInfo = unitTestsLogSeparator + fullInfo + headInfo + resultInfo + summaryInfo; 
		
        //uncomment this block to store to log file functions that were covered by unit tests
        
		/* if(this.coveredMethods.length > 0)
		{
			var codeCoveringInfo = "\r\n\r\n" + "Code covering : " + "\r\n\r\n";
			
			for(var val in this.coveredMethods)
			{
				codeCoveringInfo = codeCoveringInfo + this.coveredMethods[val] + "\r\n";
			}
			
			logInfo = logInfo + codeCoveringInfo;
		} */
        
        return logInfo;
    }
    
    function CreateTeamCityLog(testsLogs) {
    
        var resultInfo="";
    
        for(var log in testsLogs)
		{
            resultInfo = resultInfo + "##teamcity[testStarted name='"+testsLogs[log].testID+"']\r\n";
        
            var messagesList = [];
        
            testsLogs[log].messages.forEach(function(value, i) 
			{		
				messagesList.push(value);
			});	

			testsLogs[log].statuses.forEach(function(value, i)                              
			{		
				var output = messagesList[i].replace(/'/g, "|'").replace(/\[/g, "|[").replace(/\]/g, "|]").replace(/[\n\r]+/g, "|n");
			
				if(value)
				{
                    resultInfo = resultInfo + "##teamcity[testStdOut name='"+testsLogs[log].testID+"' out='"+output+"']\r\n"; 
				}
				else
				{      
                    resultInfo = resultInfo + "##teamcity[testFailed name='"+testsLogs[log].testID+"' message='"+output+"']\r\n";
				}
			});
			
            resultInfo = resultInfo + "##teamcity[testFinished name='"+testsLogs[log].testID+"']\r\n";
		}

        return resultInfo;
    }
    
    
    
	function WriteLogToFile(message) {

		var outputPath = GetOpt.Get("logPath");

		if(!outputPath)
		{
			outputPath = FileSystem.MakePath("micl_unit_tests_log", FileSystem.MakePath("..", (FileSystem.MakePath("..", FileSystem.GetTemp()))));
		}
		
		if(!FileSystem.Exists(outputPath))
		{	
			FileSystem.CreateDirectory(outputPath);
		}
		
		var fileName = "\\TestLog_" + GetFormattedDate() + ".log";

		FileSystem.WriteFileUTF8(outputPath + fileName, message);
		
		//uncomment GetClassesAttributes() to start storing attributes from Micl JS classes to Log file
		//this algorithm needs property with name 'Type', value = "Property" to be added to functions Property(), Constant() which is contained in property.js file
	
		//GetClassesAttributes(); 
	}

	var base_dir = FileSystem.MakePath("\\Config\\Base", FileSystem.MakePath("..", Origin.Directory()));
	var base = function (name) { return required(FileSystem.MakePath(name, base_dir)); };
	var ns_enums = base("enums.js");
	var tempObj = {};
	ns_enums.BindTo(tempObj);
	var enumsKeys = Object.keys(tempObj);

	this.coveredMethods = [];
	var classMethods = [];
	var storedMethods = [];
	
	this.StoreTestCovering = function(ID, objClass, objTest)
	{
		ID = "##############" + ID + "##############";
	
		if(this.coveredMethods.indexOf(ID) == -1)
		{
			this.coveredMethods.push(ID);
			storedMethods = [];
		}

		ParseMethods(objClass);

		for(var method in classMethods)
		{
			if(objTest.toString().indexOf("." + classMethods[method].toString() + "(") > -1 || objTest.toString().indexOf("." + classMethods[method].toString() + ".") > -1)
			{	
				if(storedMethods.indexOf(classMethods[method]) == -1)
				{
					storedMethods.push(classMethods[method]);
					this.coveredMethods.push(classMethods[method] + "()");
				}
			} 
		}

		classMethods = [];
	}
	
	function ParseMethods(obj)
	{	
		var keys = Object.keys(obj);
	
		for(var key in keys)
		{
			if(classMethods.indexOf(keys[key]) == -1 && enumsKeys.indexOf(keys[key]) == -1)
			{
				classMethods.push(keys[key]);
			}
		}
	}
	
	var keys = [];

	function GetClassesAttributes()
	{
		var casc_dir = base("cascade_dir.js");
		var ns_cmp_inf = base("component_info.js");
		var ns_arp = base("component_arp3.js");
		var ns_cmp_is = base("component_isource3.js");
		var ns_cmp_micl = base("component_micl3.js");
		var ns_cmp_msi = base("component_msi3.js");
		var ns_prc = base("component_processor.js");	
		var ns_prcE = base("component_processor_exe.js");
		var ns_prcM = base("component_processor_msi.js");
		var ns_prcZ = base("component_processor_zip.js");
		var ns_compSource = base("component_source.js");
		var comp_z = base("component_zip.js");	
		var cmp = base("component3.js");	
		var configurator = base("configurator.js");
		var cont = base("container.js");
		var dp_man = base("dp_manager.js");
		var dump = base("dumper.js");
		var dumpDB = base("dumper_db.js");
		var dumpDown = base("dumper_download.js");
		var dumpF = base("dumper_file.js");
		var dumpR = base("dumper_registry.js");
		var event = base("event.js");
		var exec = base("executor.js");
		var ns_ftr_inf = base("feature_info.js");
		var ftr = base("feature3.js");
		var ftrGui = base("feature_gui.js");
		var ftrMp = base("feature_map.js");
		var install = base("install.js");
		var installer = base("installer.js");
		var lic = base("license.js");
		var meth = base("method.js");
		var pathCh = base("path_checker.js");
		var prod = base("product3.js");
		var prop = base("property.js");
		var propSet = base("property_set.js");
		var scen = base("scenario3.js");
		var upgr = base("upgrade3.js");
		var vers = base("version.js");
		var que = base("queue.js");
		
		
		var dir = casc_dir.Directory("","");
		var c_arp = ns_arp.Create({Info : ns_cmp_inf.InfoPure("1"), ARPId : "1"});
		
		var infoPure = ns_cmp_inf.InfoPure("","");
		var infoComp = ns_cmp_inf.ComponentInfo();
		var infoWI = ns_cmp_inf.InfoWI(1);

		var comp_i = ns_cmp_is.Create({Info : ns_cmp_inf.InfoPure("2" + "2") , ISFolder : "2"});
		
		var comp_m = ns_cmp_micl.Create({Info : ns_cmp_inf.InfoPure("4" + "4") , ISFolder : "4"});
		
		var comp_msi = ns_cmp_msi.Create({Info : ns_cmp_inf.InfoPure("6" + "6") , ISFolder : "6"});
		
		var proc = ns_prc.Processor();
		
		var procDB = ns_prc.ProcessorDB();
		var procE = ns_prcE.ProcessorExe();
		var procM = ns_prcM.ProcessorMSI();
		var procZ = ns_prcZ.ProcessorZip();
		
		var copm_sF = ns_compSource.FileSource("C:\\test.exe","");
		var copm_sU = ns_compSource.UrlSource("C:\\test.exe","","");
		var copm_sS = ns_compSource.ScopeSource();
		var copm_sKF = ns_compSource.KeyFileSource("C:\\test.exe");
		var copm_TF = ns_compSource.Transform("C:\\test.exe", "");
		
		var compZip = comp_z.Create({Info : ns_cmp_inf.InfoPure("8" + "8") , ISFolder : "8"});
		
		var componentCreate = cmp.Create({Info : ns_cmp_inf.InfoPure("10" + "10") , ISFolder : "10"});
		
		var tempObj = {};
		
		var conf = configurator.Configurator(tempObj);
		var confComp = configurator.ComponentConfigurator(tempObj);
		var confFeat = configurator.FeatureConfigurator(tempObj);
		var container = cont.Container();
		var dumper = dump.Dumper("");
		var dumperIter = dump.Iterator(dumper);
		var dumpertrace = dump.Trace(dumper);
		
		var dumperDB = dumpDB.CreateAction();
		
		var dumperDownload = dumpDown.Download();
		
		var dumpFile = dumpF.File();
		var dumpDir = dumpF.Directory();
		
		var dumpRegistry = dumpR.CreateAction();
		
		var FEvent = event.FEvent();
		var Event = event.Event();
		
		var executor = exec.Executor();
		
		var featureInfo = ns_ftr_inf.InfoPure("Test_Root_Feature","Test_Root_Feature","Test_Root_Feature","1.0"); 

		var feature = ftr.Create(featureInfo);

		var ns_installer = installer.Installer;
		
		var method = meth.Method("");
		
		var pathChecker = pathCh.PathChecker("");
		
		var product = prod.Create(featureInfo);
		
		var property = prop.Property();
		var propertyConst = prop.Constant();
		var propertyCollect = prop.Collector();
		
		var property_set = propSet.PropertySet();
		
		var scenario = scen.Create();
		
		var upgrade = upgr.Upgrade();
 		var upgradeTarg = upgr.UpgradeTarget();
		var upgradeEntry = upgr.UpgradeEntry;
		var upgradeEntryGroup = upgr.GroupUpgradeEntry;
		var upgradeMSIComp = upgr.MSIComponentCodeUpgradeEntry;
		var upgradeProd = upgr.MSIProductCodeUpgradeEntry;
		var upgradeMSI = upgr.MSIUpgradeCodeUpgradeEntry;
		
		var version = vers.Version();
		var versionTypeName = vers.TypeName();
		
		var queue = que.Queue();
		
		keys.push("###########################cascade_dir.js###########################")
		IterateAttributes(casc_dir, null, "cascade_dir");
		IterateAttributes(dir, null, "cascade_dir.Directory");

		keys.push("###########################component_arp3.js###########################")
		IterateAttributes(ns_arp, null, "component_arp");
		IterateAttributes(c_arp, null, "component_arp"); 
		
		keys.push("###########################component_info.js###########################")
		IterateAttributes(ns_cmp_inf, null, "component_info");
		IterateAttributes(infoPure, null, "component_info.InfoPure");
		IterateAttributes(infoComp, null, "component_info.ComponentInfo");
		IterateAttributes(infoWI, null, "InfoWI");

		keys.push("###########################component_isource3.js###########################")
		IterateAttributes(ns_cmp_is, null, "component_isource");
		IterateAttributes(comp_i, null, "component_isource");

		keys.push("###########################component_micl3.js###########################")
		IterateAttributes(ns_cmp_micl, null, "component_micl");
		IterateAttributes(comp_m, null, "component_micl");
		 
		keys.push("###########################component_msi3.js###########################")
		IterateAttributes(ns_cmp_msi, null, "component_msi");
		IterateAttributes(comp_msi, null, "component_msi");

		keys.push("###########################component_processor.js###########################")
		IterateAttributes(ns_prc, null, "component_processor");
		IterateAttributes(proc, null, "component_processor.Processor");

		IterateAttributes(ns_prc, null, "component_processorDB");
		IterateAttributes(procDB, null, "component_processorDB.Processor");
		
		
		keys.push("###########################component_processor_exe.js###########################")
		IterateAttributes(ns_prcE, null, "component_processor_exe");
		IterateAttributes(procE, null, "component_processor_exe.ProcessorExe");

		keys.push("###########################component_processor_msi.js###########################")
		IterateAttributes(ns_prcM, null, "component_processor_msi");
		IterateAttributes(procM, null, "component_processor_msi.ProcessorMSI");
		
		keys.push("###########################component_processor_zip.js###########################")
		IterateAttributes(ns_prcZ, null, "component_processor_zip");
		IterateAttributes(procZ, null, "component_processor_zip.ProcessorZip");
		
		keys.push("###########################component_source.js###########################")
		IterateAttributes(ns_compSource, null, "component_source");
		IterateAttributes(copm_sF, null, "component_source.FileSource");
		IterateAttributes(copm_sU, null, "component_source.UrlSource");
		IterateAttributes(copm_sS, null, "component_source.ScopeSource");
		IterateAttributes(copm_sKF, null, "component_source.KeyFileSource");
		IterateAttributes(copm_TF, null, "component_source.Transform");
		
		keys.push("###########################component_zip.js###########################")
		IterateAttributes(compZip, null, "component_zip");

		keys.push("###########################component3.js###########################")
		IterateAttributes(cmp, null, "component");
		IterateAttributes(componentCreate, null, "component");

		keys.push("###########################configurator.js###########################")
		IterateAttributes(configurator, null, "configurator");
		IterateAttributes(conf, null, "configurator.Configurator");
		IterateAttributes(confComp, null, "configurator.ConfiguratorComponent");
		IterateAttributes(confFeat, null, "configurator.ConfiguratorFeature");
		
		keys.push("###########################container.js###########################")
		IterateAttributes(cont, null, "container");
		IterateAttributes(container, null, "container.Container");
		
		keys.push("###########################dp_manager.js###########################")
		IterateAttributes(dp_man, null, "dp_manager");

		keys.push("###########################dumper.js###########################")
		IterateAttributes(dump, null, "dumper");
		IterateAttributes(dumper, null, "dumper.Dumper");
		IterateAttributes(dumperIter, null, "dumper.Iterator");
		IterateAttributes(dumpertrace, null, "dumper.Trace");

		keys.push("###########################dumperDB.js###########################")
		IterateAttributes(dumpDB, null, "dumperDB");
		IterateAttributes(dumperDB, null, "dumperDB.CreateAction");
		
		keys.push("###########################dumperDownload.js###########################")
		IterateAttributes(dumpDown, null, "dumperDownload");
		IterateAttributes(dumperDownload, null, "dumperDownload.Download");
		
		keys.push("###########################dumper_file.js###########################")
		IterateAttributes(dumpF, null, "dumper_file");
		IterateAttributes(dumpFile, null, "dumper_file.File");
		IterateAttributes(dumpDir, null, "dumper_file.Directory");
		
		keys.push("###########################dumper_registry.js###########################")
		IterateAttributes(dumpR, null, "dumper_registry");
		IterateAttributes(dumpRegistry, null, "dumper_registry.CreateAction");
		
		keys.push("###########################event.js###########################")
		IterateAttributes(event, null, "event");
		IterateAttributes(FEvent, null, "event.FEvent");
		IterateAttributes(Event, null, "event.Event");
		
		keys.push("###########################executor.js###########################")
		IterateAttributes(exec, null, "executor");
		IterateAttributes(executor, null, "executor.Executor");

		keys.push("###########################feature_info.js###########################")
		IterateAttributes(ns_ftr_inf, null, "feature_info");
		
		keys.push("###########################feature3.js###########################")
		IterateAttributes(ftr, null, "feature");
		IterateAttributes(feature, null, "feature");
		
		keys.push("###########################feature_gui.js###########################")
		IterateAttributes(ftrGui, null, "feature_gui");
		
		keys.push("###########################feature_map.js###########################")
		IterateAttributes(ftrMp, null, "feature_map");
		
		keys.push("###########################install.js###########################")
		IterateAttributes(install, null, "install");
		
		keys.push("###########################installer.js###########################")
		IterateAttributes(ns_installer, null, "installer");
		
		keys.push("###########################license.js###########################")
		IterateAttributes(lic, null, "license");
		
		keys.push("###########################method.js###########################")
		IterateAttributes(meth, null, "method");
		IterateAttributes(method, null, "method.Method");
		
		keys.push("###########################path_checker.js###########################")
		IterateAttributes(pathCh, null, "path_checker");
		IterateAttributes(pathChecker, null, "path_checker.PathChecker");
		
		keys.push("###########################product3.js###########################")
		IterateAttributes(prod, null, "product");
		IterateAttributes(product, null, "product");
		
		keys.push("###########################property.js###########################")
		IterateAttributes(prop, null, "property");
		IterateAttributes(property, null, "property.Property");
		IterateAttributes(propertyConst, null, "property.Constant");
		IterateAttributes(propertyCollect, null, "property.Collector");
		
		keys.push("###########################property_set.js###########################")
		IterateAttributes(propSet, null, "property_set");
		IterateAttributes(property_set, null, "property_set.PropertySet");
		
		keys.push("###########################scenario3.js###########################")
		IterateAttributes(scen, null, "scenario");
		IterateAttributes(scenario, null, "scenario.Create");
		
		keys.push("###########################upgrade3.js###########################")
		IterateAttributes(upgr, null, "upgrade");
		IterateAttributes(upgrade, null, "upgrade.Upgrade");
		IterateAttributes(upgradeTarg, null, "upgrade.UpgradeTarget");
		IterateAttributes(upgradeEntry, null, "upgrade.UpgradeEntry");
		IterateAttributes(upgradeEntryGroup, null, "upgrade.GroupUpgradeEntry");
		IterateAttributes(upgradeMSIComp, null, "upgrade.MSIComponentCodeUpgradeEntry");
		IterateAttributes(upgradeProd, null, "upgrade.MSIProductCodeUpgradeEntry");
		IterateAttributes(upgradeMSI, null, "upgrade.MSIUpgradeCodeUpgradeEntry");

		keys.push("###########################version.js###########################")
		IterateAttributes(vers, null, "version");
		IterateAttributes(version, null, "version.Version");
		IterateAttributes(versionTypeName, null, "version.TypeName");

		keys.push("###########################queue.js###########################")
		IterateAttributes(que, null, "queue");
		IterateAttributes(queue, null, "queue.Queue");
		
		for(var i in keys)
		{
			Log(keys[i]);
		}
	}     
	
	function IterateAttributes(obj, val, objName)
	{		
		for(var prop in obj)
		{
			if(obj["Type"] != "Property" || objName.indexOf("property") > -1)
			{
				if(typeof (obj[prop]) == "function")
				{
					if(val)
					{
						var value = objName + "." + val + "." + prop + "()";
						
						if(keys.indexOf(value) == -1)
							keys.push(value);	
					}
					else
					{
						var value = objName + "." + prop + "()";
					
						if(keys.indexOf(value) == -1)
							keys.push(value);	
					}

					arguments.callee(obj[prop], prop, objName);
				}
			}
		}
	}
}