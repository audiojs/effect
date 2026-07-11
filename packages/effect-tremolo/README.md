# @audio/effect-tremolo [![npm](https://img.shields.io/npm/v/@audio/effect-tremolo)](https://www.npmjs.com/package/@audio/effect-tremolo) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tremolo — amplitude modulation via LFO

```
npm install @audio/effect-tremolo
```

```js
import tremolo from '@audio/effect-tremolo'
```

Amplitude modulation via LFO — periodic volume pulsing.

**`rate`** LFO rate in Hz (default 5) · **`depth`** modulation depth 0–1 (default 0.5) · **`fs`** sample rate

```js
import { tremolo } from '@audio/effect'

let p = { rate: 5, depth: 0.7, fs: 44100 }
for (let buf of stream) tremolo(buf, p)
```

**Use when**: vintage amp tremolo, rhythmic pulsing, guitar effects<br>
**Not for**: pitch modulation (use vibrato)

<!-- ![Tremolo](plot/tremolo.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
