# @audio/effect-flanger [![npm](https://img.shields.io/npm/v/@audio/effect-flanger)](https://www.npmjs.com/package/@audio/effect-flanger) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Flanger — modulated short delay with feedback

```
npm install @audio/effect-flanger
```

```js
import flanger from '@audio/effect-flanger'
```

Modulated short delay (1–10 ms) with feedback — creates comb filter sweep.

**`rate`** LFO rate in Hz (default 0.3) · **`depth`** modulation depth 0–1 (default 0.7) · **`delay`** center delay in seconds (default 0.003) · **`feedback`** 0–1 (default 0.5) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 90; 0 moves the channels together) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this), so identical left and right come out different; channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase`, `depth` or `delay` glides across the next call.

A zero center delay uses a one-sample feedback ring. The ring is floor(2 · `delay` · `fs`) + 1 samples, enough for the farthest read (twice the center delay, at depth 1), so a center delay under half a sample also gets one sample. A ring made for a longer delay holds a shorter one, every sample at its age; the `/audio` factory makes it for the longest delay, 0.02 seconds. The swept delay is held at one sample or more, as the feedback loop cannot read the sample it is about to write.

```js
import flanger from '@audio/effect-flanger'

let p = { rate: 0.3, depth: 0.7, delay: 0.003, feedback: 0.5, fs: 44100 }
for (let buf of stream) flanger(buf, p)
```

**Use when**: jet sweeps, metallic modulation, guitar/bass<br>
**Not for**: subtle pitch modulation (use vibrato)

<!-- ![Flanger](plot/flanger.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
