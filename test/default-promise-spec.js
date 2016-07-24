/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global after */
/* global before */
/* global describe */
/* global it */
// /* global xdescribe */
// /* global xit */

'use strict'

var promisedHandlebars = require('../')
var promiseName = 'default Promise'
// Chai Setup
var chai = require('chai')
var expect = chai.expect

describe('promised-handlebars: ', function () {
  if (global.Promise) {
    describe('running with ' + promiseName, function () {
      it('should not throw when global.Promise is defined', function () {
        expect(function () { promisedHandlebars(require('handlebars')) }).to.not.throw()
      })
    })
    describe('using ' + promiseName, function () {
      before(function () {
        this.Handlebars = promisedHandlebars(require('handlebars'))
      })
      after(function () {
        delete this.Handlebars
      })
      require('./default-suite')()
    })
  } else {
    describe('running with ' + promiseName, function () {
      it('should throw when Promise is not defined', function () {
        expect(function () { promisedHandlebars(require('handlebars')) }).to.throw()
      })
    })
  }
})
