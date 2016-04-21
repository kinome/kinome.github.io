/*global M, document, KINOMICS, google, console, $, jQuery*/
/*jslint todo: true */

//TODO: slider bar for R^2, without the installed package? Not high priority, but probably best to remove this framework

KINOMICS.qualityControl.UI = (function () {
    'use strict';

    //variable declarations
    var barcodes, barContainer, buttonRow, buttonWell, dataAnalysisObj,  figureColumn, figureInfoColumn,
        lib, loadingBarRow, qcBody, reportError, run, startNextPeptide, tableSpot, workerObj, sliderbar,
        fitCurvesWorkersFile, optionsElem, currentAnalysis;

    //variable definitions
    lib = {};

    //library definitions
    workerObj = KINOMICS.workers;
    dataAnalysisObj = KINOMICS.qualityControl.DA;
    fitCurvesWorkersFile = '/js/qualityControl/fitCurvesWorker.js';
    barcodes = KINOMICS.barcodes;
    currentAnalysis = KINOMICS.barcodes;

    //local functions
    reportError = function (err) {
        return console.error("Kinomics User Interface Error: " + err + "\nTo display more information for any" +
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

    //define UI element function groups

    //Since this is a UI function it starts by creating a number of HTML elements, hides the appropriate ones
        // and stores the identities of the ones that are needed inside of the following anaomous closure:
    (function () {
        //variable declarations
        var qcTab, tempElem, wellRow;
        //variable definitions

        //Create UI elements
        //This is the top portion of the page contain buttons and the loading bar
        qcTab = $('#qualtityControl');

        //This contains the buttons themselves
        wellRow =  $('<div/>', {'class': "row"}).appendTo(qcTab);
        tempElem = $('<div/>', {'class': "span12"}).appendTo(wellRow);
        buttonWell = $('<div/>', {'class': "well"}).appendTo(tempElem).hide();
        tempElem = $('<div/>', {'class': "row"}).appendTo(buttonWell);
        buttonRow = $('<div/>', {'class': "span11"}).appendTo(tempElem);
        $('<div/>', {'class': "row", html: "&nbsp;"}).appendTo(buttonWell); // for spacing...
        loadingBarRow = $('<div/>', {'class': "row"}).appendTo(buttonWell);

        //The place for the options
        tempElem = $('<div/>', {'class': "row"}).appendTo(buttonWell);
        tempElem = $('<div/>', {'class': "span11"}).appendTo(tempElem);
        tempElem = $('<div/>', {'class': 'accordion'}).appendTo(tempElem);
        tempElem = $('<div/>', {'class': 'accordion-group'}).appendTo(tempElem);
        $('<div/>', {'class': 'accordion-heading'}).append(
            $('<a/>', {
                'class': 'accordion-toggle',
                'data-toggle': "collapse",
                'data-target': "#collapseOpt",
                'html': '<small><i class=icon-chevron-down></i></small>Display Options'
            })
        ).appendTo(tempElem);
        tempElem = $('<div/>', {id: 'collapseOpt', 'class': 'accordion-body collapse'}).appendTo(tempElem);
        optionsElem = $('<div/>', {'class': 'accordion-inner'}).appendTo(tempElem);


        //The place for the table, figures, and figure info
        qcBody = $('<div/>', {'class': "row"}).appendTo(qcTab).hide();
        tableSpot = $('<div/>', {'class': "span6"}).appendTo(qcBody);
        figureInfoColumn = $('<div/>', {'class': "span2"}).appendTo(qcBody).hide();
        sliderbar = $('<dl/>').appendTo(optionsElem);

        //Add the figure paces and the header for the place
        figureColumn = $('<div/>', {'class': "span4"}).appendTo(qcBody).hide();
    }());

    //The following functions are for various elements of the page, in the order they appear top->bottom, left->right
    lib.fitCurvesBut = (function (mainLib) {
        //variable declarations
        var element, fitCurves, fitCurvesClick, thislib, progressBar, tempElem, update, updateActive;

        //variable definitions
        thislib = {};
        fitCurves = dataAnalysisObj.fitCurves;

        //library definitions
        updateActive = function () {
            /*////////////////////////////////////////////////////////////////////////////////
            This function takes no arguments, but checks if there are barcodeWells that need 
            to be fit by fit curves, and if so it enables the button.
            */////////////////////////////////////////////////////////////////////////////////
            run(update)();
        };
        thislib.update = updateActive;

        //local functions
        fitCurvesClick = function () {
            element.unbind('click');
            thislib.update = ""; //This is so the button cannot be updated while curves are being fit.
            element.button('loading');
            barContainer.show();
            //fit the curves
            fitCurves({
                progressBar: progressBar,
                barWellContainer: barcodes,
                workersLocation: workerObj,
                currentAnalysis: currentAnalysis,
                workersFile: fitCurvesWorkersFile,
                callback: function () {
                    element.button('complete');
                    barContainer.hide();
                    progressBar.hide();
                    progressBar.width('0%');
                    run(update)();
                    thislib.update = updateActive; // Turns update feature back on.
                    mainLib.QCtable.update();
                    //mainLib.saveDataBut.update();
                    //TODO: update/create save button
                }
            });
        };

        update = function () {
            var i, upd = 0;
            element.button('complete');
            if(KINOMICS.barcodes) {
                barcodes = KINOMICS.barcodes.JSON.parents || barcodes;
                currentAnalysis = KINOMICS.barcodes;
                for (i = 0; i < barcodes.length; i += 1) {
                    $('#tempQCMessage').hide();
                    buttonWell.show();
                    if (barcodes[i].db.fit === false) {
                        element.button('reset');
                        element.unbind('click');
                        element.click(fitCurvesClick);
                    } else if (!upd) {
                        mainLib.QCtable.update();
                        //mainLib.saveDataBut.update();
                        upd += 1;
                    }
                }
            } else {
                barcodes = [];
                mainLib.QCtable.update();
            }
            
        };

        //Actually create the element
        //Create fit curves button
        // tempElem = $('<div/>', {'class': 'span3'}).appendTo(buttonRow);
        element = $('<button/>', {
            'class': 'btn btn-primary',
            'data-loading-text': 'Fitting Data, this may take a while',
            'data-complete-text': 'Curves have been fitted',
            text: 'Fit Curves'
        }).appendTo(buttonRow);

        //Creates the loading bar
        tempElem = $('<div/>', {'class': 'span11'}).appendTo(loadingBarRow);
        barContainer = $('<div/>', {'class': "progress progress-striped active"}).appendTo(tempElem).hide();
        progressBar = $('<div/>', {'class': "bar", style: "width: 0%", id: "bar"}).appendTo(barContainer).hide();

        return thislib;
    }(lib));

    //This will be for the option element when there are more options...
    /*    lib.optionsCol = (function () {
        //variable declartions
        var lib;

        //variable definitions
        lib = {};

        return lib;
    }()); */

    lib.QCtable = (function (mainLib) {
        //variable declarations
        var flagR, idsPerPage, thislib, slider, tableRows, update, prevPep, nextPep,
            barArr, barClicked, barPageElem, barSelected, barCurrentPage, barRefresh, pepInd,
            pepArr, pepClicked, pepPageElem, pepSelected, pepCurrentPage, pepRefresh, barInd;

        //variable definitions
        barArr = [];
        barCurrentPage = 1;
        pepArr = [];
        pepCurrentPage = 1;
        thislib = {};
        flagR = 0.8;
        tableRows = [[], []];
        idsPerPage = 10;

        //library definitions
        thislib.update = function () {
            /*////////////////////////////////////////////////////////////////////////////////
            This function takes no arguments, but checks if there are barcode_wells that need 
            to be added to the QC table.
            */////////////////////////////////////////////////////////////////////////////////
            run(update)();
        };

        thislib.getCurrentBar = function () {
            /*////////////////////////////////////////////////////////////////////////////////
            This function takes no arguments, and returns the current barcode displayed.
            */////////////////////////////////////////////////////////////////////////////////
            return barSelected === 0 ? 0 : barSelected || undefined;
        };

        thislib.getCurrentPep = function () {
            /*////////////////////////////////////////////////////////////////////////////////
            This function takes no arguments, and returns the current barcode displayed.
            */////////////////////////////////////////////////////////////////////////////////
            return pepSelected || undefined;
        };

        //function defintions
        barClicked = function () {
            //variable declarations
            var pep, pepHere, that;

            //variable definitions
            that = $(this);

            //start barside
            barSelected = that.data("barcodeWell");

            if (barSelected === undefined) {return; }

            //start pepside
            pepArr = [];
            for (pep in barcodes[barSelected].peptides) {
                if (barcodes[barSelected].peptides.hasOwnProperty(pep)) {
                    pepArr.push(pep);
                }
            }
            pepArr.sort();
            if (pepSelected) {
                pepHere = pepArr.indexOf(pepSelected);
                if (pepHere > -1) {
                    pepCurrentPage = Math.floor(pepArr.indexOf(pepSelected) / idsPerPage) + 1;
                } else {
                    pepSelected = "";
                    pepCurrentPage = 1;
                }
            }

            //refresh both sides
            barRefresh();
            pepRefresh();
            mainLib.plots.update();
        };
        barRefresh = function () {
            //variable declarations
            var html, i, ind, len, tableStart;
            //variable definitions
            tableStart = (barCurrentPage - 1) * 10;
            len = barArr.length;

            //update table
            for (i = 0; i < idsPerPage; i += 1) {
                ind = i + tableStart;
                if (ind < len) {
                    if (barcodes[barArr[ind]].hasOwnProperty('meta') && barcodes[barArr[ind]].meta.hasOwnProperty('display_name') && typeof barcodes[barArr[ind]].meta.display_name === "string") {
                        html = barcodes[barArr[ind]].meta.display_name;
                    } else {
                        html = barcodes[barArr[ind]].name;
                    }
                    if (barArr[ind] === barSelected) {
                        html = '<b>' + html + '</b>';
                        barInd = ind;
                    }
                    tableRows[0][i].html(html);
                    tableRows[0][i].data('barcodeWell', barArr[ind]);
                } else {
                    tableRows[0][i].html('&nbsp;');
                    tableRows[0][i].data('barcodeWell', undefined);
                }
            }

            //update page number
            barPageElem.html('<a>Page ' + barCurrentPage + '/' + (Math.floor(len / idsPerPage) + 1) + '</a>');
            if (pepSelected) {
                pepRefresh();
            }
        };

        pepClicked = function () {
            //variable declarations
            var that;

            //variable definitions
            that = $(this);

            //start barside
            pepSelected = that.data("peptide");

            //refresh peptides
            pepRefresh();

            //display figures
            mainLib.plots.update();
        };
        pepRefresh = function () {
            //variable declarations
            var data, flag, html, i, ind, len, peptide, tableStart;

            //variable definitions
            tableStart = (pepCurrentPage - 1) * 10;
            len = pepArr.length;

            //TODO: better flag and preload data

            for (i = 0; i < idsPerPage; i += 1) {
                ind = i + tableStart;
                if (ind < len) {
                    data = barcodes[barSelected].peptides[pepArr[ind]];
                    peptide = pepArr[ind];
                    peptide = peptide.replace(/(r|c)_(\d+)/g, '$1-$2');
                    peptide = peptide.replace(/_/g, ' ');
                    //TODO generalize this to work with any number of models or types
                    if (data.postWash.models[0].R2 < flagR ||
                            data.cycleSeries.models[0].R2 < flagR) {
                        flag = "&nbsp;<i class=icon-exclamation-sign></i>";
                    } else {
                        flag = "";
                    }
                    if (pepArr[ind] === pepSelected) {
                        html = '<b>' + peptide + flag + '</b>';
                        pepInd = ind;
                    } else {
                        html = peptide + flag;
                    }
                    tableRows[1][i].html(html);
                    tableRows[1][i].data('peptide', pepArr[ind]);
                } else {
                    tableRows[1][i].html("&nbsp;");
                    tableRows[1][i].data('peptide', undefined);
                }
            }

            //update page number
            pepPageElem.html('<a>Page ' + pepCurrentPage + '/' + (Math.floor(len / idsPerPage) + 1) + '</a>');
        };

        nextPep = function () {
            //variable declarations
            var barL, pepL;

            //variable defintions
            barL = barArr.length;
            pepL = pepArr.length;

            //Three cases: normal, 
                // we are at the last pep, 
                // we are at the last pep on the last barcode - do nothing
            if (pepInd < pepL - 1) {
                //normal
                pepSelected = pepArr[pepInd + 1];
                pepCurrentPage = Math.floor((pepInd + 1) / idsPerPage) + 1;
                pepRefresh();
                mainLib.plots.update();
            } else if (barInd < barL - 1) {
                barSelected = barArr[barInd + 1];
                //rather than rewrite barClicked for this specific case, create a temporary element and click it.
                $('<tr>').click(barClicked).data("barcodeWell", barSelected).click();
                pepSelected = pepArr[0];
                pepCurrentPage = 1;
                barCurrentPage = Math.floor((barInd + 1) / idsPerPage)  + 1;
                barRefresh();
                pepRefresh();
                mainLib.plots.update();
            }
        };
        prevPep = function () {
            //variable declarations

            //Three cases: normal, 
                // we are at the first pep, 
                // we are at the first pep on the first barcode - do nothing
            if (pepInd > 0) {
                //normal
                pepSelected = pepArr[pepInd - 1];
                pepCurrentPage = Math.floor((pepInd - 1) / idsPerPage) + 1;
                pepRefresh();
                mainLib.plots.update();
            } else if (barInd > 0) {
                barSelected = barArr[barInd - 1];
                //rather than rewrite barClicked for this specific case, create a temporary element and click it.
                $('<tr>').click(barClicked).data("barcodeWell", barSelected).click();
                pepSelected = pepArr[pepArr.length - 1];
                pepCurrentPage = Math.floor(pepArr.length / 10) + 1;
                barCurrentPage = Math.floor((barInd - 1) / idsPerPage) + 1;
                barRefresh();
                pepRefresh();
                mainLib.plots.update();
            }
        };

        startNextPeptide = function () {
            //redefine so it doesn't call this more than once.
            startNextPeptide = "";

            //variable declarations
            var tempElem;
            //variable definitions

            tempElem = $('<div/>', {"class": 'row'}).appendTo(figureInfoColumn);
            tempElem = $('<div/>', {"class": 'span2'}).appendTo(tempElem);
            tempElem = $('<div/>', {"class": 'btn-group'}).appendTo(tempElem);
            $('<button/>', {'class': 'btn', html: "<i class=icon-arrow-left></i>&nbsp;Prev"}).appendTo(tempElem).click(prevPep);
            $('<button/>', {'class': 'btn', html: "Next&nbsp;<i class=icon-arrow-right></i>"}).appendTo(tempElem).click(nextPep);
        };

        update = function () {
            //variable declarations
            var bw;

            //Barcode table hide if no data
            if(! barcodes || barcodes.length < 1) {
                qcBody.hide()
                return;
            }

            //variable definitions
            barArr = [];
            qcBody.show();

            //loop through barcodes to determine if any are ready for display
            for (bw = 0; bw < barcodes.length; bw += 1) {
                if (barcodes[bw].db && barcodes[bw].db.fit) {
                    barArr.push(bw);
                }
            }
            barArr = barArr.sort(function (a, b) {
                var aName, bName;
                if (barcodes[barArr[a]].hasOwnProperty('meta') && barcodes[barArr[a]].meta.hasOwnProperty('display_name') && typeof barcodes[a].meta.display_name === "string") {
                    aName = barcodes[a].meta.display_name;
                } else {
                    aName = barcodes[a].name;
                }
                if (barcodes[barArr[b]].hasOwnProperty('meta') && barcodes[barArr[b]].meta.hasOwnProperty('display_name') && typeof barcodes[b].meta.display_name === "string") {
                    bName = barcodes[b].meta.display_name;
                } else {
                    bName = barcodes[b].name;
                }
                if (aName === bName) {
                    return 0;
                }
                return aName > bName ? 1 : -1;
            });
            if (barSelected) {
                barCurrentPage = Math.floor(barArr.indexOf(barSelected) / idsPerPage) + 1;
            }
            barRefresh();
        };

        //sets up the table element
        (function () {
            //variable declarations
            var cell, slideFunc, dataTable, i, Rdisp, row, tempElem;

            //variable definitions

            //Build the table
            dataTable = $('<table/>', {"class": "table table-striped table-bordered", style: "table-layout: fixed; width: 100%;"}).appendTo(tableSpot); //was #barcodes
            //$('<col/>', {style: "width: 30%"}).appendTo(dataTable);

            //Add the header
            tempElem = $('<tr/>').appendTo(dataTable);
            $('<th/>', {text: "Barcodes"}).appendTo(tempElem); // was #tdbars
            $('<th/>', {text: "Peptides"}).appendTo(tempElem); // was #theadPep

            //Add the rows
            for (i = 0; i < idsPerPage; i += 1) {
                row = $('<tr/>').appendTo(dataTable);

                //Barcode Side
                tableRows[0][i] = $('<td/>').appendTo(row);
                tableRows[0][i].html("&nbsp;");
                tableRows[0][i].data('barcodeWell', undefined);
                tableRows[0][i].click(barClicked);

                //Peptide Side
                tableRows[1][i] = $('<td/>', {style: 'word-wrap: break-word'}).appendTo(row);
                tableRows[1][i].html("&nbsp;");
                tableRows[1][i].data('peptide', undefined);
                tableRows[1][i].click(pepClicked);
            }

            //Add the pagination portions
            row = $('<tr/>').appendTo(dataTable);

            //Barcode
            cell = $('<td/>', {'style': 'text-align: center', html: '<br />'}).appendTo(row);
            tempElem = $('<div/>', {'class': 'btn-group'}).appendTo(cell);
            $('<button/>', {'class': 'btn', html: "<i class = icon-arrow-left></i>"}).appendTo(tempElem).click(function () {
                barCurrentPage -= barCurrentPage > 1 ? 1 : 0;
                barRefresh();
            });
            barPageElem = $('<button/>', {'class': 'btn', html: "Page 1/1"}).appendTo(tempElem);
            $('<button/>', {'class': 'btn', html: "<i class = icon-arrow-right></i>"}).appendTo(tempElem).click(function () {
                barCurrentPage += barCurrentPage < Math.floor(barArr.length / idsPerPage) + 1 ? 1 : 0;
                barRefresh();
            });
            $('<br/>').appendTo(cell);

            //Peptides
            cell = $('<td/>', {'style': 'text-align: center', html: '<br />'}).appendTo(row);
            tempElem = $('<div/>', {'class': 'btn-group'}).appendTo(cell);
            $('<button/>', {'class': 'btn', html: "<i class = icon-arrow-left></i>"}).appendTo(tempElem).click(function () {
                pepCurrentPage -= pepCurrentPage > 1 ? 1 : 0;
                pepRefresh();
            });
            pepPageElem = $('<button/>', {'class': 'btn', html: "Page 1/1"}).appendTo(tempElem);
            $('<button/>', {'class': 'btn', html: "<i class = icon-arrow-right></i>"}).appendTo(tempElem).click(function () {
                pepCurrentPage += pepCurrentPage < Math.floor(pepArr.length / idsPerPage) + 1 ? 1 : 0;
                pepRefresh();
            });
            $('<br/>').appendTo(cell);

            //Slider bar
            Rdisp = $('<dt/>', {id: "Number", text: "Flag cutoff: "}).append(M.sToMathE("R^2=0.80")).appendTo(sliderbar);
            tempElem = $('<dd/>').appendTo(sliderbar);
            slider = $('<div/>', {"class": "sliderbar"}).appendTo(tempElem);

            slideFunc = function () {
                flagR = slider.noUiSlider("getValue");
                Rdisp.empty().text("Flag cutoff: ").append(M.sToMathE("R^2=" + (Math.round(flagR * 100) / 100).toFixed(2)));
                if (barSelected !== undefined) {
                    pepRefresh();
                }
            };
            slider.noUiSlider("init", {
                dontActivate: "lower",
                startMax: 0.8,
                scale: [0, 1],
                tracker: slideFunc,
                clickmove: slideFunc
            });
        }());

        return thislib;
    }(lib));

    lib.plots = (function (mainLib) {
        //variable declarations
        var barcode, thislib, makePostWashFigure, makeTimeSeriesFigure, update,
            figureInfoHeader, figureOneInfo,
            figureTwoInfo, chartClick, peptide;

        //variable definitions
        thislib = {};

        thislib.update = function () {
            /*////////////////////////////////////////////////////////////////////////////////
            This function takes no arguments, but checks if there are barcode_wells that need 
            to be added to the QC table.
            */////////////////////////////////////////////////////////////////////////////////
            return run(update)();
        };

        makePostWashFigure = function () {
            //variable declarations
            //TODO: combine these into one function...
            var eq, ind, chart, data, dataTable, i, length, max, options, params, tempElem;
            //variable defintions
            eq = KINOMICS.postWashFunc;
            dataTable = [["exposure time", "read", "removed", "fit"], [-10, -10, -10, -10]]; //Initializes the plot
            ind = 0;
            data = barcodes[barcode].peptides[peptide].postWash.models[ind];
            params = data.parameters;
            length = data.x_values.length;
            max = Math.max.apply(null, data.x_values);

            //add values to dataTable
            for (i = 0; i < length; i += 1) {
                if (data.accurateData[i]) {
                    dataTable.push([data.x_values[i], data.y_values[i], null, null]);
                } else {
                    dataTable.push([data.x_values[i], null, data.y_values[i], null]);
                }
            }

            //Add the fit data to dataTable
            for (i = 0; i < max + 5; i += 5) {
                dataTable.push([i, null, null, eq([i], params)]);
            }

            dataTable = google.visualization.arrayToDataTable(dataTable);

            options = {
                title: "Post Wash",
                hAxis: {
                    title: "Exposure time (ms)",
                    viewWindowMode: 'explicit',
                    viewWindow: {max: max, min: 0}
                },
                vAxis: {title: "Median signal - background fluorescence"},
                legend: 'none',
                seriesType: "scatter",
                series: {2: {type: "line", curveType: "function", enableInteractivity: false}}
            };

            //Actual data to be listed
            figureTwoInfo.empty();
            $("<dt/>", {text: 'Figure 2:'}).appendTo(figureTwoInfo);
            tempElem = $("<dl/>").appendTo(figureTwoInfo);
            tempElem = $('<small/>').appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("R^2= " + Math.round(data.R2 * 100) / 100)).appendTo(tempElem);
            $('<dt/>', {text: 'Equation'}).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("y(t)=k·t+y_0")).appendTo(tempElem);
            $('<dt/>', {text: 'With parameters:'}).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("k=" + Math.round(params[0] * 100) / 100)).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("y_0=" + Math.round(params[1] * 100) / 100)).appendTo(tempElem);

            //This chart was added in a while back...    
            chart = new google.visualization.ComboChart(document.getElementById('chart2'));
            chart.draw(dataTable, options);
            google.visualization.events.addListener(chart, 'select', chartClick(data, chart));
        };

        makeTimeSeriesFigure = function () {
            //variable declarations
            //TODO: combine these into one function...
            var ind, eq, chart, data, dataTable, i, length, max, min, options, params, tempElem;

            //variable defintions
            ind = 0;
            data = barcodes[barcode].peptides[peptide].cycleSeries.models[ind];
            eq = data.equation.func;
            dataTable = [["Cycle Number", "read", "removed", "fit"], [-10, -10, -10, -10]]; //Initializes the plot
            params = data.parameters;
            length = data.x_values.length;
            max = Math.max.apply(null, data.x_values);
            min = Math.min.apply(null, data.x_values);

            //TODO: turn this portion into a function call?
            //add values to dataTable
            for (i = 0; i < length; i += 1) {
                if (data.accurateData[i]) {
                    dataTable.push([data.x_values[i], data.y_values[i], null, null]);
                } else {
                    dataTable.push([data.x_values[i], null, data.y_values[i], null]);
                }
            }

            //Add the fit data to dataTable
            for (i = 0; i < max + 5; i += 5) {
                dataTable.push([i, null, null, eq([i], params)]);
            }

            dataTable = google.visualization.arrayToDataTable(dataTable);

            options = {
                title: "Time Series",
                hAxis: {
                    title: "Cycle Number",
                    viewWindowMode: 'explicit',
                    viewWindow: {max: max + (max - min) / 10, min: min - (max - min) / 10}
                },
                vAxis: {title: "Median signal - background fluorescence"},
                legend: 'none',
                seriesType: "scatter",
                series: {2: {type: "line", curveType: "function", enableInteractivity: false}}
            };

            //Actual data to be listed
            figureOneInfo.empty();
            $("<dt/>", {text: 'Figure 1:'}).appendTo(figureOneInfo);
            tempElem = $("<dl/>").appendTo(figureOneInfo);
            tempElem = $('<small/>').appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("R^2= " + Math.round(data.R2 * 100) / 100)).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("Runs P-val= " + Math.round(data.WWtest * 1000) / 1000)).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("Linear R^2= " + Math.round(data.linearR2 * 100) / 100)).appendTo(tempElem);
            $('<dt/>', {text: 'Equation'}).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("y(c)={y_{max}·v_{i}·(c-c_0)}/{y_{max}+v_{i}·(c-c_0)}")).appendTo(tempElem);
            $('<dt/>', {text: 'With parameters:'}).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("v_{i}=" + Math.round(params[0] * 100) / 100)).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("c_0=" + Math.round(params[1] * 100) / 100)).appendTo(tempElem);
            $('<dd/>').append(M.sToMathE("y_{max}=" + Math.round(params[2] * 100) / 100)).appendTo(tempElem);

            //This chart was added in a while back...    
            chart = new google.visualization.ComboChart(document.getElementById('chart1'));
            chart.draw(dataTable, options);
            google.visualization.events.addListener(chart, 'select', chartClick(data, chart));
        };

        update = function () {
            //variable declarations

            //variable definitions            
            barcode = mainLib.QCtable.getCurrentBar();
            peptide = mainLib.QCtable.getCurrentPep();

            if (barcode === undefined || !peptide) {
                figureColumn.hide();
                figureInfoColumn.hide();
                throw "Need to select both a peptide and a barcode to display figures";
            }
            figureColumn.show();
            figureInfoColumn.show();
            makePostWashFigure();
            makeTimeSeriesFigure();
            figureInfoHeader.html('<b>' + barcodes[barcode].name +
                '</b><br /><small>&nbsp;&nbsp;' + peptide + '</small>');
            return true;
        };

        chartClick = function (data, chart) {
            return function () {
                //variable declarations
                var point;

                //variable definitions
                point = chart.getSelection();
                point = point[0];
                barcodes[barcode].db.changed = true;
                // mainLib.saveDataBut.update(); // update save data button

                //Change from good to bad
                if (point && Number(point.column) === 1) {
                    data.accurateData[point.row - 1] = false;
                    //refit curve...
                //change from bad to good
                } else if (point && Number(point.column) === 2) {
                    data.accurateData[point.row - 1] = true;
                }

                //refit, then replot
                dataAnalysisObj.fitCurve({
                    workersLocation: workerObj,
                    workersFile: fitCurvesWorkersFile,
                    data: data,
                    callback: function () { update(); mainLib.QCtable.update(); }
                });
            };
        };

        //Sets up charts
        (function () {
            //variable declarations
            var tempElem;

            //tempElem = $('<div/>', {"class": "row"}).appendTo(figureInfoColumn);
            figureOneInfo = $('<div/>', {"class": "span2"}).appendTo(figureInfoColumn);
            //tempElem = $('<div/>', {"class": "row"}).appendTo(figureInfoColumn);
            figureTwoInfo = $('<div/>', {"class": "span2"}).appendTo(figureInfoColumn);
            startNextPeptide();
            //TODO: add in title above figure legends - maybe... With highlighting is this needed?

            //Height must be there so the charts to not get bigger over time...
            tempElem = $('<div/>', {"class": "row"}).appendTo(figureColumn);
            figureInfoHeader = $('<div/>', {"class": "offset1 span3"}).appendTo(tempElem);
            $('<div/>', {id: 'chart1', style: 'height:221px'}).appendTo(figureColumn);
            $('<div/>', {id: 'chart2', style: 'height:221px'}).appendTo(figureColumn);
        }());

        return thislib;
    }(lib));

    return lib;
}());
