/*global $, window, google, jQuery*/
var requireJS = (function () {
  'use strict';
  // The purpose of these functions is to allow for easy loading of modules in an 
  // organized manner. This will insure that jquery is loaded before anything else.

  var getJQuery, current, main, loading, callbacks, unloading, unload, uncall, jQ;

  jQ = 'http://code.jquery.com/jquery-2.1.3.min.js';
      //used only if no jQueryURL is provided
  current = {};
  loading = [];
  callbacks = [];
  unloading = false;

  main = function (urls, callback, jQueryURL) {
    var i;
    callback = callback || undefined;
    jQuery = jQuery || undefined;

    if (!jQuery || typeof jQuery !== 'function') {
      unloading = true;
      jQueryURL = jQueryURL || jQ;
      getJQuery(jQueryURL);
    }

    for (i = 0; i < urls.length; i += 1) {
      if (!current.hasOwnProperty(urls[i])) {
        loading.push(urls[i]);
      }
    }
    if (typeof callback === 'function') {
      callbacks.push(callback);
    }
    unload();
  };

  uncall = function () {
    unloading = false;
    unload();
  };

  unload = function () {
    var url;
    if (!unloading) {
      if (loading.length) {
        unloading = true;
        url = loading.shift();
        if (!current[url]) {
          current[url] = true;
          $.getScript(url, uncall);
        }
      } else if (callbacks.length) {
        (callbacks.shift())();
        unload();
      }
    }
  };

  getJQuery = function (jQueryURL) {
    current[jQueryURL] = true;
    $.getScript(jQueryURL, uncall);

  };

  return main;

}());