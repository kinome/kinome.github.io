/*global KINOMICS, console, FileReader, $*/
/*jslint todo: true */
//TODO: error reporting for user very important here, make a failed save a ! or a yeild sign.
//TODO: change error so it only occurs on a barcode by barcode basis.

var globs = [];
KINOMICS.fileManager.DA = (function () {
    'use strict';

    //variable declarations
    var lib, parseFile, run, saveChanges, addDataFile, localData,
        reportError, reportErrorFromWorker, cdb, parseObj, localDataAvaliable,
        localAnalyses, localAnalysesList;


    //variable definitions
    lib  = {};
    localData = {batch: {}, sample: {}};
    localDataAvaliable = {batches: [], samples: []};
    localAnalyses = {};
    localAnalysesList = [];

    //Define global functions
    lib.login = function (db, pack, parse, callback) {
        cdb = db;
        parseObj = parse;
        cdb.login(pack, callback);
    };

    lib.newAnalysisObject = function (initialObj) {
        var ana, queue, queuePush, unloading, localId, length;

        //TODO: check user input, add user docs
        unloading = false;
        queue = [];
        ana = {};
        ana.data = lib.newDataObject();
        ana.id = Math.uuid();
        localId = Math.uuid();
        ana.name = initialObj.name;
        ana.date = (new Date()).toISOString();
        KINOMICS.barcodes = ana.data;
        globs.push(['analysis', ana]);

        if (initialObj.UI !== false) {
            localAnalyses[localId] = ana;
            length = localAnalysesList.length;
            if (length > 0) {
                localAnalysesList[length].status = 'local';
            }
            localAnalysesList.push({funcs: {save: ana.save}, status: 'current', name: ana.name, id: localId, type: 'analysis', date: (new Date()).toISOString() });

        }

        queuePush = function (array) {
            var i;
            //Adds something to the adjacent place in the queue instead of the end.
            //TODO: (for this and data) make sure it is an array...
            if (typeof array !== 'object') {
                console.error('must use an array for queuePush function');
                return false;
            }
            for (i = 0; i < array.length; i += 1) {
                if (typeof array[i] === 'function') {
                    queue.push(array[i]);
                } else {
                    console.error(array[i] + ' is not a function');
                }
            }
            ana.unloadQueue();
        };

        ana.listAnalyses = function () {
            return localAnalysesList;
        };

        ana.loadData = function (dataObj) {
            queuePush([function (qContinue) {
                var callback;
                callback = function () {
                    dataObj.callback();
                    qContinue();
                };
                ana.data.loadData({info: dataObj.info, callback: callback});
            }]);
        };

        ana.loadAnalysis = function (dataObj) {
            queuePush([function (callback) {
                callback();
            }]);
        };

        ana.save = function (dataObj) {
            queuePush([function (callback) {
                console.log('need to be able to save...');
                callback();
            }]);
        };

        ana.unloadQueue = function (callback) {
            //All functions for this have one parameter: callback, they all call callFunc to indicate completion of task.
            var callFunc = function () {
                unloading = false;
                queue.shift();
                ana.unloadQueue();
            };

            if (typeof callback === 'function' && callback !== ana.unloadQueue && callback !== callFunc) {
                queuePush([callback]);
            }
            //How to interact with the Queue that is responsible for handling data
            if (unloading) {
                return false;
            }
            if (queue.length < 1) {
                unloading = false;
                return true;
            }
            unloading = true;
            (queue[0])(callFunc);
        };
        return ana;
    };

    lib.newDataObject = function () {
        var addObject, expand, collapse, unfoldTriples, that, localBatchID, batchID, data, fileObj, queue, unloading, queuePush;

        //TODO: make it so if a file has already been grabbed from google drive it just grabs the original string
        //TODO: store the original string when getting data so there is a comparison for analysis storage
        //TODO: when data is added remove ability to add more and other non needed functions
        //TODO: when data is loaded remove ability to save, add data and other non needed functions

        queue = [];
        data = {};
        globs.push(data);
        that = data;
        unloading = false;
        batchID = Math.uuid();
        localBatchID = Math.uuid(); // This is the id as long as the data stays local...

        data.JSON = {};
        data.string = "";

        queuePush = function (array) {
            var i;
            //Adds something to the adjacent place in the queue instead of the end.
            if (typeof array !== 'object') {
                console.error('must use an array for queuePush function');
                return false;
            }
            for (i = 0; i < array.length; i += 1) {
                if (typeof array[i] === 'function') {
                    queue.push(array[i]);
                } else {
                    console.error(array[i] + ' is not a function');
                }
            }
            data.unloadQueue();
        };

        parseFile = function (input_obj) {
            //variable declarations
            var barcodes, callback, dbObj, file, onerror, workers, workerObj, workersFile, uuids = [];

            if (typeof input_obj !== 'object' || input_obj === null) {
                throw "input_obj was not defined";
            }

            workersFile = 'js/fileManagement/fileParseWorker.js';
            workerObj = KINOMICS.workers;

            //variable definitions
            //barcodes = input_obj.barcodes || undefined;
            barcodes = that;
            callback = input_obj.callback || undefined;
            //dbObj = input_obj.database || undefined;
            file = barcodes.string || undefined;
            onerror = input_obj.onError || function (err) {reportError(err); };
            //workerObj = input_obj.workers || undefined;
            //workersFile = input_obj.workersfile || undefined;

            //check user input
            if (typeof callback !== 'function') {
                throw "ParseFile error: Callback must be defined and a function.";
            }
            //if (typeof dbObj !== 'object' || dbObj === null) {
            //  throw "ParseFile error:  Must pass in a database object, please pass in.";
            //}
            //if (typeof expandBarcodeWell !== 'function') {
            //  throw "ParseFile error:  Must pass in the function for creating barcode prototype.";
            //}
            if (typeof workerObj !== 'object' || workerObj === null) {
                throw "ParseFile error:  Must pass in a worker object, please pass in.";
            }
            if (typeof workersFile !== 'string') {
                throw "ParseFile error:  Must pass in a file, please pass in.";
            }

            workers = workerObj.startWorkers({num_workers: 1, filename: workersFile, onError: function (err) {reportErrorFromWorker(err); onerror(err); }});
            workers.submitJob(file, function (evt) {
                //When this function runs, it returns the JSON triples for the file, this should be saved to the database at this point, and a table line added.
                //If an analysis is open, add this to the analysis...
                //TODO: check for error...
                data.JSON = evt.data;
                //data.save();
                //variable declarations
                //globs = [evt.data, data];
                //unfoldTriples(evt.data);
                //what to do with results
                //for (prop in evt.data) {
                //  if (evt.data.hasOwnProperty(prop)) {
                        //uuid = Math.uuid();
                        //uuids.push(uuid);
                        //barcodes.JSON[uuid] = expandBarcodeWell(evt.data[prop]);
                        //barcodes[uuid].db =  JSON.parse(JSON.stringify(dbObj));
                        //barcodes.JSON[uuid].name = prop;
                        //barcodes.JSON[uuid].uuid = uuid;
                //  }
                //}
            });
            workers.onComplete(function () {
                workers.clearWorkers();
                callback(uuids);
            });
        };


        //This division is used to expand and collapse the data object
        (function () {
            var expanded, isRef, setPropsMain, setPropsMinor;
            expanded = [];

            //helper functions
            isRef = function (input) {
                if (typeof input === "string" && input.match(/^\&\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/)) {
                    return 1;
                }
                return 0;
            };

            setPropsMain = function (obj, uuid) {
                //This stores the uuid as a property without it getting in the way
                if (!obj.hasOwnProperty(uuid)) {
                    Object.defineProperty(obj, 'uuid', {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: uuid
                    });
                }
            };
            addObject = function (inputObj) {
                var newUUID = Math.uuid();
                data.JSON.uuids[newUUID] = inputObj.child;
                inputObj.parent[inputObj.key] = data.JSON.uuids[newUUID];
                Object.defineProperty(data.JSON.uuids[newUUID], 'uuid', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: newUUID
                });
                (function (obj, key, ref) {
                    expanded.push(function () {
                        obj[key] = ref;
                    });
                }(inputObj.parent, inputObj.key, '&' + newUUID));
                return inputObj.child;
            };
            expand = function (callback) {
                //This has two major goals, to expand on the parents/uuids to make a full unit and to create setter properties for tracking analytical steps
                var i, key, key2, pw_x, ts_x, pep, obj, ref, input_obj;
                input_obj = data.JSON;
                for (key in input_obj.uuids) {
                    if (input_obj.uuids.hasOwnProperty(key)) {
                        //Set object properties
                        setPropsMain(input_obj.uuids[key], key);
                        if (typeof input_obj.uuids[key] === 'object') {
                            obj = input_obj.uuids[key];
                            if (obj instanceof Array) {
                                for (i = 0; i < obj.length; i += 1) {
                                    if (isRef(obj[i])) {
                                        ref = obj[i];
                                        obj[i] = input_obj.uuids[ref.replace(/^\&/, '')];
                                        //This stores the dereference so it can be undone
                                        (function (obj, i, ref) {
                                            expanded.push(function () {obj[i] = ref; });
                                        }(obj, i, ref));
                                    }
                                }
                            } else {
                                for (key2 in obj) {
                                    if (obj.hasOwnProperty(key2) && isRef(obj[key2])) {
                                        ref = obj[key2];
                                        obj[key2] = input_obj.uuids[ref.replace(/^\&/, '')];
                                        //This stores the dereference so it can be undone
                                        (function (obj, key2, ref) {
                                            expanded.push(function () {obj[key2] = ref; });
                                        }(obj, key2, ref));
                                    }
                                }
                            }
                        }
                    }
                }
                //Now set the parents
                for (i = 0; i < input_obj.parents.length; i += 1) {
                    if (isRef(input_obj.parents[i])) {
                        ref = input_obj.parents[i];
                        input_obj.parents[i] = input_obj.uuids[ref.replace(/^\&/, '')];
                        //This stores the dereference so it can be undone
                        (function (obj, i, ref) {
                            expanded.push(function () {obj[i] = ref; });
                        }(input_obj.parents, i, ref));
                        //Add data object
                        if (!input_obj.parents[i].db) {
                            input_obj.parents[i].db = {};
                            input_obj.parents[i].db.fit = false;
                            input_obj.parents[i].name = 'bar' + input_obj.parents[i].barcode + '_well' + input_obj.parents[i].row;
                        }
                    }
                }

                //Finally add the x-values to each of the peptides...
                for (i = 0; i < input_obj.parents.length; i += 1) {
                    pw_x = input_obj.parents[i].dataArr.postWash.exposureTime;
                    ts_x = input_obj.parents[i].dataArr.cycleSeries.cycle;
                    for (pep in input_obj.parents[i].peptides) {// This is the peptide level
                        if (input_obj.parents[i].peptides.hasOwnProperty(pep)) {
                            input_obj.parents[i].peptides[pep].cycleSeries.xVals = ts_x;
                            input_obj.parents[i].peptides[pep].postWash.xVals = pw_x;

                            (function (obj, prop) {
                                expanded.push(function () {delete obj[prop]; });
                            }(input_obj.parents[i].peptides[pep].cycleSeries, 'xVals'));

                            (function (obj, prop) {
                                expanded.push(function () {delete obj[prop]; });
                            }(input_obj.parents[i].peptides[pep].postWash, 'xVals'));
                        }
                    }
                }

                callback();
            };
            collapse = function (callback) {
                var i, obj, uuid, key, toCollapse, tarr;
                toCollapse = [];
                while (expanded.length > 0) {
                    (expanded.pop())();
                }

                //Now that those changes are accounted for, need to change all object parts to triples format
                for (uuid in data.JSON.uuids) {
                    if (data.JSON.uuids.hasOwnProperty(uuid)) {
                        obj = data.JSON.uuids[uuid];

                        //If it is not a string or an interger etc, then turn it into a reference
                        if (typeof obj === 'object') {
                            //Array
                            if (obj.constructor === Array) {
                                for (i = 0; i < obj.length; i += 1) {
                                    if (typeof obj[i] === 'object') {
                                        toCollapse.push([obj[i], uuid, i]);
                                    }
                                }
                            //Object
                            } else {
                                for (key in obj) {
                                    if (typeof obj[key] === 'object') {
                                        toCollapse.push([obj[key], uuid, key]);
                                    }
                                }
                            }
                        }
                    }
                }
                while (toCollapse.length > 0) {
                    tarr = toCollapse.pop();
                    //Idea: For objects that need to be decomposed in a special way, give them a specific function.
                    if (tarr[0].uuid && data.JSON.uuids.hasOwnProperty(tarr[0])) {
                        uuid = tarr[0].uuid;
                        obj = JSON.parse(JSON.stringify(tarr[0]));
                        data.JSON.uuids[uuid] = obj;
                        data.JSON.uuids[tarr[1]][tarr[2]] = '&' + uuid;
                        continue;
                    }
                    
                    uuid = Math.uuid();
                    obj = JSON.parse(JSON.stringify(tarr[0]));
                    data.JSON.uuids[uuid] = obj;
                    data.JSON.uuids[tarr[1]][tarr[2]] = '&' + uuid;

                    if (obj.constructor === Array) {
                        for (i = 0; i < obj.length; i += 1) {
                            if (typeof obj[i] === 'object') {
                                toCollapse.push([obj[i], uuid, i]);
                            }
                        }

                    //Object
                    } else {
                        for (key in obj) {
                            if (typeof obj[key] === 'object') {
                                toCollapse.push([obj[i], uuid, key]);
                            }
                        }
                    }
                }

                callback();
            };
        }());

        data.addData = function (dataObj) {
            var that, dealWithInput, readFileObject, parseFileString, batchObj;
            that = data;
            //This grabs the string passed to it, and handles it... Maybe, just deals directly with file object?
            dealWithInput = function (callback) {
                if (dataObj.type === 'string') {
                    data.string = dataObj.data;
                } else if (dataObj.type === 'fileObj') {
                    fileObj = dataObj.data;
                } else {
                    console.error('Data Type not recognized. Please either use a file object, or a string with full batch file');
                }
                callback();
            };
            readFileObject = function (callback) {
                var reader;
                if (typeof fileObj === 'object') {
                    reader = new FileReader();
                    reader.onload = function (e) {
                        that.string = e.target.result;
                        callback();
                    };
                    reader.readAsText(fileObj);
                } else {
                    callback();
                }
            };
            parseFileString = function (callback) {
                if (that.string) {
                    parseFile({callback: callback});
                } else {
                    console.error('No file string found...');
                    callback();
                }
            };

            queuePush([dealWithInput, readFileObject, parseFileString]);

            //To make results avaliable
            queuePush([function (cb) {
                var tempObj, bar, that, prop, i, sampleObj, saveOne, samples;

                that = data;
                samples = [];
                localData.batch[localBatchID] = localData.batch[localBatchID] || [];
                batchObj = {funcs: {save: data.save}, barcodes: localData.batch[localBatchID], status: 'local', name: fileObj.name, id: localBatchID, type: 'batch', date: (new Date()).toISOString() };

                saveOne = function (id) {
                    return function (input_obj) {
                        input_obj.id = id;
                        data.save(input_obj);
                    };
                };

                //Seperate out the families
                for (prop in that.JSON.families) {
                    if (that.JSON.families.hasOwnProperty(prop)) {
                        bar = {uuids: {}, parents: [prop], families: {}};
                        tempObj = data.JSON.families[prop];
                        bar.families[prop] = tempObj;
                        bar.uuids[prop.replace(/^\&/, '')] = that.JSON.uuids[prop.replace(/^\&/, '')];
                        for (i = 0; i < tempObj.length; i += 1) {
                            bar.uuids[tempObj[i].replace(/^\&/, '')] = that.JSON.uuids[tempObj[i].replace(/^\&/, '')];
                        }
                        localData.sample[prop.replace(/^\&/, '')] = bar;
                        localData.batch[localBatchID].push(prop.replace(/^\&/, ''));
                        samples.push({funcs: {save: saveOne(prop.replace(/^\&/, ''))}, date: batchObj.date, id: prop.replace(/^\&/, ''), status: 'local', type: 'data', name: 'bar' + data.JSON.uuids[prop.replace(/^\&/, '')].barcode + '_well' + data.JSON.uuids[prop.replace(/^\&/, '')].row });
                    }
                }
                localDataAvaliable.batches.push(batchObj);
                localDataAvaliable.samples = localDataAvaliable.samples.concat(samples);
                cb();
            }]);

            //for callback
            if (typeof dataObj.callback === 'function') {
                queuePush([function (cb) {
                    dataObj.callback(batchObj);
                    cb();
                }]);
            }
        };

        data.expand = function (callback) {
            expand(callback);
        };

        data.collapse = function (callback) {
            collapse();
            callback();
        };

        data.addObject = function (inputObj) {
            return addObject(inputObj);
        };

        data.loadData = function (dataObj) {
            //purpose of this funciton is is grab the actual data from data base
            var i, mainCallback, loadDataToJSON, funcs, localCall;

            funcs = [];
            //Note once this occurs, saving should no longer be an option            
            data.save = function () {
                console.error('Cannot save when data has been loaded from database');
            };
            console.log(dataObj);
            loadDataToJSON = function (object) {
                var prop, prop2, i, j, check, against;

                //This makes sure that identical data is not loaded on top of itself.
                if (data.JSON.parents && object.parents) {
                    for (i = 0; i < object.parents.length; i += 1) {
                        check = object.parents[i].uuid || object.parents[i].replace(/^\&/, '');
                        for (j = 0; j < data.JSON.parents.length; j += 1) {
                            against = data.JSON.parents[j].uuid || data.JSON.parents[j].replace(/^\&/, '');
                            if (check === against) {
                                return;
                            }
                        }
                    }
                }

                for (prop in object) {
                    if (object.hasOwnProperty(prop)) {
                        //Check to see if data already exists
                        if (data.JSON.hasOwnProperty(prop)) {
                            if (typeof object[prop] === 'object') {
                                //As an array the concat method works well
                                if (object[prop] instanceof Array) {
                                    data.JSON[prop] = data.JSON[prop].concat(object[prop]);
                                } else {
                                    //Just an object here
                                    for (prop2 in object[prop]) {
                                        if (object[prop].hasOwnProperty(prop2)) {
                                            data.JSON[prop][prop2] = object[prop][prop2];
                                        }
                                    }
                                }
                            }
                        } else {
                            data.JSON[prop] = object[prop];
                        }
                    }
                }
            };

            mainCallback = function (uuid) {
                // console.log('Being called once: ' + uuid);
                return function (qContinue) {
                    // console.log('here: ' + uuid);
                    cdb.loadData({uuid: uuid, callback: function (response) {
                        if (response === "") {
                            console.log('failed grab... need to update icon');
                        } else {
                            loadDataToJSON(JSON.parse(response));
                        }
                        data.expand(qContinue);
                    }});
                };
            };

            localCall = function(object) {
                return function (cb) {
                    loadDataToJSON(JSON.parse(JSON.stringify(object)));
                    data.expand(cb);
                };
            };
            if (localData.sample.hasOwnProperty(dataObj.info.id)) {
                funcs.push(localCall(localData.sample[dataObj.info.id]));
            } else if (localData.batch.hasOwnProperty(dataObj.info.id)) {
                for (i = 0; i < localData.batch[dataObj.info.id].length; i += 1) {
                    funcs.push(localCall(localData.sample[localData.batch[dataObj.info.id][i]]));
                }
            } else if (dataObj.info.type === 'batch') {
                for (i = 0; i < dataObj.info.barcodes.length; i += 1) {
                    funcs.push(mainCallback(dataObj.info.barcodes[i]));
                }
            } else {
                funcs.push(mainCallback(dataObj.info.id));
            }
            // funcs.push(data.expand);
            funcs.push(function (cb) {
                dataObj.callback();
                cb();
            });
            queuePush(funcs);
        };

        data.downloadURL = function (dataObj) {
            //purpose of this funciton is is grab the actual data from data base
            var url;

            funcs = [];
            if (dataObj.self) {
                //TODO: Just create a file out of self
            } else {
                url = cdb.getDownloadURL(dataObj);
                dataObj.callback(url);
            }
            return;
        };

        data.listBatches = function () {
            //simply returns data list avaliable
            return ((cdb.listBatches()).concat(localDataAvaliable.batches).sort(function (a, b) {
                if (a.date >= b.date) {
                    return -1;
                }
                return 1;
            }));
        };

        data.listData = function () {
            //simply returns data list avaliable
            return ((cdb.listData()).concat(localDataAvaliable.samples).sort(function (a, b) {
                if (a.date >= b.date) {
                    return -1;
                }
                return 1;
            }));
        };

        data.save = function (dataObj) {
            var that, fileObjFunc, individualBarcodeFunc;
            //purpose of this is to save data to database, since this is data, new batch id is always created
            that = data;

            fileObjFunc = function (callback) {
                if (typeof fileObj === 'object') {
                    //save file object, add information to config file
                    cdb.writeFile({data: fileObj, callback: function () {
                        var i;
                        fileObj = "";
                        for (i = 0; i < localDataAvaliable.batches.length; i += 1) {
                            if (localDataAvaliable.batches[i].id === localBatchID) {
                                localDataAvaliable.batches[i].name = "Remaining (not uploaded) samples for: " + localDataAvaliable.batches[i].name;
                            }
                        }
                        callback();
                    }, batchID: batchID});
                } else {
                    callback();
                }
            };

            individualBarcodeFunc = function (callback) {
                var prop, funcs = [], sendEach;

                funcs.push(collapse);
                sendEach = function (id) {
                    return function (callback) {
                        cdb.saveBarcode({id: id, data: localData.sample[id], name: 'bar' + that.JSON.uuids[id].barcode + '_well' + that.JSON.uuids[id].row + '.txt', batchID: batchID, callback: function () {
                            var i;
                            delete localData.sample[id];
                            delete that.JSON.families['&' + id];
                            for (i = 0; i < localDataAvaliable.samples.length; i += 1) {
                                if (localDataAvaliable.samples[i].id === id) {
                                    localDataAvaliable.samples.splice(i, 1);
                                }
                            }
                            for (i = 0; i < localData.batch[localBatchID].length; i += 1) {
                                if (localData.batch[localBatchID][i] === id) {
                                    localData.batch[localBatchID].splice(i, 1);
                                }
                            }
                            callback();
                        }});
                    };
                };

                if (dataObj && dataObj.id) {
                    console.log(JSON.parse(JSON.stringify([dataObj, dataObj.id, localData])));
                    funcs.push(sendEach(dataObj.id));
                } else {
                    //Send them all away
                    for (prop in that.JSON.families) {
                        if (that.JSON.families.hasOwnProperty(prop)) {
                            funcs.push(sendEach(prop.replace(/^\&/, '')));
                        }
                    }
                    //Now remove stuff from local avaliable
                    funcs.push(function (callback) {
                        var i;
                        delete localData.batch[localBatchID];
                        for (i = 0; i < localDataAvaliable.batches.length; i += 1) {
                            if (localDataAvaliable.batches[i].id === localBatchID) {
                                localDataAvaliable.batches.splice(i, 1);
                            }
                        }
                        callback();
                    });
                }

                if (dataObj && dataObj.callback) {
                    funcs.push(function (callback) {
                        dataObj.callback();
                        callback();
                    });
                }

                funcs.push(expand);
                queuePush(funcs);
                callback();
            };
            queuePush([fileObjFunc, individualBarcodeFunc]);
        };

        data.unloadQueue = function (callback) {
            //All functions for this have one parameter: callback, they all call callFunc to indicate completion of task.
            var callFunc = function () {
                unloading = false;
                queue.shift();
                data.unloadQueue();
            };

            if (typeof callback === 'function' && callback !== data.unloadQueue && callback !== callFunc) {
                queue.push(callback);
            }
            //How to interact with the Queue that is responsible for handling data
            if (unloading) {
                return false;
            }
            if (queue.length < 1) {
                unloading = false;
                return true;
            }
            unloading = true;
            (queue[0])(callFunc);
        };


        return data;
    };

    //Define Local functions 
    reportError = function (err) {
        $('<div/>', {'class': 'alert alert-error', html:
            '<button type="button" class="close" data-dismiss="alert">×</button>' +
            "File Manager Error: " + err
            }).appendTo('#errors');
        console.error("File Manager Error: " + err + "<br />To display more information for any" +
            " function type [func_name] instead of [func_name](...)");
    };

    reportErrorFromWorker = function (err) {
        var message = err.message || err;
        reportError(message + " In worker Package...");
    };

    run = function (func) {
        return function () {
            var y;
            try {
                y = func.apply(null, arguments);
            } catch (err) {
                reportError(err);
            }
            return y;
        };
    };

    return lib;
}());
