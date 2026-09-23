# @audio/effect-sbr

> Spectral band replication — extend HF from midband harmonics (aural exciter family; De-Slop bandwidth recovery)

Exciter-class bandwidth recovery: takes the top octave still present below `fc`, regenerates its harmonic series with a waveshaper (harmonics land above `fc`), highpasses at `fc`, and mixes back in at a level tracking the source band's envelope. Recovers HF lost to lossy encoding or a lowpassed source.

## Install

```
npm install @audio/effect-sbr
```

## Usage

```js
import sbr from '@audio/effect-sbr'

let p = { fc: 8000, amount: 0.5, drive: 0.5, fs: 44100 }
for (let buf of stream) sbr(buf, p)
```

`sbr(data, params)` mutates `data` (`Float32Array`/`Float64Array`) in place and returns it. Pass the same `params` object across calls — the source bandpass, output highpass, and envelope-follower state persist on it (`_src`, `_hp1`, `_hp2`, `_env`, `_henv`, `_dc`).

**`fc`** where the source content dies, Hz (default 8000; `cutoff` still accepted) · **`amount`** replication level 0–1 (default 0.5) · **`drive`** waveshaper intensity 0–1 (default 0.5) · **`fs`** sample rate

**Use when**: restoring HF on lossy-encoded or bandwidth-limited material, mastering "air"<br>
**Not for**: adding harmonics to a full-bandwidth source (use `@audio/effect-exciter`) or bass reconstruction (use `@audio/effect-subbass`)

Part of [@audio/effect](https://github.com/audiojs/effect).
