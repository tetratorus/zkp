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

// C = rH + aG
test('Test pedersen commitments work', () => {
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

// C1 = r1.H + xvec1.Gvec
// C2 = r2.H + xvec2.Gvec
// ...
// Cm = rm.H + xvecm.Gvec
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

  // P -> V: C0 (new commitment to a random vector)
  r.unshift(random(32)) // r0
  let x0 = []
  for (let j = 0; j < N; j++) {
    x0.push(random(32))
  }
  let x0vec = new Vector(x0)
  x.unshift(x0vec)
  C.unshift(H0.mul(r[0]).add(x0vec.innerProduct(Gvec(N))))

  // V -> P: e
  let e = random(32)

  // P -> V: (zvec, s)
  let evec = genExpVec(e, m)
  let zvec = new Vector(Array.from(Array(N)).map(() => ec.curve.point(null, null)))
  evec.values.map(function(elem, index) {
    zvec = zvec.ops(x[index].mul(elem), (a, b) => a.add(b))
  })
  let s = new BN(0)
  evec.values.map(function(elem, index) {
    s = s.add(elem.mul(r[index]))
  })

  // SUM(e^i . Ci) ?= sH + zvec.Gvec
  let eC = ec.curve.point(null, null)
  evec.values.map(function(elem, index) {
    eC = eC.add(C[index].mul(elem))
  })

  let rhs = H0.mul(s).add(zvec.innerProduct(Gvec(N)))
  expect(ptsEql(eC, rhs)).toBe(true)

  // Correctness
  // sH + zvec.Gvec = SUM(e^i(ri.H) + SUM(e^i(xivec.Gvec))
  // = SUM(e^i(ri.H + xivec.Gvec))
  // = SUM(e^i.Ci)

  // Zero knowledge
  // choose C0 = (sH + zvec.Gvec) - SUM(e^-i . Ci)
  // still correctly validates

  // Soundness
  // run protocol m+1 times with m+1 different values of e
  // i.e. (C0_1, e1, (z1, s1))
  //      (C0_2, e2, (z2, s2))
  //      ...
  //      (C0_m, em, (zm, sm))
  //
  // get the inverse of the Vandemonde matrix (V) of ei
  // i.e. [1, e0, e0^2, ... e0^m ]
  //      [1, e1, e1^2, ... e1^m ]  = Ainverse
  //      ...
  //      [1, em, em^2, ... em^m ]
  // A x V = Identity matrix (I)
  //
  // then, 
  // Ch (for h in [1, m]) = SUMi(∂hi . Ci)
  // = SUMi(SUMj(ahj . ej^i) . Ci) , where ahj is the h,j element from A
  // = SUMj(ahj) . SUMi(ej^i . Ci)
  // = SUMj(ahj) . SUMi(ej^i . (riH + xivec.Gvec))
  // = SUMj(ahj) . SUMi(ej^i . ri . H) + SUMj(ahj) . SUMi(ej^i . (xivec.Gvec))
  // = SUMj(ahj . sj . H) + SUMj(ahj . (zjvec.Gvec))
  // this form shows that Ch is a commitment to SUMj(ahj.zjvec) with randomness SUMj(ahj.sj)
  // xhvec = SUMj(ahj.zjvec) 
})

test('Inner product proof, z = xvec . yvec', () => {
  let vectorLength = 3
  // setup
  let H0 = H(0)
  let G0 = G(0)
  let xvec = new Vector(Array.from(Array(vectorLength)).map(() => random(32)))
  let yvec = new Vector(Array.from(Array(vectorLength)).map(() => random(32)))
  let z = xvec.innerProduct(yvec)
  let t = random(32) 
  let r = random(32) 
  let s = random(32) 
  // broadcast Cz, Cx, Cy, later we prove they satisfy inner product relation
  let Cz = H0.mul(t).add(G0.mul(z))
  let Cx = H0.mul(r).add(xvec.innerProduct(Gvec(vectorLength)))
  let Cy = H0.mul(s).add(yvec.innerProduct(Gvec(vectorLength)))
  
  // we dont send commitments of x and y themselves,
  // instead, we use a commitment to a blinding factor (much like the value of R = g^k in Schnorr)
  let dx  = new Vector(Array.from(Array(vectorLength)).map(() => random(32)))
  let dy  = new Vector(Array.from(Array(vectorLength)).map(() => random(32)))
  let rd = random(32)
  let sd = random(32)
  // Ad = rd.H + dxvec.Gvec
  // Bd = sd.H + dyvec.Gvec
  let Ad = H0.mul(rd).add(dx.innerProduct(Gvec(vectorLength)))
  let Bd = H0.mul(sd).add(dy.innerProduct(Gvec(vectorLength)))

  // Since later on we will need to prove things about the inner product
  // but we sent a blinded value, we will need to commit to the expected
  // coefficients of the inner product of the *blinded form* of our vectors
  // which will be some kind of polynomial a.e^2 + b.e + c
  // ... we already have Cz, which is the expected coefficient on e^2, so skip that
  // now we just need to construct two more commitments
  // C1 = t1.H + (xvec.dy + yvec.dx).G
  // C0 = t1.H + (dy.dx).G
  let t1 = random(32)
  let t0 = random(32)
  let C1 = H0.mul(t1).add(G0.mul(xvec.innerProduct(dy).add(yvec.innerProduct(dx))))
  let C0 = H0.mul(t0).add(G0.mul(dx.innerProduct(dy)))

  // verifier sends a challenge, e
  let e = random(32)

  // send blinded forms of the x, y vectors and rd, sd scalars
  // fx = xvec.e + dx
  // fy = yvec.e + dy
  // rx = r.e + rd
  // sy = s.e + sd
  let add = (a,b) => a.add(b)
  let fx = xvec.mul(e).ops(dx, add)
  let fy = yvec.mul(e).ops(dy, add)
  let rx = e.mul(r).add(rd)
  let sy = e.mul(s).add(sd)
  // Comm(fx.fy) = e^2.Cz + e.(Comm(x.dy + y.dx)) + Comm(dx.dy)
  let tz = e.pow(new BN(2)).mul(t).add(e.mul(t1)).add(t0)

  expect(ptsEql(Cx.mul(e).add(Ad), H0.mul(rx).add(fx.innerProduct(Gvec(vectorLength))))).toBe(true)
  expect(ptsEql(Cy.mul(e).add(Bd), H0.mul(sy).add(fy.innerProduct(Gvec(vectorLength))))).toBe(true)
  // fx.fy = e^2.z + e.(x.dy + y.dx) + dx.dy
  expect(fx.innerProduct(fy).umod(ec.curve.n).eq(
    e.pow(new BN(2)).mul(z).add(e.mul(xvec.innerProduct(dy).add(yvec.innerProduct(dx)))).add(dx.innerProduct(dy)).umod(ec.curve.n)
  )).toBe(true)
  // tzH + (fx.fy)G ?= e^2.Cz + eC1 + C0
  expect(ptsEql(H0.mul(tz).add(G0.mul(fx.innerProduct(fy))), Cz.mul(e.pow(new BN(2))).add(C1.mul(e)).add(C0))).toBe(true)
})

