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
  engine.registerHelper = wrap(engine.registerHelper, function (fn, args) {
    var keyOrObject = args[0]
    var value = args[1]
    // Wrap helpers provided in arguments
    if (typeof keyOrObject === 'string') {
      // Wrap single helper
      fn.call(this, keyOrObject, wrap(value, helper))
    } else {
      // Key is an object. Wrap all helpers
      for (var key in keyOrObject) {
        var wrappedHelpers = {}
        if (keyOrObject.hasOwnProperty(key)) {
          wrappedHelpers[key] = wrap(keyOrObject[key], helper)
        }
        fn.call(this, wrappedHelpers)
      }
    }
  })

  // Wrap the `compile` function, so that it wraps the compiled-template
  // with `prepareAndResolve`
  engine.compile = wrap(engine.compile, function (oldCompile, args) {
    var fn = oldCompile.apply(engine, args)
    return wrap(fn, prepareAndResolve)
  // Wrap the compiled function
  })

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
  function prepareAndResolve (fn, args) {
    if (promises) {
      // "promises" array already exists: We are executing a partial or a synchronous block
      // helper. That means we are called from somewhere within Handlebars. Handlebars does
      // not like promises, so we act as normal as possible.
      return fn.apply(this, args)
    }
    try {
      // We are called from outside Handlebars (initial call). Initialize the `promise`
      // variable (see above) with an empty array, so that helpers can store their promises
      // during the template execution.
      promises = []
      // Execute template (helpers are getting called and store promises into the array
      var resultWithPlaceholders = fn.apply(this, args)
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

  /**
   * Wrapper function for a helper.
   * Wrap `options.fn` and `options.inverse` to
   * return promises (eventually)
   * and call `markAndPromise` afterwards
   */
  function helper (fn, args) {
    var _this = this
    var options = args[args.length - 1]
    if (options.fn) {
      options.fn = wrap(options.fn, prepareAndResolve)
    }
    if (options.inverse) {
      options.inverse = wrap(options.inverse, prepareAndResolve)
    }
    return markAndPromise.call(_this, fn, args)
  }

  /**
   * Apply a function with arguments.
   * If a promise is returned by the function, push it into
   * the promises-array and set its `.toString` method
   * to
   * * the placeholder, followed by
   * * the index in thesarray
   * * ">"
   *
   * @param fn the original function
   * @param arguments the arguments passed to the original function
   * @returns {*}
   */
  function markAndPromise (fn, args) {
    var rawResult = fn.apply(this, args)

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
      throw immediateError.error
    }

    promises.push(result)
    result.toString = function () {
      return options.placeholder + (promises.length - 1) + '>'
    }
    return result
  }

  return engine
}

/**
 * Wrap a function with a wrapper function
 * @param {function} fn the original function
 * @param {function(function,array)} wrapper the wrapper-function
 *   receiving `fn` as first parameter and the arguments as second
 * @returns {function} a function that calls the wrapper with
 *   the original function and the arguments
 */
function wrap (fn, wrapper) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    return wrapper.call(this, fn, args)
  }
}
