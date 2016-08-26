/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global after */
/* global before */
/* global describe */
// /* global it */
// /* global xdescribe */
/* global xit */

'use strict'

var promisedHandlebars = require('../')
var promiseName = 'global bluebird Promises'

// Chai Setup
var chai = require('chai')
var expect = chai.expect

describe('promised-handlebars:', function () {
  before(function () {
    global.Promise = require('bluebird')
    this.Handlebars = promisedHandlebars(require('handlebars'))
  })
  after(function () {
    Promise.noConflict()
    delete this.Handlebars
  })
  describe('running with ' + promiseName, function () {
    xit('Handlebars.Promise.version should match bluebird package\'s semver', function () {
      // var bluebirdVersion = require('bluebird/package').version
      // The version string provided by require('bluebird').version is out of date in the
      // latest version of the module. For now the test needs to hardcode the value.
      expect(this.Handlebars.Promise.version).to.equal('3.4.0' /* bluebirdVersion */)
    })
  })
  describe('using ' + promiseName, function () {
    require('./default-suite')()
  })
})
