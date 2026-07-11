# @audio/effect-slew [![npm](https://img.shields.io/npm/v/@audio/effect-slew)](https://www.npmjs.com/package/@audio/effect-slew) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Rate-of-change limiter

```
npm install @audio/effect-slew
```

```js
import slewLimiter from '@audio/effect-slew'
```

Clips the derivative — limits how fast the signal can change.

**`rise`** maximum rise rate in units/second (default 1000) · **`fall`** maximum fall rate (default 1000) · **`fs`** sample rate

```js
import { slewLimiter } from '@audio/effect'

let p = { rise: 5000, fall: 5000, fs: 44100 }
for (let buf of stream) slewLimiter(buf, p)
```

**Use when**: click removal, smoothing control signals, limiting slew on CVs<br>
**Not for**: dynamic range control

<!-- ![Slew limiter](plot/slew-limiter.svg) -->

---

Part of [@audio/effect](https://github.com/audiojs/effect) — the effect family umbrella. This README is generated from the umbrella docs.

MIT © [audiojs](https://github.com/audiojs)
