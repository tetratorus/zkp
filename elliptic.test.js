const { G, H, ec, random, ptsEql, Vector } = require('./utils')
const BN = require('bn.js')
const fixtures = require('./fixtures.json')

// G
test('G generates', () => {
  expect(G(0).x.toString(16, 64)).toBe(ec.curve.g.x.toString(16, 64))
  expect(G(0).y.toString(16, 64)).toBe(ec.curve.g.y.toString(16, 64))
  for (let i = 0; i < 10; i++) {
    expect(G(i).x.toString(16, 64)).toBe(fixtures.G[i][0])
    expect(G(i).y.toString(16, 64)).toBe(fixtures.G[i][1])
  }
})

// H
test('H generates', () => {
  for (let i = 0; i < 10; i++) {
    expect(H(i).x.toString(16, 64)).toBe(fixtures.H[i][0])
    expect(H(i).y.toString(16, 64)).toBe(fixtures.H[i][1])
  }
})

// Vector
test('Vectors work', () => {
  let vals = [new BN(1), new BN(2), new BN(3)]
  let vec = new Vector(vals)
  expect(vec.values).toHaveLength(3)
  let otherVals = [new BN(1), new BN(2), new BN(3)]
  let otherVec = new Vector(otherVals)
  let innerProd = vec.innerProduct(otherVec)
  expect(innerProd.toString(10)).toBe('14')
})

// Pedersen commitment
test('Test pedersen commitments work', () => {
  // C = rH + aG
  const a1 = random(32)
  const r1 = random(32)
  const a2 = random(32)
  const r2 = random(32)
  const C1 = H(1).mul(r1).add(ec.curve.g.mul(a1))
  const C2 = H(1).mul(r2).add(ec.curve.g.mul(a2))
  const Csum = C1.add(C2)
  const check = H(1).mul(r1.add(r2)).add(ec.curve.g.mul(a1.add(a2)))
  expect(ptsEql(Csum, check)).toBe(true)
})

