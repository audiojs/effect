# @audio/effect-gain [![npm](https://img.shields.io/npm/v/@audio/effect-gain)](https://www.npmjs.com/package/@audio/effect-gain) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Gain — simple level adjustment in dB

```
npm install @audio/effect-gain
```

```js
import gain from '@audio/effect-gain'
```

Simple level adjustment in decibels.

**`dB`** gain in dB (default 0)

```js
import { gain } from '@audio/effect'

for (let buf of stream) gain(buf, { dB: -6 })
```

<!-- ![Gain](plot/gain.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
