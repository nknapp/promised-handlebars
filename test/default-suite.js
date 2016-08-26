/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

/* global before */
/* global it */
// /* global xit */

'use strict'

// Chai Setup
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = chai.expect

module.exports = runDefaultSuite

function runDefaultSuite() {
  before(function () {
    // Handlebars = this.Handlebars
    setupHandlebars(this.Handlebars)
  })

  // Default test suite
  it('should return a promise for the ouput with helpers resolved', function (done) {
    var template = this.Handlebars.compile(fixture('simple-helper.hbs'))
    return expect(template({ a: 'abc', b: 'xyz' }))
      .to.eventually.equal('123 h(abc) 456 h(xyz)')
      .notify(done)
  })

  it('should work with block helpers that call `fn` while resolving a promise', function (done) {
    var template = this.Handlebars.compile(fixture('block-helper.hbs'))
    return expect(template({ a: 'abc', b: 'xyz' }))
      .to.eventually.equal('123 b(abc) 456\n123 bi(cba) 456')
      .notify(done)
  })

  it('should work with a helper being called from within a block helpers', function (done) {
    var template = this.Handlebars.compile(fixture('nested-helpers.hbs'))
    return expect(template({ a: 'abc', b: 'xyz' }))
      .to.eventually.equal('block b( h(abc) ) 45\ninverse bi( h(cba) ) 456')
      .notify(done)
  })

  it('should handle {{expr}} and {{{expr}}} like Handlebars does', function (done) {
    var template = this.Handlebars.compile(fixture('escaping.hbs'))
    return expect(template({ a: '<a>', b: '<b>' }))
      .to.eventually.equal('raw: <a> h(<a>)\nesc: &lt;a&gt; h(&lt;a&gt;)')
      .notify(done)
  })

  it('should work correctly when partials are called', function (done) {
    var template = this.Handlebars.compile(fixture('partials.hbs'))
    return expect(template({ a: 'aa', b: 'bb' }))
      .to.eventually.equal('h(partialA) 123 h(aa) h(partialB) 456 h(bb)')
      .notify(done)
  })

  it('the options.fn()-method should not return a promise for synchronous block helpers', function (done) {
    var template = this.Handlebars.compile(fixture('synchronous-block-helper.hbs'))
    return expect(template({}))
      .to.eventually.equal('abc,abc')
      .notify(done)
  })

  it('simple helpers should also be able to return real values', function (done) {
    var template = this.Handlebars.compile(fixture('synchronous-simple-helper.hbs'))
    return expect(template({}))
      .to.eventually.equal('27')
      .notify(done)
  })

  it('helpers passed in as parameters like {{#helper (otherhelper 123)}} should be resolved within the helper call', function (done) {
    var template = this.Handlebars.compile(fixture('helper-as-parameter.hbs'))
    return expect(template({}))
      .to.eventually.equal('index.js (1)\nondex.js (0)')
      .notify(done)
  })

  it('helpers passed into partials as parameters like {{>partial (helper 123)}} should be resolved within the helper call', function (done) {
    var template = this.Handlebars.compile(fixture('helper-as-parameter-for-partial.hbs'))
    return expect(template({}))
      .to.eventually.equal('id(h(abc))')
      .notify(done)
  })

  it('helpers passed in via as hash-parameter like {{#helper param=(otherhelper 123)}} should be resolved within the helper call', function (done) {
    var template = this.Handlebars.compile(fixture('helper-as-hash.hbs'))
    return expect(template({}))
      .to.eventually.equal('hash(false=h(false),true=h(true))')
      .notify(done)
  })
  it('async helpers nested in synchronous block-helpers should work', function (done) {
    var template = this.Handlebars.compile(fixture('synchronous-block-helper-nests-async.hbs'))
    return expect(template({ a: 'aa' }))
      .to.eventually.equal('h(aa),h(aa)')
      .notify(done)
  })
  it('async helpers nested in synchronous builtin block-helpers should work', function (done) {
    var template = this.Handlebars.compile(fixture('builtin-block-helper-nests-async.hbs'))
    return expect(template({ arr: [{ a: 'aa' }, { a: 'bb' }] }))
      .to.eventually.equal('h(aa)-h(bb)-')
      .notify(done)
  })

  it('a completely synchronous block helper (with synchronous resolvable content) not have to deal with placeholders', function (done) {
    var template = this.Handlebars.compile(fixture('block-helper-manipulate.hbs'))
    return expect(template({ arr: [{ a: 'aa' }, { a: 'bb' }] }))
      .to.eventually.equal('abc')
      .notify(done)
  })

  it('error helper', function (done) {
    var template = this.Handlebars.compile('{{#test}}{{/test}}');
    return expect(template({}))
      .to.eventually.equal('30')
      .notify(done)
  });
}

// Setup Handlebars helpers and partials
function setupHandlebars(Handlebars) {
  Handlebars.registerHelper({
    'helper': function (delay, value) {
      return promisedDelay(delay).then(function () {
        return 'h(' + value + ')'
      })
    },
    'stringifyRoot': function (options) {
      return JSON.stringify(options.data.root)
    },
    'helper-hash': function (options) {
      var hashString = Object.keys(options.hash).sort().map(function (key) {
        return key + '=' + options.hash[key]
      }).join(',')
      return new Handlebars.SafeString('hash(' + hashString + ')')
    },
    'block': function (delay, value, options) {
      return promisedDelay(delay)
        .then(function () {
          return options.fn(value)
        })
        .then(function (result) {
          return 'b(' + result + ')'
        })
    },
    'block-inverse': function (delay, value, options) {
      return promisedDelay(delay)
        .then(function () {
          return options.inverse(value)
        })
        .then(function (result) {
          return 'bi(' + result + ')'
        })
    },
    'block-context': function (options) {
      return Handlebars.Promise.resolve(options.fn(this))
    },
    'insert-twice': function (options) {
      return options.fn(this) + ',' + options.fn(this)
    },
    'times-three': function (number) {
      return 3 * number
    },
    'exists': function (file) {
      return promisedExists(file)
    },
    'toNumber': function (obj) {
      return '(' + Number(obj) + ')'
    },
    'spaces': function (count) {
      return '                                              '.substr(0, count)
    }
  })

  // Call "registerHelper(name, helper) for code coverage
  // Trim block contents
  Handlebars.registerHelper('trim', function (options) {
    return String(options.fn(this)).trim()
  })

  Handlebars.registerHelper('test', function (options) {
    return promisedDelay(100).then(function () {
      return new Handlebars.SafeString("30");
    });
  });

  Handlebars.registerPartial('a', "{{helper '10' 'partialA'}}")
  Handlebars.registerPartial('b', "{{helper '10' 'partialB'}}")
  Handlebars.registerPartial('identity', 'id({{.}})')

  function promisedExists(file) {
    return new Handlebars.Promise(function (resolve, reject) {
      require('fs').stat(file, function (err, result) {
        if (err) {
          resolve(false)
        }
        resolve(true)
      })
    })
  }

  function promisedDelay(delay) {
    return new Handlebars.Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(true)
      }, delay)
    })
  }
}

function fixture(file) {
  var fs = require('fs')
  return fs.readFileSync(require.resolve('./fixtures/' + file), { encoding: 'utf-8' }).trim()
}
