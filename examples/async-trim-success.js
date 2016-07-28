var promisedHandlebars = require('../')
var Q = require('q')
var Handlebars = promisedHandlebars(require('handlebars'), { Promise: Q.Promise })

Handlebars.registerHelper({
  // Returns a promise for `true`
  'eventually-true': function () {
    return Q.delay(1).then(function () {
      return true
    })
  },
  // Trim whitespaces from block-content result.
  // -----<snip>-----------
  'trim': function (options) {
    return Q()
      .then(function () {
        return options.fn()
      })
      .then(function (contents) {
        return contents.trim()
      })
  }
// -----</snip>------------
})

var template = Handlebars.compile('{{#trim}}{{#if (eventually-true)}}   abc   {{/if}}{{/trim}}')

// We would expect "abc", but...
template({}).then(JSON.stringify).done(console.log)
