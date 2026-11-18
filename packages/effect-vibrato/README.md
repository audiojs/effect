# @audio/effect-vibrato [![npm](https://img.shields.io/npm/v/@audio/effect-vibrato)](https://www.npmjs.com/package/@audio/effect-vibrato) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Vibrato — pitch modulation via modulated delay line

```
npm install @audio/effect-vibrato
```

```js
import vibrato from '@audio/effect-vibrato'
```

Pitch modulation via modulated delay line — periodic pitch wobble.

**`rate`** LFO rate in Hz (default 5) · **`depth`** modulation depth 0–1, scales a max ~6ms delay-time swing (default 0.5) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 0, the channels together; at 180 their pitches swing opposite ways) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this). Channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` or `depth` glides across the next call; the delay ring holds depth 1 from the first call.

```js
import vibrato from '@audio/effect-vibrato'

let p = { rate: 5, depth: 0.5, fs: 44100 }
for (let buf of stream) vibrato(buf, p)
```

**Use when**: vocal vibrato, string wobble, instrument simulation<br>
**Not for**: amplitude variation (use tremolo)

<!-- ![Vibrato](plot/vibrato.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
