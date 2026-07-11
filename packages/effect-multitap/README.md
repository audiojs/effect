# @audio/effect-multitap [![npm](https://img.shields.io/npm/v/@audio/effect-multitap)](https://www.npmjs.com/package/@audio/effect-multitap) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Multi-tap delay — multiple delay taps at different times and gains

```
npm install @audio/effect-multitap
```

```js
import multitap from '@audio/effect-multitap'
```

Multiple independent delay taps at different times with individual gains.

**`taps`** array of `{ time, gain }` objects · **`fs`** sample rate

```js
import { multitap } from '@audio/effect'

let p = {
  taps: [{ time: 0.1, gain: 0.6 }, { time: 0.25, gain: 0.4 }, { time: 0.4, gain: 0.2 }],
  fs: 44100
}
for (let buf of stream) multitap(buf, p)
```

**Use when**: complex rhythmic echo patterns, vintage tape echo with multiple heads<br>
**Not for**: simple single echo (use delay)

<!-- ![Multitap](plot/multitap.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
