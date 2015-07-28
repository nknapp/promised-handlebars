# Change Log

This project adheres to [Semantic Versioning](http://semver.org/).

## Upcoming

* Documentation update

## v0.3.0 - 2015-07-28
### Change

* Revert the use of `registerPromiseHelper` and overwrite `registerHelper` again. 
  The return-value of `options.fn` et.al. was and is different from the entry for version `v0.2.0`:
  The `options.fn` and `options.inverse` functions only return promises if they are called
  asynchronously. Since helper-librarries for Handlebars would not do that, the `registerPromiseHelper`
  method is still compatible to `registerHelper`, so `registerHelper` can as well be replaced. 

## v0.2.1 - 2015-07-26
### Fix

* Issue #2: Escaping of promise return value is now done properly 

## v0.2.0 - 2015-07-26
### Change
* `registerHelper` is not overwritten anymore. Instead, a new method `registerPromiseHelper`
  is added to Handlebars
* for block-helpers registered with `registerPromiseHelper`, the `options.fn`- and `options.inverse`-functions
  always return a promise for the body-contents (not a string).
 
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