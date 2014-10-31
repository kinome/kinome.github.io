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
        navigationBar, table, parseObj, currentLoaded;

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
    (function () {
        //variable declarations

        //variable definitions

        //set up login menu - fusion tables, allowing gapi to be here for getting the access token to determine user name.
        $('#authFT').click(function () {
            lib.formControl.setUpload('fuse');
            thisDA.login(fuse, fusePackage, parseObj, lib.table.update);
        });

        //set up login menu - s3db
    }());

    //Page set up, accesable elements
    lib.formControl = (function (mainLib) {
        //variable declarations
        var defaultMessage, s3dbPanel, fusePanel, lib, update,
            setUpload, saveToDb, panel, dbSelector, addFileToTable, newAnalysis, box,
            analysisTextBox, currentAnaDisplay;

        //variable definitions
        lib = {};
        defaultMessage = $('#defaultFile');
        dbSelector = $('.dbSelector');

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
            $('#FUSEsub').unbind();
            $('#FUSEsub').bind('change', addFileToTable);

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

    lib.table = (function (mainLib) {
        //variable declarations
        var createLine, addToAnalysis, addLineToTableTop, addLinesToTable, anaObj, dataObj, lib, update;

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
                tempElem = $('<td />').appendTo(trow);
                $('<button />', {'class': 'btn btn-info', html: "<i class='icon-upload icon-white'></i> Upload"}).click(function (evt) {
                    evt.preventDefault();
                    obj.funcs.save({callback: update});
                }).appendTo(tempElem);
            } else {
                $('<td />').appendTo(trow);
            }

             //Where cancel upload would be
            tempElem = $("<td />").appendTo(trow);
            $('<button />', {'class': 'btn btn-danger',
                html: "<i class='icon-trash icon-white'></i> Remove From List"}).
                appendTo(tempElem);
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

    return lib;
}());








/*
    var submitFileToFuse = function(that, callback)
        {
        //Note - callback is typically updateTable for adding bionavigator files
        fuse.submitLinesToTable(originalFileTabID, 
            ["FileName","DateCreated","FileContents","FileSize","JSONFileID"], 
            [[that.data('fileName'), new Date, 
                that.data('fileContents').replace(/'/g,'"').replace(/\\/g,"/"),
                that.data('fileSize'), ""]], 
            callback);
        };

$('#subBut'+size).click(function(evt)
                        {
                        var that = $(this); 
                        that.button('loading');
                        //To keep form submission from actually occurring...
                        evt.preventDefault();
                        submitFileToFuse(that, updateTable(that,originalFileTabID));
                        that.unbind('click');
                        });














































































var fuse = KINOMICS.fusionTables;
fuse.JSON = 
    {
    access_token:"",
    userName:"",
    activeTables:new Array(),
    loggedIn:false,
    barWellColumns:['Barcode_Well','JSON','RDF','Referring Table and Row']
    },


// Private functions 
(function()
    {
    ///////////////////
    //Local Variables//
    ///////////////////
    var originalFileTabID = '1WbPPf-vYO_EUVp1bV01zzQCwUU2i98AOD5IADGQ';
    var barWellFileID = '1PLV48H-2oR2dQNJAZct2qkaPhJV97mYhsOD4lEI';
    var clientId = '547674207977.apps.googleusercontent.com';
    var apiKey = 'AIzaSyBjXKVpOKsYQd7DSzWRzQEVY0c7kiDJa4M';
    var scopes = ['https://www.googleapis.com/auth/fusiontables','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/plus.me'];
    var max_requests = 2;
    var numberOfRequests = 0;
    var requestBuffer = [];
    
    ///////////////////
    //Local Functions//
    ///////////////////
    
    //Main runner for all submits/grabs/queries from fusion tables - every call to google
        //runs through this function...
    
    //Changes the menu once authentication has taken place
    changeMenu = function()
        {
        //Following Authentication to show that we are logged in...
        var the = fuse.JSON;
        var getUserName = function(info)
            {
            the.userName = info.email;
            $('#auth').html("&nbsp&nbsp" + the.userName + "&nbsp&nbsp");
            //Do this here so the username is set when the collection changes
            fileUpload.setUploadToFUSE();
            }
        $.get('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token='+the.access_token,getUserName);
        };    
    
    //Submits a line to a fusion table
    var submitFileToFuse = function(that, callback)
        {
        //Note - callback is typically updateTable for adding bionavigator files
        fuse.submitLinesToTable(originalFileTabID, 
            ["FileName","DateCreated","FileContents","FileSize","JSONFileID"], 
            [[that.data('fileName'), new Date, 
                that.data('fileContents').replace(/'/g,'"').replace(/\\/g,"/"),
                that.data('fileSize'), ""]], 
            callback);
        };
    
    //Gets a row(s) of a table
    var getRow = function(request,callback)
        {
        fuse.getRow(request, callback)
        };
    
    //Updates the table after submit has completed
    var updateTable = function(uploadButton, fuseFile)
        {
        //This is done so we can tell which line was submitted
        return function(evt)
            {
            //variables
            var id, ftrow, row;
            
            if( evt.error != undefined )
                {
                    //There is an error and I need to handle it... Somehow....
                }
            else
                {
                // change the row to reflect it worked :-)
                
                //get the table row
                row = uploadButton.parent().parent();
                
                //get the fusion table row id
                ftrow = evt.rows[0][0];
                
                //1st portion need a button to add to qc
                var button = $('<button>',{'type':"reset"}).appendTo(row.find("td")[0]);
                addQCbutton( button, ftrow, fuseFile );
                
                //Change the sending button to a delete button
                var delID = 'delete' + uploadButton.attr('id');
                uploadButton.parent().html($('<button>',{'class':'btn btn-danger', 'id':delID,'html':'<i class="icon-trash icon-white"></i>Delete'}));
                $('#'+delID).click( function(del)
                    {
                    del.preventDefault();
                    console.log('PC LOAD LETTER');
                    });
                    
                //Delete the loading bar and the cancel button if they are ever added...
                $(row.find("td")[3]).html("");
                $(row.find("td")[5]).html("");
                
                
                }
            }
    };
    
    displayFUSEtable = function(fuseFile)
        {
        
        fuse.queryTable(originalFileTabID, {columns:['ROWID','FileName','FileSize','DateCreated'],order:'DateCreated',orderD:'ASC'}, function(res)
            {
            var fnInd = 1;
            var ridInd = 0;
            var fsInd = 2;
            for( var rowInd in res.rows )
                {
                //Add line to the table
                $('<tr>',{'class':'fuserow', html:
                  
                  //Add to QC button
                  "<td><button type=reset id=addHere"+rowInd+"></button></td>"+
                  
                  //File name
                  "<td>"+res.rows[rowInd][fnInd]+"</td>" + 
                  
                  //File size - not added yet
                  "<td>" + res.rows[rowInd][fsInd]+ "&nbsp KB</td>" +
                  
                  //Where loading bar would be
                  "<td></td>"+
                  
                  //Delete Button
                  "<td><button class='btn btn-danger'>"+
                  "<i class='icon-trash icon-white'></i>"+
                  "Delete</button></td>"+
                  
                  //Where cancel upload would be
                  "<td></td>"}).appendTo($('#fileTable'));
                  
                  //Actually give add to QC button something to do
                  //1st portion need a button to add to qc
                addQCbutton( $('#addHere'+rowInd), res.rows[rowInd][ridInd], fuseFile );
                  }
            });
        };
    
    var addQCbutton = function( jqueryButton, ftROWID, fuseFile )
        {
        var getFileReq = 'SELECT FileContents FROM ' + fuseFile + ' WHERE ROWID = ' + ftROWID;
        //This must be set in original creation of the button
        //jqueryButton.attr('type','reset');
        jqueryButton.attr('class','btn btn-success');
        jqueryButton.html("<i class='icon-plus icon-white'></i>");                  
        jqueryButton.data('queryName',getFileReq);
        
        jqueryButton.click(function()
            {
            var that = $(this);
            that.unbind('click');
            that.html("<i class='icon-ok icon-refresh'></i>");
            that.attr('class','btn btn-warning');

            //Load the file into QC    
            getRow(that.data('queryName'),function(res)
                {
                //If it fails
                
                
                //If it works
                KINOMICS.fileManager.DA.parseFile({
                    file:res.rows[0][0],
                    workersfile: 'js/fileManagement/fileParseWorker.js',
                    workers: KINOMICS.workers,
                    barcodes: KINOMICS.barcodes,
                    barcodeCreator: KINOMICS.expandBarcodeWell,
                    database: {fit:false,changed:false,'dbType':'fusionTables', originFile: {file: fuseFile, rowID: ftROWID}, barcodeFiles: [{file:barWellFileID}]},
                    callback: afterAddedToQC(that,fuseFile,ftROWID),
                    //callback: function(x){}
                    
                    });
            });});
        };
    
    var afterAddedToQC = function(buttonElement,fuseFile,ftROWID)
        {
        return function()
            {
            //vars
            var columns = fuse.JSON.barWellColumns;
            var lines = [];
            var barObject = KINOMICS.barcodes;
            
            //check to make sure data does not already exist
            fuse.queryTable(barWellFileID, {columns:['Barcode_Well','JSON'], 
                        where: "'Referring Table and Row' = '" + fuseFile + '_row_' + ftROWID + "'"}, 
            //callback
            function(res)
                {
                //If error, handle it
                if(0){}
                
                else
                    {
                    //Check if new data arrived
                    var barcodesFound = [];
                    for( var rowNum in res.rows )
                        {
                        //If the barcode returned is present, update data
                        var bar = res.rows[rowNum][0];
                        if(typeof barObject[bar] != undefined)
                            {
                            barObject[bar] = JSON.parse(res.rows[rowNum][1]);
                            barObject[bar].db.looked = true;
                            barcodesFound.push(bar);
                            KINOMICS.qualityControl.UI.fitCurvesBut.update();
                            }
                        }
                    
                    //Any data that is new will be added to the table after it is fit
                        // No point in adding data at this stage, doing this will just
                        // make the fitting algorithm a little longer.
                    //Add the data to be fit if need be
                    KINOMICS.qualityControl.UI.fitCurvesBut.update();
                    
                    buttonElement.html("<i class='icon-ok icon-white'></i>");
                    buttonElement.attr('class','btn btn-info');
                    }
                });
            }
        }
    
    //Actual events to run at load
    //Change Add files button
    $('#FUSEsub').unbind();
    $('#FUSEsub').bind('change', function(evt)
        {
        var files = evt.target.files; // FileList object
        evt.preventDefault();
        // Loop through the FileList and read the files
        for (var i = 0, f; f = files[i]; i++) 
            {
            var reader = new FileReader();
            
            // Closure to capture the file information.
              reader.onload = (function(theFile) 
                  {
                return function(e) 
                    {
                    //Delete the elemets of the wrong class I cannot get rid of otherwise since it is the one generated by the file upload tool...
                    $('#fileTable').find('.template-upload').remove();
                    
                    //Get all lines of the table
                    var lines = $('#fileTable').find('tr');
                    
                    //Determine the length of the table
                    var size = lines.length;
                    
                      //Add line to the table
                      $('<tr>',{'class': 'fuserow', html:"<td></td><td>"+theFile.name+"</td><td>" + Math.round(theFile.size/10.24)/100 + "&nbsp KB</td><td>load</td><td><button class='btn btn-primary push' id='subBut"+size+"'><i class='icon-upload icon-white'></i>Push To Fusion Tables</button></td><td>Cancel</td>"}).appendTo($('#fileTable'));
                    
                    //Make sure submit button does not behave badly
                    $('#subBut'+size).unbind();
                    
                    //Give submit button a new calling, and the contents of the file
                    $('#subBut'+size).data('fileContents',amdjs.clone(e.target.result));
                    $('#subBut'+size).data('fileName',amdjs.clone(theFile.name));
                    $('#subBut'+size).data('fileSize',amdjs.clone(Math.round(theFile.size/10.24)/100));
                    $('#subBut'+size).attr('data-loading-text','Sending...');
                    $('#subBut'+size).click(function(evt)
                        {
                        var that = $(this); 
                        that.button('loading');
                        //To keep form submission from actually occurring...
                        evt.preventDefault();
                        submitFileToFuse(that, updateTable(that,originalFileTabID));
                        that.unbind('click');
                        });
                    };
                  })(f);
              // Read in the image file as a data URL.
              reader.readAsText(f);
            }
        });
    
    //Change Submit All Button
    $("#fusionUpload").find(".start").unbind().click(function(evt){evt.preventDefault();$('#fileTable').find('.push').click()});
    
    }()) */
