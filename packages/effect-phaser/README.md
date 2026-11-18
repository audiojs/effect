# @audio/effect-phaser [![npm](https://img.shields.io/npm/v/@audio/effect-phaser)](https://www.npmjs.com/package/@audio/effect-phaser) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Phaser — cascade of swept first-order allpass filters creating moving notches/peaks

```
npm install @audio/effect-phaser
```

```js
import phaser from '@audio/effect-phaser'
```

Cascade of swept allpass filters creating moving notches and peaks.

**`rate`** LFO rate in Hz (default 0.5) · **`depth`** sweep depth 0–1 (default 0.7) · **`stages`** allpass stages (default 4) · **`feedback`** 0–1 (default 0.5) · **`fc`** center frequency Hz (default 1000) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 90; 0 moves the channels together) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this), so identical left and right come out different; channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` glides across the next call. A change of `stages` crossfades over 20 ms, however the calls fall, from the cascade before to the new one; the stages that enter start from silence, and a count asked during a crossfade follows when it ends.

```js
import phaser from '@audio/effect-phaser'

let p = { rate: 0.5, depth: 0.7, stages: 4, feedback: 0.5, fc: 1000, fs: 44100 }
for (let buf of stream) phaser(buf, p)
```

**Use when**: electric guitar, synth pads, vintage phase effects<br>
**Not for**: spatial positioning (use stereoWidener or haas)

<!-- ![Phaser](plot/phaser.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
