# @audio/effect-vibrato [![npm](https://img.shields.io/npm/v/@audio/effect-vibrato)](https://www.npmjs.com/package/@audio/effect-vibrato) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Vibrato — pitch modulation via modulated delay line

```
npm install @audio/effect-vibrato
```

```js
import vibrato from '@audio/effect-vibrato'
```

Pitch modulation via modulated delay line — periodic pitch wobble.

**`rate`** LFO rate in Hz (default 5) · **`depth`** modulation depth 0–1, scales a max ~6ms delay-time swing (default 0.5) · **`fs`** sample rate

```js
import { vibrato } from '@audio/effect'

let p = { rate: 5, depth: 0.5, fs: 44100 }
for (let buf of stream) vibrato(buf, p)
```

**Use when**: vocal vibrato, string wobble, instrument simulation<br>
**Not for**: amplitude variation (use tremolo)

<!-- ![Vibrato](plot/vibrato.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
