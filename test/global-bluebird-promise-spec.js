/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global after */
/* global before */
/* global describe */
// /* global xit */
// /* global xdescribe */
/* global it */

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
    it('Handlebars.Promise.version should match bluebird package\'s semver', function () {
      var bluebirdVersion = require('bluebird/package').version
      expect(this.Handlebars.Promise.version).to.equal(bluebirdVersion)
    })
  })
  describe('using ' + promiseName, function () {
    require('./default-suite')()
  })
})
