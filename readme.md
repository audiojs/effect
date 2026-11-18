# @audio/effect

Canonical audio effect implementations.

<table><tr><td valign="top">

**[Modulation](#modulation)**<br>
<sub>[Phaser](#phaser) · [Flanger](#flanger) · [Chorus](#chorus) · [Wah-wah](#wah-wah) · [Tremolo](#tremolo) · [Vibrato](#vibrato) · [Rotary speaker](#rotary-speaker) · [Ring mod](#ring-mod) · [Frequency shifter](#frequency-shifter) · [Pitch shifter](#pitch-shifter) · [Auto-wah](#auto-wah)</sub>

**[Dynamics](#dynamics)**<br>
<sub>moved to [`@audio/dynamics`](https://github.com/audiojs/dynamics)</sub>

**[Delay](#delay)**<br>
<sub>[Delay](#delay-1) · [Multitap](#multitap) · [Ping-pong](#ping-pong) · [Reverb](#reverb)</sub>

</td><td valign="top">

**[Distortion](#distortion)**<br>
<sub>[Distortion / saturation](#distortion--saturation) · [Exciter](#exciter) · [Bitcrusher](#bitcrusher)</sub>

**[Spatial](#spatial)**<br>
<sub>[Stereo widener](#stereo-widener) · [Haas effect](#haas-effect) · [Panner](#panner) · [Auto-panner](#auto-panner)</sub>

**[Utility](#utility)**<br>
<sub>[Gain](#gain) · [Mixer](#mixer) · [Slew limiter](#slew-limiter) · [Noise shaping](#noise-shaping) · [Tape stop](#tape-stop)</sub>

</td></tr></table>


## Install

```
npm install @audio/effect
```

```js
import { delay } from '@audio/effect'

const fs = 48000
const input = new Float32Array(14401)
input[0] = 1 // impulse; replace with mono PCM samples
const params = { time: 0.1, feedback: 0.5, mix: 0.5, fs }
const output = delay(input.slice(), params)
console.log(output[0], output[4800], output[9600]) // 0.5, 0.5, 0.25
```

For one effect: `npm install @audio/effect-delay`, then `import delay from '@audio/effect-delay'`. The umbrella re-exports the same functions and types. Sibling families such as `@audio/dynamics`, `@audio/spatial` and `@audio/reverb` are separate installations.

## API

| Operation | Input/output | State |
|---|---|---|
| Mono effects, such as `gain`, `delay`, `chorus` | `effect(buffer, params?)` modifies and returns that same buffer. | Reuse one params object across chunks to continue history. |
| `pingPong`, `rotary` | `effect(left, right, params?)` modifies both and returns `[left, right]`. | Equal channel lengths required (otherwise RangeError). One params object per stereo instance. Rotary averages its inputs to mono before producing stereo. `rotaryInPlace` from `@audio/effect-rotary` and `pingPongInPlace` from `@audio/effect-pingpong` do the same and return nothing. |
| `mixer` | `mixer([{ buffer, gain }, ...])` returns a new Float64Array; inputs remain unchanged. | Stateless; empty input returns an empty buffer. Unequal lengths throw RangeError. |
| `tapeStop` | Modifies and returns its buffer. | Whole-buffer operation; do not split it into chunks. `tapestopStream` from `@audio/effect-tapestop` is the same stop over a stream. |

PCM buffers may be Float32Array or Float64Array; TypeScript preserves the supplied array type in the return value. Omitted options (or `undefined`) create fresh defaults for that call. For continuous processing, keep the same mutable options object; use a fresh object with the same settings to reset. Keep separate state for separate channels unless the function explicitly takes a stereo pair. Do not pass `null` as the options object.

For example, after the complete example above, `delay(nextChunk, params)` continues its echo history. Passing `nextChunk.slice()` preserves the original samples. Further examples using `data`, `stream` or `stereoStream` are fragments that expect your audio input.

`fs` is sample rate in Hz, default 44100. Time/delay and envelope attack/release in this family are seconds; LFO/carrier frequencies are Hz; mix/depth and feedback are linear ratios. `gain.dB` is decibels. Check individual options for exceptions such as semitones, sample counts and slew rates. Dynamics is a separate API and uses milliseconds for attack/release.

The leaf `/audio` exports are host processor factories. Their parameter metadata can limit ranges, smooth controls, or mark changes as requiring a restart. The direct buffer functions do not automatically smooth arbitrary parameter changes. A new delay time moves the read across the call from where the last call left it, bending the pitch as a tape delay does, the read running no slower than half speed and no faster than double; it keeps the line's history. The chorus's and the flanger's `delay` and lofi's `wow` and `flutter` move their reads the same way. A value that scales the signal (the `mix` of the delay, ping-pong, grain delay, frequency shifter, rotary and stutter, gain's `dB`, tremolo's `depth`, subbass's and sbr's levels and drive, stutter's `decay`, the phaser's `feedback`) is smoothed (over 20 ms; gain's `dB` over 10) and played sample by sample along the host's ramp, so a move never steps the output, however the host cuts its calls; a value that holds is the kernel's own, sample for sample. The ring modulator's and the distortion's `mix` are smoothed and taken once a call. The wah's and the phaser's `fc` glide across each call; the exciter's and sbr's `fc`, lofi's `lowpass` and `highpass` and the rotary's `crossover` are smoothed so that a host ramps them, retuned each call. A factory's `tail` is the time until what the input leaves stays 60 dB under the input's level: it counts the gain a ring starts at (a resonance's peak, the echoes of a loop piling up, a saturator's slope), and a ring of 128 frames or less declares none. Given a value that is not finite (automation whose values are not known yet), it reserves the longest tail that value's range can ring.


## Modulation

LFO-driven effects that vary a parameter periodically.

### Phaser

Cascade of swept allpass filters creating moving notches and peaks.

**`rate`** LFO rate in Hz (default 0.5) · **`depth`** sweep depth 0–1 (default 0.7) · **`stages`** allpass stages (default 4) · **`feedback`** 0–1 (default 0.5) · **`fc`** center frequency Hz (default 1000) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 90; 0 moves the channels together) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this), so identical left and right come out different; channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` glides across the next call. A change of `stages` crossfades over 20 ms, however the calls fall, from the cascade before to the new one; the stages that enter start from silence, and a count asked during a crossfade follows when it ends.

```js
import { phaser } from '@audio/effect'

let p = { rate: 0.5, depth: 0.7, stages: 4, feedback: 0.5, fc: 1000, fs: 44100 }
for (let buf of stream) phaser(buf, p)
```

**Use when**: electric guitar, synth pads, vintage phase effects<br>
**Not for**: spatial positioning (use stereoWidener or haas)

<!-- ![Phaser](plot/phaser.svg) -->


### Flanger

Modulated short delay (1–10 ms) with feedback — creates comb filter sweep.

**`rate`** LFO rate in Hz (default 0.3) · **`depth`** modulation depth 0–1 (default 0.7) · **`delay`** center delay in seconds (default 0.003) · **`feedback`** 0–1 (default 0.5) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 90; 0 moves the channels together) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this), so identical left and right come out different; channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase`, `depth` or `delay` glides across the next call.

A zero center delay uses a one-sample feedback ring. The ring is floor(2 · `delay` · `fs`) + 1 samples, enough for the farthest read (twice the center delay, at depth 1), so a center delay under half a sample also gets one sample. A ring made for a longer delay holds a shorter one, every sample at its age; the `/audio` factory makes it for the longest delay, 0.02 seconds. The swept delay is held at one sample or more, as the feedback loop cannot read the sample it is about to write.

```js
import { flanger } from '@audio/effect'

let p = { rate: 0.3, depth: 0.7, delay: 0.003, feedback: 0.5, fs: 44100 }
for (let buf of stream) flanger(buf, p)
```

**Use when**: jet sweeps, metallic modulation, guitar/bass<br>
**Not for**: subtle pitch modulation (use vibrato)

<!-- ![Flanger](plot/flanger.svg) -->


### Chorus

Multiple detuned delay voices layered over dry signal — ensemble thickening.

**`rate`** LFO rate in Hz (default 1.5) · **`depth`** modulation depth 0–1 (default 0.5) · **`delay`** center delay in seconds (default 0.02) · **`voices`** number of chorus voices (default 3) · **`phase`** offset of each channel's voices from the channel before's, degrees −180–180 of the voice spacing (default 90; 0 moves the channels together) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

The voices sit 360/`voices` degrees of LFO apart, and `phase` divides that spacing as degrees divide a cycle: 180 puts a channel's voices halfway between the other's, and with one voice it is LFO degrees. In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this), so identical left and right come out different; channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole spacing on and moves with channel 0. A change of `phase`, `depth` or `delay` glides across the next call. A change of `voices` crossfades over 20 ms, however the calls fall, from the voices before to as many again, spaced from voice 0, each set at its own lead; a count asked during a crossfade follows when it ends.

A zero center delay is passthrough. A ring made for a longer delay holds a shorter one, every sample at its age; the `/audio` factory makes it for the longest delay, 0.05 seconds, and the LFO phases for 8 voices.

```js
import { chorus } from '@audio/effect'

let p = { rate: 1.5, depth: 0.5, delay: 0.02, voices: 3, fs: 44100 }
for (let buf of stream) chorus(buf, p)
```

**Use when**: thickening strings, vocals, synth pads<br>
**Not for**: transparent processing (adds modulation artifacts)

<!-- ![Chorus](plot/chorus.svg) -->


### Wah-wah

Swept resonant bandpass filter — auto (LFO) or fixed frequency mode.

**`rate`** LFO rate in Hz (default 1.5) · **`depth`** sweep depth in octaves, 0–3 (default 0.8) · **`fc`** center frequency Hz (default 1000) · **`Q`** resonance (default 5) · **`mode`** `'auto'` LFO or `'manual'` fixed (default `'auto'`) · **`phase`** LFO phase of each channel ahead of the one before, in `'auto'` mode, degrees −180–180 (default 0, the channels together; at 180 they sweep opposite ways) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this). Channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` glides across the next call.

```js
import { wah } from '@audio/effect'

let p = { rate: 1.5, depth: 0.8, fc: 1000, Q: 5, fs: 44100 }
for (let buf of stream) wah(buf, p)
```

**Use when**: classic wah sound, filter sweeps<br>
**Not for**: signal-driven wah (use autoWah)

<!-- ![Wah-wah](plot/wah.svg) -->


### Tremolo

Amplitude modulation via LFO — periodic volume pulsing.

**`rate`** LFO rate in Hz (default 5) · **`depth`** modulation depth 0–1 (default 0.5) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 0, the channels together; 180 is an auto-pan) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this). At 180, the left gain rises as the right falls and the two add to 2 − `depth`: an auto-pan. Channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` glides across the next call.

```js
import { tremolo } from '@audio/effect'

let p = { rate: 5, depth: 0.7, fs: 44100 }
for (let buf of stream) tremolo(buf, p)
```

**Use when**: vintage amp tremolo, rhythmic pulsing, guitar effects<br>
**Not for**: pitch modulation (use vibrato)

<!-- ![Tremolo](plot/tremolo.svg) -->


### Vibrato

Pitch modulation via modulated delay line — periodic pitch wobble.

**`rate`** LFO rate in Hz (default 5) · **`depth`** modulation depth 0–1, scales a max ~6ms delay-time swing (default 0.5) · **`phase`** LFO phase of each channel ahead of the one before, degrees −180–180 (default 0, the channels together; at 180 their pitches swing opposite ways) · **`channel`** index of the channel this call processes (default 0) · **`fs`** sample rate

In stereo, each channel keeps its own params object with its `channel` index (the `/audio` factory does this). Channel 0 never shifts, so a mono signal is the same at any `phase`. Channel c runs c × `phase` ahead, so at 90 channel 4 is a whole cycle on and moves with channel 0. A change of `phase` or `depth` glides across the next call; the delay ring holds depth 1 from the first call.

```js
import { vibrato } from '@audio/effect'

let p = { rate: 5, depth: 0.5, fs: 44100 }
for (let buf of stream) vibrato(buf, p)
```

**Use when**: vocal vibrato, string wobble, instrument simulation<br>
**Not for**: amplitude variation (use tremolo)

<!-- ![Vibrato](plot/vibrato.svg) -->


### Rotary speaker

Leslie cabinet simulation — a treble horn and bass drum spin at independent, inertia-limited rates below a crossover split, each producing Doppler pitch modulation and directivity amplitude modulation as they turn past two virtual mics. Mono in, stereo out.

**`hornSpeed`**/**`drumSpeed`** rotor rates in Hz (default 0.8/0.7 chorale · 6.7/5.9 tremolo · 0/0 off) · **`crossover`** horn/drum split in Hz (default 800) · **`depth`** modulation intensity 0–1 (default 1) · **`hornInertia`**/**`drumInertia`** spin-up/down time constants in seconds (default 0.6/2.5 — the heavier drum lags the horn) · **`micSpread`** angle between the two virtual mics in radians (default π/2) · **`mix`** wet/dry 0–1 (default 1) · **`fs`** sample rate

```js
import { rotary } from '@audio/effect'

// mono in, stereo out: pre-fill both channels with the same dry signal
let left = Float64Array.from(mono), right = Float64Array.from(mono)
let p = { hornSpeed: 6.7, drumSpeed: 5.9, fs: 44100 }
rotary(left, right, p)   // left, right now hold the two virtual-mic outputs
```

Switching `hornSpeed`/`drumSpeed` mid-stream glides through the inertia model instead of snapping — the classic chorale↔tremolo swell. A change of `depth` or `micSpread` glides across the next call, a new `crossover`, smoothed so that a host ramps it, rewrites the filter sections in place, and a new `mix` glides sample by sample.

The rotors' delay is the model's, not latency: the path from each rotor to a mic, up to twice its radius over the speed of sound (2 · 0.09 m / 343 m/s, 23 samples at 44.1 kHz, for the horn at rest facing the left mic). At `mix` 0 the output is the input, undelayed.

**Use when**: organ/guitar Leslie emulation, spinning-speaker swells<br>
**Not for**: plain stereo chorus (use chorus) or static stereo widening (use `@audio/spatial`)

<!-- ![Rotary speaker](plot/rotary-speaker.svg) -->


### Ring mod

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


### Frequency shifter

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


### Pitch shifter

Moved to [`@audio/shift`](https://github.com/audiojs/shift) — 15 algorithms from granular to phase-vocoder to PSOLA:

```js
import { granular } from '@audio/shift'

let out = granular(buf, { ratio: 1.5 })
```


### Auto-wah

Envelope follower drives a resonant bandpass filter — signal level controls the sweep.

**`base`** minimum cutoff Hz (default 300) · **`range`** sweep range Hz (default 3000) · **`Q`** resonance (default 5) · **`attack`** envelope attack seconds (default 0.002) · **`release`** envelope release seconds (default 0.1) · **`sens`** input sensitivity multiplier (default 2) · **`fs`** sample rate

```js
import { autoWah } from '@audio/effect'

let p = { base: 300, range: 3000, Q: 5, sens: 2, fs: 44100 }
for (let buf of stream) autoWah(buf, p)
```

**Use when**: funk guitar, touch-sensitive filter sweeps, envelope filter<br>
**Not for**: LFO-driven wah (use wah with `mode: 'auto'`)

<!-- ![Auto-wah](plot/auto-wah.svg) -->


## Dynamics

Dynamics processing lives in [@audio/dynamics](https://github.com/audiojs/dynamics) — compressor, limiter, gate, expander, deesser, ducker, softclip, compand, multiband, character models (fet/opto/vca/varimu), leveler. See its README for the accurate API (sample-rate keys vary by processor; attack/release are in ms).


## Delay

Time-based echo and reverberation effects.

### Delay

Simple causal delay — dry signal mixed with delayed copy and optional feedback.

**`time`** non-negative seconds (default 0.25) · **`feedback`** gain per repeat (default 0.3) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** positive sample rate in Hz (default 44100)

```js
import { delay } from '@audio/effect'

const input = new Float32Array(14401)
input[0] = 1
const p = { time: 0.1, feedback: 0.5, mix: 0.5, fs: 48000 }
const output = delay(input, p)
console.log(output === input, output[4800], output[9600]) // true, 0.5, 0.25
```

The delay is `max(1, time * fs)` samples: zero and sub-sample times use one sample, keeping the feedback loop causal. A delay between two frames is read between them (linear interpolation); a time within a Float32 step of a whole frame, as a host passes it, reads that frame exactly (`delaySamples(time, fs)` from `@audio/effect-delay` gives the length). A new time moves the read across the call from the time the last call ended on, at most half a frame a frame farther back and a frame a frame nearer, as a tape delay's head runs between half speed and double; a farther move goes on across the calls after, and then the read sits on the time. The ring keeps its history while it holds the time: a ring too short for a longer time or a new `fs` is made anew, empty, so give `buffer` a `Float64Array` long enough (`floor(delaySamples(longest, fs)) + 2`) to keep it. Empty buffers do not advance or reset the line. Non-finite/negative time or non-finite/non-positive `fs` throws RangeError before modifying input/state.

Keep `abs(feedback) < 1` for a decaying tail; the direct function does not clamp feedback or mix. Reuse `p` across chunks, including silence to drain echoes, and use a fresh options object to reset. The `/audio` factory limits feedback to 0–0.95 and time to 0.001–4 seconds, and makes each ring for 4 seconds, so `time` is live: smoothed over 20 ms, it bends the echo's pitch as it moves. A move bends over those 20 ms where the host's ramp asks the read to go at most half a frame a frame farther or a frame a frame nearer: 10 ms longer or 20 ms shorter where each call of the ramp is 32 frames (at 48, 96 and 192 kHz in audio's host), less where a call of the ramp is cut shorter and carries a 32-frame step in its k frames: 20 · k / 64 ms longer or 20 · k / 32 ms shorter (5.6 and 11.3 ms at 44.1 kHz, whose 882-frame ramp ends in a call of 18; 7.8 and 15.6 ms at 22.05 kHz, a call of 25; 2.5 and 5 ms at 176.4 kHz, of 8; 1.25 and 2.5 ms at 88.2 kHz, of 4). A farther move bends the echo an octave at most, down while the time grows, for twice the increase, and up while it shrinks, for as long as the decrease (0.25 s to 2 s is 3.5 s an octave down); one that reverses while under way turns from an octave down to an octave up in one frame, two octaves at once. While the time shrinks the read runs faster than the line, and what the line holds above a quarter of the sample rate folds below it, as loud as it was. `sync` (`'off'`, `'1/2'`, `'1/4'`, `'1/4t'`, `'1/8d'`, `'1/8'`, `'1/8t'`, `'1/16'`; default `'off'`) sets the time to that note at the host's tempo (`ctx.transport.bpm`, a quarter note a beat; `d` dotted, `t` triplet), held to 4 seconds; a new tempo or note glides across the call after it, or bends at the read's bound where that is slower; `'off'` leaves `time` in charge. Its `tail(ctx)` estimates decay by 60 dB at the supplied settings, rather than imposing a fixed eight-second limit: 60 dB under the input's level, so it counts the echoes of a held sound piling up to `mix / (1 − feedback)` times it. A known `mix: 0` has no tail. Unknown automated mix retains the wet tail; non-finite time/feedback planning values reserve their declared maxima, and so does a sync to a note when the host hands the tail no transport (with one, the note at its tempo). This is not exact silence; hosts taking a finite snapshot must account for later automation, and a time cut short just before the input stops rings longer than the new time's tail while the read is still on its way down. Disconnected inputs are processed as silence so existing tails drain.

**Use when**: slap-back echo, rhythmic delays<br>
**Not for**: diffuse reverberation (use reverb)

<!-- ![Delay](plot/delay.svg) -->


### Multitap

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


### Ping-pong

Cross-fed stereo delay — left echo bounces to right, right to left.

**`time`** non-negative seconds (default 0.25) · **`feedback`** gain per repeat (default 0.4) · **`mix`** wet/dry 0–1 (default 0.5) · **`fs`** positive sample rate in Hz (default 44100)

```js
import { pingPong } from '@audio/effect'

let p = { time: 0.15, feedback: 0.5, mix: 0.5, fs: 44100 }
for (let [L, R] of stereoStream) pingPong(L, R, p)
```

Both channels must have equal lengths; a mismatch throws before processing. The delay is read as the mono delay reads it, between frames where it falls between them, and a new time moves both reads across the call from the time the last call ended on, as fast as the mono delay's read at most. Rings too short for a longer time are made anew, empty (give `_bufL` and `_bufR` long enough to keep them); empty channels do not advance or reset them. Reuse one params object for successive stereo chunks, or create a fresh one to reset. Time and sample-rate validation match the mono delay. Keep `abs(feedback) < 1` for decay; the direct function does not clamp it.

The `/audio` factory limits feedback to 0–0.9 and time to 0.01–2 seconds and makes both rings for 2 seconds, so `time` is live, smoothed over 20 ms; a far move bends the echoes an octave at most, as the mono delay's does. `sync` sets the time to a note at the host's tempo, as the mono delay's does, held to 2 seconds. Each block calls the in-place form. Its tail estimate describes 60 dB decay at the supplied settings (with sync on, at the note at the tempo the host hands it, or at the longest time where it hands none; a value not known yet reserves its range's longest), not a hard silence boundary; disconnected inputs drain through silent blocks.

**Use when**: stereo width from delays, spatial depth, rhythmic bounce effects<br>
**Not for**: mono output

<!-- ![Ping-pong](plot/ping-pong.svg) -->


### Reverb

Promoted to [`@audio/reverb`](https://github.com/audiojs/reverb) — Schroeder, Freeverb, Dattorro, convolution, FDN, spring, shimmer:

```js
import { freeverb } from '@audio/reverb'

let out = freeverb(buf, { decay: 0.84, damping: 0.5, mix: 0.3, fs: 44100 })
```


## Distortion

Non-linear waveshaping effects.

### Distortion / saturation

Four waveshaping types: cubic soft clip, hard clip, tanh saturation, and wavefolding.

**`drive`** distortion amount 0–1 (default 0.5, maps to 1–10× input gain) · **`type`** `'soft'` | `'hard'` | `'tanh'` | `'foldback'` (default `'soft'`) · **`mix`** wet/dry 0–1 (default 1) · **`fs`** sample rate

```js
import { distortion } from '@audio/effect'

// Soft saturation
let p = { drive: 0.6, type: 'soft', fs: 44100 }
for (let buf of stream) distortion(buf, p)

// Hard clip
distortion(buf, { drive: 0.8, type: 'hard' })

// Tanh (asymptotically smooth, never clips hard)
distortion(buf, { drive: 0.5, type: 'tanh' })

// Wavefolding (metallic/harsh)
distortion(buf, { drive: 0.7, type: 'foldback' })
```

| type | character | clamps at ±1 |
|---|---|---|
| `soft` | cubic saturation, smooth knee | yes |
| `hard` | brickwall clip, harsh | yes |
| `tanh` | asymptotically smooth | approaches 1 |
| `foldback` | metallic, complex harmonics | yes |

**Use when**: guitar overdrive, tube saturation, lo-fi crunch, harmonic enrichment<br>
**Not for**: transparent limiting (use limiter)

<!-- ![Distortion types](plot/distortion.svg) -->


### Exciter

Aphex-style aural exciter. Extracts the high band via SVF highpass, runs it through tanh saturation to synthesize harmonics, then mixes the harmonic residue back into the dry signal. Adds perceived "air" and "presence" without EQ boost.

**`fc`** highpass cutoff Hz (default 3000; `freq` still accepted) · **`drive`** saturation amount 0–1 (default 0.5, maps to 1–10× gain) · **`amount`** mix-in level 0–1 (default 0.5) · **`fs`** sample rate

```js
import { exciter } from '@audio/effect'

let p = { fc: 4000, drive: 0.6, amount: 0.4, fs: 44100 }
for (let buf of stream) exciter(buf, p)
```

**Use when**: dull vocals, lifeless cymbals, mastering polish, restoring high-end after compression<br>
**Not for**: spectral shaping (use a shelf/EQ from `@audio/filter`) — exciter *adds* harmonics, not gain

<!-- ![Exciter](plot/exciter.svg) -->


### Bitcrusher

Sample-rate reduction (zero-order hold) + bit-depth quantization.

**`bits`** target bit depth 1–24 (default 8) · **`rate`** sample rate ratio 0–1 (default 0.25, quarter rate) · **`fs`** sample rate

```js
import { bitcrusher } from '@audio/effect'

// 8-bit, quarter sample rate (lo-fi)
let p = { bits: 8, rate: 0.25, fs: 44100 }
for (let buf of stream) bitcrusher(buf, p)

// Bit depth only, no rate reduction
bitcrusher(buf, { bits: 4, rate: 1 })
```

**Use when**: lo-fi aesthetics, game audio, retro console sound, stutter effects<br>
**Not for**: smooth saturation (use distortion)

<!-- ![Bitcrusher](plot/bitcrusher.svg) -->


## Spatial

Stereo image and positioning effects. All take `(left, right, params)` and return `[left, right]`.

### Stereo widener

Mid/side processing to widen or narrow the stereo image.

**`width`** 0 = mono, 1 = unchanged, 2 = full side emphasis (default 1.5)

```js
import { stereoWidener } from '@audio/spatial'

let p = { width: 1.5 }
for (let [L, R] of stereoStream) stereoWidener(L, R, p)
```

**Use when**: widening narrow mixes, mono-compatibility check (width=0), mastering<br>
**Not for**: positioning a single source (use panner)

<!-- ![Stereo widener](plot/stereo-widener.svg) -->


### Haas effect

Delays one channel by 1–35 ms — creates phantom stereo from mono source.

**`time`** delay in seconds (default 0.02 = 20 ms) · **`channel`** `'left'` or `'right'` (default `'right'`) · **`fs`** sample rate

```js
import { haas } from '@audio/spatial'

let p = { time: 0.015, channel: 'right', fs: 44100 }
for (let [L, R] of stereoStream) haas(L, R, p)
```

**Use when**: mono-to-stereo widening, spatial placement, drum room simulation<br>
**Not for**: large delays (use ping-pong delay instead)

<!-- ![Haas effect](plot/haas.svg) -->


### Panner

Constant-power stereo panning using cos/sin law.

**`pan`** −1 = full left, 0 = center, +1 = full right (default 0)

```js
import { panner } from '@audio/spatial'

let p = { pan: -0.3 }
for (let [L, R] of stereoStream) panner(L, R, p)
```

**Use when**: placing sources in the stereo field<br>
**Not for**: 3D spatial audio

<!-- ![Panner](plot/panner.svg) -->


### Auto-panner

LFO-driven constant-power pan — signal sweeps between speakers periodically.

**`rate`** LFO rate in Hz (default 0.5) · **`depth`** sweep depth 0–1 (default 1, full excursion) · **`fs`** sample rate

```js
import { autoPanner } from '@audio/spatial'

let p = { rate: 0.5, depth: 1, fs: 44100 }
for (let [L, R] of stereoStream) autoPanner(L, R, p)
```

**Use when**: rhythmic stereo motion, ambient spatialization, auto-panning leads<br>
**Not for**: static placement (use [panner](#panner))

<!-- ![Auto-panner](plot/auto-panner.svg) -->


## Utility

Signal conditioning and mixing tools.

### Gain

Simple level adjustment in decibels.

**`dB`** gain in dB (default 0)

```js
import { gain } from '@audio/effect'

for (let buf of stream) gain(buf, { dB: -6 })
```

<!-- ![Gain](plot/gain.svg) -->


### Mixer

Sums an array of buffers with individual gain multipliers.

**`inputs`** array of `{ buffer, gain }` objects

```js
import { mixer } from '@audio/effect'

let out = mixer([
  { buffer: drums,  gain: 0.8 },
  { buffer: bass,   gain: 0.7 },
  { buffer: synth,  gain: 0.5 },
])
```

Returns a fresh Float64Array and leaves inputs unchanged. `mixer([])` returns an empty buffer. All input buffers must have equal lengths; otherwise it throws RangeError before summing.

**Use when**: combining signals, bus summing, stem mixing


### Slew limiter

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


### Noise shaping

Error-feedback quantization — shapes quantization noise out of the audible band.

**`bits`** target bit depth (default 16)

```js
import { noiseShaping } from '@audio/effect'

for (let buf of stream) noiseShaping(buf, { bits: 16 })
```

**Use when**: dithering before bit-depth reduction, quantization to lower bit depths<br>
**Not for**: audio compression (unrelated to lossy codecs)

<!-- ![Noise shaping](plot/noise-shaping.svg) -->


### Tape stop

Variable-rate playback with a decelerating (or accelerating) read pointer — turntable power-off / tape-deck stop, and the reverse spin-up. `tapeStop` works on the whole buffer in one call. `tapestopStream` from `@audio/effect-tapestop`, and the `/audio` factory with it, give the same stop over a stream, `at` seconds into it: they run as many frames late as flutter can speed the tape past the input at the stop's start (`lead(fs, options)`; none without flutter or in `'start'`).

**`at`** when the stop/start begins, in seconds (default 0) · **`time`** ramp duration in seconds (default 1) · **`curve`** speed-profile exponent — 1 = physical constant-torque linear decay, >1 = faster initial drop, <1 = held then dropping (default 1) · **`direction`** `'stop'` or `'start'` (default `'stop'`) · **`flutter`** 0–1 random rate wobble during the ramp (default 0)

```js
import { tapeStop } from '@audio/effect'

tapeStop(buf, { at: 2, time: 1.5, direction: 'stop', fs: 44100 })
```

**Use when**: DJ/turntable power-off, tape-deck stop/start, transition sweeps<br>
**Not for**: continuous pitch modulation (use vibrato) or tempo-locked time-stretch

<!-- ![Tape stop](plot/tape-stop.svg) -->
