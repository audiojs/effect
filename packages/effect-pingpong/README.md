# @audio/effect-pingpong [![npm](https://img.shields.io/npm/v/@audio/effect-pingpong)](https://www.npmjs.com/package/@audio/effect-pingpong) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Ping-pong delay — stereo: left and right delays alternate

```
npm install @audio/effect-pingpong
```

```js
import pingPong from '@audio/effect-pingpong'
```

Cross-fed stereo delay — left echo bounces to right, right to left.

**`time`** delay time in seconds (default 0.25) · **`feedback`** 0–1 (default 0.3) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** sample rate

```js
import { pingPong } from '@audio/effect'

let p = { time: 0.15, feedback: 0.5, mix: 0.5, fs: 44100 }
for (let [L, R] of stereoStream) pingPong(L, R, p)
```

**Use when**: stereo width from delays, spatial depth, rhythmic bounce effects<br>
**Not for**: mono output

<!-- ![Ping-pong](plot/ping-pong.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
