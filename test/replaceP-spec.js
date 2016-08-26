/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

// /* global after */
// /* global before */
/* global describe */
// /* global xdescribe */
/* global it */

'use strict'

var replaceP = require('../lib/replaceP')(require('bluebird'))
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = chai.expect

describe('replaceP: ', function () {
  it('should behave like String.prototype.replace for string replacements', function () {
    return expect(replaceP('abcde', /([bd])./g, '$1x')).to.eventually.equal('abxdx')
  })

  it('should behave like String.prototype.replace for functions returning strings', function () {
    function replacer (match, p1, offset, string) {
      expect(string).to.equal('abcdef')
      return match + '(' + p1 + ',' + offset + ')'
    }

    // Check fixture againt String.prototype.replace to make sure the test is correct
    expect('abcdef'.replace(/([bd])./g, replacer)).to.equal('abc(b,1)de(d,3)f')
    // Actual "expect"
    return expect(replaceP('abcdef', /([bd])./g, replacer)).to.eventually.equal('abc(b,1)de(d,3)f')
  })

  it('should be able to handle promises returned by the replacer', function () {
    function replacer (match, p1, offset, string) {
      expect(string).to.equal('abcdef')
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve(match + '(' + p1 + ',' + offset + ')')
        }, 10)
      })
    }

    return expect(replaceP('abcdef', /([bd])./g, replacer)).to.eventually.equal('abc(b,1)de(d,3)f')
  })
})
