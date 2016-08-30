/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

var deepAplus = require('deep-aplus')
var createMarkers = require('./lib/markers')
var utils = require('./lib/utils')

// Basic utility functions
var values = utils.values
var wrap = utils.wrap
var mapValues = utils.mapValues
var anyApplies = utils.anyApplies
var isPromiseAlike = utils.isPromiseAlike

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
 * @param {object=} options optional parameters
 * @param {string=} options.placeholder the placeholder to be used in the template-output before inserting
 *   the promised results. This placeholder may not occur in the template or any partial. Neither
 *   my any helper generate the placeholder in to the result. Errors or wrong replacement will
 *   happen otherwise.
 * @param {Promise=} options.Promise the promise implementation to use. Defaults to global.Promise
 * @returns {Handlebars} a modified Handlebars object
 */
function promisedHandlebars (Handlebars, options) {
  options = options || {}
  options.placeholder = options.placeholder || '\u0001'

  var Promise = options.Promise || global.Promise
  if (!Promise) {
    throw new Error('promised-handlebars: Promise is undefined. Please specify options.Promise or set global.Promise.')
  }

  var deep = deepAplus(Promise)
  var Markers = createMarkers(Promise)

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
    var promisesInArgs = anyApplies(args, isPromiseAlike)
    var promisesInHash = anyApplies(values(hash), isPromiseAlike)

    if (!promisesInArgs && !promisesInHash) {
      // No promises in hash or args. Act a normal as possible.
      var result = fn.apply(_this, args)
      return isPromiseAlike(result) ? markers.asMarker(result) : result
    }

    var promise = deep(args).then(function (resolvedArgs) {
      // We need "markers", because we are in a new event-loop-cycle now.
      return prepareAndResolveMarkers(function () {
        return fn.apply(_this, resolvedArgs)
      })
    })
    return markers.asMarker(promise)
  }

  engine.Promise = Promise

  return engine
}

