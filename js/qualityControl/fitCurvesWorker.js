/*global self: false */

// TODO: check user input...
//Container for all code. Will be run on load
(function () {
    'use strict';

    //variable declarations
    var fmincon, determineRunningConditions;

    //variable definitions

    //function definitions
    fmincon = (function () {
        //please note - this is a minimized version of fmincon from amdjs_1.1.0.js
        //variable declarations
        var sqrSumOfErrors, sqrSumOfDeviations, func;

        //variable defintions

        //function definitions
        func = function (fun, x0, X, y) {
            //variable definitions
            var corrIsh, itt, lastItter, options, parI, SSDTot, sse, SSETot, x1;

            //variable declarations
            options = {
                step: x0.map(function (s) {return s / 100; }),
                maxItt: 1000,
                minPer: 1e-6
            };
            lastItter = Infinity;
            x1 = JSON.parse(JSON.stringify(x0));

            //Actually begin looping through all the data
            for (itt = 0; itt < options.maxItt; itt += 1) {

                //Go through all the parameters
                for (parI in x1) {
                    if (x1.hasOwnProperty(parI)) {
                        x1[parI] += options.step[parI];
                        if (sqrSumOfErrors(fun, X, y, x1) < sqrSumOfErrors(fun, X, y, x0)) {
                            x0[parI] = x1[parI];
                            options.step[parI] *= 1.2;
                        } else {
                            x1[parI] = x0[parI];
                            options.step[parI] *= -0.5;
                        }
                    }
                }

                //make it so it checks every 3 rotations for end case
                if ((itt % 3) === 0) {
                    sse = sqrSumOfErrors(fun, X, y, x0);
                    if (Math.abs(1 - sse / lastItter) < options.minPer) {
                        break;
                    } else {
                        lastItter = sse;
                    }
                }
            }

            //I added the following 'R^2' like calculation.
            SSDTot = sqrSumOfDeviations(y);
            SSETot = sqrSumOfErrors(fun, X, y, x0);
            corrIsh = 1 - SSETot / SSDTot;
            return {parameters: x0, totalSqrErrors: SSETot, R2: corrIsh};
        };

        sqrSumOfErrors = function (fun, X, y, x0) {
            //variable declarations
            var error = 0, i, n = X.length;
            for (i = 0; i < n; i += 1) {
                error += Math.pow(fun(X[i], x0) - y[i], 2);
            }
            return error;
        };

        sqrSumOfDeviations = function (y) {
            //variable declarations
            var avg, error, length, i;
            //variable definitions
            error = 0;
            avg = 0;
            length = y.length;
            //find average
            for (i = 0; i < length; i += 1) {
                avg += y[i];
            }
            avg = avg / length;
            //find ssd
            for (i = 0; i < length; i += 1) {
                error += Math.pow(y[i] - avg, 2);
            }
            return error;
        };



        //return function
        return func;
    }());

    determineRunningConditions = function (object) {
        //variable declarations
        var func, i, X, xIni, xS, xVec, xMax, xMin, y0, yIni, yMax, yMin, yN,
            Ym, vi, c, params, length, equationObj;
        eval('equationObj=' + object.equation.string);
        //variable defintions
        X = object.x_values;
        xIni = [];
        xVec = [];
        yIni = [];
        length = X.length;

        //determine what points are 'good'
        for (i = 0; i < length; i += 1) {
            if (object.accurateData[i]) {
                xIni.push([X[i]]); // This is to be used for the curve fitting
                yIni.push(object.y_values[i]);
            }
        }

        return {params: equationObj.setInitial(xIni, yIni), X: xIni, y: yIni, func: equationObj.func};
    };

    self.onmessage = function (event) {
        //variable declarations
        var barcode, peptide, points, result, runCond, type, x0;
        //variable definitions
        runCond = determineRunningConditions(event.data[0]);

        result = fmincon(runCond.func, runCond.params, runCond.X, runCond.y);
        //return result
        self.postMessage([event.data[0], result]);
    };
}());
