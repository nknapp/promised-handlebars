# promised-handlebars 

[![NPM version](https://badge.fury.io/js/promised-handlebars.svg)](http://badge.fury.io/js/promised-handlebars)
[![Travis Build Status](https://travis-ci.org/nknapp/promised-handlebars.svg?branch=master)](https://travis-ci.org/nknapp/promised-handlebars)
[![Coverage Status](https://img.shields.io/coveralls/nknapp/promised-handlebars.svg)](https://coveralls.io/r/nknapp/promised-handlebars)


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
var Handlebars = promisedHandlebars(require('handlebars'), { Promise: Q.Promise })

// Register a helper that returns a promise
// Helpers do not have to return a promise of the sane
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

This will generate the following output: 
`123abc456xyz`


### Block helpers

If a block-helper, calls the helper-contents (`options.fn`) and the else-block 
(`options.inverse`) asynchronously, i.e. from within a promise chain those functions 
may return a promise. 

When those methods is called synchronously they return the value as they do in default Handlebars.  
This means that helper-libraries written for Handlebars will still work, but you can also write
block-helpers that do some asynchronous work before evaluating the block contents, such as:

```js
var promisedHandlebars = require('promised-handlebars')
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
```

This will generate the following output: 
`nknapp: Nils Knappmeier`

### Usage with other promise libraries

Starting with `v2.x`, `promised-handlebars`, no longer depends on
[`Q`](https://github.com/kriskowal/q). Instead, you will need to ensure
that a [`Promises/A+`](https://promisesaplus.com/) implementation is provided.
You can do this by passing the promise implementation of your choice in the options.

```js
var promisedHandlebars = require('promised-handlebars')
var Q = require('q')
// Pass Q.Promise to promisedHandlebars in the options.Promise
var Handlebars = promisedHandlebars(require('handlebars'), { Promise: Q.Promise })
```

`promised-handlebars` will default to using the global Promise object, so if your environment provides it (e.g if you are using `node@^4.x` or a [modern web browser](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#Browser_compatibility))
or if you are using a promise library as `global.Promise`, you will not need to pass the Promise constructor
in the options.

```js
global.Promise = require('bluebird')
var promisedHandlebars = require('promised-handlebars')
// By default promisedHandlebars uses global.Promise,
var Handlebars = promisedHandlebars(require('handlebars'))
```

#### Mixed Promises/A+

When writing helper functions that return promises, it is not necessary to return the same sort of promises that you used when invoking `promisedHelper()`.

```js
var promisedHandlebars = require('promised-handlebars')
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
```

This works and generates
`ABC123XYZ456`


## How it works

Handlebars allows you to register helper functions and that can be called 
from the template. The template itself is compiled into the function that 
can be called to render a JSON.

This module wraps the compiled template function and helpers register with 
`registerHelper` in order to do the following:

* In case the helper returns an object that is `isPromiseAlike` (i.e. it is a non-`null` object with a 
  function method `then()`), the value is inserted into a temporary `promises-array`.

* The `.toString` method of the helper-return value is modified to return
  a concatenated string of
  * A placeholder-character that is not supposed to occur in the template (currently `\u0001`).
    The placeholder may also not occur in the output generated by helpers.
  * The index of the inserted value within the `promises-array` (as stringified digits)
  * A `>` character that is used to detect whether the helper output was be escaped.

* After the execution of the compiled template, a combined promise of all
  helper return values is created with `Q.all()` and returned when this 
  promise (i.e. all helper-return-values) are resolved, all placeholder 
  characters in the template output are replaced by the actual resolved values.
  The inserted `>`-character is now used to determine whether to escape the helper output.
  (If it is was converted to `&gt;`, it is escaped, otherwise not) 

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
* Helper arguments (like in `{{helper (promise-helper arg) hashArg=(promise-helper arg2)}}`)
  need to be resolved before running the actual helper.

* Builtin-helpers must be wrapped as well to allow something like `{{#each (promise-helper arg)}}abc{{/each}}`

### Caveats  / TODOs

**Customizable placeholder:** The algorithm currently uses the char `\u0001` as placeholder in the 
template. It may happen that the placeholder-sequence occurs in the template, a partial, the input data 
or that it is generated by helpers. In such a case, it will replaced by a promise result at some point.

This can be ommited by passing an other character in the `options` parameter, but this is not a complete solution.

**Known problems:** Although many edge-cases are handled by this module, there are some cases that 
cannot be handled properly.
The following example uses a synchronous block-helper `{{#trim}}...{{trim}}` to remove whitespace
from both ends of the enclosed block and a asynchronous helper `{{promise-helper}}` that returns a
promise for a boolean value:

```js
var promisedHandlebars = require('promised-handlebars')
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
```

The output of the example still contains the surrounding spaces, so the `{{#trim}}` helper
appearently did not work:

`"   abc   "`

The problem is, that the `{{#if}}`-helper cannot be executed until the result of `{{eventually-true}}`
is resolved. This means, that the `{{#if}}`-helper must return a promise instead of the actual string.
Returning a promise means inserting a placeholder, but calling `.trim()` on the placeholder does not return
the whitespaces around the resolved result. 

If you are writing the `{{#trim}}`-helper yourself, you can adjust it so that it uses promises:

```js
'trim': function (options) {
    return Q()
      .then(function () {
        return options.fn()
      })
      .then(function (contents) {
        return contents.trim()
      })
  }
```

Then, the output will be correct: `"abc"`
 
If you cannot easily adapt the `{{#trim}}`-helper, you have a problem.
**Suggestions welcome**.


See [open issues](https://github.com/nknapp/promised-handlebars/issues) for possible other problems.

### Other solutions for async-handlebars

* The problem of async-helpers was discussed in 
  [this issue in the Handlebars project on github](https://github.com/wycats/handlebars.js/issues/141).
  Some solutions are discussed there. The implementation of this module is similar to one of them.  

* There is a [handlebars-async](https://www.npmjs.com/package/handlebars-async)-package on npm, which
  works with callbacks instead of promises. It's version is currently 0.0.3 and the last release is 
  two years ago (as of July 2015), which is why I did not take a closer look. But it seems to use 
  uuids to mark insertion-points for promise-results.

  

## License

`promised-handlebars` is published under the MIT-license. 
See [LICENSE.md](LICENSE.md) for details.

## Release-Notes
 
For release notes, see [CHANGELOG.md](CHANGELOG.md)
 
## Contributing guidelines

See [CONTRIBUTING.md](CONTRIBUTING.md).