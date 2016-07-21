/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

var Q = require('q')
var deep = require('deep-aplus')(Q.Promise)

module.exports = promisedHandlebars
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
 *   the promised results. This placeholder may not occur in the template or any partial. Neither
 *   my any helper generate the placeholder in to the result. Errors or wrong replacement will
 *   happen otherwise.
 * @returns {Handlebars} a modified Handlebars object
 */
function promisedHandlebars (Handlebars, options) {
  options = options || {}
  options.placeholder = options.placeholder || '\u0001'

  var engine = Handlebars.create()
  var markers = null

  // Wrap `registerHelper` with a custom function
  engine.registerHelper = wrap(engine.registerHelper, function registerHelperWrapper (oldRegisterHelper, args) {
    if (typeof args[0] === 'string' && typeof args[1] === 'function') {
      var name = args[0]
      var helper = args[1]
      // Called like "registerHelper(name, helper)"
      oldRegisterHelper.call(engine, name, wrap(helper, helperWrapper))
    } else if (args.length === 1 && typeof args[0] === 'object') {
      // Called like "registerHelper({ name: helper })
      oldRegisterHelper.call(engine, mapValues(args[0], function (helper) {
        return wrap(helper, helperWrapper)
      }))
    }
  })
  // Re-register all built-in-helpers to ensure that their methods are wrapped
  engine.registerHelper(engine.helpers)

  // Wrap the `compile` function, so that it wraps the compiled-template
  // with `prepareAndResolveMarkers`
  engine.compile = wrap(engine.compile, function compileWrapper (oldCompile, args) {
    var fn = oldCompile.apply(engine, args)
    return wrap(fn, prepareAndResolveMarkers)
  // Wrap the compiled function
  })

  /**
   * Wrapper for templates, partials and block-helper callbacks
   *
   * 1) the `markers` variable is initialized with a new instance of Markers
   * 2) a promise is returned instead of a string
   * 3) promise placeholder-values are replaced with the promise-results
   *    in the returned promise
   */
  function prepareAndResolveMarkers (fn, args) {
    if (markers) {
      // The Markers-object has already been created for this cycle of the event loop:
      // Just run the wraped function
      return fn.apply(this, args)
    }
    try {
      // No Markers yet. This is the initial call or some call that occured during a promise resolution
      // Create markers, apply the function and resolve placeholders (i.e. promises) created during the
      // function execution
      markers = new Markers(engine, options.placeholder)
      var resultWithPlaceholders = fn.apply(this, args)
      return markers.resolve(resultWithPlaceholders)
    } finally {
      // Reset promises for the next execution run
      markers = null
    }
  }

  /**
   * Wrapper for helper methods:
   * * Call the helper after resolving parameters (if any promises are passed)
   * * Wrap `options.fn` and `options.inverse` to return promises (if needed)
   * * Convert helper results markers if they are promises.
   */
  function helperWrapper (fn, args) {
    var _this = this
    var options = args[args.length - 1]
    var hash = options.hash

    // "fn" and "inverse" return strings. They must be able to handle promises
    // just as the compiled template and partials
    options.fn = options.fn && wrap(options.fn, prepareAndResolveMarkers)
    options.inverse = options.inverse && wrap(options.inverse, prepareAndResolveMarkers)

    // If there are any promises in the helper args or in the hash,
    // the evaluation of the helper cannot start before these promises are resolved.
    var promisesInArgs = anyApplies(args, Q.isPromiseAlike)
    var promisesInHash = anyApplies(values(hash), Q.isPromiseAlike)

    if (!promisesInArgs && !promisesInHash) {
      // No promises in hash or args. Act a normal as possible.
      var result = fn.apply(_this, args)
      return Q.isPromiseAlike(result) ? markers.asMarker(result) : result
    }

    var promise = deep(args).then(function (resolvedArgs) {
      // We need "markers", because we are in a new event-loop-cycle now.
      return prepareAndResolveMarkers(function () {
        return fn.apply(_this, resolvedArgs)
      })
    })
    return markers.asMarker(promise)
  }

  return engine
}

/**
 * Wrap a function with a wrapper function
 * @param {function} fn the original function
 * @param {function(function,array)} wrapperFunction the wrapper-function
 *   receiving `fn` as first parameter and the arguments as second
 * @returns {function} a function that calls the wrapper with
 *   the original function and the arguments
 */
