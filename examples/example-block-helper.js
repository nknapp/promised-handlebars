var promisedHandlebars = require('../')
var Handlebars = promisedHandlebars(require('handlebars'), { Promise: require('q').Promise })
var httpGet = require('get-promise')

// A block helper (retrieve github.com user data for a given username)
// Execute the helper-block with the user data when it resolves
Handlebars.registerHelper('github-user', function (value, options) {
  var url = 'https://api.github.com/users/' + value
  return httpGet(url, { headers: { 'User-Agent': 'Node' } })
    .get('data')
    .then(JSON.parse)
    .then(function (data) {
      // `options.fn` returns a promise. Wrapping brackets must be added after resolving
      return options.fn(data)
    })
})

var template = Handlebars.compile('{{username}}: {{#github-user username}}{{{name}}}{{/github-user}}')

// The whole compiled function returns a promise as well
template({
  username: 'nknapp'
}).done(console.log)
