var promisedHandlebars = require('../')
var Q = require('q')
var Handlebars = promisedHandlebars(require('handlebars'))

// Register a helper that returns a promise
Handlebars.registerHelper('p', function (value) {
  return Q.delay(100).then(function () {
    return value
  })
})

// The whole compiled function returns a promise as well
Handlebars.compile('123{{p a}}456{{p b}}')({ a: 'abc', b: 'xyz'})
  .done(console.log)
