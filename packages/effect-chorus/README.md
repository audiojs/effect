# @audio/effect-chorus [![npm](https://img.shields.io/npm/v/@audio/effect-chorus)](https://www.npmjs.com/package/@audio/effect-chorus) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Chorus — multiple detuned delay lines for ensemble thickening

```
npm install @audio/effect-chorus
```

```js
import chorus from '@audio/effect-chorus'
```

Multiple detuned delay voices layered over dry signal — ensemble thickening.

**`rate`** LFO rate in Hz (default 1.5) · **`depth`** modulation depth 0–1 (default 0.5) · **`delay`** center delay in seconds (default 0.02) · **`voices`** number of chorus voices (default 3) · **`phase`** offset of each channel's voices from the channel before's, degrees −180–180 of the voice spacing (default 90; 0 moves the channels together) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

The voices sit 360/`voices` degrees of LFO apart, and `phase` divides that spacing as degrees divide a cycle: 180 puts a channel's voices halfway between the other's, and with one voice it is LFO degrees. In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this), so identical left and right come out different; channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole spacing on and moves with channel 0. A change of `phase`, `depth` or `delay` glides across the next call. A change of `voices` crossfades over 20 ms, however the calls fall, from the voices before to as many again, spaced from voice 0, each set at its own lead; a count asked during a crossfade follows when it ends.

A zero center delay is passthrough. A ring made for a longer delay holds a shorter one, every sample at its age; the `/audio` factory makes it for the longest delay, 0.05 seconds, and the LFO phases for 8 voices.

```js
import chorus from '@audio/effect-chorus'

let p = { rate: 1.5, depth: 0.5, delay: 0.02, voices: 3, fs: 44100 }
for (let buf of stream) chorus(buf, p)
```

**Use when**: thickening strings, vocals, synth pads<br>
**Not for**: transparent processing (adds modulation artifacts)

<!-- ![Chorus](plot/chorus.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
