var promisedHandlebars = require('../')
var Handlebars = promisedHandlebars(require('handlebars'))

var Q = require('q')

// Register a helper that returns a promise
// Helpers can use any A+ promises type
Handlebars.registerHelper('helper', function (value) {
  return Q.delay(100).then(function () {
    return value
  })
})

var template = Handlebars.compile('ABC{{helper a}}XYZ{{helper b}}')

// The whole compiled function returns a promise as well
template({
  a: '123',
  b: '456'
}).then(console.log)
