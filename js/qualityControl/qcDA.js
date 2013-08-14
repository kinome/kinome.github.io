/*global KINOMICS: false, console: false, $*/
/*jslint evil:true, todo: true */
KINOMICS.qualityControl.DA = (function () {
    'use strict';

    //Local Variables
    var lib, barWellObj, currentAnalysis, dataUpdateCallback, fitCurve, fitCurves, reportError, run;

    //Define variables
    lib = {};
    lib.functions = {
        postWash: ['js/qualityControl/postWashEq.js'],
        cycleSeries: ['js/qualityControl/cyclingEq.js']
    };

    //preload equations
    (function () {
        var type, i, suc, er;
        suc = function (arr, ind) {
            return function (x) {
                var sol, url;
                url = arr[ind];
                sol = eval('sol=' + x.replace(/[\S \t]+?\/\/[\S \t]+?[\r\n]+/g, '').replace(/[\n\r]+/g, ''));
                arr[ind] = sol;
                arr[ind].string = x;
                arr[ind].url = url;
            };
        };
        //TODO: make this a better error function..
        er = function (x) {
            console.error(x.error, 'it does not work...');
        };

        for (type in lib.functions) {
            if (lib.functions.hasOwnProperty(type)) {
                for (i = 0; i < lib.functions[type].length; i += 1) {
                    $.ajax({
                        dataType: "text",
                        url: lib.functions[type][i],
                        success: suc(lib.functions[type], i),
                        error: er
                    });
                }
            }
        }
    }());


    //Define global functions
    lib.fitCurve = function (input_obj) {
        /*/////////////////////////////////////////////////////////////
        TODO: fill in these comments
        These will be comments for the user....
        Fit the curve specified by input_obj
        *//////////////////////////////////////////////////////////////
        run(fitCurve)(input_obj);
    };

    lib.fitCurves = function (input_obj) {
        /*/////////////////////////////////////////////////////////////
        TODO: fill in these comments
        These will be comments for the user....
        Fits all curves that do not already have data...
        *//////////////////////////////////////////////////////////////
        run(fitCurves)(input_obj);
    };

    //Define Local functions
    dataUpdateCallback = function (event) {
        //variable declarations
        var originalObj, data, fit;
        //Get location of original data
        originalObj = event.data.shift();
        fit = event.data.shift();
        data = currentAnalysis.uuids[originalObj.uuid].models[originalObj.modelInd];
        //variable defintions
        data.parameters = fit.parameters;
        data.R2 = fit.R2;
        data.totalSqrErrors = fit.totalSqrErrors;
    };

    fitCurve = function (input_obj) {
        //varible declarations
        var worker, workerObj, workerFile;
        //variable declarations
        barWellObj = input_obj.barWellContainer;
        workerObj = input_obj.workersLocation;
        workerFile = input_obj.workersFile;
        //TODO: check user input

        //the point of this pattern is to start a worker only one time. No need to close it then...
        worker = workerObj.startWorkers({filename: workerFile, num_workers: 1});
        fitCurve = function (input_obj) {
            //variable declarations
            var callback, uuid, ind, typeObj, submitObj;

            //variable definitions
            callback = input_obj.callback || function (x) {if (x !== undefined) { console.log(x); } };
            typeObj = input_obj.data;
            uuid = input_obj.uuid;
            ind = input_obj.ind;

            //TODO: check user input
            submitObj = JSON.parse(JSON.stringify(typeObj));
            submitObj.uuid = uuid;
            submitObj.modelInd = ind;
            worker.submitJob([submitObj], dataUpdateCallback);
            worker.onComplete(callback);
        };
        //call the new definition to do work
        fitCurve(input_obj);
    };

    fitCurves = function (input_obj) {
        //variable declarations
        var callback, progressBar, barcodesAnalyzed, barWell, barWellChanged, progress,
            peptide, percentFinished, total, updateData, workers, workersFile, workerObj, i, length,
            j, skip, mainObj, submitObj, type, initializeMainObject, typeObj;

        //variable definitions
        barcodesAnalyzed = [];
        barWellObj = input_obj.barWellContainer;
        currentAnalysis = input_obj.currentAnalysis;
        barWellChanged = [];
        percentFinished = 0;
        progress = 0;
        progressBar = input_obj.progressBar;
        total = 0;
        workerObj = input_obj.workersLocation;
        workersFile = input_obj.workersFile;
        callback = input_obj.callback;

        //TODO: check user input
        //function definitions
        updateData = function (event) {
            dataUpdateCallback(event);
            //Update the bar
            progress += 1;
            percentFinished = Math.floor(progress / total * 100);
            progressBar.width(percentFinished + '%');
            progressBar.text(percentFinished + '%');
        };
        initializeMainObject = function (mainObj, func) {
            var skip;
            skip = -1;
            //Does it already exist? - Right now this checks URL, ideal it will check screen
            mainObj.models.map(function (x, ind) {
                if (x.equation.url === func.url) {
                    skip = ind;
                }
            });
            //Add the needed components if not
            if (skip < 0) {
                skip = mainObj.models.length;
                mainObj.models.push({
                    equation: func,
                    accurateData: [],
                    x_values: mainObj.xVals,
                    y_values: mainObj.medSigMBack
                });
                mainObj.medSigMBack.map(function () {
                    mainObj.models[skip].accurateData.push(true);
                });
            }
            return skip;
        };

        //Open workers
        workers = workerObj.startWorkers({filename: workersFile, num_workers: 4});

        //Start submitting jobs
        for (barWell = 0; barWell < barWellObj.length; barWell += 1) {
            if (barWellObj[barWell].db.fit === false) {
                barWellChanged.push(barWell);
                //Hopefully I can get rid of the barcodesAnalyzed part, and just update the table...
                barcodesAnalyzed.push(barWell);
                for (peptide in barWellObj[barWell].peptides) {
                    if (barWellObj[barWell].peptides.hasOwnProperty(peptide)) {
                        //TODO: add in dealing with '0' data, and errors based on barcode_well rather than file.
                        mainObj = barWellObj[barWell].peptides[peptide];
                        for (type in mainObj) {
                            if (mainObj.hasOwnProperty(type)) {
                                typeObj = mainObj[type];
                                if (!typeObj.models) {
                                    typeObj.models = [];
                                }
                                //Add all the equations making sure that they do not already exist
                                for (j = 0; j <  lib.functions[type].length; j += 1) {
                                    // Initialize main object as needed
                                    skip = initializeMainObject(typeObj, lib.functions[type][j]);
                                    //Finally submit the job
                                    submitObj = JSON.parse(JSON.stringify(typeObj.models[skip]));
                                    submitObj.uuid = typeObj.uuid;
                                    submitObj.modelInd = skip;
                                    workers.submitJob([submitObj], updateData);
                                    total += 1;
                                }
                            }
                        }
                    }
                }
            }
        }

        //Now that all jobs have been submitted we can show the bar growing
        progressBar.show();

        workers.onComplete(function () {
            //Finalize the loading bar
            progressBar.width(100 + '%');
            workers.clearWorkers();
            length = barWellChanged.length;
            for (i = 0; i < length; i += 1) {
                barWell = barWellChanged[i];
                barWellObj[barWell].db.fit = true;
                barWellObj[barWell].db.changed = true;
            }
            callback();
            //Adds data to the fusion table object - this can occur after the data has been
                //displayed, it should run in the background no problem... Just make sure
                //the save button shows up after this is done.
            //fileUpload.sendBarcodesToDB(barcodesAnalyzed, fileUpload.showSaveDataButton);
        });
    };


    reportError = function (err) {
        return console.error("Error with quality control data analysis: " + err + "\nTo display more information for any" +
            " function type <func_name> instead of <func_name>(...)");
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
