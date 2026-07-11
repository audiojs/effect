# @audio/effect-exciter [![npm](https://img.shields.io/npm/v/@audio/effect-exciter)](https://www.npmjs.com/package/@audio/effect-exciter) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Exciter — psychoacoustic harmonic synthesis for presence/air

```
npm install @audio/effect-exciter
```

```js
import exciter from '@audio/effect-exciter'
```

Aphex-style aural exciter. Extracts the high band via SVF highpass, runs it through tanh saturation to synthesize harmonics, then mixes the harmonic residue back into the dry signal. Adds perceived "air" and "presence" without EQ boost.

**`freq`** highpass cutoff Hz (default 3000) · **`drive`** saturation amount 0–1 (default 0.5, maps to 1–10× gain) · **`amount`** mix-in level 0–1 (default 0.5) · **`fs`** sample rate

```js
import { exciter } from '@audio/effect'

let p = { freq: 4000, drive: 0.6, amount: 0.4, fs: 44100 }
for (let buf of stream) exciter(buf, p)
```

**Use when**: dull vocals, lifeless cymbals, mastering polish, restoring high-end after compression<br>
**Not for**: spectral shaping (use a shelf/EQ from `@audio/filter`) — exciter *adds* harmonics, not gain

<!-- ![Exciter](plot/exciter.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
