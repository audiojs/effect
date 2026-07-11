# @audio/effect-phaser [![npm](https://img.shields.io/npm/v/@audio/effect-phaser)](https://www.npmjs.com/package/@audio/effect-phaser) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Phaser — cascade of swept first-order allpass filters creating moving notches/peaks

```
npm install @audio/effect-phaser
```

```js
import phaser from '@audio/effect-phaser'
```

Cascade of swept allpass filters creating moving notches and peaks.

**`rate`** LFO rate in Hz (default 0.5) · **`depth`** sweep depth 0–1 (default 0.7) · **`stages`** allpass stages (default 4) · **`feedback`** 0–1 (default 0.5) · **`fc`** center frequency Hz (default 1000) · **`fs`** sample rate

```js
import { phaser } from '@audio/effect'

let p = { rate: 0.5, depth: 0.7, stages: 4, feedback: 0.5, fc: 1000, fs: 44100 }
for (let buf of stream) phaser(buf, p)
```

**Use when**: electric guitar, synth pads, vintage phase effects<br>
**Not for**: spatial positioning (use stereoWidener or haas)

<!-- ![Phaser](plot/phaser.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
