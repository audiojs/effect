# @audio/effect-flanger [![npm](https://img.shields.io/npm/v/@audio/effect-flanger)](https://www.npmjs.com/package/@audio/effect-flanger) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Flanger — modulated short delay with feedback

```
npm install @audio/effect-flanger
```

```js
import flanger from '@audio/effect-flanger'
```

Modulated short delay (1–10 ms) with feedback — creates comb filter sweep.

**`rate`** LFO rate in Hz (default 0.3) · **`depth`** modulation depth 0–1 (default 0.7) · **`delay`** center delay in seconds (default 0.003) · **`feedback`** 0–1 (default 0.5) · **`fs`** sample rate

```js
import { flanger } from '@audio/effect'

let p = { rate: 0.3, depth: 0.7, delay: 0.003, feedback: 0.5, fs: 44100 }
for (let buf of stream) flanger(buf, p)
```

**Use when**: jet sweeps, metallic modulation, guitar/bass<br>
**Not for**: subtle pitch modulation (use vibrato)

<!-- ![Flanger](plot/flanger.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
