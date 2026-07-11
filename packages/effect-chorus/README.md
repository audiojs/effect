# @audio/effect-chorus [![npm](https://img.shields.io/npm/v/@audio/effect-chorus)](https://www.npmjs.com/package/@audio/effect-chorus) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Chorus — multiple detuned delay lines for ensemble thickening

```
npm install @audio/effect-chorus
```

```js
import chorus from '@audio/effect-chorus'
```

Multiple detuned delay voices layered over dry signal — ensemble thickening.

**`rate`** LFO rate in Hz (default 1.5) · **`depth`** modulation depth 0–1 (default 0.5) · **`delay`** center delay in seconds (default 0.02) · **`voices`** number of chorus voices (default 3) · **`fs`** sample rate

```js
import { chorus } from '@audio/effect'

let p = { rate: 1.5, depth: 0.5, delay: 0.02, voices: 3, fs: 44100 }
for (let buf of stream) chorus(buf, p)
```

**Use when**: thickening strings, vocals, synth pads<br>
**Not for**: transparent processing (adds modulation artifacts)

<!-- ![Chorus](plot/chorus.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
