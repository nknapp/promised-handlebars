/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global after */
/* global before */
/* global describe */
// /* global xdescribe */

'use strict'

var promisedHandlebars = require('../')
var promiseName = 'bluebird'
describe('promised-handlebars: ', function () {
  describe('using ' + promiseName, function () {
    before(function () {
      this.Handlebars = promisedHandlebars(require('handlebars'), { Promise: require('bluebird') })
    })
    after(function () {
      delete this.Handlebars
    })
    require('./default-suite')()
  })
})
