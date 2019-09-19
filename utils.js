const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const createKeccakHash = require('keccak')
const BN = require('bn.js')
const crypto = require('crypto')
const H = ecBNToPoint(new BN(createKeccakHash('keccak256')
    .update(ec.curve.g.x.toString('hex'))
    .digest('hex'), 16))

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

module.exports = {
  H,
  ec,
  random,
  ptsEql
}