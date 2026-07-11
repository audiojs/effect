# @audio/effect-rotary [![npm](https://img.shields.io/npm/v/@audio/effect-rotary)](https://www.npmjs.com/package/@audio/effect-rotary) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Rotary speaker (Leslie) simulation — split horn/drum rotors, Doppler + directivity AM

```
npm install @audio/effect-rotary
```

```js
import rotary from '@audio/effect-rotary'
```

Leslie cabinet simulation — a treble horn and bass drum spin at independent, inertia-limited rates below a crossover split, each producing Doppler pitch modulation and directivity amplitude modulation as they turn past two virtual mics. Mono in, stereo out.

**`hornSpeed`**/**`drumSpeed`** rotor rates in Hz (default 0.8/0.7 chorale · 6.7/5.9 tremolo · 0/0 off) · **`crossover`** horn/drum split in Hz (default 800) · **`depth`** modulation intensity 0–1 (default 1) · **`hornInertia`**/**`drumInertia`** spin-up/down time constants in seconds (default 0.6/2.5 — the heavier drum lags the horn) · **`micSpread`** angle between the two virtual mics in radians (default π/2) · **`mix`** wet/dry 0–1 (default 1) · **`fs`** sample rate

```js
import { rotary } from '@audio/effect'

// mono in, stereo out: pre-fill both channels with the same dry signal
let left = Float64Array.from(mono), right = Float64Array.from(mono)
let p = { hornSpeed: 6.7, drumSpeed: 5.9, fs: 44100 }
rotary(left, right, p)   // left, right now hold the two virtual-mic outputs
```

Switching `hornSpeed`/`drumSpeed` mid-stream glides through the inertia model instead of snapping — the classic chorale↔tremolo swell.

**Use when**: organ/guitar Leslie emulation, spinning-speaker swells<br>
**Not for**: plain stereo chorus (use chorus) or static stereo widening (use `@audio/spatial`)

<!-- ![Rotary speaker](plot/rotary-speaker.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
