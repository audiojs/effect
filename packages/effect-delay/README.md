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

The delay is `max(1, time * fs)` samples: zero and sub-sample times use one sample, keeping the feedback loop causal. A delay between two frames is read between them (linear interpolation); a time within a Float32 step of a whole frame, as a host passes it, reads that frame exactly (`delaySamples(time, fs)` from `@audio/effect-delay` gives the length). A new time moves the read across the call from the time the last call ended on, at most half a frame a frame farther back and a frame a frame nearer, as a tape delay's head runs between half speed and double; a farther move goes on across the calls after, and then the read sits on the time. The ring keeps its history while it holds the time: a ring too short for a longer time or a new `fs` is made anew, empty, so give `buffer` a `Float64Array` long enough (`floor(delaySamples(longest, fs)) + 2`) to keep it. Empty buffers do not advance or reset the line. Non-finite/negative time or non-finite/non-positive `fs` throws RangeError before modifying input/state.

Keep `abs(feedback) < 1` for a decaying tail; the direct function does not clamp feedback or mix. Reuse `p` across chunks, including silence to drain echoes, and use a fresh options object to reset. The `/audio` factory limits feedback to 0–0.95 and time to 0.001–4 seconds, and makes each ring for 4 seconds, so `time` is live: smoothed over 20 ms, it bends the echo's pitch as it moves. A move bends over those 20 ms where the host's ramp asks the read to go at most half a frame a frame farther or a frame a frame nearer: 10 ms longer or 20 ms shorter where each call of the ramp is 32 frames (at 48, 96 and 192 kHz in audio's host), less where a call of the ramp is cut shorter and carries a 32-frame step in its k frames: 20 · k / 64 ms longer or 20 · k / 32 ms shorter (5.6 and 11.3 ms at 44.1 kHz, whose 882-frame ramp ends in a call of 18; 7.8 and 15.6 ms at 22.05 kHz, a call of 25; 2.5 and 5 ms at 176.4 kHz, of 8; 1.25 and 2.5 ms at 88.2 kHz, of 4). A farther move bends the echo an octave at most, down while the time grows, for twice the increase, and up while it shrinks, for as long as the decrease (0.25 s to 2 s is 3.5 s an octave down); one that reverses while under way turns from an octave down to an octave up in one frame, two octaves at once. While the time shrinks the read runs faster than the line, and what the line holds above a quarter of the sample rate folds below it, as loud as it was. `sync` (`'off'`, `'1/2'`, `'1/4'`, `'1/4t'`, `'1/8d'`, `'1/8'`, `'1/8t'`, `'1/16'`; default `'off'`) sets the time to that note at the host's tempo (`ctx.transport.bpm`, a quarter note a beat; `d` dotted, `t` triplet), held to 4 seconds; a new tempo or note glides across the call after it, or bends at the read's bound where that is slower; `'off'` leaves `time` in charge. Its `tail(ctx)` estimates decay by 60 dB at the supplied settings, rather than imposing a fixed eight-second limit: 60 dB under the input's level, so it counts the echoes of a held sound piling up to `mix / (1 − feedback)` times it. A known `mix: 0` has no tail. Unknown automated mix retains the wet tail; non-finite time/feedback planning values reserve their declared maxima, and so does a sync to a note when the host hands the tail no transport (with one, the note at its tempo). This is not exact silence; hosts taking a finite snapshot must account for later automation, and a time cut short just before the input stops rings longer than the new time's tail while the read is still on its way down. Disconnected inputs are processed as silence so existing tails drain.

**Use when**: slap-back echo, rhythmic delays<br>
**Not for**: diffuse reverberation (use reverb)

<!-- ![Delay](plot/delay.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
