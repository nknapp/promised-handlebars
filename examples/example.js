var promisedHandlebars = require('../')
var Q = require('q')
var Handlebars = promisedHandlebars(require('handlebars'))

// Register a helper that returns a promise
Handlebars.registerPromiseHelper('helper', function (value) {
  return Q.delay(100).then(function () {
    return value
  })
})

var template = Handlebars.compile('123{{helper a}}456{{helper b}}')

// The whole compiled function returns a promise as well
template({
  a: 'abc',
  b: 'xyz'
}).done(console.log)
