const { ec, genExpVec, G, Gvec, H, ptsEql, random, Vector } = require('./utils')
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

test('Interactive proof that we know openings of m vectors', () => {
  let m = 2
  let N = 3
  let C = []
  let r = []
  let x = []
  let H0 = H(0)
  for (let i = 0; i < m; i++) {
    let ri = random(32)
    r.push(ri)
    let xi = []
    for (let j = 0; j < N; j++) {
      xi.push(random(32))
    }
    let xivec = new Vector(xi)
    x.push(xivec)
    C.push(H0.mul(ri).add(xivec.innerProduct(Gvec(N))))
  }

  r.unshift(random(32)) // r0
  let x0 = []
  for (let j = 0; j < N; j++) {
    x0.push(random(32))
  }
  let x0vec = new Vector(x0)
  x.unshift(x0vec)
  C.unshift(H0.mul(r[0]).add(x0vec.innerProduct(Gvec(N))))

  let e = random(32)
  let evec = genExpVec(e, m)
  let z = new Vector(Array.from(Array(N)).map(() => ec.curve.point(null, null)))
  evec.values.map(function(elem, index) {
    z = z.ops(x[index].mul(elem), (a, b) => a.add(b))
  })
  let s = new BN(0)
  evec.values.map(function(elem, index) {
    s = s.add(elem.mul(r[index]))
  })

  let eC = ec.curve.point(null, null)
  evec.values.map(function(elem, index) {
    eC = eC.add(C[index].mul(elem))
  })

  let rhs = H0.mul(s).add(z.innerProduct(Gvec(N)))
  expect(ptsEql(eC, rhs)).toBe(true)

})

