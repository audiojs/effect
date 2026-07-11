# @audio/effect-mixer [![npm](https://img.shields.io/npm/v/@audio/effect-mixer)](https://www.npmjs.com/package/@audio/effect-mixer) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Mixer — sums multiple buffers with gains

```
npm install @audio/effect-mixer
```

```js
import mixer from '@audio/effect-mixer'
```

Sums an array of buffers with individual gain multipliers.

**`channels`** array of `{ buffer, gain }` objects

```js
import { mixer } from '@audio/effect'

let out = mixer([
  { buffer: drums,  gain: 0.8 },
  { buffer: bass,   gain: 0.7 },
  { buffer: synth,  gain: 0.5 },
])
```

**Use when**: combining signals, bus summing, stem mixing

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
