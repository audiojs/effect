# @audio/effect-subbass

> Psychoacoustic bass enhancer — harmonic synthesis below cutoff (MaxxBass/RBass class)

Extracts the band below `freq`, generates its harmonic series with an even/odd waveshaper, band-limits the harmonics to the audible low-mids, and mixes against dry. Small speakers reproduce the harmonics; the ear reconstructs the missing fundamental.

## Install

```
npm install @audio/effect-subbass
```

## Usage

```js
import subbass from '@audio/effect-subbass'

let p = { freq: 80, amount: 0.5, drive: 0.5, keep: 1, fs: 44100 }
for (let buf of stream) subbass(buf, p)
```

`subbass(data, params)` mutates `data` (`Float32Array`/`Float64Array`) in place and returns it. Pass the same `params` object across calls — the sub-extraction and harmonic-band filter state persists on it (`_sub`, `_out`, `_dc`).

**`freq`** sub cutoff, Hz — harmonics built from below this (default 80) · **`amount`** harmonic level 0–1 (default 0.5) · **`drive`** waveshaper intensity 0–1 (default 0.5) · **`keep`** how much original sub to keep, 0–1, 0 = replace entirely (default 1) · **`fs`** sample rate

**Use when**: small-speaker/phone playback, bass on systems that can't reproduce true sub<br>
**Not for**: sources already reproduced on full-range monitors, general saturation (use `@audio/effect-distortion`)

Part of [@audio/effect](https://github.com/audiojs/effect).
