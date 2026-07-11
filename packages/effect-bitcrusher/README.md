# @audio/effect-bitcrusher [![npm](https://img.shields.io/npm/v/@audio/effect-bitcrusher)](https://www.npmjs.com/package/@audio/effect-bitcrusher) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Bitcrusher — sample-rate reduction + bit-depth quantization

```
npm install @audio/effect-bitcrusher
```

```js
import bitcrusher from '@audio/effect-bitcrusher'
```

Sample-rate reduction (zero-order hold) + bit-depth quantization.

**`bits`** target bit depth 1–24 (default 8) · **`rate`** sample rate ratio 0–1 (default 0.25, quarter rate) · **`fs`** sample rate

```js
import { bitcrusher } from '@audio/effect'

// 8-bit, quarter sample rate (lo-fi)
let p = { bits: 8, rate: 0.25, fs: 44100 }
for (let buf of stream) bitcrusher(buf, p)

// Bit depth only, no rate reduction
bitcrusher(buf, { bits: 4, rate: 1 })
```

**Use when**: lo-fi aesthetics, game audio, retro console sound, stutter effects<br>
**Not for**: smooth saturation (use distortion)

<!-- ![Bitcrusher](plot/bitcrusher.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
