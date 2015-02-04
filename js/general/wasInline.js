/*global $, window, google, KINOMICS, jQuery*/
/*jslint closure:true*/

// I do not know what this is for, but it allows the google charts to work :P
 //window["_GOOG_TRANS_EXT_VER"] = "1";
 
 
//This is to get the tabs to work at the top of the toolbox
(function () {
    'use strict';
    $('#tag1').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
    $('#tag2').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
        window.location.hash = '#model';
    });
    $('#tag3').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
        KINOMICS.fileManager.UI.navigationBar.setDataType();
    });
}());