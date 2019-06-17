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
new function () {
    var load = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "\\..\\")); };
    var base = function (name) { return required(FileSystem.MakePath(name, Origin.Directory() + "../../Base")); };

    var ns = this;

    //detect and return information about old IDE integrations
    this.GetIDEInfo = function () {

        //10.1
        var c_cmp101 = {};
        c_cmp101.id = "c_cmp101";
        c_cmp101.name = "IDE of C++ Compiler 10.1";
        c_cmp101.data = {};
        c_cmp101.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\101", type: "hive" };

        var f_cmp101 = {};
        f_cmp101.id = "f_cmp101";
        f_cmp101.name = "IDE of Visual Fortran Compiler 10.1";
        f_cmp101.data = {};
        f_cmp101.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\101", type: "hive" };

        //11.0
        var c_cmp110 = {};
        c_cmp110.id = "c_cmp110";
        c_cmp110.name = "IDE of C++ Compiler 11.0";
        c_cmp110.data = {};
        c_cmp110.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\110", type: "hive" };
        c_cmp110.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\110", value: "PackageId", type: "value" };
        c_cmp110.data.installed_dir_vs2003 = { key: "SOFTWARE\\Intel\\IDE\\C++\\110\\VSNet2003", value: "ProductDir", type: "directory" };
        c_cmp110.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\C++\\110\\VSNet2005", value: "ProductDir", type: "directory" };
        c_cmp110.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\C++\\110\\VSNet2008", value: "ProductDir", type: "directory" };

        var f_cmp110 = {};
        f_cmp110.id = "f_cmp110";
        f_cmp110.name = "IDE of Visual Fortran Compiler 11.0";
        f_cmp110.data = {};
        f_cmp110.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\110", type: "hive" };
        f_cmp110.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\110", value: "PackageId", type: "value" };
        f_cmp110.data.installed_dir_vs2003 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\110\\VSNet2003", value: "ProductDir", type: "directory" };
        f_cmp110.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\110\\VSNet2005", value: "ProductDir", type: "directory" };
        f_cmp110.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\110\\VSNet2008", value: "ProductDir", type: "directory" };

        //11.1
        var c_cmp111 = {};
        c_cmp111.id = "c_cmp111";
        c_cmp111.name = "IDE of C++ Compiler 11.1";
        c_cmp111.data = {};
        c_cmp111.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\111", type: "hive" };
        c_cmp111.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\111", value: "PackageId", type: "value" };
        c_cmp111.data.product_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\111", value: "ProductId", type: "value" };
        c_cmp111.data.installed_dir_vs2003 = { key: "SOFTWARE\\Intel\\IDE\\C++\\111\\VSNet2003", value: "ProductDir", type: "directory" };
        c_cmp111.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\C++\\111\\VSNet2005", value: "ProductDir", type: "directory" };
        c_cmp111.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\C++\\111\\VSNet2008", value: "ProductDir", type: "directory" };

        var f_cmp111 = {};
        f_cmp111.id = "f_cmp110";
        f_cmp111.name = "IDE of Visual Fortran Compiler 11.1";
        f_cmp111.data = {};
        f_cmp111.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\111", type: "hive" };
        f_cmp111.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\111", value: "PackageId", type: "value" };
        f_cmp111.data.installed_dir_vs2003 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\111\\VSNet2003", value: "ProductDir", type: "directory" };
        f_cmp111.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\111\\VSNet2005", value: "ProductDir", type: "directory" };
        f_cmp111.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\111\\VSNet2008", value: "ProductDir", type: "directory" };

        //12.0
        var c_cmp120 = {};
        c_cmp120.id = "c_cmp120";
        c_cmp120.name = "IDE of C++ Compiler 12.0";
        c_cmp120.data = {};
        c_cmp120.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 12.0", type: "hive" };
        c_cmp120.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 12.0", value: "PackageId", type: "value" };
        c_cmp120.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\C++\\120\\VSNet2005", value: "ProductDir", type: "directory" };
        c_cmp120.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\C++\\120\\VSNet2008", value: "ProductDir", type: "directory" };
        c_cmp120.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\120\\VSNet2010", value: "ProductDir", type: "directory" };

        var c_cmp120_pc = {};
        c_cmp120_pc.id = "c_cmp120_pc";
        c_cmp120_pc.name = "IDE of C++ Compiler 12.0 (Parallel Composer 2011)";
        c_cmp120_pc.data = {};
        c_cmp120_pc.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Parallel Composer 2011", type: "hive" };
        c_cmp120_pc.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Parallel Composer 2011", value: "PackageId", type: "value" };

        var f_cmp120 = {};
        f_cmp120.id = "f_cmp120";
        f_cmp120.name = "IDE of Visual Fortran Compiler 12.0";
        f_cmp120.data = {};
        f_cmp120.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\120", type: "hive" };
        f_cmp120.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\120", value: "PackageId", type: "value" };
        f_cmp120.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\120\\VSNet2005", value: "ProductDir", type: "directory" };
        f_cmp120.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\120\\VSNet2008", value: "ProductDir", type: "directory" };
        f_cmp120.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\120\\VSNet2010", value: "ProductDir", type: "directory" };

        //12.1
        var c_cmp121 = {};
        c_cmp121.id = "c_cmp121";
        c_cmp121.name = "IDE of C++ Compiler 12.1";
        c_cmp121.data = {};
        c_cmp121.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 12.1", type: "hive" };
        c_cmp121.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 12.1", value: "PackageId", type: "value" };
        c_cmp121.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\C++\\121\\VSNet2005", value: "ProductDir", type: "directory" };
        c_cmp121.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\C++\\121\\VSNet2008", value: "ProductDir", type: "directory" };
        c_cmp121.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\121\\VSNet2010", value: "ProductDir", type: "directory" };

        var c_cmp121_pc = {};
        c_cmp121_pc.id = "c_cmp121_pc";
        c_cmp121_pc.name = "IDE of C++ Compiler 12.1 (Parallel Composer 2011 SP1)";
        c_cmp121_pc.data = {};
        c_cmp121_pc.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Parallel Composer 2011 SP1", type: "hive" };
        c_cmp121_pc.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Parallel Composer 2011 SP1", value: "PackageId", type: "value" };

        var f_cmp121 = {};
        f_cmp121.id = "f_cmp121";
        f_cmp121.name = "IDE of Visual Fortran Compiler 12.1";
        f_cmp121.data = {};
        f_cmp121.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\121", type: "hive" };
        f_cmp121.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\121", value: "PackageId", type: "value" };
        f_cmp121.data.installed_dir_vs2005 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\121\\VSNet2005", value: "ProductDir", type: "directory" };
        f_cmp121.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\121\\VSNet2008", value: "ProductDir", type: "directory" };
        f_cmp121.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\121\\VSNet2010", value: "ProductDir", type: "directory" };

        //13.0 , 13.1
        var c_cmp130 = {};
        c_cmp130.id = "c_cmp130";
        c_cmp130.name = "IDE of C++ Compiler 13.0";
        c_cmp130.data = {};
        c_cmp130.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 13.0", type: "hive" };
        c_cmp130.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 13.0", value: "PackageId", type: "value" };
        c_cmp130.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\C++\\130\\VSNet2008", value: "ProductDir", type: "directory" };
        c_cmp130.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\130\\VSNet2010", value: "ProductDir", type: "directory" };
        c_cmp130.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\130\\VS11", value: "ProductDir", type: "directory" };

        var f_cmp130 = {};
        f_cmp130.id = "f_cmp130";
        f_cmp130.name = "IDE of Visual Fortran Compiler 13.0";
        f_cmp130.data = {};
        f_cmp130.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\130", type: "hive" };
        f_cmp130.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\130", value: "PackageId", type: "value" };
        f_cmp130.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\130\\VSNet2008", value: "ProductDir", type: "directory" };
        f_cmp130.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\130\\VSNet2010", value: "ProductDir", type: "directory" };
        f_cmp130.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\130\\VSNet2012", value: "ProductDir", type: "directory" };

        //14.0
        var c_cmp140 = {};
        c_cmp140.id = "c_cmp140";
        c_cmp140.name = "IDE of C++ Compiler 14.0";
        c_cmp140.data = {};
        c_cmp140.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 14.0", type: "hive" };
        c_cmp140.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 14.0", value: "PackageId", type: "value" };
        c_cmp140.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\C++\\140\\VSNet2008", value: "ProductDir", type: "directory" };
        c_cmp140.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\140\\VSNet2010", value: "ProductDir", type: "directory" };
        c_cmp140.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\140\\VS11", value: "ProductDir", type: "directory" };
        c_cmp140.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\140\\VS12", value: "ProductDir", type: "directory" };

        var f_cmp140 = {};
        f_cmp140.id = "f_cmp140";
        f_cmp140.name = "IDE of Visual Fortran Compiler 14.0";
        f_cmp140.data = {};
        f_cmp140.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\140", type: "hive" };
        f_cmp140.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\140", value: "PackageId", type: "value" };
        f_cmp140.data.installed_dir_vs2008 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\140\\VSNet2008", value: "ProductDir", type: "directory" };
        f_cmp140.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\140\\VSNet2010", value: "ProductDir", type: "directory" };
        f_cmp140.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\140\\VSNet2012", value: "ProductDir", type: "directory" };
        f_cmp140.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\140\\VSNet2013", value: "ProductDir", type: "directory" };

        //15.0
        var c_cmp150 = {};
        c_cmp150.id = "c_cmp150";
        c_cmp150.name = "IDE of C++ Compiler 15.0";
        c_cmp150.data = {};
        c_cmp150.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 15.0", type: "hive" };
        c_cmp150.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler XE 15.0", value: "PackageId", type: "value" };
        c_cmp150.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150\\VSNet2010", value: "ProductDir", type: "directory" };
        c_cmp150.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150\\VS11", value: "ProductDir", type: "directory" };
        c_cmp150.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150\\VS12", value: "ProductDir", type: "directory" };
        c_cmp150.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150\\VS14", value: "ProductDir", type: "directory" };

        var c_cmp150_inde = {};
        c_cmp150_inde.id = "c_cmp150_inde";
        c_cmp150_inde.name = "IDE of C++ Compiler 15.0 for INDE Studio";
        c_cmp150_inde.data = {};
        c_cmp150_inde.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 15.0 [INDE]", type: "hive" };
        c_cmp150_inde.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 15.0 [INDE]", value: "PackageId", type: "value" };
        c_cmp150_inde.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_INDE\\VS11", value: "ProductDir", type: "directory" };
        c_cmp150_inde.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_INDE\\VS12", value: "ProductDir", type: "directory" };
        c_cmp150_inde.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_INDE\\VS14", value: "ProductDir", type: "directory" };

        var c_cmp150_iss = {};
        c_cmp150_iss.id = "c_cmp150_iss";
        c_cmp150_iss.name = "IDE of C++ Compiler 15.0 for ISS Studio";
        c_cmp150_iss.data = {};
        c_cmp150_iss.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 15.0 [ISS]", type: "hive" };
        c_cmp150_iss.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 15.0 [ISS]", value: "PackageId", type: "value" };
        c_cmp150_iss.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_ISS\\VSNet2010", value: "ProductDir", type: "directory" };
        c_cmp150_iss.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_ISS\\VS11", value: "ProductDir", type: "directory" };
        c_cmp150_iss.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_ISS\\VS12", value: "ProductDir", type: "directory" };
        c_cmp150_iss.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\150_ISS\\VS14", value: "ProductDir", type: "directory" };

        var f_cmp150 = {};
        f_cmp150.id = "f_cmp150";
        f_cmp150.name = "IDE of Visual Fortran Compiler 15.0";
        f_cmp150.data = {};
        f_cmp150.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\150", type: "hive" };
        f_cmp150.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\150", value: "PackageId", type: "value" };
        f_cmp150.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\150\\VSNet2010", value: "ProductDir", type: "directory" };
        f_cmp150.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\150\\VSNet2012", value: "ProductDir", type: "directory" };
        f_cmp150.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\150\\VSNet2013", value: "ProductDir", type: "directory" };
        f_cmp150.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\150\\VSNet14", value: "ProductDir", type: "directory" };

        //16.0
        var c_cmp160 = {};
        c_cmp160.id = "c_cmp160";
        c_cmp160.name = "IDE of C++ Compiler 16.0";
        c_cmp160.data = {};
        c_cmp160.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 16.0", type: "hive" };
        c_cmp160.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 16.0", value: "PackageId", type: "value" };
        c_cmp160.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\C++\\160\\VSNet2010", value: "ProductDir", type: "directory" };
        c_cmp160.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\160\\VS11", value: "ProductDir", type: "directory" };
        c_cmp160.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\160\\VS12", value: "ProductDir", type: "directory" };
        c_cmp160.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\160\\VS14", value: "ProductDir", type: "directory" };

        var f_cmp160 = {};
        f_cmp160.id = "f_cmp160";
        f_cmp160.name = "IDE of Visual Fortran Compiler 16.0";
        f_cmp160.data = {};
        f_cmp160.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\160", type: "hive" };
        f_cmp160.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\160", value: "PackageId", type: "value" };
        f_cmp160.data.installed_dir_vs2010 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\160\\VSNet2010", value: "ProductDir", type: "directory" };
        f_cmp160.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\160\\VSNet2012", value: "ProductDir", type: "directory" };
        f_cmp160.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\160\\VSNet2013", value: "ProductDir", type: "directory" };
        f_cmp160.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\160\\VSNet14", value: "ProductDir", type: "directory" };

        //17.0
        var c_cmp170 = {};
        c_cmp170.id = "c_cmp170";
        c_cmp170.name = "IDE of C++ Compiler 17.0";
        c_cmp170.data = {};
        c_cmp170.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 17.0", type: "hive" };
        c_cmp170.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 17.0", value: "PackageId", type: "value" };
        c_cmp170.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\C++\\170\\VS11", value: "ProductDir", type: "directory" };
        c_cmp170.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\170\\VS12", value: "ProductDir", type: "directory" };
        c_cmp170.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\170\\VS14", value: "ProductDir", type: "directory" };
        c_cmp170.data.installed_dir_vs2017 = { key: "SOFTWARE\\Intel\\IDE\\C++\\170\\VS15", value: "ProductDir", type: "directory" };

        var f_cmp170 = {};
        f_cmp170.id = "f_cmp170";
        f_cmp170.name = "IDE of Visual Fortran Compiler 17.0";
        f_cmp170.data = {};
        f_cmp170.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\170", type: "hive" };
        f_cmp170.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\170", value: "PackageId", type: "value" };
        f_cmp170.data.installed_dir_vs2012 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\170\\VSNet2012", value: "ProductDir", type: "directory" };
        f_cmp170.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\170\\VSNet2013", value: "ProductDir", type: "directory" };
        f_cmp170.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\170\\VSNet14", value: "ProductDir", type: "directory" };
        f_cmp170.data.installed_dir_vs2017 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\170\\VSNet15", value: "ProductDir", type: "directory" };

        //18.0
        var c_cmp180 = {};
        c_cmp180.id = "c_cmp180";
        c_cmp180.name = "IDE of C++ Compiler 18.0";
        c_cmp180.data = {};
        c_cmp180.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 18.0", type: "hive" };
        c_cmp180.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 18.0", value: "PackageId", type: "value" };
        c_cmp180.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\180\\VS12", value: "ProductDir", type: "directory" };
        c_cmp180.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\180\\VS14", value: "ProductDir", type: "directory" };
        c_cmp180.data.installed_dir_vs2017 = { key: "SOFTWARE\\Intel\\IDE\\C++\\180\\VS15", value: "ProductDir", type: "directory" };

        var f_cmp180 = {};
        f_cmp180.id = "f_cmp180";
        f_cmp180.name = "IDE of Visual Fortran Compiler 18.0";
        f_cmp180.data = {};
        f_cmp180.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\180", type: "hive" };
        f_cmp180.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\180", value: "PackageId", type: "value" };
        f_cmp180.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\180\\VSNet2013", value: "ProductDir", type: "directory" };
        f_cmp180.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\180\\VSNet14", value: "ProductDir", type: "directory" };
        f_cmp180.data.installed_dir_vs2017 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\180\\VSNet15", value: "ProductDir", type: "directory" };

        //19.0
        var c_cmp190 = {};
        c_cmp190.id = "c_cmp190";
        c_cmp190.name = "IDE of C++ Compiler 19.0";
        c_cmp190.data = {};
        c_cmp190.data.installed = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 19.0", type: "hive" };
        c_cmp190.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\C++\\Compiler 19.0", value: "PackageId", type: "value" };
        c_cmp190.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\C++\\190\\VS12", value: "ProductDir", type: "directory" };
        c_cmp190.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\C++\\190\\VS14", value: "ProductDir", type: "directory" };
        c_cmp190.data.installed_dir_vs2017 = { key: "SOFTWARE\\Intel\\IDE\\C++\\190\\VS15", value: "ProductDir", type: "directory" };

        var f_cmp190 = {};
        f_cmp190.id = "f_cmp190";
        f_cmp190.name = "IDE of Visual Fortran Compiler 19.0";
        f_cmp190.data = {};
        f_cmp190.data.installed = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\190", type: "hive" };
        f_cmp190.data.package_id = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\190", value: "PackageId", type: "value" };
        f_cmp190.data.installed_dir_vs2013 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\190\\VSNet2013", value: "ProductDir", type: "directory" };
        f_cmp190.data.installed_dir_vs2015 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\190\\VSNet14", value: "ProductDir", type: "directory" };
        f_cmp190.data.installed_dir_vs2017 = { key: "SOFTWARE\\Intel\\IDE\\Fortran\\190\\VSNet15", value: "ProductDir", type: "directory" };

        //object list
        var ide_list = {
            c_cmp101: c_cmp101,
            f_cmp101: f_cmp101,
            c_cmp110: c_cmp110,
            f_cmp110: f_cmp110,
            c_cmp111: c_cmp111,
            f_cmp111: f_cmp111,
            c_cmp120: c_cmp120,
            c_cmp120_pc: c_cmp120_pc,
            f_cmp120: f_cmp120,
            c_cmp121: c_cmp121,
            c_cmp121_pc: c_cmp121_pc,
            f_cmp121: f_cmp121,
            c_cmp130: c_cmp130,
            f_cmp130: f_cmp130,
            c_cmp140: c_cmp140,
            f_cmp140: f_cmp140,
            c_cmp150: c_cmp150,
            c_cmp150_inde: c_cmp150_inde,
            c_cmp150_iss: c_cmp150_iss,
            f_cmp150: f_cmp150,
            c_cmp160: c_cmp160,
            f_cmp160: f_cmp160,
            c_cmp170: c_cmp170,
            f_cmp170: f_cmp170,
            c_cmp180: c_cmp180,
            f_cmp180: f_cmp180,
            c_cmp190: c_cmp190,
            f_cmp190: f_cmp190
        };

        var find = function (array, val) {
            for (var i in array)
                if (array[i] == val)
                    return true;
            return false;
        }

        //fill objects by performing detection
        for (var i in ide_list) {
            var iter = ide_list[i];
            Log("Processing: " + iter.id + ": " + iter.name);
            var data = iter.data;

            for (var k in data) {
                Log("  item: " + k);

                var r = data[k];
                if (r.key && r.type) {
                    Log("    key: " + r.key + "; value: " + r.value + "; type: " + r.type);
                    var reg = Registry("HKLM", r.key);

                    var found;
                    found = false;

                    if (reg.Exists()) {
                        Log("    Registry key exists");
                        var val;

                        if (r.value && find(reg.Values(), r.value)) {
                            val = reg.Value(r.value);
                            Log("    value detected: " + val);

                            switch (r.type) {
                                case "directory":
                                    if (FileSystem.Exists(val)) {
                                        if (FileSystem.IsDirectory(val)) {
                                            iter[k] = val;
                                            found = true;
                                        }
                                        else
                                            Log("    Target path is not directory");
                                    }
                                    else
                                        Log("    Directory doesn't exist");
                                    break;
                                case "value":
                                    iter[k] = val;
                                    found = true;
                                    break;
                            }
                        }
                        else {
                            switch (r.type) {
                                case "hive":
                                    iter[k] = true;
                                    break;
                            }
                        }
                    }
                    else {
                        Log("    registry key doesn't exist");

                        if (!found) {
                            switch (r.type) {
                                case "directory":
                                case "value":
                                case "hive":
                                    iter[k] = false;
                                    break;
                            }
                        }
                    }
                }
            }
        }

        return ide_list;
    }
}
