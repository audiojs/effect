# @audio/effect-distortion [![npm](https://img.shields.io/npm/v/@audio/effect-distortion)](https://www.npmjs.com/package/@audio/effect-distortion) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Distortion / saturation — non-linear waveshaping

```
npm install @audio/effect-distortion
```

```js
import distortion from '@audio/effect-distortion'
```

Four waveshaping types: cubic soft clip, hard clip, tanh saturation, and wavefolding.

**`drive`** distortion amount 0–1 (default 0.5, maps to 1–10× input gain) · **`type`** `'soft'` | `'hard'` | `'tanh'` | `'foldback'` (default `'soft'`) · **`mix`** wet/dry 0–1 (default 1) · **`fs`** sample rate

```js
import { distortion } from '@audio/effect'

// Soft saturation
let p = { drive: 0.6, type: 'soft', fs: 44100 }
for (let buf of stream) distortion(buf, p)

// Hard clip
distortion(buf, { drive: 0.8, type: 'hard' })

// Tanh (asymptotically smooth, never clips hard)
distortion(buf, { drive: 0.5, type: 'tanh' })

// Wavefolding (metallic/harsh)
distortion(buf, { drive: 0.7, type: 'foldback' })
```

| type | character | clamps at ±1 |
|---|---|---|
| `soft` | cubic saturation, smooth knee | yes |
| `hard` | brickwall clip, harsh | yes |
| `tanh` | asymptotically smooth | approaches 1 |
| `foldback` | metallic, complex harmonics | yes |

**Use when**: guitar overdrive, tube saturation, lo-fi crunch, harmonic enrichment<br>
**Not for**: transparent limiting (use limiter)

<!-- ![Distortion types](plot/distortion.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
