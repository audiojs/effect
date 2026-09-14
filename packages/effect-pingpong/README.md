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

Both channels must have equal lengths; a mismatch throws before processing. Delay time uses `max(1, floor(time * fs))` samples. Changing the effective length resets both rings; empty channels do not advance or reset them. Reuse one params object for successive stereo chunks, or create a fresh one to reset. Time and sample-rate validation match the mono delay. Keep `abs(feedback) < 1` for decay; the direct function does not clamp it.

The `/audio` factory limits feedback to 0–0.9 and time to 0.01–2 seconds. Time changes restart it. Its tail estimate describes 60 dB decay at the supplied settings, not a hard silence boundary; disconnected inputs drain through silent blocks.

**Use when**: stereo width from delays, spatial depth, rhythmic bounce effects<br>
**Not for**: mono output

<!-- ![Ping-pong](plot/ping-pong.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
