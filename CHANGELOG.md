# Change Log

This project adheres to [Semantic Versioning](http://semver.org/).

## Upcoming
### Fix

* Issue #2: Escaping of promise return value is now done properly 

## v0.2.0 - 2015-07-26
### Change
* `registerHelper` is not overwritten anymore. Instead, a new method `registerPromiseHelper`
  is added to Handlebars
* for block-helpers registered with `registerPromiseHelper`, the `options.fn`- and `options.inverse`-functions
  always return a promisefor the body-contents (not a string).
 
### Fix
* Issue #1: Promise-Helpers can be called from within Promise block-helpers.

## v0.1.2 - 2015-07-26
### Fix
* More test cases
* Fix partials handling

## v0.1.1 - 2015-07-26
### Fix
* More documentation, Caveats, Issues

## v0.1.0 - 2015-07-25
### Initial version

* Initial version