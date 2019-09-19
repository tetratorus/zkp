const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const createKeccakHash = require('keccak')
const BN = require('bn.js')
const crypto = require('crypto')
// const H = ecBNToPoint(new BN(createKeccakHash('keccak256')
//   .update(ec.curve.g.x.toString('hex'))
//   .digest('hex'), 16))

const G = (function() {
  const cache = {
    0: ec.curve.g
  }
  const getG = function(num) {
    if (cache[num]) {
      return cache[num]
    } else {
      cache[num] = ecBNToPoint(new BN(createKeccakHash('keccak256')
        .update(getG(num - 1).x.toString('hex'))
        .digest('hex'), 16))
      return cache[num]
    }
  }
  return getG
})()

const H = (function() {
  const cache = {}
  const getH = function(num) {
    if (num === -1) {
      return ec.curve.g
    } else if (cache[num]) {
      return cache[num]
    } else {
      cache[num] = ecBNToPoint(new BN(createKeccakHash('keccak256')
        .update(getH(num - 1).x.toString('hex') + 'H')
        .digest('hex'), 16))
      return cache[num]
    }
  }
  return getH
})()

function ecBNToPoint(bn) {
  while (true) {
    try {
      return ec.curve.pointFromX(bn.toString(16, 64))
    } catch (e) {
      bn = bn.add(new BN(1))
    }
  }
}

function random(bytes) {
  do {
    var k = new BN(crypto.randomBytes(bytes))
  } while (k.toString() === '0' && k.gcd(ec.curve.n).toString() !== '1')
  return k
}

function ptsEql(pt1, pt2) {
  return pt1.x.toString(16, 64) === pt2.x.toString(16, 64) && pt1.y.toString(16, 64) === pt2.y.toString(16, 64)
}

function Vector(values) {
  if (!Array.isArray(values)) {
    throw new Error('Vector cannot be created without array of values')
  }
  this.values = values
}

Vector.prototype.constructor = Vector

Vector.prototype.combine = function(vector, operation) {
  if (!(vector instanceof Vector)) {
    throw new Error('innerProduct can only be between vectors')    
  }
  if (vector.values.length !== this.values.length) {
    throw new Error('innerProduct can only multiply two same length vectors')
  }
  if (typeof operation !== 'function') {
    throw new Error('operation must be a function')
  }
  if (operation.length !== 2) {
    throw new Error('operation must accept two arguments')
  }
  const resVal = []
  for (let i = 0; i < this.values.length; i++) {
    resVal.push(operation(this.values[i], vector.values[i]))
  }
  return new Vector(resVal)
}

Vector.prototype.apply = function(operation) {
  if (typeof operation !== 'function') {
    throw new Error('operation must be a function')
  }
  if (operation.length !== 1) {
    throw new Error('operation must accept one argument')
  }
  for (let i = 0; i < this.values.length; i++) {
    this.values[i] = operation(this.values[i])
  }
  return this
}

Vector.prototype.innerProduct = function(vector) {
  if (!(vector instanceof Vector)) {
    throw new Error('innerProduct can only be between vectors')
  }
  if (vector.values.length !== this.values.length) {
    throw new Error('innerProduct can only multiply two same length vectors')
  }
  var resVals = []
  const isPoint = val => typeof val === 'object' && val.x != undefined && val.y != undefined
  const isBN = val => BN.isBN(val)
  for (let i = 0; i < this.values.length; i++) {
    // Cases:
    if (isPoint(this.values[i]) && isBN(vector.values[i])) {
    // scalars . points
      resVals.push(this.values[i].mul(vector.values[i]))
    } else if (isBN(this.values[i]) && isPoint(vector.values[i])) {
    // points . scalars
      resVals.push(vector.values[i].mul(this.values[i]))
    } else if (isBN(this.values[i]) && isBN(vector.values[i])) {
    // scalars . scalars
      resVals.push(this.values[i].mul(vector.values[i]))
    }
  }
  if (isPoint(resVals[0])) {
    return resVals.reduce(function(acc, curr) {
      if (!acc) {
        return curr
      } else {
        return acc.add(curr)
      }
    }, null)
  } else if (isBN(resVals[0])) {
    return resVals.reduce(function(acc, curr) {
      if (!acc) {
        return curr
      } else {
        return acc.add(curr)
      }
    }, null)
  }

}

module.exports = {
  ec,
  G,
  H,
  ptsEql,
  random,
  Vector
}