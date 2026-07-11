# @audio/effect-ringmod [![npm](https://img.shields.io/npm/v/@audio/effect-ringmod)](https://www.npmjs.com/package/@audio/effect-ringmod) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Ring modulator — multiplies signal by a carrier oscillator

```
npm install @audio/effect-ringmod
```

```js
import ringMod from '@audio/effect-ringmod'
```

Multiplies signal by a carrier oscillator — produces sum and difference frequencies.

**`fc`** carrier frequency Hz (default 440) · **`mix`** wet/dry 0–1 (default 1) · **`fs`** sample rate

```js
import { ringMod } from '@audio/effect'

let p = { fc: 300, mix: 1, fs: 44100 }
for (let buf of stream) ringMod(buf, p)
```

**Use when**: metallic/robotic tones, experimental textures, AM synthesis<br>
**Not for**: clean frequency shifting

<!-- ![Ring mod](plot/ring-mod.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
