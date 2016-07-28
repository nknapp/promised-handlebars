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
  'trim': function (options) {
    return String(options.fn()).trim()
  }
})

var template = Handlebars.compile('{{#trim}}{{#if (eventually-true)}}   abc   {{/if}}{{/trim}}')

// We would expect "abc", but...
template({}).then(JSON.stringify).done(console.log)
