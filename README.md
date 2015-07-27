# promised-handlebars

> Wrapper for Handlebars that allows helpers returning promises


# Installation

```
npm install promised-handlebars
```

## Usage

`promised-handlebars` creates a new a Handlebars-instance with wrapped
`compile`-method and `registerHelper`-method to allow 
helpers that return promises.

As a side-effect (in order to allow asynchronous template execution)
the compiled template-function itself always returns a promise instead
of a string.

### Simple helpers 

Simple helpers can just return promises.

```js
var promisedHandlebars = require('promised-handlebars')
var Q = require('q')
var Handlebars = promisedHandlebars(require('handlebars'))

// Register a helper that returns a promise
Handlebars.registerHelper('helper', function (value) {
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

If a block-helper, calls the helper-contents (`options.fn`) and the else-block 
(`options.inverse`) asynchronously, i.e. from within a promise chain those functions 
may return a promise. 

When those methods is called synchronously they return the value as they do in default Handlebars.  
This means that helper-libraries written for Handlebars will still work, but you can also write
block-helpers that do some asynchronous work before evaluating the block contents, such as:

```js
var promisedHandlebars = require('promised-handlebars')
var Handlebars = promisedHandlebars(require('handlebars'))
var httpGet = require('get-promise')

// A block helper (retrieve weather for a city from openweathermap.org)
// Execute the helper-block with the weather result
Handlebars.registerHelper('weather', function (value, options) {
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
Darmstadt: 18.48°C
```





## How it works

Handlebars allows you to register helper functions and that can be called 
from the template. The template itself is compiled into the function that 
can be called to render a JSON.

This module wraps the compiled template function and helpers register with 
`registerHelper` in order to do the following:

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

### Edge-cases

There are things to think about that are covered by this module:

* The promise-array only exists during one execution of the javascript event-loop.
  It will be reset to `null` once the template-execution is done and the `Q.all()` function
  is called. Otherwise there would be serious concurrency problems when the template
  is executed several times at the same time.

* Registered partials in are compiled by Handlebars with the same `compile` function
  as the template itself. However, they may not return a promise, because the caller-code
  is not expecting that.
  
  Since the `partial`-function is called from somewhere within the `template`-function, the
  promise-array already exists. Thus, the solution is, to call the `partial`-function directly
  if the promise-array already exists. This will then return a string instead of a promise.

* A block-helper may call `options.fn` and `option.inverse` from the `.then` function
  of a promise. The promise-array is already reset to `null` when those functions are executed,
  which means that they cannot insert any more promises. We solve this problem by wrapping
  those functions with the same mechanism as the `template`- and `partial`-functions:
  If the function is called in the same event-loop-cycle as the `template`-function, no
  wrapper is applied and the return value is passed on as-is.

  If the functions are called asynchronously from within a promise-`.then` function, the wrapper
  will be applied and a promise will be returned instead of the actual return value.
  The side-effect is that synchronous helper-libraries can still be used, while asynchronous
  block helpers are possible, but must handle the promise return-value correctly.

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
