/*!
 * promised-handlebars <https://github.com/nknapp/promised-handlebars>
 *
 * Copyright (c) 2015 Nils Knappmeier.
 * Released under the MIT license.
 */

'use strict'

module.exports = {
  wrap: wrap,
  mapValues: mapValues,
  values: values,
  anyApplies: anyApplies,
  toArray: toArray,
  isPromiseAlike: isPromiseAlike
}

/**
 * Wrap a function with a wrapper function
 * @param {function} fn the original function
 * @param {function(function,array)} wrapperFunction the wrapper-function
 *   receiving `fn` as first parameter and the arguments as second
 * @returns {function} a function that calls the wrapper with
 *   the original function and the arguments
 */
function wrap (fn, wrapperFunction) {
  return function () {
    return wrapperFunction.call(this, fn, toArray(arguments))
  }
}

/**
 * Apply the mapFn to all values of the object and return a new object with the applied values
 * @param obj the input object
 * @param {function(any, string, object): any} mapFn the map function (receives the value, the key and the whole object as parameter)
 * @returns {object} an object with the same keys as the input object
 */
function mapValues (obj, mapFn) {
  return Object.keys(obj).reduce(function (result, key) {
    result[key] = mapFn(obj[key], key, obj)
    return result
  }, {})
}

/**
 * Return the values of the object
 * @param {object} obj an object
 * @returns {Array} the values of the object
 */
function values (obj) {
  return Object.keys(obj).map(function (key) {
    return obj[key]
  })
}

/**
 * Check if the predicate is true for any element of the array
 * @param {Array} array
 * @param {function(any):boolean} predicate
 * @returns {boolean}
 */
function anyApplies (array, predicate) {
  for (var i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
      return true
    }
  }
  return false
}

/**
 * Convert arrayLike-objects (like 'arguments') to an array
 * @param arrayLike
 * @returns {Array.<T>}
 */
function toArray (arrayLike) {
  return Array.prototype.slice.call(arrayLike)
}

/**
 * Test an object to see if it is a Promise
 * @param   {Object}  obj The object to test
 * @returns {Boolean}     Whether it's a PromiseA like object
 */
function isPromiseAlike (obj) {
  if (obj == null) {
    return false
  }
  return (typeof obj === 'object') && (typeof obj.then === 'function')
}
