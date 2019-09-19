const { H, ec, random, ptsEql } = require('./utils')

// H
test('H is defined', () => {
  expect(H.x.toString(16, 64)).toBe('d208a940b893a52dc24d77b97e1d6f3deac0464368bdecbeaee442133d845606')
  expect(H.y.toString(16, 64)).toBe('671d627a3b6b1f6199aa6104aa5373cb6623e584231d077f2a43ebea08a430c2')
})

// pedersen commitment
test('Test pedersen commitments work', () => {
  // C = rH + aG
  const a1 = random(32)
  const r1 = random(32)
  const a2 = random(32)
  const r2 = random(32)
  const C1 = H.mul(r1).add(ec.curve.g.mul(a1))
  const C2 = H.mul(r2).add(ec.curve.g.mul(a2))
  const Csum = C1.add(C2)
  const check = H.mul(r1.add(r2)).add(ec.curve.g.mul(a1.add(a2)))
  expect(ptsEql(Csum, check)).toBeTruthy()
})

