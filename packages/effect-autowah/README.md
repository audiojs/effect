# @audio/effect-autowah [![npm](https://img.shields.io/npm/v/@audio/effect-autowah)](https://www.npmjs.com/package/@audio/effect-autowah) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Auto-wah — envelope follower drives resonant bandpass cutoff

```
npm install @audio/effect-autowah
```

```js
import autoWah from '@audio/effect-autowah'
```

Envelope follower drives a resonant bandpass filter — signal level controls the sweep.

**`base`** minimum cutoff Hz (default 300) · **`range`** sweep range Hz (default 3000) · **`Q`** resonance (default 5) · **`attack`** envelope attack seconds (default 0.002) · **`release`** envelope release seconds (default 0.1) · **`sens`** input sensitivity multiplier (default 2) · **`fs`** sample rate

```js
import { autoWah } from '@audio/effect'

let p = { base: 300, range: 3000, Q: 5, sens: 2, fs: 44100 }
for (let buf of stream) autoWah(buf, p)
```

**Use when**: funk guitar, touch-sensitive filter sweeps, envelope filter<br>
**Not for**: LFO-driven wah (use wah with `mode: 'auto'`)

<!-- ![Auto-wah](plot/auto-wah.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
