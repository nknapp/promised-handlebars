/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

/**
 * Creates a String.prototype.replace function with support for Promises using a specific Promise constructor.
 *
 * @param {function(new:Promise)} Promise a promise constructor
 * @returns {function(string, RegExp, function)} an equivalent for String.prototype.replace which
 *  can handle promises
 */
module.exports = function createReplaceP (Promise) {
  var deepAPlus = require('deep-aplus')(Promise)
  /**
   * Similar to String.prototype.replace, but it returns a promise instead of a string
   * and it can handle promises returned by the replacer
   *
   * @param {string} string the source string
   * @param {RegExp} regex the part/pattern to be replaced
   * @param {function(string, string..., number, string):(Promise<string>|string)|string} replacer the replacement function or string
   * @return {Promise<string>} a promise the resolves to the replaced string
   */
  return function replaceP (string, regex, replacer) {
    if (typeof replacer === 'string') {
      return Promise.resolve(string.replace(regex, replacer))
    }
    if (typeof replacer === 'function') {
      var parts = []
      var lastIndex = 0

      // Use "replace" just to iterate all matches conveniently
      string.replace(regex, function () {
        var replacerArgs = Array.prototype.slice.apply(arguments)
        var offset = replacerArgs[replacerArgs.length - 2] // prior to last argument is the offset

        // From last match (or start) up to next match
        parts.push(string.substr(lastIndex, offset - lastIndex))

        var replacementP = deepAPlus(replacer.apply(this, replacerArgs))
          .then(function (replacement) {
            return String(replacement)
          })

        // Next match
        parts.push(replacementP)

        // Prepare next iteration (switch to first character after match)
        lastIndex = offset + replacerArgs[0].length
      })

      // Last match up to end
      parts.push(string.substr(lastIndex))

      return Promise.all(parts).then(function (resolvedParts) {
        return resolvedParts.join('')
      })
    }
  }
}
