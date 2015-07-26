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
 * @param {Handlebars} Handlebars
 * @param {object} options
 * @param {string=} options.placeholder
 * @returns {Handlebars} a modified Handlebars object
 */

module.exports = function promisedHandlebars (Handlebars, options) {
  options = options || {}
  options.placeholder = options.placeholder || '\u0001'

  // one line from from substack's quotemeta-package
  var regex = new RegExp(String(options.placeholder).replace(/(\W)/g, '\\$1'), 'g')

  var engine = Handlebars.create()

  // Wrap `registerHelper` with a custom function
  var oldRegisterHelper = engine.registerHelper
  engine.registerPromiseHelper = function (keyOrObject, fn) {
    if (typeof keyOrObject === 'string') {
      // Register a custom helper-function instead of actual helper
      oldRegisterHelper.call(this, keyOrObject, function () {
        // Wrap "optons.fn" and "options.inverse" to apply the same
        var helperOpts = arguments[arguments.length - 1]
        if (helperOpts.fn) {
          helperOpts.fn = wrapAndResolve(helperOpts.fn)
        }
        if (helperOpts.inverse) {
          helperOpts.inverse = wrapAndResolve(helperOpts.inverse)
        }

        var result = Q(fn.apply(this, arguments))
        // Remember promise and return placeholder instead
        promises.push(result)
        return options.placeholder
      })
    } else {
      // `keyOrObject` is actual an object of helpers
      // Call `registerHelper` again for each object
      // This simulates the default Handlebars-behaviour
      Object.keys(keyOrObject).forEach(function (key) {
        engine.registerPromiseHelper(key, keyOrObject[key])
      })
    }
  }

  var oldCompile = engine.compile
  engine.compile = function () {
    var fn = oldCompile.apply(this, arguments)
    return wrapAndResolve(fn)
  // Wrap the compiled function
  }

  function wrapAndResolve (fn) {
    return function () {
      if (promises) {
        // "promises" array already exists: We are executing a partial
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
          return String(resultWithPlaceholders).replace(regex, function () {
            return results.shift()
          })
        })
      } finally {
        // Reset promises for the next execution run
        promises = null
      }

    }

  }

  return engine
}
