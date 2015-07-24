/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global describe */
/* global it */
// /* global xdescribe */
// /* global xit */

'use strict'

var promisedHandlebars = require('../')
var Q = require('q')
var expect = require('chai').expect

describe('promised-handlebars:', function () {
  it('should return a promise for the ouput with helpers resolved', function (done) {
    var Handlebars = promisedHandlebars(require('handlebars'))
    Handlebars.registerHelper('p', function (value) {
      return Q.delay(100).then(function () {
        return value
      })
    })
    Handlebars.compile('123{{p a}}456{{p b}}')({ a: 'abc', b: 'xyz'}).then(
      function ( result) {
        expect(result).to.equal('123abc456xyz')
      }).done(done)
  })

})
