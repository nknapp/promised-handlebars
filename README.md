# promised-handlebars

> Wrapper for Handlebars that allows helpers returning promises


# Installation

```
npm install promised-handlebars
```

 
## Usage

The following example demonstrates how to use this module:

```js
var promisedHandlebars = require("../");
var Q = require("q");
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
```

This will generate the following output

```
123abc456xyz
```

##  API-reference

### Global





* * *

##### exports(Handlebars, options, options.placeholder) 

Returns a wrapped Handlebars instance that
* Allows helpers to return promises
* Creates `compiled` templates that always
  return a promise for the resulting string.
  The promise is fulfilled after all helper-promsises
  are resolved.

**Parameters**

**Handlebars**: `Handlebars`, Returns a wrapped Handlebars instance that
* Allows helpers to return promises
* Creates `compiled` templates that always
  return a promise for the resulting string.
  The promise is fulfilled after all helper-promsises
  are resolved.

**options**: `object`, Returns a wrapped Handlebars instance that
* Allows helpers to return promises
* Creates `compiled` templates that always
  return a promise for the resulting string.
  The promise is fulfilled after all helper-promsises
  are resolved.

**options.placeholder**: `string`, Returns a wrapped Handlebars instance that
* Allows helpers to return promises
* Creates `compiled` templates that always
  return a promise for the resulting string.
  The promise is fulfilled after all helper-promsises
  are resolved.

**Returns**: `Handlebars`, a modified Handlebars object



* * *












## License

`promised-handlebars` is published under the MIT-license. 
See [LICENSE.md](LICENSE.md) for details.

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
