# @audio/effect-delay [![npm](https://img.shields.io/npm/v/@audio/effect-delay)](https://www.npmjs.com/package/@audio/effect-delay) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Simple delay — mix of dry signal with delayed copy

```
npm install @audio/effect-delay
```

```js
import delay from '@audio/effect-delay'
```

Simple causal delay — dry signal mixed with delayed copy and optional feedback.

**`time`** non-negative seconds (default 0.25) · **`feedback`** gain per repeat (default 0.3) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** positive sample rate in Hz (default 44100)

```js
import delay from '@audio/effect-delay'

const input = new Float32Array(14401)
input[0] = 1
const p = { time: 0.1, feedback: 0.5, mix: 0.5, fs: 48000 }
const output = delay(input, p)
console.log(output === input, output[4800], output[9600]) // true, 0.5, 0.25
```

Time is quantized to `max(1, floor(time * fs))` samples: zero and sub-sample times use one sample, keeping the feedback loop causal. Changing this effective length resets buffered history, including when shrinking it or changing `fs`; unchanged length preserves history. Empty buffers do not advance or reset the line. Non-finite/negative time or non-finite/non-positive `fs` throws RangeError before modifying input/state.

Keep `abs(feedback) < 1` for a decaying tail; the direct function does not clamp feedback or mix. Reuse `p` across chunks, including silence to drain echoes, and use a fresh options object to reset. The `/audio` factory limits feedback to 0–0.95 and time to 0.001–4 seconds; time changes restart it. Its `tail(ctx)` estimates decay by 60 dB at the supplied settings, rather than imposing a fixed eight-second limit. This is not exact silence; hosts that evaluate tails once must account for later feedback automation. Disconnected inputs are processed as silence so existing tails drain.

**Use when**: slap-back echo, rhythmic delays<br>
**Not for**: diffuse reverberation (use reverb)

<!-- ![Delay](plot/delay.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
