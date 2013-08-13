/*global KINOMICS: false, console: false, $ */
/*jslint todo: true */
KINOMICS.qualityControl.DA = (function () {
    'use strict';

    //Local Variables
    var lib, barWellObj, dataUpdateCallback, fitCurve, fitCurves, reportError, run;

    //Define variables
    lib = {};
    lib.functions = {
        postWash: ['js/qualityControl/postWashEq.js'],
        cycling: ['js/qualityControl/cyclingEq.js']
    };

    //preload equations
    (function () {
        var eq, i, suc, er;
        suc = function (obj) {
            return function (x) {
                var sol, url;
                url = obj;
                sol = eval('sol=' + x.replace(/[\n\r]+/g, ''));
                obj = sol;
                obj.string = x;
                obj.url = url;
            };
        };
        //TODO: make this a better error function..
        er = function (x) {
            console.log(x.error, 'it does not work...');
        };

        for (eq in lib.functions) {
            if (lib.functions.hasOwnProperty(eq)) {
                for (i = 0; i < lib.functions[eq]; i += 1) {
                    $.ajax({
                        dataType: "text",
                        url: lib.functions[eq][i],
                        success: suc(lib.functions[eq][i]),
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
        var barcode, data, fit, params, peptideI, percentFinished, R2, totalSSE, type;
        //Get location of original data
        barcode = event.data.shift();
        peptideI = event.data.shift();
        type = event.data.shift();
        fit = event.data.shift();
        data = barWellObj[barcode].peptides[peptideI][type];
        // console.log("Came back for barcode: " + barcode + " peptide: " + peptideI);
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
            var analysisType, barcode, callback, data, peptide;

            //variable definitions
            analysisType = input_obj.analysisType;
            barcode = input_obj.barcode;
            callback = input_obj.callback || function (x) {if (x !== undefined) { console.log(x); } };
            peptide = input_obj.peptide;
            //TODO: check user input
            worker.submitJob([barWellObj[barcode].peptides[peptide][analysisType], barcode, peptide, analysisType],
                dataUpdateCallback);

            worker.onComplete(callback);
        };
        //call the new definition to do work
        fitCurve(input_obj);
    };

    fitCurves = function (input_obj) {
        //variable declarations
        var callback, progressBar, barcodesAnalyzed, barContainer, barWell, barWellChanged, progress,
            peptide, percentFinished, total, updateData, workers, workersFile, workerObj, i, length,
            j, mainObj;

        //variable definitions
        barcodesAnalyzed = [];
        barWellObj = input_obj.barWellContainer;
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
                        if (!mainObj.postWash.models) {
                            mainObj.postWash.models = [];
                        }
                        for (j = 0; j <  lib.functions.postWash.length; j += 1) {
                            mainObj.postWash.models.push({
                                equation: lib.functions.postWash[j],
                                goodData: [],
                                x_values: mainObj.postWash.x_vals,
                                v_values: mainObj.postWash.medSigMBack
                            });
                            mainObj.postWash.medSigMBack.map(function () {
                                mainObj.postWash.models[mainObj.postWash.models.length -1].goodData.push(true);
                            });
                        }
                        // workers.submitJob([barWellObj[barWell].peptides[peptide].postWash, barWell, peptide, "postWash"],
                        //     updateData);
                        // workers.submitJob([barWellObj[barWell].peptides[peptide].timeSeries, barWell, peptide, "timeSeries"],
                        //     updateData);
                        // total += 2;
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
        return console.log("Error with quality control data analysis: " + err + "\nTo display more information for any" +
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
