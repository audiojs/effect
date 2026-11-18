# @audio/effect-stutter

> Stutter / beat-repeat — sliced buffer retrigger (Ableton Beat Repeat class)

Every `interval`, captures a `slice`-length window and retriggers it for the rest of the interval. Edge fades kill retrigger clicks; `decay` attenuates successive repeats; `mix` blends against the uninterrupted dry signal.

## Install

```
npm install @audio/effect-stutter
```

## Usage

```js
import stutter from '@audio/effect-stutter'

let p = { interval: 0.5, slice: 0.125, decay: 0, mix: 1, fs: 44100 }
for (let buf of stream) stutter(buf, p)
```

`stutter(data, params)` mutates `data` (`Float32Array`/`Float64Array`) in place and returns it. Pass the same `params` object across calls — the captured slice buffer, cycle position and the lengths of the cycle under way persist on it (`_slice`, `_pos`, `_cycle`). A new `interval` or `slice` takes effect where the next cycle starts: the cycle under way keeps its lengths, so no repeat is cut short or stretched. A longer slice than the buffer holds grows it, keeping what it holds; the `/audio` factory makes it for the longest slice, 1 s.

**`interval`** capture cycle length, seconds (default 0.5) · **`slice`** captured slice length, seconds (default 0.125) · **`decay`** amplitude loss per repeat, 0–1 (default 0) · **`mix`** wet/dry 0–1 (default 1) · **`fs`** sample rate

**Use when**: glitch/IDM rhythmic effects, breakbeat retrigger, buildup fills<br>
**Not for**: smooth granular texture (use `@audio/effect-graindelay`) or tempo-locked time-stretch

Part of [@audio/effect](https://github.com/audiojs/effect).