function wrap (fn, wrapperFunction) {
  return function () {
    return wrapperFunction.call(this, fn, toArray(arguments))
  }
}

/**
 * A class the handles the creation and resolution of markers in the Handlebars output.
 * Markes are used as placeholders in the output string for promises returned by helpers.
 * They are replaced as soon as the promises are resolved.
 * @param {Handlebars} engine a Handlebars instance (needed for the `escapeExpression` function)
 * @param {string} prefix the prefix to identify placeholders (this prefix should never occur in the template).
 * @constructor
 */
function Markers (engine, prefix) {
  /**
   * This array stores the promises created in the current event-loop cycle
   * @type {Promise[]}
   */
  this.promiseStore = []
  this.engine = engine
  this.prefix = prefix
  // one line from substack's quotemeta-package
  var placeHolderRegexEscaped = String(this.prefix).replace(/(\W)/g, '\\$1')
  this.regex = new RegExp(placeHolderRegexEscaped + '(\\d+)(>|&gt;)', 'g')
}

/**
 * Add a promise the the store and return a placeholder.
 * A placeholder consists of
 * * The configured prefix (or \u0001), followed by
 * * the index in the array
 * * ">"

 * @param {Promise} promise the promise
 * @return {Promise} a new promise with a toString-method returning the placeholder
 */
Markers.prototype.asMarker = function asMarker (promise) {
  // The placeholder: "prefix" for identification, index of promise in the store for retrieval, '>' for escaping
  var placeholder = this.prefix + this.promiseStore.length + '>'
  // Create a new promise, don't modify the input
  var result = new Q.Promise(function (resolve, reject) {
    promise.done(resolve, reject)
  })
  result.toString = function () {
    return placeholder
  }
  this.promiseStore.push(promise)
  return result
}

/**
 * Replace the placeholder found in a string by the resolved promise values.
 * The input may be Promise, in which case it will be resolved first.
 * Non-string values are returned directly since they cannot contain placeholders.
 * String values are search for placeholders, which are then replaced by their resolved values.
 * If the '>' part of the placeholder has been escaped (i.e. as '&gt;') the resolved value
 * will be escaped as well.
 *
 * @param {Promise<any>} input the string with placeholders
 * @return {Promise<string>} a promise for the string with resolved placeholders
 */
Markers.prototype.resolve = function resolve (input) {
  var self = this
  return Q(input).then(function (output) {
    if (typeof output !== 'string') {
      // Make sure that non-string values (e.g. numbers) are not converted to a string.
      return output
    }
    return Q.all(self.promiseStore)
      .then(function (promiseResults) {
        /**
         * Replace placeholders in a string. Looks for placeholders
         * in the replacement string recursively.
         * @param {string} string
         * @returns {string}
         */
        function replacePlaceholdersRecursivelyIn (string) {
          return string.replace(self.regex, function (match, index, gt) {
            // Check whether promise result must be escaped
            var resolvedValue = promiseResults[index]
            var result = gt === '>' ? resolvedValue : self.engine.escapeExpression(resolvedValue)
            return replacePlaceholdersRecursivelyIn(result)
          })
        }

        // Promises are fulfilled. Insert real values into the result.
        return replacePlaceholdersRecursivelyIn(String(output))
      })
  })
}

/**
 * Apply the mapFn to all values of the object and return a new object with the applied values
 * @param obj the input object
 * @param {function(any, string, object): any} mapFn the map function (receives the value, the key and the whole object as parameter)
 * @returns {object} an object with the same keys as the input object
 */
function mapValues (obj, mapFn) {
  return Object.keys(obj).reduce(function (result, key) {
    result[key] = mapFn(obj[key], key, obj)
    return result
  }, {})
}

/**
 * Return the values of the object
 * @param {object} obj an object
 * @returns {Array} the values of the object
 */
function values (obj) {
  return Object.keys(obj).map(function (key) {
    return obj[key]
  })
}

/**
 * Check if the predicate is true for any element of the array
 * @param {Array} array
 * @param {function(any):boolean} predicate
 * @returns {boolean}
 */
function anyApplies (array, predicate) {
  for (var i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
      return true
    }
  }
  return false
}

/**
 * Convert arrayLike-objects (like 'arguments') to an array
 * @param arrayLike
 * @returns {Array.<T>}
 */
function toArray (arrayLike) {
  return Array.prototype.slice.call(arrayLike)
}
