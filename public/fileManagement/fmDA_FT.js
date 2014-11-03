/*global KINOMICS, jQuery, $, console, gapi, RegExp*/
/*jslint todo: true */
var globFT = [];
var queryTriples, triples, glob, files;
KINOMICS.fileManager.DA.fusionTables = (function () {
    'use strict';

    //TODO: another big one... make fusion tables more triples based...
    //TODO: yet another big deal... rework save barcodes and others for multiple instances of an analysis...
    //TODO: determine permissions using google drive if possible...

    //variable declarations
    var activeFiles, lib, fuse, configFileName, getTableLines, addBarcodeData, addFilesToActiveList,
        fusionTablesSave, loginMenu, newTable, writeFile, currentConfig, bySubject,
        getOriginUITableLines, getBarcodeUITableLines, activeBarFiles, getUserName, currentDate,
        fusionTables_barWellFileColumns, fusionTablesBatchSave, run, reportError, RDF,
        fusionTables_originFileColumns, makeTableLine, addButtonFunc, saveBarcodes, userName,
        addBarcodeButton, saveBarcode, tripColumns, getTriplesWithoutContent, tripNewColumns;

    //variable definitions
    lib = {};
    bySubject = {};
    activeFiles = {
        barcode: {},
        origin: {}
    };
    triples = {};
    activeBarFiles = {};
    fusionTables_originFileColumns = ['FileName', 'DateCreated', 'FileContents', 'FileSize', 'JSONFileID'];
    fusionTables_barWellFileColumns = ['Barcode_Well', 'JSON', 'RDF', 'Referring Table and Row'];
    tripColumns = ["Subject", "Predicate", "Object", "tripleID", "dateChanged", "changedBy"];
    tripNewColumns = [{name: "Subject", type: "STRING"}, {name: "Predicate", type: "STRING"}, {name: "Object", type: "STRING"}, {name: "tripleID", type: "STRING"}, {name: "dateChanged", type: "STRING"}, {name: "changedBy", type: "STRING"}];
    configFileName = '_?KINOMICS_config';

    //fuse = KINOMICS.fusionTables;
    RDF = {
        batch: "batch",
        type: "rdf:type",
        triplesData: "dataTriples",
        flatFile: "flatFile",
        file: 'hasFile',
        dataFolder: "dataFolder",
        configFolder: "configFolder",
        analysisFolder: "analysisFolder",
        rootFolder: "rootFolder",
        kinomicFolder: 'kinomicFolder',
        sqlLocationPrefix: 'https://www.googleapis.com/fusiontables/v1/tables/',
        gdJSON: 'googleDriveObj',
        list: function (id) {return id; },
        name: 'name',
        data: 'data',
        analysis: 'analysis',
        query: 'query'
    };
    files = {
        rootFolder: function () {
            return "0Bw9j7WvO_WpOSnRkR0dOOEFNdVk";
        }
    };
    files[RDF.flatFile] = [];
    files[RDF.data] = [];
    files[RDF.batch] = [];
    files[RDF.analysis] = [];
    files[RDF.query] = [];

    userName = function () {
        return "guest";
    };



    //This is the only avaliable function on package load, once logged in other become avaliable.
    //It is designed this way so fusePackage will have to be defined.
    lib.loggedIn = false;
    lib.login = function (fusePackage, callback) {
        /*////////////////////////////////////////////////////////////////////////////////
        This function gets the location of the fusePackage, fusionTables.js, logs the user
        in, identifies the config file(s), loads the file(s) and returns the list of
        file types the user has access to. If one does not exist it will create a config
        file and preload it with public data. It also loads all other library functions
        TODO: finish documetation.
        ARGV: 
        */////////////////////////////////////////////////////////////////////////////////
        run(loginMenu)(fusePackage, callback);
    };

    //The management of this code became difficult so I have split it into several closure function groups, enjoy.

    //Login and work with config file functions
    (function () {
        var makeConfigFile, getTableListFromConfig, sortTriplesByDate, mainConfig, addFilesToObject;
        loginMenu = function (fusePackage, callback) {
            fuse = fusePackage;
            //variable definitions
            lib.loggedIn = true;
                $.getJSON('https://7f3d27bba7ddcc2ee9a1f12b367e81c165b25ae7.googledrive.com/host/0Bw9j7WvO_WpORkY3WVlLRVNSb0E', function (resp) {
                getTableListFromConfig(resp, callback);
            });

            //update libraries :-) - closed for code collapsing purposes.
            (function () {
                // lib.getTableLines = function (parseObj, callback) {
                //     ////////////////////////////////////////////////////////////////////////////////
                //     TODO: user docs
                //     ////////////////////////////////////////////////////////////////////////////////
                //     run(getTableLines)(parseObj, callback);
                // };
                lib.getUserName = function (callback) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    return "guest";
                };
            }());
        };

        addFilesToObject = function (file, type, bySubject) {
            var i;
            for (i = 0; i < file.length; i += 1) {
                files[type].push(bySubject[file[i][0]][RDF.name].sort(sortTriplesByDate)[0]);
            }
        };

        sortTriplesByDate = function (a, b) {
            if (a[5] >= b[5]) {
                return 1;
            } else {
                return -1;
            }
        };

        getTableListFromConfig = function (tables, callback) {
            //variable declarations
            var i, length, myConfig, files;

            mainConfig(tables.pop());

            //variable definitions
            length = tables.length;
            myConfig = [];
            files = [];

            //looking at an array of tables... with [0] - name, and [1] - tableID
            if (length !== 0) {
                for (i = 0; i < files.length; i += 1) {
                    if (currentConfig !== files[i]) {
                        addFilesToActiveList(tables[i]);
                    }
                }
            }
            callback();
        };

        mainConfig = function (configFile) {
            var i, byType, type, sortFunc;
            byType = {};

            if (!configFile.rows) {
                console.error('Something is wrong with the config file');
                return;
            }

            //Convert arrays into objects
            for (i = 0; i < configFile.rows.length; i += 1) {
                bySubject[configFile.rows[i][0]] = bySubject[configFile.rows[i][0]] || {};
                bySubject[configFile.rows[i][0]][configFile.rows[i][1]] = bySubject[configFile.rows[i][0]][configFile.rows[i][1]] || [];
                bySubject[configFile.rows[i][0]][configFile.rows[i][1]].push(configFile.rows[i]);
                if (configFile.rows[i][1] === RDF.type) {
                    byType[configFile.rows[i][2]] = byType[configFile.rows[i][2]] || [];
                    byType[configFile.rows[i][2]].push(configFile.rows[i]);
                }
            }

            for (type in byType) {
                if (byType.hasOwnProperty(type)) {
                    switch (type) {
                    case RDF.configFolder:
                        files.configFolder = byType[type].sort(sortTriplesByDate)[0][0];
                        break;
                    case RDF.dataFolder:
                        files.dataFolder = byType[type].sort(sortTriplesByDate)[0][0];
                        break;
                    case RDF.analysisFolder:
                        files.analysisFolder = byType[type].sort(sortTriplesByDate)[0][0];
                        break;
                    case RDF.rootFolder:
                        break;
                    case RDF.batch:
                        addFilesToObject(byType[type], RDF.batch, bySubject);
                        break;
                    case RDF.flatFile:
                        addFilesToObject(byType[type], RDF.flatFile, bySubject);
                        break;
                    case RDF.data:
                        addFilesToObject(byType[type], RDF.data, bySubject);
                        break;
                    case RDF.analysis:
                        addFilesToObject(byType[type], RDF.analysis, bySubject);
                        break;
                    case RDF.query:
                        addFilesToObject(byType[type], RDF.query, bySubject);
                        break;
                    default:
                        break;
                    }
                }
            }
        };

        addFilesToActiveList = function (configFile) {
            var i, byType, type, sortFunc;
            byType = {};

            if (!configFile.rows) {
                console.error('Something is wrong with the config file');
                return;
            }

            //Convert arrays into objects
            for (i = 0; i < configFile.rows.length; i += 1) {
                bySubject[configFile.rows[i][0]] = bySubject[configFile.rows[i][0]] || {};
                bySubject[configFile.rows[i][0]][configFile.rows[i][1]] = bySubject[configFile.rows[i][0]][configFile.rows[i][1]] || [];
                bySubject[configFile.rows[i][0]][configFile.rows[i][1]].push(configFile.rows[i]);
                if (configFile.rows[i][1] === RDF.type) {
                    byType[configFile.rows[i][2]] = byType[configFile.rows[i][2]] || [];
                    byType[configFile.rows[i][2]].push(configFile.rows[i]);
                }
            }
            //Only interested in files, not in folders or locations.
            for (type in byType) {
                if (byType.hasOwnProperty(type)) {
                    switch (type) {
                    case RDF.batch:
                        addFilesToObject(byType[type], RDF.batch, bySubject);
                        break;
                    case RDF.flatFile:
                        addFilesToObject(byType[type], RDF.flatFile, bySubject);
                        break;
                    case RDF.data:
                        addFilesToObject(byType[type], RDF.data, bySubject);
                        break;
                    case RDF.analysis:
                        addFilesToObject(byType[type], RDF.analysis, bySubject);
                        break;
                    case RDF.query:
                        addFilesToObject(byType[type], RDF.query, bySubject);
                        break;
                    default:
                        break;
                    }
                }
            }
        };
    }());



    //This is for listing the information avaliable
    (function () {
        lib.listBatches = function () {
            var i, result;
            result = [];
            if (files[RDF.batch]) {
                for (i = 0; i < files[RDF.batch].length; i += 1) {
                    result.push({status: 'get', id: files[RDF.batch][i][0], name: files[RDF.batch][i][2], type: 'batch', date: files[RDF.batch][i][4], creator: files[RDF.batch][i][5], barcodes: bySubject[files[RDF.batch][i][0]][RDF.data].map(function (x) {
                        return x[2];
                    })});
                }
            }
            return result;
        };
        lib.listData = function () {
            var i, result;
            result = [];
            if (files[RDF.data]) {
                for (i = 0; i < files[RDF.data].length; i += 1) {
                    result.push({status: 'get', id: files[RDF.data][i][0], name: files[RDF.data][i][2], type: RDF.data, date: files[RDF.data][i][4], creator: files[RDF.data][i][5]});
                }
            }
            return result;
        };
    }());


    currentDate = function () {
        return (new Date()).toISOString();
    };


    getOriginUITableLines = function (parseObj, fileName, results) {
        //variable declarations
        var parseCallback, readIn;

        fuse.queryTable(fileName, {columns: ['ROWID', 'FileName', 'FileSize'], order: 'DateCreated', orderD: 'DESC'}, function (res) {
            //variable declarations
            var trow, i;
            //TODO: handle error...
            if (!res.rows) {return; }
            for (i = 0; i < res.rows.length; i += 1) {
                //Add line to the UI table
                results.push(makeTableLine(res.rows[i][1], res.rows[i][2], res.rows[i][0], fileName, parseObj));
            }
        });
    };

    addButtonFunc = function (contentArr, groupTripleID, fileType, parseObj) {
        return function (evt) {
            evt.preventDefault();
            //variable declarations
            var i, that, parseCallback, parseObjHere, part, out, fileName, rowid,
                queryCallback;

            //variable definitions
            that = $(this);
            parseObjHere = {params: {}};
            parseCallback = parseObj.params.callback;
            out = [];

            //change button properties
            that.unbind();
            that.attr('class', 'btn btn-warning');
            that.html("<i class='icon-refresh'></i>");

            //So changes are not global make a 'deep' (not truly deep due to skipping callback...) copy of parseObj
            for (part in parseObj.params) {
                if (parseObj.params.hasOwnProperty(part) && part !== 'callback') {
                    parseObjHere.params[part] = parseObj.params[part];
                }
            }
            parseObjHere.params.callback = function () {
                that.attr('class', 'btn btn-info');
                that.html('<i class="icon-ok icon-white"></i>');
                parseObj.params.callback();
            };
            parseObjHere.params.onError = function () {
                that.attr('class', 'btn btn-danger');
                that.html('<i class="icon-warning-sign icon-white"></i>');
            };
            parseObjHere.params.database = {
                fit: false,
                changed: false,
                dbType: 'fusionTables',
                originFile: {
                    file: groupTripleID
                }
            };
            queryCallback = function (res) {
                //TODO: deal with removed data...
                out.push([res.rows[0][0], res.rows[0][1]]);
            };
            //actually get and parse the file..., then check if it already exists?
            for (i = 0; i < contentArr.length; i += 1) {
                contentArr[i] = contentArr[i].split('_r_');
                fileName = contentArr[i][0];
                rowid = contentArr[i][1];
                fuse.queryTable(fileName, {columns: ['Predicate', 'Object'], where: "ROWID = " + rowid}, queryCallback);
            }

            fuse.onComplete(function () {
                //Sorts by <num> of uabKin:hasContent:<num>
                if (out.length > 1) {
                    out = out.sort(function (a, b) {return a[0].replace(/\S+\:(\d+)$/, '$1') - b[0].replace(/\S+\:(\d+)$/, '$1'); });
                }
                //gets the actual content
                out = out.map(function (x) {return x[1].replace(/[\n\r]+$/, ''); });
                out = out.join('\n');
                glob = out;
                parseObjHere.params.file = out;
                if (fileType === 'originRow') {
                    parseObj.func(parseObjHere.params);
                } else if (fileType === 'barcodeRow') {
                    var obj = JSON.parse(out.replace(/\n/g, ''));
                    obj.db.barcodeFile.rowID = groupTripleID;
                    parseObj.params.barcodes[obj.name] = parseObj.params.barcodeCreator(obj);
                    parseObj.params.callback();
                    that.html("<i class='icon-ok icon-white'></i>");
                    that.attr('class', 'btn btn-info');
                } else {
                    throw 'unkown file type...';
                }
            });
        };
    };

    makeTableLine = function (row, parseFileObj) {
        var trow, tempElem, readbutton, deleteButton, irow, creator, createDate,
            createDateStr, fileName, fileContents = [], fileSize, rows, i, fileType, now;

            /*
            [uid, 'uabKin:hasName', fileName, (new Date()).toISOString(), 'tester'],
            [uid, 'uabKin:hasContent', fileContent, (new Date()).toISOString(), 'tester'],
            [uid, 'uabKin:isOfSize', fileSize, (new Date()).toISOString(), 'tester'],
            [uid, 'uabKin:fileType',
            */

        rows = triples[row][2].split('AND');
        for (i = 0; i < rows.length; i += 1) {
            irow = rows[i];
            if (triples[irow]) {
                switch (triples[irow][1]) {
                case 'uabKin:isOfSize':
                    fileSize = triples[irow][2];
                    break;
                case 'uabKin:hasName':
                    fileName = triples[irow][2];
                    break;
                case 'uabKin:fileType':
                    fileType = triples[irow][2];
                    break;
                }
            } else {
                fileContents.push(rows[i]);
            }
        }
        fileSize = fileSize ? fileSize + ' KB' : "";
        fileType = fileType.replace(/(uabKin\:)([\S\s]+?)(File)/, "$2Row");
        creator =  triples[row][4];
        createDate = new Date(triples[row][3]);
        now = new Date((new Date()).toLocaleDateString()); //Actually the time stamp for 12a of today
        createDateStr =  now > createDate ? createDate.toLocaleDateString().replace(/^\S+\s/, '') : createDate.toLocaleTimeString();

        trow = $('<tr />', {'class': fileType, title: createDate.getTime() + '_madeBy:' + creator});

        //read button
        tempElem = $('<td />').appendTo(trow);
        readbutton = $('<button />', {'class': 'btn btn-success',
            html: "<i class='icon-plus icon-white'></i>"}).
            appendTo(tempElem);

        //File name
        $("<td />", {text: fileName}).appendTo(trow);

        //File size
        $("<td />", {text: fileSize}).appendTo(trow);

        //Creator info
        $("<td />", {html: "<small>" + creator + "<br/>" + createDateStr + "</small>"}).appendTo(trow);

        //Delete Button
        tempElem = $('<td />').appendTo(trow);
        deleteButton = $('<button />', {'class': 'btn btn-danger',
            html: "<i class='icon-trash icon-white'></i> Delete"}).
            appendTo(tempElem);

        //Where cancel upload would be
        $("<td />").appendTo(trow);

        //Actually give read button something to do
        readbutton.click(addButtonFunc(fileContents, row, fileType, parseFileObj));

        return trow;
    };

    addBarcodeButton = function (fuseTableID, rowID, parseBarcode) {
        return function (evt) {
            var that = $(this);
            evt.preventDefault();
            that.unbind('click');
            that.html("<i class='icon-refresh'></i>");
            that.attr('class', 'btn btn-warning');
            fuse.queryTable(fuseTableID, {columns: ['ROWID', 'JSON', 'Barcode_Well'], where: "ROWID = " + rowID}, function (res) {
                var obj = JSON.parse(res.rows[0][1]);
                obj.db.barcodeFile.rowID = res.rows[0][0];
                parseBarcode(res.rows[0][2], obj);
                that.html("<i class='icon-ok icon-white'></i>");
                that.attr('class', 'btn btn-info');
            });
        };
    };

    getBarcodeUITableLines = function (parseObj, fileName, results) {
        //TODO: make sure to add in rowID if not already present...
        var funcToRun = function (id, contents) { //location of the make barcode function from barcodeProto.js
            parseObj.params.barcodes[id] = parseObj.params.barcodeCreator(contents);
            parseObj.params.callback();
        };

        fuse.queryTable(fileName, {columns: ['ROWID', 'Barcode_Well', 'Referring Table and Row']}, function (res) {
            //variable declaration
            var i, trow, tempElem, deleteButton, button;
            if (!res.rows || res.error) {
                return; //Assume no pure barcodes.
            }
            //ROWID, ['Barcode_Well', 'JSON', 'RDF', 'Referring Table and Row']
            for (i = 0; i < res.rows.length; i += 1) {
                trow = $('<tr />', {'class': 'barcodeRow'});
                tempElem = $('<td />').appendTo(trow);
                button = $('<button />', {'class': 'btn btn-success',
                    html: "<i class='icon-plus icon-white'></i>"}).
                    appendTo(tempElem);
                $('<td />', {text: res.rows[i][1]}).appendTo(trow);
                $("<td />").appendTo(trow);
                $("<td />").appendTo(trow);
                tempElem = $('<td />').appendTo(trow);
                deleteButton = $('<button />', {'class': 'btn btn-danger',
                    html: "<i class='icon-trash icon-white'></i> Delete"}).
                    appendTo(tempElem);
                button.click(addBarcodeButton(fileName, res.rows[i][0], funcToRun));
                results.push(trow);
            }
        });
    };

    //this is for loading data
    (function () {
        //TODO: deal with error from fusion tables call...
        lib.loadData = function (dataObj) {
            globFT.push(dataObj);
            var file = bySubject[dataObj.uuid][RDF.file][0][2];
            file = file.replace(/([\S\s]+id\=)([\S\s]+)(\&export[\S\s]+)/, "$2");
            console.log(file, dataObj);
            // fuse.readFile(file, function (response) {
            //     dataObj.callback(response);
            // });
        };
    }());


    reportError = function (err) {
        $('<div/>', {'class': 'alert alert-error', html:
            '<button type="button" class="close" data-dismiss="alert">×</button>' +
            "File Manager Error: " + err
            }).appendTo('#errors');
        console.error("File Manager Error: " + err + "<br />To display more information for any" +
            " function type [func_name] instead of [func_name](...)");
    };

    run = function (func) {
        return function () {
            var y;
      //      try {
                y = func.apply(null, arguments);
        //    } catch (err) {
          //      reportError(err);
            //}
            return y;
        };
    };

    return lib;
}());