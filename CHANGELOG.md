# Change Log

This project adheres to [Semantic Versioning](http://semver.org/).

### Fix

* Documentation update

## v0.4.0 - 2015-08-16

### Fix

* In a completely synchronous setup, a block helper is now guaranteed to receive the real string
  from `options.fn()` containing no promises. It can therefore modify the string (without 
  the risk of dealing with placeholders)
  
### Change

* Helper arguments are not resolved with `q-deep` anymore, because this is to slow in large template
  structures with large datasets. Instead, only each parameter (but no recursively) and each hash-arguments
  is resolved.

## v0.3.4 - 2015-08-06
### Fix
* Resolve helper arguments with `q-deep` rather than `Q.all`, so that hash-arguments are
  resolved as well.

## v0.3.3 - 2015-08-01
### Fix 
* Make sure that builtin block-helpers (`#each`, `#if`) are also wrapped appropriately to work with
  promise-helpers inside their blocks
* Issue #3: Allow async helpers as arguments to other helpers (`{{#each (helper)}}abc{{/each}}`)

## v0.3.2 - 2015-07-30
### Fix

* Allow async-helpers inside synchronous block-helpers
* Added missing dependency on `q`

## v0.3.1 - 2015-07-28

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