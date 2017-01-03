Before submitting your PR, please be aware of the following:

* If you are submitting a feature, please also provide a should usage 
  example (a working JavaScript file for NodeJS that demonstrates your 
  use case). This file is best put into the `examples`-directory.

Most of the times, this is enough to start a discussion. In order for 
PR to get merged, it should include

* The actual code
* The usage example (in the `examples`-directory)
  * the example should be included, along the a prose explanatation, 
    in the file `.thought/partials/usage.md.hbs`.
  * `npm run thought` should be run to generate the actual documentation.
* A test-case for the feature.
* All other tests must pass and existing tests should not be modified.