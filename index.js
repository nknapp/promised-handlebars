/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

var Q = require('q')


/**
 * Returns a new Handlebars instance that
 * * Allows helpers to return promises
 * * Creates `compiled` templates that always
 *   return a promise for the resulting string.
 *   The promise is fulfilled after all helper-promsises
 *   are resolved.
 *
 * @param {Handlebars} Handlebars
 * @param {object} options
 * @param {string=} options.placeholder
 * @returns {Handlebars} a modified Handlebars object
 */
module.exports = function promisedHandlebars (Handlebars,options) {
  options = options || {};
  options.placeholder = options.placeholder || '\u0001';

  // one line from from substack's quotemeta-package
  var regex = new RegExp(String(options.placeholder).replace(/(\W)/g, '\\$1'),"g");

  var promises = null;
  var engine = Handlebars.create();
  var oldRegisterHelper = engine.registerHelper;
  engine.registerHelper = function (keyOrObject, fn) {
    if (typeof keyOrObject === "string") {
      oldRegisterHelper.call(this, keyOrObject, function() {
        var result = Q(fn.apply(this, arguments));
        promises.push(result);
        return options.placeholder;
      });
    } else {
      // `keyOrObject` is actual an object of helpers
      Object.keys(keyOrObject).forEach(function(key) {
        engine.registerHelper(key, keyOrObject[key]);
      })
    }
  };

  var oldCompile = engine.compile;
  engine.compile = function() {
    var fn = oldCompile.apply(this, arguments);
     // Wrap the compiled function
    return function() {
      promises = [];
      var resultWithPlaceholders = fn.apply(engine,arguments);
      // Save a local copy for concurrency reasons
      var _promises = promises;
      return Q.all(_promises).then(function(results) {
        return resultWithPlaceholders.replace(regex, function() {
          return results.shift();
        });
      });
    }

  }
  return engine
}
