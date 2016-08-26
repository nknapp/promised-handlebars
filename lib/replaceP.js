/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/**
 *
 * @param {Promise} Promise a Promise constructor
 * @returns {function(string, RegExp, function)} an equivalent for String.prototype.replace which
 *  can handle promises
 */
module.exports = function (Promise) {
  var deepAPlus = require('deep-aplus')(Promise)
  /**
   *
   * @param {string} string
   * @param {RegExp} regex
   * @param {function|string} replaceer
   * @return {Promise<string>} a promise for the replaced string
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
