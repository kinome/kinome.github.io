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
            var rF;
            fuse.getRootFolder(function (x) {
                rF = x;
                files.rootFolder = function () {
                    return rF;
                };
            });
        }
    };
    files[RDF.flatFile] = [];
    files[RDF.data] = [];
    files[RDF.batch] = [];
    files[RDF.analysis] = [];
    files[RDF.query] = [];

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

            //TODO: fix this so it does not randomly make new folder structures....
            //login
            fuse.login(function (log) {
                //TODO: handle failed login...
                lib.loggedIn = true;
                userName();
                files.rootFolder();
                fuse.getTablesByName(configFileName, getTableListFromConfig);
                fuse.onComplete(callback);
            });

            //update libraries :-) - closed for code collapsing purposes.
            (function () {
                lib.writeFile = function (obj) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    run(writeFile)(obj);
                };
                lib.saveBarcodes = function (barcodeArr, callback, uiUpdate) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    run(saveBarcodes)(barcodeArr, callback, uiUpdate);
                };
                lib.tablesSave = function (barcodeObj, callback) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    This function saves barcode objects to fusion tables based on the db property of
                        the passed in barcode object.
                    ARGV: 
                    */////////////////////////////////////////////////////////////////////////////////
                    run(fusionTablesSave)(barcodeObj, callback);
                };

                lib.batchSave = function (barcodeObj, callback) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    This function saves barcode objects to fusion tables based on the db property of
                        the passed in barcode object.
                    ARGV: 
                    */////////////////////////////////////////////////////////////////////////////////
                    run(fusionTablesBatchSave)(barcodeObj, callback);
                };

                lib.getTableLines = function (parseObj, callback) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    run(getTableLines)(parseObj, callback);
                };

                lib.getUserName = function (callback) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    run(getUserName)(callback);
                };
                lib.saveBarcode = function (dataObj) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    run(saveBarcode)(dataObj);
                };
                lib.addBarcodeData = function (barcodeObj) {
                    /*////////////////////////////////////////////////////////////////////////////////
                    TODO: user docs
                    */////////////////////////////////////////////////////////////////////////////////
                    run(addBarcodeData)(barcodeObj);
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

        makeConfigFile = function () {
            //TODO: make multiple config files so sharing becomes more logical. One for saving current changes, one for functional stuff (folders ect) and then as sharing becomes serious, add ones for sharing.
            //variable declaration
            var fold1, makeSubFolder, addFolderToTriples, tempTriples = [];
            //variable definitions

            //function defintions
            addFolderToTriples = function (type, response) {
                tempTriples.push([response.id.toString(), RDF.type, type, Math.uuid(), currentDate(), userName()]);
                files[type] = response.id.toString();
                // tempTriples.push([response.id.toString(), RDF.gdJSON, JSON.stringify(response), Math.uuid(), currentDate(), userName()]);
            };

            makeSubFolder = function (res) {
                addFolderToTriples(RDF.kinomicFolder, res);
                //Make sub folders for data, analysis, configs
                fuse.newFolder('data', {"parents": [{id: res.id}]}, function (x) {addFolderToTriples(RDF.dataFolder, x); });
                fuse.newFolder('config', {"parents": [{id: res.id}]}, function (x2) {
                    addFolderToTriples(RDF.configFolder, x2);
                    newTable(configFileName, x2.id.toString(), function (y2) {
                        // tempTriples.push([y2.tableId, RDF.type, 'configFile', Math.uuid(), currentDate(), userName()]);
                        currentConfig = y2.tableId;
                        //tempTriples.push([y2.tableId, RDF.gdJSON, JSON.stringify(y2), Math.uuid(), currentDate(), userName()]);
                        fuse.submitLinesToTable(currentConfig, tripColumns, tempTriples, function () {});
                    });
                });
                fuse.newFolder('analysis', {"parents": [{id: res.id}]}, function (x) {addFolderToTriples('analysisFolder', x); });
            };

            //Make main folder
            fuse.newFolder('autoKinomicsToolbox', {}, makeSubFolder);
        };

        getTableListFromConfig = function (tables) {
            //variable declarations
            var i, length, myConfig, files;

            //variable definitions
            length = tables.length;
            myConfig = [];
            files = [];

            //looking at an array of tables... with [0] - name, and [1] - tableID
            if (length === 0) {
                makeConfigFile();
            } else {
                for (i = 0; i < length; i += 1) {
                    files.push(tables[i].id);
                    if (tables[i].userPermission.role === 'owner' && (!myConfig.length || tables[i].createdDate > myConfig[1])) {
                        myConfig = [tables[i].id, tables[i].createdDate];
                    }
                }
                if (!myConfig.length) {
                    makeConfigFile();
                } else {
                    currentConfig = myConfig[0];
                    for (i = 0; i < files.length; i += 1) {
                        if (currentConfig !== files[i]) {
                            fuse.queryTable(files[i], {columns: tripColumns, order: tripColumns[4]}, addFilesToActiveList);
                        }
                    }
                    fuse.queryTable(currentConfig, {columns: tripColumns, order: tripColumns[4]}, mainConfig);
                }
            }
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

    //TODO: transport most of these triples to writting from fmDA, reason: when writting triples to s3db, the triples should be the same...
    //Write functions: writeFile, and write (triples)
    (function () {
        //TODO: add status updates....
        //TODO: add file name to config file.
        var createBarcodeFile;
        writeFile = function (writeFileObj) {
            //variable declarations
            var tempTriples = [], batchID = writeFileObj.batchID, funcParams;
            fuse.writeFile(writeFileObj.data, files[RDF.dataFolder], function (response) {
                //TODO: deal with failed response...
                if (response.error) {
                    throw 'error uploading file';
                } else {
                    //Triples: BatchID RDF:type RDF:batch, BatchID RDF:file {}.id, {}.id RDF:type flatFile, {}.id RDF:gdJSON {}
                    // tempTriples.push([RDF.list(batchID), RDF.type, RDF.batch, Math.uuid(), currentDate(), userName()]);
                    // tempTriples.push([RDF.list(batchID), RDF.file, response.webContentLink, Math.uuid(), currentDate(), userName()]);
                    // tempTriples.push([RDF.list(batchID), RDF.name, writeFileObj.data.name, Math.uuid(), currentDate(), userName()]);
                    tempTriples.push([response.webContentLink, RDF.type, RDF.flatFile, Math.uuid(), currentDate(), userName()]);
                    tempTriples.push([response.webContentLink, RDF.name, writeFileObj.data.name, Math.uuid(), currentDate(), userName()]);
                    tempTriples.push([RDF.list(writeFileObj.batchID), RDF.type, RDF.batch, Math.uuid(), currentDate(), userName()]);
                    tempTriples.push([RDF.list(writeFileObj.batchID), RDF.name, writeFileObj.data.name, Math.uuid(), currentDate(), userName()]);
                    tempTriples.push([RDF.list(writeFileObj.batchID), RDF.file, response.webContentLink, Math.uuid(), currentDate(), userName()]);
                    addFilesToActiveList({rows:tempTriples});
                    fuse.submitLinesToTable(currentConfig, tripColumns, tempTriples, function (x) {
                        writeFileObj.callback();
                    });
                }
            });
        };
        saveBarcode = function (dataObj) {
            var doc, tempTrips, i, writeIt, tempTriples, createTriples;
            console.log("number 1", JSON.parse(JSON.stringify(dataObj.data)));
            tempTriples = [];
            //This function creates a blob from the string and sends to to google
            writeIt = function (str, name, callback) {
                var bb = new Blob([str], {type: "text/plain"});
                bb.name = name;
                fuse.writeFile(bb, files[RDF.dataFolder], 
                    function (response) {
                        //This error thing did not seem to work....
                        console.log("testing", response);
                        if (response.error) {
                            console.error('This one did not write, trying agian.');
                            writeIt(str, name, callback);
                        } else {
                            createTriples(response); 
                            callback();
                        }
                    });
            };

            //This function responds to the file being written to google
            createTriples = function (response) {
                //TODO: Deal with error response
                tempTriples.push([dataObj.id, RDF.type, RDF.data, Math.uuid(), currentDate(), userName()]);
                tempTriples.push([dataObj.id, RDF.file, response.webContentLink, Math.uuid(), currentDate(), userName()]);
                tempTriples.push([dataObj.batchID, RDF.data, dataObj.id, Math.uuid(), currentDate(), userName()]);
                tempTriples.push([dataObj.id, RDF.name, dataObj.name, Math.uuid(), currentDate(), userName()]);
                addFilesToActiveList({rows:tempTriples});
                fuse.submitLinesToTable(currentConfig, tripColumns, tempTriples, function (x) { console.log('written....')});
            };
            writeIt(JSON.stringify(dataObj.data), dataObj.name, dataObj.callback);
        };

        addBarcodeData = function (barcodeObj) {
            //TODO: get rid of globals
            //TODO: deal with alerting the user of data being saved....
            newTable('barcode_' + barcodeObj.name, files.dataFolder.id, function (res) {
                var dataTriples, configTriples, i;
                //TODO: get rid of blank function.
                fuse.submitLinesToTable(res.tableId, tripColumns, [barcodeObj.JSON.stringify(barcodeObj)], function () {});
                //fuse.submitLinesToTable(files.configFile[currentConfig].googleDriveObj.tableId, tripColumns, [
                // [barcodeObj.batchID, RDF.triplesData, JSON.stringify(res), Math.uuid(), currentDate(), userName()]
                // ], function () {});
            });
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

    //this is for loading data
    (function () {
        //TODO: deal with error from fusion tables call...
        lib.loadData = function (dataObj) {
            globFT.push(dataObj);
            var file = bySubject[dataObj.uuid][RDF.file][0][2];
            file = file.replace(/([\S\s]+id\=)([\S\s]+)(\&export[\S\s]+)/, "$2");
            fuse.readFile(file, function (response) {
                dataObj.callback(response);
            });
        };
    }());








    //Creating new tables
    newTable = function (fileName, folder, callback) {
        //Create table, then move it to the appropriate folder (This requires 3 requests, 1. make file, 2. add parent [add to folder], 3. remove parent [remove from root folder])
        fuse.newTable(fileName, tripNewColumns, {}, function (res) {
            if (folder) {
                fuse.addFileToFolder(res.tableId, folder, function () {});
                fuse.removeFileFromFolder(res.tableId, files.rootFolder(), function () {});
            }
            fuse.onComplete(function () {
                callback(res);
            });
        });
    };

    saveBarcodes = function (barcodeArr, callback, uiUpdate) {
        console.error('saveBarcodes removed');
        return;
        // //variable declarations
        // var i, fuseTableID, finalCallback, lines, rows, thisCallback, uid, date, author;

        // //variable definitions
        // lines = [];
        // author = "tester";
        // date = (new Date()).toISOString();


        // /*
        // for (fuseTableID in activeFiles.barcode) {
        //     if (activeFiles.barcode.hasOwnProperty(fuseTableID)) {
        //         break;
        //     }
        // }*/
        // fuseTableID = '1lbl5Cttwj7XIpsd6XSOJFH6lGWsQaWQw9zPKEXY';
        // if (barcodeArr.length > 0) {
        //     //fusionTables_barWellFileColumns = ['Barcode_Well', 'JSON', 'RDF', 'Referring Table and Row'];
        //     for (i = 0; i < barcodeArr.length; i += 1) {
        //         barcodeArr[i].db.barcodeFile = {file: fuseTableID};
        //         barcodeArr[i].db.changed = false;
        //         uid = 'ft' + fuseTableID + ":" + Math.uuid();
        //         lines.push(
        //             [uid, 'uabKin:hasContent', barcodeArr[i].asString('short'), date, author],
        //             [uid, 'uabKin:hasName', barcodeArr[i].name, date, author],
        //             [uid, 'uabKin:fileType', 'uabKin:barcodeFile', date, author],
        //             [uid, 'uabKin:fromGroup', barcodeArr[i].db.originFile.file, date, author]
        //         );
        //     }
        //     thisCallback = function (x, y) {
        //         var i, groups, uid, toSubmit;
        //         groups = {};
        //         toSubmit = [];
        //         for (i = 0; i < x.rows.length; i += 1) {
        //             groups[lines[i][0]] = groups[lines[i][0]] || [];
        //             groups[lines[i][0]].push(fuseTableID + '_r_' + x.rows[i][0]);
        //         }
        //         for (uid in groups) {
        //             if (groups.hasOwnProperty(uid)) {
        //                 toSubmit.push([uid, 'uabKin:fileGroup', groups[uid].join('AND'), date, author]);
        //             }
        //         }
        //         fuse.submitLinesToTable(fuseTableID, tripColumns, toSubmit, function (x, y) {
        //             var i;
        //             for (i = 0; i < x.rows.length; i += 1) {
        //                 barcodeArr[i].db.barcodeFile.file = x.rows[i][0]; //TODO: fix this once barcodes are saved with uuids...
        //             }
        //             callback(x, y);
        //         });
        //     };
        //     //TODO: fix documentation in fusionTables.js for this function...
        //     fuse.submitLinesToTable(fuseTableID, tripColumns, lines, thisCallback); //TODO: change callback...
        // }
        // fuse.onComplete(uiUpdate);
    };


    getUserName = function (callback) {
        fuse.getUserName(callback);
        //this is it...
    };

    fusionTablesSave = function (barcodeObj, callback) {
        //variable declarations
        var i, length;

        //variable definitions
        //TODO:check user input
        callback = typeof callback === 'function' ? callback : function () {};
        length = barcodeObj.db.barcodeFiles.length;

        for (i = 0; i < length; i += 1) {
            //TODO: add if has user permissions
            fuse.updateTableLine(barcodeObj.db.barcodeFiles[i].file, {JSON: barcodeObj.asString()}, barcodeObj.db.barcodeFiles[i].rowID, callback);
        }
    };

    getTableLines = function (parseObj, callback) {
        //variable declarations
        var category, file, fileUID, results, row, rows;
        //variable definitions
        results = [];
        for (row in triples) {
            if (triples.hasOwnProperty(row) && triples[row][1] === 'uabKin:fileGroup') {
                results.push(makeTableLine(row, parseObj));
            }
        }
        callback(results);
    };

    getTriplesWithoutContent = function (fileName) {
        fuse.queryTable(fileName, {columns: tripColumns.concat(['ROWID']), where: "'Predicate' DOES NOT CONTAIN 'hasContent'"}, function (x) {
            var i, rowID;
            for (i = 0; i < x.rows.length; i += 1) {
                rowID = fileName + '_r_' + x.rows[i].pop();
                triples[rowID] = x.rows[i];
            }
        });
    };

    userName = function () {
        //must be called once at login to initilize since this is an async call
        var uName;
        getUserName(function (x) {
            uName = x;
            userName = function () {
                return uName;
            };
        });
    };

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