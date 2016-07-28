// -----<snip>-------
global.Promise = require('bluebird')
var promisedHandlebars = require('../')
// By default promisedHandlebars uses global.Promise,
var Handlebars = promisedHandlebars(require('handlebars'))
// -----</snip>-------

// Register a helper that returns a promise
// Helpers do not have to return a promise of the sane
Handlebars.registerHelper('helper', function (value) {
  return Promise.delay(100).then(function () {
    return value
  })
})

var template = Handlebars.compile('123{{helper a}}456{{helper b}}')

// The whole compiled function returns a promise as well
template({
  a: 'abc',
  b: 'xyz'
}).then(console.log)
