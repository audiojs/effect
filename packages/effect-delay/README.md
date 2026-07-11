# @audio/effect-delay [![npm](https://img.shields.io/npm/v/@audio/effect-delay)](https://www.npmjs.com/package/@audio/effect-delay) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Simple delay — mix of dry signal with delayed copy

```
npm install @audio/effect-delay
```

```js
import delay from '@audio/effect-delay'
```

Simple delay — dry signal mixed with delayed copy and optional feedback.

**`time`** delay time in seconds (default 0.25) · **`feedback`** echo decay 0–1 (default 0.3) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** sample rate

```js
import { delay } from '@audio/effect'

let p = { time: 0.25, feedback: 0.4, mix: 0.5, fs: 44100 }
for (let buf of stream) delay(buf, p)
```

**Use when**: slap-back echo, rhythmic delays, tape delay emulation<br>
**Not for**: diffuse reverberation (use reverb)

<!-- ![Delay](plot/delay.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
