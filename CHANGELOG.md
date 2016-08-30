# Change Log

<a name="current-release"></a>
# Version 2.0.1 (Tue, 30 Aug 2016 21:10:12 GMT)

* [b9eaaa0](https://github.com/nknapp/promised-handlebars/commit/b9eaaa0) Support for Handlebars.SafeString (#27) - Nils Knappmeier
* [e805c22](https://github.com/nknapp/promised-handlebars/commit/e805c22) TravisCI: Add node 6, remove auto-deploy (#28) - Nils Knappmeier

# Version 2.0.0 (Thu, 28 Jul 2016 23:39:58 GMT)

Version 2.0.0 allows to configure the used Promise-library. The default is to the `global.Promise` this is considered a breaking change,
because the template now does not return a `Q.Promise` by default. If you want to use specific functions of `Q` on the template-result, 
you have to change your code to `var result = Q(template(input))` pass the `Q`-Promise constructor as `options.Promise`. 

The primary goal of this change was to allow `bluebird` to be used instead of `Q`, which is considered to increase performance.

* [baac5d5](https://github.com/nknapp/promised-handlebars/commit/baac5d5) Update comment in example-block-helper to match github API call - Joshua Estrin Skrzypek
* [fe5b4a2](https://github.com/nknapp/promised-handlebars/commit/fe5b4a2) Breaking change: Allow any Promises/A+ implementation - Joshua Estrin Skrzypek


# Version 1.0.6 (Thu, 21 Jul 2016 20:30:25 GMT)

* [022797e](https://github.com/nknapp/promised-handlebars/commit/022797e) Revert to pre-refactoring wrapper of the `compile`-function and `regi… (#15) - Nils Knappmeier

# Version 1.0.5 ...

* ... is equal to Version 1.0.3


# Version 1.0.4 (Sat, 16 Jul 2016 11:23:44 GMT)

* [975b7e7](https://github.com/nknapp/promised-handlebars/commit/975b7e7) Use "thoughtful-release" for version upgrades (#11) - Nils Knappmeier
* [7c33c38](https://github.com/nknapp/promised-handlebars/commit/7c33c38) Add "files" and "keywords" to package.json (#10) - Nils Knappmeier
* [a746477](https://github.com/nknapp/promised-handlebars/commit/a746477) Markers were not always resolved when block-helpers returned promise (#9) - Nils Knappmeier
* [f1dc2c9](https://github.com/nknapp/promised-handlebars/commit/f1dc2c9) Refactor for better readability (#8) - Nils Knappmeier

# Version 1.0.3 (Sun, 10 Jan 2016 22:13:28 GMT)

* [00c537e](https://github.com/nknapp/promised-handlebars/commit/00c537e) Run code-style hook and Thoughtful prior to commit - Nils Knappmeier
* [620919a](https://github.com/nknapp/promised-handlebars/commit/620919a) Call to Handlebars.registerHelper(string, function) to increase code coverage - Nils Knappmeier
* [eeb0e33](https://github.com/nknapp/promised-handlebars/commit/eeb0e33) Remove redundant function - Nils Knappmeier
* [d8b7ee2](https://github.com/nknapp/promised-handlebars/commit/d8b7ee2) Added Node 4 and 5 to Travis. Fix coverage tests. Add badges for Travis and Coveralls - Nils Knappmeier


## v1.0.2 - 2015-10-30 

* Documentation fix

## v1.0.1 - 2015-10-30

## Fix

* Allow `handlebars@4` as peer-dependencies (not just 3) 

This project adheres to [Semantic Versioning](http://semver.org/).

## v1.0.0 - 2015-09-15

* Bump version to 1.0.0 to show API stability

## v0.4.2 - 2015-08-17

### Fix

* Documentation update

## v0.4.1 - 2015-08-16

### Fix

* Documentation update
* Check for `.done()` function when trying to retrieve the immediate value of a promise.
  
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
