/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

var isPromiseAlike = require('./utils').isPromiseAlike
var createReplaceP = require('./replaceP')

/**
 * Returns a `Markers` constructor that uses a specific Promise constructor
 * @param Promise a Promise constructor
 * @return {Markers} the Markers class
 */
module.exports = function createMarkersClass (Promise) {
  var replaceP = createReplaceP(Promise)

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
    var result = Promise.resolve(promise)
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
    return Promise.resolve(input).then(function (output) {
      if (typeof output !== 'string') {
        // Make sure that non-string values (e.g. numbers) are not converted to a string.
        return output
      }
      return Promise.all(self.promiseStore)
        .then(function (promiseResults) {
          /**
           * Replace placeholders in a string. Looks for placeholders
           * in the replacement string recursively.
           * @param {string|Promise|Handlebars.SafeString} string
           * @returns {Promise<string>}
           */
          function replacePlaceholdersRecursivelyIn (string) {
            if (isPromiseAlike(string)) {
              return string.then(function (string) {
                return replacePlaceholdersRecursivelyIn(string)
              })
            }
            if (typeof string.toHTML === 'function' && string.string) {
              // This is a Handlebars.SafeString or something like it
              return replacePlaceholdersRecursivelyIn(string.string)
            }

            // Must be a string, or something that can be converted to a string
            return replaceP(String(string), self.regex, function (match, index, gt) {
              // Check whether promise result must be escaped
              var resolvedValue = promiseResults[ index ]
              var result = gt === '>' ? resolvedValue : self.engine.escapeExpression(resolvedValue)
              return replacePlaceholdersRecursivelyIn(result)
            })
          }

          // Promises are fulfilled. Insert real values into the result.
          return replacePlaceholdersRecursivelyIn(output)
        })
    })
  }

  return Markers
}
