/*global $, console, document, jQuery*/
/*jslint todo: true*/

//TODO: make this a place to insure packages load correctly using get commands instead of just putting the scripts in
//TODO: use this to get rid of 'was inline', try to load everything except jQuery through this mechanism
//TODO: fix file manager so that only what absolutely has to be will be inside the form (No fusion tables stuff)
//TODO: loading bar for fusion tables?
//TODO: allow multiple data collections to be viewed
//TODO: expand fusion tables to work in personal fusion table rather than just access existant ones.
//TODO: expand Options to include dataset information ie number of samples with poor R^2, number of samples etc....
//TODO: change all comments on user based files to column 1.

var KINOMICS = (function () {
    'use strict';
    var packages = {}, lib = {};

    lib.cycleSeriesFunc = function (xVector, P) {
        //Yo + 1/[1/(k*[x-Xo])+1/Ymax]   P[0]=k, P[1]= Xo, p[2] = Ymax
        //if (xVector[0] < P[1]) {return Infinity; }
        return (1 / (1 / (P[0] * (xVector[0] - P[1])) + 1 / P[2]));
        //return params[0]+1/(1/(params[1]*(xVector[0]-params[2]))+1/params[3]);
    };

    lib.postWashFunc = function (xVector, params) {
        //Y = mx+b, params[0]=m, parmas[1]=b
        return params[0] * xVector[0] + params[1];
    };
    lib.requirePackage = function (url, callback) {
        var a;
        if (packages[url]) {
            callback();
        } else if (typeof jQuery === 'function') {
            packages[url] = 1;
            jQuery.get(url, callback);
        } else {
            packages[url] = 1;
            a = document.createElement('script');
            a.src = url;
            a.onload = callback;
            document.getElementById('javascripts').appendChild(a);
        }
    };

    lib.barcodes = {};
    lib.qualityControl = {DA: {}, UI: {}};
    lib.fileManager = {DA: {}, UI: {}};

    //This is to report errors
    lib.reportError = function (err) {
        return console.log("Error: " + err + "\nTo display more information for any" +
            " function type <func_name> instead of <func_name>()");
    };

    Math.uuid = function () {
        /*jslint bitwise: true*/
        var a, b;
        a = 1;
        b = '';
        while (a < 37) {
            b += a * 51 & 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-';
            a += 1;
        }
        return b;
    };

    //return the library created
    return lib;
}());
