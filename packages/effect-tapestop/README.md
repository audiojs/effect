# @audio/effect-tapestop [![npm](https://img.shields.io/npm/v/@audio/effect-tapestop)](https://www.npmjs.com/package/@audio/effect-tapestop) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tape-stop / spin-down — variable-rate playback with a decelerating read pointer

```
npm install @audio/effect-tapestop
```

```js
import tapeStop from '@audio/effect-tapestop'
```

Variable-rate playback with a decelerating (or accelerating) read pointer — turntable power-off / tape-deck stop, and the reverse spin-up. Whole-buffer effect: needs the full signal in one call, not a per-block stream.

**`at`** when the stop/start begins, in seconds (default 0) · **`time`** ramp duration in seconds (default 1) · **`curve`** speed-profile exponent — 1 = physical constant-torque linear decay, >1 = faster initial drop, <1 = held then dropping (default 1) · **`direction`** `'stop'` or `'start'` (default `'stop'`) · **`flutter`** 0–1 random rate wobble during the ramp (default 0)

```js
import { tapeStop } from '@audio/effect'

tapeStop(buf, { at: 2, time: 1.5, direction: 'stop', fs: 44100 })
```

**Use when**: DJ/turntable power-off, tape-deck stop/start, transition sweeps<br>
**Not for**: continuous pitch modulation (use vibrato) or tempo-locked time-stretch

<!-- ![Tape stop](plot/tape-stop.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
