# @audio/effect-wah [![npm](https://img.shields.io/npm/v/@audio/effect-wah)](https://www.npmjs.com/package/@audio/effect-wah) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Wah-wah — swept resonant bandpass filter

```
npm install @audio/effect-wah
```

```js
import wah from '@audio/effect-wah'
```

Swept resonant bandpass filter — auto (LFO) or fixed frequency mode.

**`rate`** LFO rate in Hz (default 1.5) · **`depth`** sweep depth in octaves, 0–3 (default 0.8) · **`fc`** center frequency Hz (default 1000) · **`Q`** resonance (default 5) · **`mode`** `'auto'` LFO or `'manual'` fixed (default `'auto'`) · **`phase`** LFO phase of each channel ahead of the one before, in `'auto'` mode, degrees −180–180 (default 0, the channels together; at 180 they sweep opposite ways) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this). Channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` glides across the next call.

```js
import wah from '@audio/effect-wah'

let p = { rate: 1.5, depth: 0.8, fc: 1000, Q: 5, fs: 44100 }
for (let buf of stream) wah(buf, p)
```

**Use when**: classic wah sound, filter sweeps<br>
**Not for**: signal-driven wah (use autoWah)

<!-- ![Wah-wah](plot/wah.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
