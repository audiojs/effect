# @audio/effect-wah [![npm](https://img.shields.io/npm/v/@audio/effect-wah)](https://www.npmjs.com/package/@audio/effect-wah) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Wah-wah — swept resonant bandpass filter

```
npm install @audio/effect-wah
```

```js
import wah from '@audio/effect-wah'
```

Swept resonant bandpass filter — auto (LFO) or fixed frequency mode.

**`rate`** LFO rate in Hz (default 1.5) · **`depth`** sweep depth in octaves, 0–3 (default 0.8) · **`fc`** center frequency Hz (default 1000) · **`Q`** resonance (default 5) · **`mode`** `'auto'` LFO or `'manual'` fixed (default `'auto'`) · **`fs`** sample rate

```js
import { wah } from '@audio/effect'

let p = { rate: 1.5, depth: 0.8, fc: 1000, Q: 5, fs: 44100 }
for (let buf of stream) wah(buf, p)
```

**Use when**: classic wah sound, filter sweeps<br>
**Not for**: signal-driven wah (use autoWah)

<!-- ![Wah-wah](plot/wah.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
