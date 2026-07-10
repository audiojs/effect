# @audio/effect-graindelay

> Granular delay — per-grain pitch/time scatter (Ableton Grain Delay class)

Grains read from a delay line with per-grain delay scatter and pitch transposition. Two Hann-windowed heads, staggered by half a grain, retrigger continuously; feedback writes the wet grain stream back into the line.

## Install

```
npm install @audio/effect-graindelay
```

## Usage

```js
import graindelay from '@audio/effect-graindelay'

let p = { time: 0.25, spray: 0.02, pitch: 0, jitter: 0, grain: 0.08, feedback: 0.3, mix: 0.5, fs: 44100 }
for (let buf of stream) graindelay(buf, p)
```

`graindelay(data, params)` mutates `data` (`Float32Array`/`Float64Array`) in place and returns it. Pass the same `params` object across calls — the delay buffer and the two grain heads persist on it (`_buf`, `_w`, `_heads`, `_rnd`). Changing `time`/`spray`/`pitch`/`jitter`/`grain` reallocates the buffer, dropping buffered history — an audible glitch if done live.

**`time`** base delay, seconds (default 0.25) · **`spray`** random extra delay per grain, seconds (default 0.02) · **`pitch`** per-grain transposition, semitones (default 0) · **`jitter`** random pitch scatter, semitones (default 0) · **`grain`** grain length, seconds (default 0.08) · **`feedback`** 0–1 (default 0.3) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** sample rate · **`seed`** grain-scatter PRNG seed

**Use when**: glitchy time-stretch, granular texture, rhythmic pitch scatter<br>
**Not for**: clean delay (use `@audio/effect-delay`) or transparent pitch shifting (use `@audio/shift`)

Part of [@audio/effect](https://github.com/audiojs/effect).
