# @audio/effect-pingpong [![npm](https://img.shields.io/npm/v/@audio/effect-pingpong)](https://www.npmjs.com/package/@audio/effect-pingpong) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Ping-pong delay — stereo: left and right delays alternate

```
npm install @audio/effect-pingpong
```

```js
import pingPong from '@audio/effect-pingpong'
```

Cross-fed stereo delay — left echo bounces to right, right to left.

**`time`** non-negative seconds (default 0.25) · **`feedback`** gain per repeat (default 0.4) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** positive sample rate in Hz (default 44100)

```js
import pingPong from '@audio/effect-pingpong'

let p = { time: 0.15, feedback: 0.5, mix: 0.5, fs: 44100 }
for (let [L, R] of stereoStream) pingPong(L, R, p)
```

Both channels must have equal lengths; a mismatch throws before processing. The delay is read as the mono delay reads it, between frames where it falls between them, and a new time moves both reads across the call from the time the last call ended on, as fast as the mono delay's read at most. Rings too short for a longer time are made anew, empty (give `_bufL` and `_bufR` long enough to keep them); empty channels do not advance or reset them. Reuse one params object for successive stereo chunks, or create a fresh one to reset. Time and sample-rate validation match the mono delay. Keep `abs(feedback) < 1` for decay; the direct function does not clamp it.

The `/audio` factory limits feedback to 0–0.9 and time to 0.01–2 seconds and makes both rings for 2 seconds, so `time` is live, smoothed over 20 ms; a far move bends the echoes an octave at most, as the mono delay's does. `sync` sets the time to a note at the host's tempo, as the mono delay's does, held to 2 seconds. Each block calls the in-place form. Its tail estimate describes 60 dB decay at the supplied settings (with sync on, at the note at the tempo the host hands it, or at the longest time where it hands none; a value not known yet reserves its range's longest), not a hard silence boundary; disconnected inputs drain through silent blocks.

**Use when**: stereo width from delays, spatial depth, rhythmic bounce effects<br>
**Not for**: mono output

<!-- ![Ping-pong](plot/ping-pong.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
