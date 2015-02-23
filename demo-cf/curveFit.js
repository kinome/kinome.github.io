/*global $, window, google, jQuery, requireJS*/

var currentData;
(function () {
  'use strict';

  var buildUI, dataDiv, fitDiv, figureDiv, startingData, bodyDiv, tempDiv, equation, functions, currentEq, selectEquationDiv,
    createFigure, selectEquation, fitCurve, parseFitResults, parseAndFit, chartClick, buttonDiv, makeDropDown;

  //init
  startingData = "c\ty\n32\t7\n37\t17\n42\t23\n47\t23\n52\t31\n57\t34\n62\t37\n67\t39\n72\t41\n77\t32\n82\t41\n92\t40";
  functions = ['/js/qualityControl/cyclingEq.js', '/js/qualityControl/cyclingEq_orgin.js', '/js/qualityControl/cyclingEq_orgin4p.js'];
  currentEq = {};
  currentData = {
    x_values: [],/*Array of Arrays*/
    y_values: [],
    accurateData: [],
    equation: currentEq
  };

  //Functions
  selectEquation = function (ind) {
    currentData.equation = functions[ind];
    currentEq = functions[ind];
    selectEquationDiv.empty();
    selectEquationDiv.append('<br /><br />Current Equation (' + (ind + 1) + '): ').append(M.sToMathE(currentEq.mathType));
  };


  createFigure = function () {
    //variable declarations
    //TODO: combine these into one function...
    var ind, eq, chart, data, dataTable, i, j, length, max, min, options, params, tempElem;

    //variable defintions
    ind = 0;
    data = currentData;
    eq = currentData.equation.func;

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
    fitDiv.empty();
    $("<dt/>", {text: 'Figure 1:'}).appendTo(fitDiv);
    tempElem = $("<dl/>").appendTo(fitDiv);
    tempElem = $('<small/>').appendTo(tempElem);
    $('<dd/>').append(M.sToMathE("R^2= " + Math.round(data.R2 * 100) / 100)).appendTo(tempElem);
    $('<dd/>').append("<i>W.W. runs p-val: " + (Math.round(data.binomFit * 100) / 100) + "<i>").appendTo(tempElem);
    $('<dt/>', {text: 'Equation'}).appendTo(tempElem);
    $('<dd/>').append(M.sToMathE(data.equation.mathType)).appendTo(tempElem);
    $('<dt/>', {text: 'With parameters:'}).appendTo(tempElem);
    for (j = 0; j < data.equation.mathParams.length; j += 1) {
      $('<dd/>').append(M.sToMathE(data.equation.mathParams[j] + "=" + Math.round(params[j] * 100) / 100)).appendTo(tempElem);  
    }
    
    //This chart was added in a while back...    
    chart = new google.visualization.ComboChart(document.getElementById('figureDiv'));
    chart.draw(dataTable, options);
    google.visualization.events.addListener(chart, 'select', chartClick(data, chart));
  };

  parseAndFit = function () {
    var dataStr, dataArr;

    currentData = {
      x_values: [],/*Array of Arrays*/
      y_values: [],
      accurateData: [],
      equation: currentEq
    };

    dataStr = dataDiv.val();
    dataArr = dataStr.split('\n');
    dataArr.shift();
    dataArr.map(function (p) {
      p = p.split('\t');
      currentData.x_values.push(parseInt([p[0]]));
      currentData.y_values.push(parseFloat(p[1]));
      currentData.accurateData.push(1);
    });
    console.log(currentData)
    fitCurve(createFigure);
  };

  fitCurve = function (callback) {
    //varible declarations
    var worker, workerObj, workerFile;
    //variable declarations
    workerObj = KINOMICS.workers;
    workerFile = 'https://raw.githubusercontent.com/adussaq/amd_cf/master/fitCurvesWorker.js';
    //TODO: check user input

    //the point of this pattern is to start a worker only one time. No need to close it then...
    worker = workerObj.startWorkers({filename: workerFile, num_workers: 1});
    fitCurve = function (callback) {
      //variable declarations
      var callback, typeObj, submitObj;

      //variable definitions
      callback = callback || function (x) {if (x !== undefined) { console.log(x); } };
      typeObj = currentData;

      //TODO: check user input
      submitObj = JSON.parse(JSON.stringify(typeObj));
      submitObj.uuid = typeObj.uuid;
      worker.submitJob([submitObj], parseFitResults);
      worker.onComplete(callback);
    };
    //call the new definition to do work
    fitCurve(callback);
  };

  parseFitResults = function (fitRes) {
    //variable declarations
    var originalObj, data, fit;
    //Get location of original data
    originalObj = fitRes.data.shift();
    fit = fitRes.data.shift();
    data = currentData;
    //variable defintions
    data.parameters = fit.parameters;
    data.R2 = fit.R2;
    data.binomFit = fit.binomFit;
    data.totalSqrErrors = fit.totalSqrErrors;
  };
    
  chartClick = function (data, chart) {
    return function () {
        //variable declarations
        var point;

        //variable definitions
        point = chart.getSelection();
        point = point[0];
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
        fitCurve(function () { createFigure(); });
    };
  };

  //Set up page
  buildUI = function () {
// console.log('I am here...'); return;
  window["_GOOG_TRANS_EXT_VER"] = "1";
  //google.load('visualization', '1.0', {packages: ['corechart']});

    var dropDown, i, tempElem;
    bodyDiv = $('#qualtityControl');
    tempDiv = $('<div>', {'class': 'row'}).appendTo(bodyDiv);
    dataDiv = $('<div>', {'class': 'col span5'}).appendTo(tempDiv);
    dataDiv = $('<textarea>', {width: '100%', height: '280px', val: startingData}).appendTo(dataDiv);
    buttonDiv = $('<div>', {'class': 'col span5 offset1'}).appendTo(tempDiv);
    tempDiv = $('<div>', {'class': 'row'}).appendTo(bodyDiv);
    tempDiv = $('<div>', {'class': 'row'}).appendTo(bodyDiv);
    fitDiv = $('<div>', {'class': 'col span3 offset2'}).appendTo(tempDiv);
    figureDiv = $('<div>', {'class': 'col span5'}).appendTo(tempDiv);
    figureDiv = $('<div>', {id: 'figureDiv'}).appendTo(figureDiv);
    fitDiv.height('280px');
    figureDiv.height('280px');
    figureDiv.width('100%');

    //Add buttons
    $('<button>', {'class': 'btn btn-primary', text: 'Fit Data'}).click(function (evt) {
      evt.preventDefault();
      parseAndFit();
    }).appendTo(buttonDiv);

    dropDown = $('<br/><br/><div class="dropdown"><button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true"><span id="dropText">Select Equation</span><span class="caret"></span></button></div>').appendTo(buttonDiv);
    dropDown = $('<ul>', {'class': 'dropdown-menu', 'role': 'menu', 'aria-labelledby': 'dropdownMenu1'}).appendTo(dropDown);
    for (i = 0; i < functions.length; i += 1) {
      (function (i) {
        tempElem = $('<li>', {'role': 'presentation'}).appendTo(dropDown);
        $('<a>', {'role': "menuitem", 'tabindex': "-1", 'href':"#"}).append(M.sToMathE(functions[i].mathType)).appendTo(tempElem).click(function (evt) {
          evt.preventDefault();
          selectEquation(i);
        });
      }(i));
    }

    if(window.location.hash === '#model') {
      $('#tag2').click();
    }

    selectEquationDiv = $('<div>').appendTo(buttonDiv);
    selectEquation(0);

    //   '<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">' +
    //   '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Action</a></li>' +
    //   '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Another action</a></li>' +
    //   '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Something else here</a></li>' +
    //   '<li role="presentation"><a role="menuitem" tabindex="-1" href="#">Separated link</a></li>' + 
    //   '</ul></div>'
    // ).appendTo(buttonDiv);
  };


  //Load equation(s) - async
  (function () {
    var type, i, suc, suc2, er;
    suc = function (arr, ind) {
      return function (x) {
        var sol, url;
        url = arr[ind];
        sol = eval('sol=' + x.replace(/[\S \t]+?\/\/[\S \t]+?[\r\n]+/g, '').replace(/[\n\r]+/g, ''));
        arr[ind] = sol;
        arr[ind].string = x;
        arr[ind].uuid = url;
      };
    };
    suc2 = function (arr, ind) {
      return function (x) {
        var sol, url;
        url = arr[ind];
        sol = eval('sol=' + x.replace(/[\S \t]+?\/\/[\S \t]+?[\r\n]+/g, '').replace(/[\n\r]+/g, ''));
        arr[ind] = sol;
        arr[ind].string = x;
        arr[ind].uuid = url;
        //$(document).ready(function(){buildUI()});
      };
    };

    //TODO: make this a better error function..
    er = function (x) {
      console.error(x.error, 'it does not work...');
    };

    for (i = 0; i < functions.length; i += 1) {
      if (i + 1 === functions.length) {
        $.ajax({
          dataType: "text",
          url: functions[i],
          success: suc2(functions, i),
          error: er
        });
      } else {
        $.ajax({
          dataType: "text",
          url: functions[i],
          success: suc(functions, i),
          error: er
        });
      }
    }
  })();

  //Load all scripts
  requireJS([
    '/js/bootstrap/js/bootstrap.min.js',
    '/js/qualityControl/UIsupport/jquery.nouislider.js',
    "/js/qualityControl/UIsupport/jqmath-etc-0.2.0.min.js",
    "https://apis.google.com/js/client.js",
    "/js/general/nameSpace.js",
    "/js/general/barcodeProto.js",
    "/js/general/workersPackage.js",
    "/js/general/amdjs_1.1.0.js",
    "/js/general/wasInline.js"
  ], buildUI, '/js/general/jquery-1.7.2.min.js');



}());