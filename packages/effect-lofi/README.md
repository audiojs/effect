# @audio/effect-lofi

> Lo-fi character — wow/flutter, vinyl noise, crackle, bandwidth ceiling (RC-20 class)

Wow/flutter via LFO-modulated fractional delay, tape saturation, a vinyl noise bed (hiss + sparse crackle), and a 3-pole lowpass ceiling / one-pole highpass floor. Noise is a seeded LCG — renders are deterministic and reproducible.

## Install

```
npm install @audio/effect-lofi
```

## Usage

```js
import lofi from '@audio/effect-lofi'

let p = { wow: 0.3, flutter: 0.2, noise: 0.1, crackle: 0.1, lowpass: 6000, highpass: 60, drive: 0.3, fs: 44100 }
for (let buf of stream) lofi(buf, p)
```

`lofi(data, params)` mutates `data` (`Float32Array`/`Float64Array`) in place and returns it. Pass the same `params` object across calls — delay-line, LFO phase, filter, and noise state persist on it (`_buf`, `_ph1`, `_ph2`, `_lp1..3`, `_hp`, `_rnd`, `_crk`).

**`wow`** 0–1, slow pitch drift, ~0.7 Hz, up to 3 ms (default 0.3) · **`flutter`** 0–1, fast wobble, ~7 Hz, up to 0.4 ms (default 0.2) · **`noise`** 0–1, hiss bed level (default 0.1) · **`crackle`** 0–1, impulse density/level (default 0.1) · **`lowpass`** bandwidth ceiling, Hz, 3-pole −18 dB/oct (default 6000) · **`highpass`** rumble floor, Hz, one-pole (default 60) · **`drive`** 0–1, tape saturation, gain-compensated tanh (default 0.3) · **`fs`** sample rate · **`seed`** LCG seed for the noise/crackle generator

**Use when**: cassette/vinyl emulation, sampler character, retro texture<br>
**Not for**: transparent bandwidth reduction (use bitcrusher) or exciter-style HF recovery (use `@audio/effect-sbr`)

Part of [@audio/effect](https://github.com/audiojs/effect).
