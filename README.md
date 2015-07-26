# promised-handlebars

> Wrapper for Handlebars that allows helpers returning promises


# Installation

```
npm install promised-handlebars
```

## Usage

`promised-handlebars` creates a new a Handlebars-instance with wrapped
`compile`-method and added `registerPromiseHelper`-method to allow 
helpers that return promises.

As a side-effect (in order to allow asynchronous template execution)
the compiled template-function itself always returns a promise instead
of a string.

### Simple helpers 

Simple helpers registered with `registerPromiseHelper` can just return
promises.

```js
var promisedHandlebars = require('promised-handlebars')
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
```

This will generate the following output

```
123abc456xyz
```

### Block helpers

If you use `registerPromiseHelper` to register a block-helper, the callback-functions that execute 
the helper-contents (`options.fn`) and the else-block (`options.inverse`) always return a promise.
This behaviour is not compatible with the default Handlebars behaviour and it means that 
helpers originally written for `registerHelper` may not work with `registerPromiseHelper`.
Here is a simple example for using block helpers:

```js
var promisedHandlebars = require('promised-handlebars')
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
```

This will generate the following output

```
Darmstadt: 17.68°C
```





## How it works

Handlebars allows you to register helper functions and that can be called 
from the template. The template itself is compiled into the function that 
can be called to render a JSON.

This module wraps the compiled template function and helpers register with 
`registerPromiseHelper` in order to do the following:

* The helper return values are not directly insert into the template output.
  Instead, they are stored in an array that is initialized on every execution
  of the compiled template.

* Instead of the helper-return value, a placeholder character is returned and
  inserted into the template output.

* After the execution of the compiled template, a combined promise of all
  helper return values is created with `Q.all()` and returned when this 
  promise (i.e. all helper-return-values) are resolved, all placeholder 
  character in the template output is replaced by the actual resolved values.

The result is a promise for the finalized template output.

### Caveats  / TODOs

* The whole algorithm is based on the assumption, that the Handlebars template
  is calling and inserting helper return-values in a linear fashion. 
  If helpers are not called in the same order in which the values are inserted
  in the template, this module will shuffle values. However, this did not
  happen in the example and in the first tests. More complicated tests 
  with partials are needed to verify the behaviour.
  If this does not work out, I have to go for uuids, but I'd rather omit that.
                                                       
* The algorithm currently uses the char `\u0001` as placeholder in the 
  template. If the template or any partial or the input data contains this 
  character already, helper values will be inserted in the wrong place.
  This can be ommited by passing an other character in the `options` parameter,
  but it would be better to determine a character automatically based on the 
  actual input.

* See [open issues](https://github.com/nknapp/promised-handlebars/issues) for 
  other problems.


## License

`promised-handlebars` is published under the MIT-license. 
See [LICENSE.md](LICENSE.md) for details.

## Release-Notes
 
For release notes, see the [changelog](CHANGELOG.md)
 
## Contributing Guidelines

<!-- Taken from @tunnckoCore: https://github.com/tunnckoCore/coreflow-templates/blob/master/template/CONTRIBUTING.md -->

Contributions are always welcome!

**Before spending lots of time on something, ask for feedback on your idea first!**

Please search issues and pull requests before adding something new to avoid duplicating
efforts and conversations.


### Installing

Fork and clone the repo, then `npm install` to install all dependencies and `npm test` to
ensure all is okay before you start anything.


### Testing

Tests are run with `npm test`. Please ensure all tests are passing before submitting
a pull request (unless you're creating a failing test to increase test coverage or show a problem).

### Code Style

[![standard][standard-image]][standard-url]

This repository uses [`standard`][standard-url] to maintain code style and consistency,
and to avoid style arguments.
```
npm i standard -g
```

It is intentional to don't have `standard`, `istanbul` and `coveralls` in the devDependencies. Travis will handle all that stuffs. That approach will save bandwidth also installing and development time.

[standard-image]: https://cdn.rawgit.com/feross/standard/master/badge.svg
[standard-url]: https://github.com/feross/standard
