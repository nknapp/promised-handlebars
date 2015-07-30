/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

var Q = require('q')

// Store for promises created during a template execution
var promises = null

/**
 * Returns a new Handlebars instance that
 * * allows helpers to return promises
 * * creates `compiled` templates that always
 *   return a promise for the resulting string.
 *   The promise is fulfilled after all helper-promsises
 *   are resolved.
 *
 * @param {Handlebars} Handlebars the Handlebars engine to wrap
 * @param {object} options optional parameters
 * @param {string=} options.placeholder the placeholder to be used in the template-output before inserting
 *   the promised results
 * @returns {Handlebars} a modified Handlebars object
 */

module.exports = function promisedHandlebars (Handlebars, options) {
  options = options || {}
  options.placeholder = options.placeholder || '\u0001'

  // one line from substack's quotemeta-package
  var placeHolderRegexEscaped = String(options.placeholder).replace(/(\W)/g, '\\$1')
  var regex = new RegExp(placeHolderRegexEscaped + '(\\d+)(>|&gt;)', 'g')

  var engine = Handlebars.create()

  // Wrap `registerHelper` with a custom function
  var oldRegisterHelper = engine.registerHelper
  engine.registerHelper = function (keyOrObject, fn) {
    var _this = this;
    if (typeof keyOrObject === 'string') {
      // Register a custom helper-function instead of actual helper
      oldRegisterHelper.call(this, keyOrObject, function () {
        // Wrap "optons.fn" and "options.inverse" to apply the same logic as for the template itself
        var helperOpts = arguments[arguments.length - 1]
        if (helperOpts.fn) {
          var oldFn = helperOpts.fn;
          helperOpts.fn =  function() {
            var handleResult2 = handleResult(wrapAndResolve(oldFn).apply(_this,arguments));
            console.log("fn",handleResult2);
            return handleResult2;
          }
        }
        if (helperOpts.inverse) {
          var oldInverse = helperOpts.inverse;
          helperOpts.inverse =  function() {
            return handleResult(oldInverse.apply(_this, arguments));
          }
        }

        // If the result is not promise, return it
        var rawResult = fn.apply(this, arguments)
        console.log("raw",rawResult)
        return handleResult(rawResult);

      })
    } else {
      // `keyOrObject` is actual an object of helpers
      // Call `registerHelper` again for each object
      // This simulates the default Handlebars-behaviour
      Object.keys(keyOrObject).forEach(function (key) {
        engine.registerHelper(key, keyOrObject[key])
      })
    }
  }

  var oldCompile = engine.compile
  engine.compile = function () {
    var fn = oldCompile.apply(this, arguments)
    return wrapAndResolve(fn)
  // Wrap the compiled function
  }

  // Re-register all built-in-helpers to ensure that their methods are wrapped
  engine.registerHelper(engine.helpers)

  /**
   * Wrap a function (template or block-helper callback)
   * such that
   * 1) the `promises` variable is initialized with a new array
   * 2) a promise is returned instead of a string
   * 3) promise placeholder-values are replaced with the promise-results
   *    in the returned promise
   */
  function wrapAndResolve (fn) {
    return function () {
      if (promises) {
        // "promises" array already exists: We are executing a partial
        // or a synchronous block helper.
        // That means we are called from somewhere within Handlebars.
        // Handlebars does not like promises, so we act as normal as possible.
        return fn.apply(undefined, arguments)
      }
      try {
        // We are called from outside Handlebars (initial call)
        // Initialize the `promise` variable (see above) with an empty
        // array, so that helpers can store their promises during the
        // template execution.
        promises = []
        // Execute template (helpers are getting called and store promises
        // into the array
        var resultWithPlaceholders = fn.apply(undefined, arguments)
        return Q.all(promises).then(function (results) {
          // Promises are fulfilled. Insert real values into the result.
          return String(resultWithPlaceholders).replace(regex, function (match, index, gt) {
            // Check whether promise result must be escaped
            return gt === '>' ? results[index] : engine.escapeExpression(results[index])
          })
        })
      } finally {
        // Reset promises for the next execution run
        promises = null
      }

    }
  }

  /**
   * Handle the return value of a helper.
   * Pass through concrete values and values of already resolver promises.
   * Put pending promises into the `promises`-array and return a placeholder instead.
   *
   * @param rawResult
   * @returns {*}
   */
  function handleResult(rawResult) {
    if (!Q.isPromiseAlike(rawResult)) {
      return rawResult
    }

    // Check if the promise is already resolved
    var immediateResult = null
    var immediateError = null
    var result = Q(rawResult)
      .then(function (result) {
        // Fetch result if it is available in the same event-loop cycle
        // Store an object to prevent the result being falsy
        immediateResult = {result: result}
        return result
      })
      .catch(function (error) {
        // Fetch error if it is available in the same event-loop cycle
        // Store an object to prevent the result being falsy
        immediateError = {error: error}
      })

    if (immediateResult) {
      return immediateResult.result
    }
    if (immediateError) {
      throw immediateError.error;
    }

    promises.push(result)
    return options.placeholder + (promises.length - 1) + '>'
  }

  return engine
}
