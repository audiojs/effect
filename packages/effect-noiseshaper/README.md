# @audio/effect-noiseshaper [![npm](https://img.shields.io/npm/v/@audio/effect-noiseshaper)](https://www.npmjs.com/package/@audio/effect-noiseshaper) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Noise shaping — error-feedback dithering for bit-depth reduction

```
npm install @audio/effect-noiseshaper
```

```js
import noiseShaping from '@audio/effect-noiseshaper'
```

Error-feedback quantization — shapes quantization noise out of the audible band.

**`bits`** target bit depth (default 16)

```js
import { noiseShaping } from '@audio/effect'

for (let buf of stream) noiseShaping(buf, { bits: 16 })
```

**Use when**: dithering before bit-depth reduction, quantization to lower bit depths<br>
**Not for**: audio compression (unrelated to lossy codecs)

<!-- ![Noise shaping](plot/noise-shaping.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
