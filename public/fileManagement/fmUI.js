/*global KINOMICS, console, $, FileReader */
/*jslint todo: true */
//TODO: error reporting for user very important here, make a failed save a ! or a yeild sign.
//TODO: change error so it only occurs on a barcode by barcode basis.
//TODO: add display for what is going on. ie parsing file, uploading file, downloading file, ect.

var glob;
KINOMICS.fileManager.UI = (function () {
    'use strict';

    //variable declarations
    var lib, fuse, files, analysis, analyses,
        run, reportError, fusePackage, s3db, qcUI,
        workersfile, workers, barcodes, barcodeCreator, thisDA,
        navigationBar, table, parseObj, currentLoaded, currentAnaDisplay;

    //variable definitions
    lib = {};
    analyses = [];

    //library function definitions
    fusePackage = KINOMICS.fusionTables;
    //s3dbPackage = KINOMICS.S3DB;
    fuse = KINOMICS.fileManager.DA.fusionTables;
    s3db = KINOMICS.fileManager.DA.s3db;
    workersfile = 'js/fileManagement/fileParseWorker.js';
    workers = KINOMICS.workers;
    barcodes = KINOMICS.barcodes;
    barcodeCreator = KINOMICS.expandBarcodeWell;
    thisDA = KINOMICS.fileManager.DA;
    qcUI = KINOMICS.qualityControl.UI;
    parseObj = {func: thisDA.parseFile, params: {
        //Will need to add, file: filename; dbObj: {info on db};
        callback: qcUI.fitCurvesBut.update,
        workersfile: workersfile,
        workers: workers,
        barcodes: barcodes,
        barcodeCreator: barcodeCreator
    }};

    //main element declarations
    navigationBar = $('#colBrowse');
    table = $('#fileTable');

    //local function definitions
    reportError = function (err) {
        return console.error("Kinomics File Manager User Interface Error: " + err + "\nTo display more information for any" +
            " function type <func_name> instead of <func_name>(...)");
    };

    run = function (func) {
        return function () {
            var y;
            // try {
                y = func.apply(null, arguments);
            // }
            // } catch (err) {
            //     reportError(err);
            // }
            return y;
        };
    };

    //define UI element function groups
    //Page set up - general


    //Page set up, accesable elements
    lib.formControl = (function (mainLib) {
        //variable declarations
        var defaultMessage, s3dbPanel, fusePanel, lib, update,
            setUpload, saveToDb, panel, dbSelector, addFileToTable, newAnalysis, box,
            analysisTextBox;

        //variable definitions
        lib = {};
        defaultMessage = $('#defaultFile');
        s3dbPanel = $('#S3DBupload');
        fusePanel = $('#fusionUpload');
        dbSelector = $('.dbSelector');

        lib.update = function () {
            //TODO: user docs...
            run(update)();
        };

        lib.setUpload = function (str) {
            //TODO: user docs...
            run(setUpload)(str);
        };

        dbSelector.setText = function (text) {
            $('.curData').text(text);
        };

        addFileToTable = function (evt) {
            //variable declarations
            var  i, file, dataObj;
            //variable definitions
            files = evt.target.files; // FileList object
            evt.preventDefault();
            // Loop through the FileList and read the files
            for (i = 0; i < files.length; i += 1) {
                file = files[i];
                //reader = new FileReader();
                //reader.onload = makeTableLineForNewFile(file.name, Math.round(file.size / 10.24) / 100, mainLib.table.addLineToTableTop);
                //NOTE: this is changed to call the general write file function
                //TODO: make sure this works for S3DB and fusion tables
                //TODO: add loading animation and popup warning for uploading
                //TODO: fix problem of loading two at the same time when refresh status changes, should be an easy fix with new status tag
                //thisDA.writeFile({db: saveToDb, file: file, callback: function (x) {console.log(x, '\nFile written\n'); }, parseObj: parseObj});
                dataObj = thisDA.newDataObject();
                dataObj.addData({type: 'fileObj', data: file, callback: function (batchObject) {
                    mainLib.table.update();
                }});
                // dataObj.save({callback: mainLib.table.update});
            }
        };

        newAnalysis = function (evt) {
            var analysisName;
            evt.preventDefault();
            box.modal('toggle');

            //get analysis name and reset text
            analysisName = analysisTextBox.val();
            analysisTextBox.val("");
            analysis = thisDA.newAnalysisObject({name: analysisName});
            analyses.push(analysis);
            currentLoaded = {};
            currentAnaDisplay.text('Current Analysis: ' + analysisName);
            mainLib.table.update();
            //Add analysis to table view
        };


        setUpload = function (str) {
            if (str === 'fuse') {
                saveToDb = fuse;
                saveToDb.name = 'Fusion Tables';
                panel = fusePanel;
                dbSelector.setText('Fusion Tables');
            } else if (str === 's3db') {
                saveToDb = s3db;
                saveToDb.name = 'S3DB';
                panel = s3dbPanel;
                dbSelector.setText('S3DB');
            } else {
                throw 'Must use setUpload with a string passed in of either s3db or fuse';
            }
            update();
        };

        update = function () {
            if ((saveToDb !== undefined) && (saveToDb.loggedIn)) {
                defaultMessage.hide();
                navigationBar.show();
                panel.show();
                saveToDb.getUserName(function (userName) {
                    $('.username').text(userName);
                });
                //$('.hiddenBut').click();
                //$('#fuseSub').click();
                //$('#multiUp').click();
            } else {
                defaultMessage.show();
                s3dbPanel.hide();
                fusePanel.hide();
                navigationBar.hide();
                $('.username').text('Login');
            }
        };

        //actually set up elements...
        (function () {
            var tempElem;
            defaultMessage.show();
            s3dbPanel.hide();
            fusePanel.hide();
            $('<li />', {html: "<a>Fusion Tables</a>"}).click(function () {setUpload('fuse'); }).appendTo(dbSelector);
            $('<li />', {html: "<a>S3DB</a>"}).click(function () {setUpload('s3db'); }).appendTo(dbSelector);
            dbSelector.setText('Select Database');
            $('#FUSEsub').unbind();
            $('#FUSEsub').bind('change', addFileToTable);

            //Add current analysis info
            currentAnaDisplay = $('.currentAnaDisp').text('To begin analysis, please select or create an analysis.');

            //Gives the new analyisis Button Function.
            $('#NEWanalysis').unbind();
            $('#NEWanalysis').click(function (evt) {
                evt.preventDefault();
                box.modal('toggle');
                analysisTextBox.focus();
            });
            box = $('<div />', {'aria-labelledby': "myModalLabel", 'aria-hidden': "true", role: 'dialog', tabindex: '-1', 'class': 'modal hide fade'}).appendTo('#tableDiv');
            $('<div />', {'class': 'modal-header', html: '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h3>Give analysis a name.</h3>'}).appendTo(box);
            tempElem = $('<div />', {'class': 'modal-body', html: ''}).appendTo(box);
            analysisTextBox = $('<input />', {type: "text"}).keypress(function (e) {
                if (e.which === 13) {
                    newAnalysis(e);
                }
            }).appendTo(tempElem);
            tempElem = $('<div />', {'class': 'modal-footer'}).appendTo(box);
            $('<button />', {'class': "btn btn-primary", text: 'Create Analysis'}).click(newAnalysis).appendTo(tempElem);
            box.on('shown', function () { analysisTextBox.focus(); });
        }());

        return lib;
    }(lib));

    lib.navigationBar = (function () {
        //variable declarations
        var currentDataType, lib, resizeMenus, setDataType;

        //variable definitions
        lib = {};
        currentDataType = 'origin';

        lib.setDataType = function (str) {
            //TODO: user docs
            run(setDataType)(str);
        };

        resizeMenus = function () {
            /*jslint unparam: true */
            if ($('#tag3').parent().attr('class') === "active") {
                var max = 20;
                $('.fileOpts').each(function (ind, x) {
                    $(x).height('auto');
                    if ($(x).is(":visible")) {
                        max = Math.max($(x).height(), max);
                    }
                }).height(max);
            }
        };

        setDataType = function (str) {
            currentDataType = str || currentDataType;
            switch (currentDataType) {
            case 'origin':
                $('.batch').show();
                $('.data').hide();
                $('.analysis').hide();
                break;
            case 'barcode':
                $('.batch').hide();
                $('.data').show();
                $('.analysis').hide();
                break;
            case 'analysis':
                $('.batch').hide();
                $('.data').hide();
                $('.analysis').show();
                break;
            default:
                throw "Must pass nothing, or a string ==(origin||barcode), you passed: " + str;
            }
            resizeMenus();
        };

        (function () {
            var tempElem;
            navigationBar.hide();
            lib.setDataType('analysis');
            tempElem = $('<div/>', {'class': 'sidebar-nav'}).appendTo(navigationBar);
            tempElem = $('<ul/>', {'class': 'nav nav-list'}).appendTo(tempElem);
            $('<li />', {'class': 'nav-header', text: 'Collections'}).appendTo(tempElem);
            $('<li />', {'class': 'active', html: '<a>Analyses</a>'}).click(function () {
                tempElem.find('li:not(.nav-header)').attr('class', '');
                $(this).attr('class', 'active');
                setDataType('analysis');
            }).appendTo(tempElem);
            $('<li />', {html: '<a>Bionavigator Output</a>'}).click(function () {
                tempElem.find('li:not(.nav-header)').attr('class', '');
                $(this).attr('class', 'active');
                setDataType('origin');
            }).appendTo(tempElem);
            $('<li />', {html: '<a>Samples</a>'}).click(function () {
                tempElem.find('li').attr('class', '');
                $(this).attr('class', 'active');
                setDataType('barcode');
            }).appendTo(tempElem);
        }());

        return lib;
    }());

    lib.table = (function (mainLib) {
        //variable declarations
        var createLine, downloadFile, addToAnalysis, addLineToTableTop, addLinesToTable, anaObj, dataObj, lib, update;

        //variable definitions
        lib = {};
        table.hide();
        dataObj = thisDA.newDataObject();
        anaObj = thisDA.newAnalysisObject({name: '', UI: false});
        //TODO reset these when the backend changes.

        //user functions
        lib.update = function () {
            //TODO: User docs...
            run(update)();
        };

        lib.addLineToTableTop = function (line) {
            //TODO: user docs...
            run(addLineToTableTop)(line);
        };

        //local functions
        addToAnalysis = function (obj) {
            return function (evt) {
                var i, that = $(this);
                evt.preventDefault();
                that.unbind('click');
                if (analysis) {
                    that.attr('class', 'btn btn-warning');
                    that.html("<i class='icon-refresh icon-white'></i>");
                    analysis.loadData({info: obj, callback: function () {
                        if (obj.files) {
                            console.log('here I am look at me', obj);
                            for (i = 0; i < obj.files.length; i += 1) {
                                currentLoaded[obj.files[i][2]] = 1;
                            }
                        }
                        if (obj.type === 'batch') {
                            obj.barcodes.map(function (x) { currentLoaded[x] = 1; });
                        }
                        currentLoaded[obj.id] = 1;
                        qcUI.fitCurvesBut.update();
                        update();
                        that.attr('class', 'btn btn-info');
                        that.html("<i class='icon-ok icon-white'></i>");
                        that.unbind('click');

                    }});
                } else {
                    that.click(addToAnalysis(obj));
                    throw 'No analysis create one first please';
                }
            };
        };

        downloadFile = function (obj) {
            return function (evt) {
                var i, that = $(this);
                evt.preventDefault();
                that.unbind('click');
                console.log(obj);
            };
        };

        addLineToTableTop = function (line) {
            //TODO: check user input...
            table.prepend(createLine(line));
        };

        createLine = function (obj) {
            var trow, tempElem, pushButton;
            //Obj needs to have a type, id, name, and date minimum
            trow = $('<tr />', {'class': 'tableRow ' + obj.type});

            //space
            tempElem = $('<td />').appendTo(trow);
            pushButton = $('<button />', {'class': 'btn btn-success',
                html: "<i class='icon-plus icon-white'></i>"}).click(addToAnalysis(obj)).appendTo(tempElem);
            if (analysis && (currentLoaded[obj.id])) {
                pushButton.attr('class', 'btn btn-info');
                pushButton.html("<i class='icon-ok icon-white'></i>");
                pushButton.unbind('click');
                pushButton.click(function (evt) {
                    evt.preventDefault();
                });
            }

            //File name
            $("<td />", {text: obj.name}).appendTo(trow);

            //File date
            $("<td />", {html: (new Date(obj.date)).toLocaleDateString()}).appendTo(trow);

            //Where loading bar would be
            $("<td />").appendTo(trow);

            //Download Button - space
            if (obj.status === 'local') {
                // tempElem = $('<td />').appendTo(trow);
                // $('<button />', {'class': 'btn btn-info', html: "<i class='icon-upload icon-white'></i> Upload"}).click(function (evt) {
                //     evt.preventDefault();
                //     obj.funcs.save({callback: update});
                // }).appendTo(tempElem);
            } else {
                tempElem = $('<td />').appendTo(trow);
                $('<button>', {'class': 'btn btn-info', 
                                html:"<i class='icon-download icon-white'></i>Download Data",
                }).click(downloadFile(obj)).appendTo(tempElem);
            }

             //Where cancel upload would be
            tempElem = $("<td />").appendTo(trow);

            //Delete button
            // $('<button />', {'class': 'btn btn-danger',
            //     html: "<i class='icon-download icon-white'></i> Remove From List"}).
            //     appendTo(tempElem);
            return trow;
        };

        addLinesToTable = function (linesArr) {
            var i;
            for (i = 0; i < linesArr.length; i += 1) {
                table.append(createLine(linesArr[i]));
            }
            table.show();
            mainLib.formControl.update();
            mainLib.navigationBar.setDataType();
        };
        update = function () {
            //change display elements
            table.find("tr:.tableRow").remove();
            table.hide();
            $('#defaultFile').hide();
            addLinesToTable(dataObj.listBatches());
            addLinesToTable(dataObj.listData());
            addLinesToTable(anaObj.listAnalyses());
        };

        return lib;
    }(lib));

    //After the page loads, be sure to log in.
    (function () {
        //'Login' right away
        lib.formControl.setUpload('fuse');
        thisDA.login(fuse, fusePackage, parseObj, lib.table.update);
    }());

    //Create default anaysis
    (function () {
        console.log('trying this...');
        var analysisName;
        analysisName = "guest_auto";
        analysis = thisDA.newAnalysisObject({name: analysisName});
        analyses.push(analysis);
        currentLoaded = {};
        currentAnaDisplay.text('Current Analysis: ' + analysisName);
        lib.table.update();
    }());


    return lib;
}());

