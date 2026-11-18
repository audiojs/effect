# @audio/effect-tremolo [![npm](https://img.shields.io/npm/v/@audio/effect-tremolo)](https://www.npmjs.com/package/@audio/effect-tremolo) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tremolo — amplitude modulation via LFO

```
npm install @audio/effect-tremolo
```

```js
import tremolo from '@audio/effect-tremolo'
```

Amplitude modulation via LFO — periodic volume pulsing.

**`rate`** LFO rate in Hz (default 5) · **`depth`** modulation depth 0–1 (default 0.5) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 0, the channels together; 180 is an auto-pan) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this). At 180, the left gain rises as the right falls and the two add to 2 − `depth`: an auto-pan. Channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` glides across the next call.

```js
import tremolo from '@audio/effect-tremolo'

let p = { rate: 5, depth: 0.7, fs: 44100 }
for (let buf of stream) tremolo(buf, p)
```

**Use when**: vintage amp tremolo, rhythmic pulsing, guitar effects<br>
**Not for**: pitch modulation (use vibrato)

<!-- ![Tremolo](plot/tremolo.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
