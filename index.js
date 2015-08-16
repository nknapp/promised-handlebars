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
 *   the promised results
 * @returns {Handlebars} a modified Handlebars object
 */
function promisedHandlebars (Handlebars, options) {
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

      return Q.all([resultWithPlaceholders, Q.all(promises)]).spread(function (output, promiseResults) {
        if (typeof output !== 'string') {
          // Make sure that non-string values are not converted to a string.
          return output
        }
        // Promises are fulfilled. Insert real values into the result.
        return String(output).replace(regex, function (match, index, gt) {
          // Check whether promise result must be escaped
          return gt === '>' ? promiseResults[index] : engine.escapeExpression(promiseResults[index])
        })
      })
    } finally {
      // Reset promises for the next execution run
      promises = null
    }
  }

  /**
   * Call the helper and modify parameters and the result
   * Wrap `options.fn` and `options.inverse` to
   * return promises (eventually)
   * and call `createMarker` afterwards
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
    var hash = options.hash

    // Handlebars calls helpers from template functions and appends the result to a string.
    // In {{helper (inner-helper)}}, the inner-helper must return a promise
    // They need a toString-method
    return createMarker(function () {
      // In `{{#each (inner-helper)}}abc{{/each}}`, if `inner-helper` returns a promise,
      // `#each` must be called with the resolved value of the promise instead.

      // Check whether there are promises at all
      var promiseArgs = false
      args.forEach(function (arg) {
        promiseArgs = promiseArgs || Q.isPromiseAlike(arg)
      })
      if (hash) {
        Object.keys(hash).forEach(function (key) {
          promiseArgs = promiseArgs || Q.isPromiseAlike(hash[key])
        })
      }
      if (!promiseArgs) {
        return fn.apply(_this, args)
      }

      // Condense promises from args and resolve them
      var argsPromise = Q.all(args)
      var hashPromise = {}
      // Resolve hash
      if (hash) {
        var hashKeys = Object.keys(hash)
        hashPromise = Q.all(hashKeys.map(function (key) {
          return hash[key]
        })).then(function (resolvedHashValues) {
          var result = {}
          for (var i = 0; i < hashKeys.length; i++) {
            result[hashKeys[i]] = resolvedHashValues[i]
          }
          return result
        })
      }
      // Sadly, `Q.all` will always put us in a new event-loop-cycle, which means more overhead
      // for instances of `promises`-array and possibly more overhead replacing placeholders
      // in the helper result.
      // That's why we only call it if necessary
      return Q.all([argsPromise, hashPromise]).spread(function (resolvedArgs, resolvedHash) {
        // We need a new `promises` array, because we are in a new event-loop-cycle now.
        if (hash) {
          resolvedArgs[resolvedArgs.length - 1].hash = resolvedHash
        }
        return prepareAndResolve(function () {
          return fn.apply(_this, resolvedArgs)
        })
      })
    })
  }

  /**
   * Apply a function with arguments.
   * If a promise is returned by the function, push it into
   * the promises-array and set its `.toString` method
   * to
   * * the placeholder, followed by
   * * the index in the array
   * * ">"
   *
   * @param {function} fn the original function
   * @param {array<*>} arguments the arguments passed to the original function
   * @returns {*}
   */
  function createMarker (fn, args) {
    var promiseOrValue = fn.apply(this, args)
    promiseOrValue = resolveNow(promiseOrValue)
    if (!Q.isPromiseAlike(promiseOrValue)) {
      return promiseOrValue
    }
    promises.push(promiseOrValue)
    promiseOrValue.toString = function () {
      return options.placeholder + (promises.length - 1) + '>'
    }
    return promiseOrValue
  }

  return engine
}

/**
 * Return the promised value, if the promise is already resolved,
 * otherwise the promise.
 * @param {Promise|*} promiseOrValue a promise or a value
 * @returns {Promise|*} the promised value or the promise
 */
function resolveNow (promiseOrValue) {
  if (!Q.isPromiseAlike(promiseOrValue)) {
    return promiseOrValue
  }
  // Check if the promise is already resolved
  var immediateResult = null
  promiseOrValue.done(function (result) {
    // Fetch result if it is available in the same event-loop cycle
    // Store an object to prevent the result being falsy
    immediateResult = {result: result}
    return result
  })

  if (immediateResult) {
    return immediateResult.result
  } else {
    // Cannot resolve
    return promiseOrValue
  }
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
