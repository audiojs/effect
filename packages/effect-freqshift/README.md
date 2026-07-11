# @audio/effect-freqshift [![npm](https://img.shields.io/npm/v/@audio/effect-freqshift)](https://www.npmjs.com/package/@audio/effect-freqshift) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Frequency shifter — single-sideband shift via Hilbert transform

```
npm install @audio/effect-freqshift
```

```js
import frequencyShifter from '@audio/effect-freqshift'
```

Single-sideband frequency shift via Hilbert transform. Every frequency moves by a constant offset (unlike [ring mod](#ring-mod), which produces sum/difference pairs; unlike [pitch shifter](#pitch-shifter), which preserves harmonic ratios). Breaks harmonic relationships → inharmonic, metallic, clangorous.

**`shift`** shift in Hz (default 100 · positive = up, negative = down) · **`mix`** wet/dry 0–1 (default 1) · **`taps`** Hilbert FIR length, must be odd (default 65) · **`fs`** sample rate

```js
import { frequencyShifter } from '@audio/effect'

let p = { shift: 200, fs: 44100 }
for (let buf of stream) frequencyShifter(buf, p)
```

**Use when**: clangorous barber-pole tones, Bode-style modulation, Moog-style frequency shifting<br>
**Not for**: musical transposition (use [pitch shifter](#pitch-shifter) or the `@audio/shift` package)

<!-- ![Frequency shifter](plot/frequency-shifter.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
