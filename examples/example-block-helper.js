var promisedHandlebars = require('../')
var Handlebars = promisedHandlebars(require('handlebars'))
var httpGet = require('get-promise')

// A block helper (retrieve weather for a city from openweathermap.org)
// Execute the helper-block with the weather result
Handlebars.registerPromiseHelper('weather', function (value, options) {
  var url = 'http://api.openweathermap.org/data/2.5/weather?q=' + value + '&units=metric'
  return httpGet(url)
    .get('data')
    .then(JSON.parse)
    .then(function (weather) {
      // `options.fn` returns a promise. Wrapping brackets must be added after resolving
      return options.fn(weather)
    })
})

var template = Handlebars.compile('{{city}}: {{#weather city}}{{{main.temp}}}°C{{/weather}}')

// The whole compiled function returns a promise as well
template({
  city: 'Darmstadt'
}).done(console.log)
