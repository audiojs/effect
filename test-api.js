import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crossover from '@audio/eq-crossover'
import * as fx from '@audio/effect'
import { rotaryInPlace } from '@audio/effect-rotary'
import { rotary as rotaryFactory } from '@audio/effect-rotary/audio'
import { freqshift as freqshiftFactory } from '@audio/effect-freqshift/audio'
import { tapestop as tapestopFactory } from '@audio/effect-tapestop/audio'
import { autowah as autowahFactory } from '@audio/effect-autowah/audio'
import { exciter as exciterFactory } from '@audio/effect-exciter/audio'
import { sbr as sbrFactory } from '@audio/effect-sbr/audio'
import { subbass as subbassFactory } from '@audio/effect-subbass/audio'
import { slew as slewFactory } from '@audio/effect-slew/audio'
import { delay as delayFactory } from '@audio/effect-delay/audio'
import { pingpong as pingpongFactory } from '@audio/effect-pingpong/audio'
import { pingPongInPlace } from '@audio/effect-pingpong'
import { multitap as multitapFactory } from '@audio/effect-multitap/audio'
import { stutter as stutterFactory } from '@audio/effect-stutter/audio'
import { graindelay as graindelayFactory } from '@audio/effect-graindelay/audio'
import { chorus as chorusFactory } from '@audio/effect-chorus/audio'
import { flanger as flangerFactory } from '@audio/effect-flanger/audio'
import { phaser as phaserFactory } from '@audio/effect-phaser/audio'
import { tremolo as tremoloFactory } from '@audio/effect-tremolo/audio'
import { vibrato as vibratoFactory } from '@audio/effect-vibrato/audio'
import { wah as wahFactory } from '@audio/effect-wah/audio'
import { gain as gainFactory } from '@audio/effect-gain/audio'
import { lofi as lofiFactory } from '@audio/effect-lofi/audio'

const stereo = new Set(['pingPong', 'rotary'])
const kernels = Object.entries(fx).filter(([name]) => name !== 'mixer')
const signal = (Type, n) => Type.from({ length: n }, (_, i) => i === 0 ? 0.75 : 0.2 * Math.sin(i * 0.07))

for (const [name, process] of kernels) {
  test(`${name} — omitted/undefined options equal fresh defaults; preserve typed buffers and independent calls`, () => {
    for (const Type of [Float32Array, Float64Array]) {
      // A → A → different B, plus empty/smallest inputs, without retained state.
      for (const n of [0, 1, 513, 513, 7]) {
        const input = signal(Type, n), right = signal(Type, n).reverse()
        const run = (...opts) => {
          const a = input.slice(), b = right.slice()
          const result = stereo.has(name) ? process(a, b, ...opts) : process(a, ...opts)
          if (stereo.has(name)) { assert.equal(result[0], a); assert.equal(result[1], b) }
          else assert.equal(result, a)
          assert.ok(a.every(Number.isFinite), `${name}: finite left/mono samples`)
          assert.ok(b.every(Number.isFinite), `${name}: finite right samples`)
          return stereo.has(name) ? [a, b] : a
        }
        assert.deepEqual(run(), run({}))
        assert.deepEqual(run(undefined), run({}))
      }
    }
  })
}

for (const [name, process] of kernels.filter(([name]) => name !== 'tapeStop')) {
  test(`${name} — reused options preserve default streaming state across empty and boundary splits`, () => {
    for (const Type of [Float32Array, Float64Array]) {
      const input = signal(Type, 257), right = signal(Type, 257).reverse()
      const expected = input.slice(), expectedRight = right.slice()
      stereo.has(name) ? process(expected, expectedRight, {}) : process(expected, {})
      for (const split of [0, 1, 127, 128, 256, 257]) {
        const opts = {}, result = [], resultRight = []
        for (const [from, to] of [[0, split], [split, split], [split, input.length]]) {
          const a = input.slice(from, to), b = right.slice(from, to)
          stereo.has(name) ? process(a, b, opts) : process(a, opts)
          result.push(...a); resultRight.push(...b)
        }
        assert.deepEqual(result, [...expected])
        if (stereo.has(name)) assert.deepEqual(resultRight, [...expectedRight])
      }
    }
  })
}

// a delay of at(i) samples (at least 1) computed over the whole input, zeros before it, no ring: the read takes the
// samples floor(at) and floor(at) + 1 back, a + f·(b − a) for the fraction f; the line holds the input plus feedback of
// what was read (from the other channel for a ping-pong), and the output mixes the read in
const direct = (Type, xl, xr, at, feedback, mix, stereo) => {
  const n = xl.length, wl = new Float64Array(n), wr = new Float64Array(n), yl = new Type(n), yr = new Type(n)
  const read = (w, i, d) => { const D = Math.floor(d), f = d - D, a = w[i - D] ?? 0, b = w[i - D - 1] ?? 0; return f ? a + f * (b - a) : a }
  for (let i = 0; i < n; i++) {
    const l = read(wl, i, at(i)), r = read(wr, i, at(i))
    wl[i] = xl[i] + feedback * (stereo ? r : l); wr[i] = xr[i] + feedback * l
    yl[i] = xl[i] * (1 - mix) + l * mix; yr[i] = xr[i] * (1 - mix) + r * mix
  }
  return [yl, yr]
}

for (const name of ['delay', 'pingPong']) {
  const process = fx[name], isStereo = name === 'pingPong'
  const run = (a, b, opts) => isStereo ? process(a, b, opts) : process(a, opts)
  test(`${name} — exact impulse echoes, sample-rate units and causal minimum delay`, () => {
    for (const Type of [Float32Array, Float64Array]) {
      for (const fs of [44100, 48000, 96000]) {
        for (const time of [0, 0.25 / fs, 1 / fs, 0.001]) for (const feedback of [0, -0.5, 0.5, 1]) {
          const d = Math.max(1, Math.round(time * fs)), n = d * 5 + 1
          const input = new Type(n), right = new Type(n); input[0] = 1
          const opts = { fs, time, feedback, mix: 0.75 }
          run(input, right, opts)
          let expected = new Type(n), expectedRight = new Type(n); expected[0] = 0.25
          for (let repeat = 1; repeat * d < n; repeat++) {
            const channel = isStereo && repeat % 2 === 0 ? expectedRight : expected
            channel[repeat * d] = 0.75 * feedback ** (repeat - 1)
          }
          // 1 ms at 44.1 kHz is 44.1 frames: each echo lies between two frames, and each repeat is the last one read
          // between frames again
          if (!Number.isInteger(Math.max(1, time * fs))) {
            const x = new Type(n); x[0] = 1
            ;[expected, expectedRight] = direct(Type, x, new Type(n), () => time * fs, feedback, 0.75, isStereo)
            assert.ok(expected[44] && expected[45] && !expected[46], 'the first echo lies on frames 44 and 45')
          }
          assert.deepEqual(input, expected)
          if (isStereo) assert.deepEqual(right, expectedRight)
          for (const split of [0, d - 1, d, d + 1, n - 1, n]) {
            const a = new Type(n), b = new Type(n); a[0] = 1
            const p = { fs, time, feedback, mix: 0.75 }
            run(a.subarray(0, split), b.subarray(0, split), p)
            run(new Type(0), new Type(0), p)
            run(a.subarray(split), b.subarray(split), p)
            assert.deepEqual(a, expected)
            if (isStereo) assert.deepEqual(b, expectedRight)
          }
        }
      }
    }
  })

  test(`${name} – a new time glides from the last call's over the history the ring holds; a ring too short starts anew; empty writes change nothing`, () => {
    const fs = 8, opts = { fs, time: 0.5, feedback: 0, mix: 1 }
    run(Float64Array.of(1, 0, 0), new Float64Array(3), opts)
    const saved = structuredClone(opts)
    run(new Float64Array(0), new Float64Array(0), opts)
    assert.deepEqual(opts, saved)
    // 4 frames to 4.08 across a call of 2: 4.04 back finds nothing yet, 4.08 back the impulse, 0.08 of a frame off it.
    // No reallocation
    const buffer = isStereo ? opts._bufL : opts.buffer
    opts.time = 0.51
    const a = new Float64Array(2); run(a, new Float64Array(2), opts)
    assert.deepEqual(a, Float64Array.of(0, 1 + (0.51 * 8 - 4) * (0 - 1)))
    assert.equal(isStereo ? opts._bufL : opts.buffer, buffer)
    // from 4 frames to a shorter time the read sweeps across the next call over what the ring holds, passing the
    // impulse, as a delay computed over the whole input does; a longer time than the ring holds (6 frames, where a ring
    // made for 4 holds 5) starts a new, empty ring
    for (const [time, heard] of [[0.125, true], [0, true], [0.75, false]]) {
      const p = { fs, time: 0.5, feedback: 0, mix: 1 }, x = Float64Array.of(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
      run(x.subarray(0, 3), new Float64Array(3), p)
      p.time = time
      const out = x.subarray(3), right = new Float64Array(8)
      run(out, right, p)
      const to = Math.max(1, time * fs), [want] = direct(Float64Array, Float64Array.of(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), new Float64Array(11), i => i < 3 ? 4 : 4 + (to - 4) * (i - 2) / 8, 0, 1)
      if (heard) assert.deepEqual(out, want.subarray(3), `0.5 → ${time}`)
      else assert.deepEqual(out, new Float64Array(8), `0.5 → ${time}`)
      assert.equal(out.some(v => v !== 0), heard)
      assert.deepEqual(right, new Float64Array(8))
    }
    // a new fs that needs more than the ring holds starts a new one too
    opts.time = 0.5; opts.fs = 8
    run(Float64Array.of(1, 0, 0), new Float64Array(3), opts)
    opts.fs = 16
    const silence = new Float64Array(9); run(silence, new Float64Array(9), opts)
    assert.deepEqual(silence, new Float64Array(9))
  })

  test(`${name} — changing mix/feedback preserves queued audio and the ring allocation`, () => {
    const opts = { fs: 8, time: 0.25, feedback: 0, mix: 0 }
    const dry = Float64Array.of(1); run(dry, Float64Array.of(0), opts)
    assert.deepEqual(dry, Float64Array.of(1))
    const buffer = isStereo ? opts._bufL : opts.buffer
    opts.mix = 1; opts.feedback = 0.5
    const a = new Float64Array(4), b = new Float64Array(4); run(a, b, opts)
    assert.deepEqual(a, Float64Array.from(isStereo ? [0, 1, 0, 0] : [0, 1, 0, 0.5]))
    if (isStereo) assert.deepEqual(b, Float64Array.of(0, 0, 0, 0.5))
    assert.equal(isStereo ? opts._bufL : opts.buffer, buffer)
  })

  test(`${name} — invalid lengths/rates fail before modifying samples or state`, () => {
    for (const invalid of [{ time: -1 }, { time: NaN }, { time: Infinity }, { time: Number.MAX_VALUE }, { time: '1' }, { fs: 0 }, { fs: -1 }, { fs: NaN }, { fs: Infinity }, { fs: '44100' }]) {
      const opts = { ...invalid }, data = Float64Array.of(1, 0), right = Float64Array.of(0, 1)
      assert.throws(() => run(data, right, opts), RangeError)
      assert.deepEqual(data, Float64Array.of(1, 0)); assert.deepEqual(right, Float64Array.of(0, 1))
      assert.deepEqual(opts, invalid)
    }
  })
}

test('stereo effects — mismatched channel lengths fail before processing', () => {
  for (const process of [fx.pingPong, fx.rotary]) {
  const a = Float32Array.of(1), b = new Float32Array(0), opts = {}
  assert.throws(() => process(a, b, opts), /channel lengths must match/)
  assert.deepEqual(a, Float32Array.of(1)); assert.deepEqual(opts, {})
  }
})

// Stereo modulation: channel c's LFO runs c × `phase` degrees ahead of channel 0's (a chorus's c × phase / voices, as
// its voice set repeats every 360 / voices degrees). Name, meaning and ±180 range as
// Logic Pro's Phase control (its Phaser, and its Modulation Delay for chorus and flanging: "At 0°, the extreme values
// of the modulation are achieved simultaneously for all channels"); default 90 as Korg's X5DR Quadrature Chorus ("The
// modulation signals fed to each channel of this stereo chorus effect are 90 degrees out of phase with each other").
const modulation = { chorus: [fx.chorus, chorusFactory], flanger: [fx.flanger, flangerFactory], phaser: [fx.phaser, phaserFactory] }
// a render through the host factory at 48 kHz, in blocks of `block` frames, at its manifest defaults with `set` over them
// (a number as a Float32Array of length 1, an enum as its string)
const host = (factory, input, set = {}, block = input[0].length) => {
  const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
  const process = factory({ sampleRate: 48000, maxBlockSize: block, params }), out = input.map(c => new Float32Array(c.length))
  for (let i = 0; i < input[0].length; i += block) process([input.map(c => c.subarray(i, i + block))], [out.map(c => c.subarray(i, i + block))], params)
  return out
}
// a mono signal at the kernel defaults as the code gave it before `phase` (effect-chorus 2.0.2, effect-flanger 2.0.2,
// effect-phaser 1.1.6, commit afb05b6): frames 1000, 2000, 3000 and 4095 of signal(Float64Array, 4096)
const before = {
  chorus: [0.10905092165484911, 0.12188192691857747, -0.003635995550264462, -0.05547007839936041],
  flanger: [0.058093003845874375, 0.060950373917718736, -0.019660749385594062, -0.12388903626842045],
  phaser: [0.03515515702769045, 0.0309460678488528, 0.013443471362652587, -0.020715455172520943],
}

for (const [name, [kernel, factory]] of Object.entries(modulation)) {
  test(`${name} – phase: identical left and right come out different at the default, equal at 0`, () => {
    const x = signal(Float32Array, 4800)
    const [l, r] = host(factory, [x, x.slice()])
    let diff = 0
    for (let i = 0; i < l.length; i++) diff = Math.max(diff, Math.abs(l[i] - r[i]))
    assert.ok(diff > 0.05, `max |L − R| = ${diff} at the default phase`)
    const [l0, r0] = host(factory, [x, x.slice()], { phase: 0 })
    assert.deepEqual(l0, r0)
  })

  test(`${name} – phase: a mono signal as before, the kernel's default the manifest's, blocks equal to whole`, () => {
    const mono = kernel(signal(Float64Array, 4096))
    // within 1e-12, not bit for bit: the last bits of Math.sin/Math.tan vary between V8 versions (the phaser's here
    // between Node 20 and 25); a shift of 1° moves these frames by more than 2e-4
    for (const [k, i] of [1000, 2000, 3000, 4095].entries())
      assert.ok(Math.abs(mono[i] - before[name][k]) < 1e-12, `frame ${i}: ${mono[i]}, before ${before[name][k]}`)
    // channel 0 never moves, whatever the phase: bit for bit on this engine
    for (const phase of [0, -180, 45]) assert.deepEqual(kernel(signal(Float64Array, 4096), { phase }), mono)
    assert.equal(factory.params.phase.default, 90)
    assert.deepEqual(kernel(signal(Float64Array, 4096), { channel: 1 }), kernel(signal(Float64Array, 4096), { channel: 1, phase: 90 }))
    assert.notDeepEqual(kernel(signal(Float64Array, 4096), { channel: 1 }), mono)
    const x = signal(Float32Array, 1000), whole = host(factory, [x, x.slice()])
    assert.deepEqual(host(factory, [x, x.slice()], {}, 128), whole)
    // one channel through the host is the left of two
    assert.deepEqual(host(factory, [x]), [whole[0]])
  })
}

test('chorus – phase: identical left and right come out different for every voice count, at 90 and 180', () => {
  // the voices sit 360 / voices degrees of LFO apart, so a lead of whole spacings only reorders them and left equals
  // right; `phase` offsets the channels within one spacing. Smallest max |L − R| of these sixteen: 0.074 (8 voices at
  // 180). When the lead was `phase` degrees of LFO, 4 and 8 voices at 90 and every even count at 180 gave under 1e-10
  const x = signal(Float32Array, 4800)
  for (const phase of [90, 180]) for (let voices = 1; voices <= 8; voices++) {
    const [l, r] = host(chorusFactory, [x, x.slice()], { voices, phase })
    let diff = 0
    for (let i = 0; i < l.length; i++) diff = Math.max(diff, Math.abs(l[i] - r[i]))
    assert.ok(diff > 0.05, `${voices} voices at ${phase}: max |L − R| = ${diff}`)
  }
})

// tremolo, vibrato and wah before `phase` (effect-tremolo 1.1.5, effect-vibrato 2.0.2, effect-wah 1.1.5, commit
// afb05b6): frames 1000, 2000, 3000 and 4095 of signal(Float64Array, 4096) at the kernel defaults
const unmoved = {
  tremolo: [0.09079145074861948, 0.09854567764696516, 0.050423106673022536, -0.09618221532340483],
  vibrato: [-0.191440818598427, 0.16209973804204236, -0.1919620776689689, -0.18096095133812423],
  wah: [0.0762177726619045, -0.009908712678650893, -0.06752272282219102, -0.05463021688007396],
}
for (const [name, [kernel, factory]] of Object.entries({ tremolo: [fx.tremolo, tremoloFactory], vibrato: [fx.vibrato, vibratoFactory], wah: [fx.wah, wahFactory] })) {
  test(`${name} – phase: 0 by default, so every channel sounds as before; any other value moves channel 1 on`, () => {
    const mono = kernel(signal(Float64Array, 4096))
    for (const [k, i] of [1000, 2000, 3000, 4095].entries())
      assert.ok(Math.abs(mono[i] - unmoved[name][k]) < 1e-12, `frame ${i}: ${mono[i]}, before ${unmoved[name][k]}`)
    assert.equal(factory.params.phase.default, 0)
    // bit for bit on this engine: the default leaves every channel's LFO where it was, and channel 0's at any phase
    for (let channel = 1; channel < 8; channel++) assert.deepEqual(kernel(signal(Float64Array, 4096), { channel }), mono)
    for (const phase of [-180, 45, 180]) assert.deepEqual(kernel(signal(Float64Array, 4096), { phase }), mono)
    assert.notDeepEqual(kernel(signal(Float64Array, 4096), { channel: 1, phase: 180 }), mono)
    const x = signal(Float32Array, 1000), [l, r] = host(factory, [x, x.slice()])
    assert.deepEqual(l, r)
    const whole = host(factory, [x, x.slice()], { phase: 90 })
    assert.notDeepEqual(whole[0], whole[1])
    assert.deepEqual(host(factory, [x, x.slice()], { phase: 90 }, 128), whole)
    assert.deepEqual(host(factory, [x], { phase: 90 }), [whole[0]])
  })
}

test('tremolo – phase: 180 is an auto-pan, the gains of left and right adding to 2 − depth', () => {
  // Ableton Live 12 manual, Auto Pan-Tremolo: "At 180°, the LFOs are perfectly out of phase so that when one LFO
  // reaches its peak value, the other is at its minimum"
  const ones = new Float32Array(9600).fill(1)   // one cycle of the default 5 Hz at 48 kHz
  for (const depth of [0.5, 1]) {
    const [l, r] = host(tremoloFactory, [ones, ones.slice()], { phase: 180, depth })
    for (let i = 0; i < l.length; i++) assert.ok(Math.abs(l[i] + r[i] - (2 - depth)) < 1e-6, `frame ${i}: ${l[i]} + ${r[i]}`)
    assert.ok(Math.min(...l) < 1 - depth + 1e-6 && Math.max(...l) > 1 - 1e-6, 'left swings over the whole depth')
  }
})

test('wah – phase: at 180 identical left and right sweep opposite ways; in manual mode there is no sweep to offset', () => {
  // Ableton Live 12 manual, Auto Filter, LFO Phase: "At 180°, the channels are perfectly out of phase, so that when one
  // LFO reaches its peak, the other is at its minimum"
  const x = signal(Float32Array, 48000)
  const [l, r] = host(wahFactory, [x, x.slice()], { phase: 180 })
  let diff = 0
  for (let i = 0; i < l.length; i++) diff = Math.max(diff, Math.abs(l[i] - r[i]))
  assert.ok(diff > 0.05, `max |L − R| = ${diff} at 180`)
  // the right is the left of a sweep half a cycle on: channel 0 of a kernel whose LFO starts at π
  const half = fx.wah(Float64Array.from(x), { fs: 48000, _lp: 0, _bp: 0, _phase: Math.PI })
  let off = 0
  for (let i = 0; i < r.length; i++) off = Math.max(off, Math.abs(r[i] - half[i]))
  assert.ok(off < 1e-6, `max |R − sweep from π| = ${off}`)
  const [ml, mr] = host(wahFactory, [x, x.slice()], { phase: 180, mode: 'manual' })
  assert.deepEqual(ml, mr)
})

// a render as a host makes one when `phase` (or the param `name`) changes (CONTRACT 1.0, Parameters: a linear ramp over
// `smoothing` seconds, and no call longer than 32 frames while it moves): `from` until frame `at`, then `to`, in calls
// of `call` frames
const ramp = (factory, x, from, to, at, call, name = 'phase') => {
  const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(p.default) : p.default]))
  const process = factory({ sampleRate: 48000, maxBlockSize: 128, params }), out = [new Float32Array(x.length), new Float32Array(x.length)]
  const frames = (factory.params[name].smoothing ?? 0) * 48000
  for (let i = 0, n; i < x.length; i += n) {
    n = Math.min(128, x.length - i, i < at ? at - i : i < at + frames ? call : 128)
    params[name][0] = i < at ? from : from + (to - from) * Math.min(1, (i + n - at) / frames)
    process([[x, x].map(c => c.subarray(i, i + n))], [out.map(c => c.subarray(i, i + n))], params)
  }
  return out
}
const lfos = { ...modulation, tremolo: [fx.tremolo, tremoloFactory], vibrato: [fx.vibrato, vibratoFactory], wah: [fx.wah, wahFactory] }
for (const [name, [kernel, factory]] of Object.entries(lfos)) {
  test(`${name} – phase: a change glides over its smoothing, the same in calls of 32 frames as of 1`, () => {
    // smoothed as this family's `mix`; the kernel joins the host's steps, so the LFO never jumps within a sample. Before
    // that, the steps of a 32-frame ramp left the output 0.01 (tremolo) to 1.1 away from a 1-frame one on this 1 kHz tone
    assert.equal(factory.params.phase.smoothing, 0.02)
    const x = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 1000 * i / 48000))
    for (const [from, to] of [[0, 180], [90, -45]]) {
      const a = ramp(factory, x, from, to, 1000, 32)[1], b = ramp(factory, x, from, to, 1000, 1)[1]
      let diff = 0
      for (let i = 0; i < a.length; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]))
      assert.ok(diff < 1e-6, `${from} → ${to}: max |32-frame − 1-frame| = ${diff}`)
    }
  })

  test(`${name} – phase: channel c leads by c × phase, so at 90 channel 4 runs with channel 0`, () => {
    for (const opts of name === 'chorus' ? [1, 2, 3, 4, 5, 6, 7, 8].map(voices => ({ voices })) : [{}]) {
      const mono = kernel(signal(Float64Array, 4096), { ...opts }), four = kernel(signal(Float64Array, 4096), { ...opts, channel: 4, phase: 90 })
      let diff = 0
      for (let i = 0; i < mono.length; i++) diff = Math.max(diff, Math.abs(four[i] - mono[i]))
      assert.ok(diff < 1e-9, `${JSON.stringify(opts)}: max |channel 4 − channel 0| = ${diff}`)
    }
  })
}

// `depth` moves a delay read as `phase` does (a jump of 0.3 → 0.9 moved the chorus's read up to 576 samples within one
// sample), so it is smoothed and glided in the same way. Vibrato's depth was a restart setting, as it sized the ring
for (const [name, factory] of Object.entries({ chorus: chorusFactory, flanger: flangerFactory, vibrato: vibratoFactory })) {
  test(`${name} – depth: a change glides over its smoothing, the same in calls of 32 frames as of 1`, () => {
    // within 4e-6: the host hands each call a Float32 depth, up to one ulp (6e-8 below 1) off the values the 1-frame
    // calls take; through the read's reach per unit of depth (the chorus 960 samples at its 0.5 mix, the flanger 144
    // with its feedback, the vibrato 576) on this tone's steepest slope (0.065 a sample), and the rounding of the
    // Float32 output, that is at most 2.4e-6. Measured: 0.9e-6 (chorus), 0.7e-6 (flanger), 1.6e-6 (vibrato). Without
    // the kernel's glide, the steps of a 32-frame ramp left the chorus and the flanger 0.32 to 0.59 apart
    assert.equal(factory.params.depth.smoothing, 0.02)
    const x = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 1000 * i / 48000))
    const far = (a, b, from = 0) => { let m = 0; for (let i = from; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m }
    for (const [from, to] of [[0.3, 0.9], [0.9, 0.1], [0, 1]]) {
      const a = ramp(factory, x, from, to, 1000, 32, 'depth')[1], b = ramp(factory, x, from, to, 1000, 1, 'depth')[1]
      assert.ok(far(a, b) < 4e-6, `${from} → ${to}: max |32-frame − 1-frame| = ${far(a, b)}`)
      // the change is heard: the end of the render is the render at `to` (equal for chorus and vibrato; the flanger's
      // feedback still carries up to 0.006 of the ramp), and more than 0.27 from the render at `from`
      const atTo = ramp(factory, x, to, to, 1000, 1, 'depth')[1], atFrom = ramp(factory, x, from, from, 1000, 1, 'depth')[1]
      assert.ok(far(a, atTo, 4000) < 0.01 && far(a, atFrom, 4000) > 0.1, `${from} → ${to}: the end ${far(a, atTo, 4000)} from the render at ${to}, ${far(a, atFrom, 4000)} from that at ${from}`)
      // a depth that holds leaves every read where it was, whatever the calls: bit for bit
      assert.deepEqual(ramp(factory, x, to, to, 1000, 32, 'depth')[1], atTo)
    }
  })
}

test('vibrato – a live depth: the ring keeps each sample at its age as it grows, and the LFO runs on', () => {
  // against the same LFO, glide and linear interpolation over the whole input (zeros before it), with no ring, through
  // calls of 1 to 400 frames at depths from 0 to 1. Depth sized the ring, so a deeper one dropped what it held and
  // restarted the LFO
  const fs = 48000, maxSwing = 0.006, inc = 2 * Math.PI * 7 / fs   // vibrato.js maxSwing
  const at = (h, pos) => { const i = Math.floor(pos), f = pos - i, a = h[i] ?? 0, b = h[i + 1] ?? 0; return a + f * (b - a) }
  const x = Float64Array.from({ length: 24000 }, (_, i) => 0.2 * Math.sin(i * 0.07) + 0.3 * Math.sin(i * 0.011))
  const y = x.slice(), ref = new Float64Array(x.length), p = { rate: 7, fs }
  for (let t = 0, k = 0, ph = 0, was; t < x.length; k++) {
    const l = Math.min(1 + (k * 97) % 400, x.length - t), depth = Math.min(1, (k * 0.618) % 1.2), from = was ?? depth
    p.depth = depth
    fx.vibrato(y.subarray(t, t + l), p)
    for (let i = 0; i < l; i++) {
      ref[t + i] = at(x, t + i - (from + (depth - from) * (i + 1) / l) * maxSwing * fs * (1 + Math.sin(ph)))
      ph += inc; if (ph > 2 * Math.PI) ph -= 2 * Math.PI
    }
    was = depth; t += l
  }
  let diff = 0
  for (let i = 0; i < x.length; i++) diff = Math.max(diff, Math.abs(y[i] - ref[i]))
  assert.ok(diff < 1e-12, `max |kernel − reference| = ${diff}`)
})

test('chorus, flanger, phaser, tremolo, vibrato, wah – a value that is not finite is not kept to glide from', () => {
  // `_glide` holds where a call ended (the lead, then the depth), for the next to glide from, NaN before the first
  // call: a NaN kept there spoiled the next call too. Chorus, tremolo and vibrato keep nothing else of a call's output,
  // so their next call is clean. The flanger's feedback ring and the phaser's and wah's filter states take such a
  // call's output in, as from any other value that is not finite
  const glides = { chorus: ['phase', 'depth'], flanger: ['phase', 'depth'], phaser: ['phase'], tremolo: ['phase'], vibrato: ['phase', 'depth'], wah: ['phase'] }
  const clean = new Set(['chorus', 'tremolo', 'vibrato'])
  for (const [name, keys] of Object.entries(glides)) for (const key of keys) for (const bad of [NaN, Infinity]) for (const first of [false, true]) {
    const kept = key === 'phase' ? 0 : 1, good = key === 'phase' ? 45 : 0.4, p = { channel: 1, fs: 48000 }, held = () => p._glide ? p._glide[kept] : NaN
    if (!first) { p[key] = good; fx[name](signal(Float64Array, 256), p) }
    const before = held()
    p[key] = bad; fx[name](signal(Float64Array, 256), p)
    assert.ok(p._glide instanceof Float64Array, `${name}: the glide memory is kept in _glide`)
    assert.equal(held(), before, `${name}, ${key} ${bad}${first ? ' first' : ''}: _glide[${kept}] = ${held()}`)
    p[key] = good
    const y = fx[name](signal(Float64Array, 256), p)
    if (clean.has(name)) assert.ok(y.every(Number.isFinite), `${name}: the call after ${key} ${bad}${first ? ' first' : ''} is finite`)
  }
})

test('chorus/flanger – the ring holds the farthest read at depth 1, and the flanger reads no nearer than one sample', () => {
  // against the same LFO and linear interpolation over the whole input (zeros before it), with no ring. The ring was
  // floor(2·delay·fs) long: at depth 1 a read 2·delay·fs back wrapped onto the newest samples (here the chorus 0.075 to
  // 0.29 off, the flanger up to 0.44), and a flanger read under one sample back took the oldest (up to 1.5 off)
  const at = (h, pos) => { const i = Math.floor(pos), f = pos - i, a = h[i] ?? 0, b = h[i + 1] ?? 0; return a + f * (b - a) }
  const chorusRef = (x, { rate, depth, delay, voices, fs }) => {
    const y = new Float64Array(x.length), inc = 2 * Math.PI * rate / fs
    const ph = Float64Array.from({ length: voices }, (_, v) => v / voices * 2 * Math.PI)
    for (let t = 0; t < x.length; t++) {
      let wet = 0
      for (let v = 0; v < voices; v++) {
        wet += at(x, t - delay * fs * (1 + depth * Math.sin(ph[v])))
        ph[v] += inc; if (ph[v] > 2 * Math.PI) ph[v] -= 2 * Math.PI
      }
      y[t] = (x[t] + wet / voices) * 0.5
    }
    return y
  }
  // a feedback loop reads at least one sample back: it cannot read the sample it is about to write
  const flangerRef = (x, { rate, depth, delay, feedback, fs }) => {
    const y = new Float64Array(x.length), w = new Float64Array(x.length), inc = 2 * Math.PI * rate / fs
    for (let t = 0, ph = 0; t < x.length; t++) {
      const wet = at(w, t - Math.max(1, delay * fs * (1 + depth * Math.sin(ph))))
      ph += inc; if (ph > 2 * Math.PI) ph -= 2 * Math.PI
      w[t] = x[t] + feedback * wet
      y[t] = x[t] + wet
    }
    return y
  }
  const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m }
  const x = Float64Array.from({ length: 24000 }, (_, i) => i === 0 ? 0.75 : 0.2 * Math.sin(i * 0.07) + 0.3 * Math.sin(i * 0.011))
  for (const fs of [44100, 48000]) {
    for (const delay of [0.002, 0.02, 0.05]) for (const voices of [1, 3]) {
      const o = { rate: 10, depth: 1, delay, voices, fs }, d = maxDiff(fx.chorus(x.slice(), { ...o }), chorusRef(x, o))
      assert.ok(d < 1e-12, `chorus ${JSON.stringify(o)}: max |kernel − reference| = ${d}`)
    }
    for (const delay of [0.0001, 0.003, 0.02]) {
      const o = { rate: 5, depth: 1, delay, feedback: 0.5, fs }, d = maxDiff(fx.flanger(x.slice(), { ...o }), flangerRef(x, o))
      assert.ok(d < 1e-12, `flanger ${JSON.stringify(o)}: max |kernel − reference| = ${d}`)
    }
  }
})

test('flanger – the tail covers the decay while the LFO holds the farthest read', () => {
  // channel 1 at phase 90 starts its LFO at the peak, and at 0.02 Hz it stays near there, so each pass through the
  // loop takes about 2 × delay. The last frame of a unit impulse's response above 1e-3 (−60 dB) is within the tail
  for (const feedback of [0.5, 0.9]) {
    const tail = flangerFactory.tail({ sampleRate: 48000, params: { feedback: Float32Array.of(feedback) } })
    const x = new Float32Array(Math.ceil((tail + 1) * 48000)); x[0] = 1
    const [, r] = host(flangerFactory, [x, x.slice()], { rate: 0.02, depth: 1, delay: 0.02, feedback, phase: 90 })
    let last = r.length - 1
    while (last > 0 && Math.abs(r[last]) <= 1e-3) last--
    assert.ok(last / 48000 <= tail, `feedback ${feedback}: above −60 dB until ${last / 48000} s, tail ${tail} s`)
  }
})

test('chorus/flanger — zero and fractional-sample rings stay finite and chunk-invariant', () => {
  for (const [process, expected] of [[fx.chorus, [1, 0, 0]], [fx.flanger, [1, 1, 0]]]) {
    const data = Float64Array.of(1, 0, 0)
    process(data, { delay: 0, feedback: 0, fs: 48000 })
    assert.deepEqual([...data], expected)
    const input = signal(Float64Array, 129)
    const whole = input.slice(); process(whole, { delay: 0.1 / 48000, fs: 48000 })
    const split = input.slice(), opts = { delay: 0.1 / 48000, fs: 48000 }
    process(split.subarray(0, 128), opts); process(split.subarray(128), opts)
    assert.ok(whole.every(Number.isFinite)); assert.deepEqual(split, whole)
  }
})

test('multitap — default tap cache is reused between blocks', () => {
  const opts = {}
  fx.multitap(Float32Array.of(1), opts)
  const taps = opts._tapSamples, buffer = opts.buffer
  fx.multitap(Float32Array.of(0), opts)
  assert.equal(opts._tapSamples, taps); assert.equal(opts.buffer, buffer)
})

test('delay factory — dry bypass has no tail; unknown automation reserves a finite tail', () => {
  const params = { time: Float32Array.of(0.25), feedback: Float32Array.of(0.3), mix: Float32Array.of(0) }
  for (const sampleRate of [16000, 48000, 96000]) {
    for (const mix of [0, -1]) {
      params.mix[0] = mix
      assert.equal(delayFactory.tail({ sampleRate, params }), 0)
    }
    for (const mix of [0.5, 1, NaN]) {
      params.mix[0] = mix
      assert.ok(delayFactory.tail({ sampleRate, params }) > 0)
    }
    const automated = { ...params, time: Float32Array.of(NaN), feedback: Float32Array.of(NaN) }
    const max = { ...params, time: Float32Array.of(4), feedback: Float32Array.of(0.95) }
    const tail = delayFactory.tail({ sampleRate, params: automated })
    assert.ok(Number.isFinite(tail))
    assert.ok(tail >= delayFactory.tail({ sampleRate, params: max }))
  }
})

test('delay factories — tail follows settings, reaches -60 dB, and includes long feedback echoes', () => {
  for (const factory of [delayFactory, pingpongFactory]) {
    for (const sampleRate of [44100, 48000, 96000]) {
      for (const feedback of [0, 0.3, factory.params.feedback.max]) {
        const params = { time: Float32Array.of(factory.params.time.max), feedback: Float32Array.of(feedback) }
        const time = Math.round(params.time[0] * sampleRate) / sampleRate
        const tail = factory.tail({ sampleRate, params }), fb = params.feedback[0]
        assert.ok(Number.isFinite(tail) && tail >= time)
        if (fb === 0) assert.equal(tail, time)
        else {
          assert.ok(fb ** (Math.floor(tail / time) - 1) <= 1e-3)
          assert.ok(tail > 8, 'maximum delay with feedback needs more than eight seconds')
        }
      }
    }
  }
})

test('delay factories – a host\'s Float32 time puts the echo and the tail on the nearest frame', () => {
  // 10 ms reaches the factory as Float32 0.009999999776: 479.99999 frames at 48 kHz, 959.99998 at 96 kHz
  for (const factory of [delayFactory, pingpongFactory]) {
    for (const sampleRate of [44100, 48000, 96000]) {
      const params = { time: Float32Array.of(0.01), feedback: Float32Array.of(0), mix: Float32Array.of(1) }
      const d = sampleRate / 100, process = factory({ sampleRate, maxBlockSize: d + 1, params })
      const input = [new Float32Array(d + 1), new Float32Array(d + 1)], out = [new Float32Array(d + 1), new Float32Array(d + 1)]
      input[0][0] = 1
      process([input], [out], params)
      const expected = new Float32Array(d + 1); expected[d] = 1
      assert.deepEqual(out[0], expected)
      assert.equal(factory.tail({ sampleRate, params }), d / sampleRate)
    }
  }
})

test('delay factories — disconnected inputs drain tails, channels and instances remain independent', () => {
  for (const factory of [delayFactory, pingpongFactory]) {
    const params = { time: Float32Array.of(0.001), feedback: Float32Array.of(0.5), mix: Float32Array.of(1) }
    const sampleRate = 48000, d = Math.round(params.time[0] * sampleRate)
    const channels = factory === delayFactory ? 9 : 2
    const make = () => factory({ sampleRate, maxBlockSize: 128, params })
    const process = make(), fresh = make()
    const input = Array.from({ length: channels }, () => new Float32Array(d))
    input[0][0] = 1
    const output = () => Array.from({ length: channels }, () => new Float32Array(d).fill(123))
    let out = output(); process([input], [out], params)
    assert.ok(out.every(channel => channel.every(x => x === 0)))
    for (let repeat = 1; repeat <= 3; repeat++) {
      out = output(); process([[]], [out], params)
      for (let c = 0; c < channels; c++) {
        const expected = new Float32Array(d)
        if (c === (factory === pingpongFactory ? (repeat - 1) % 2 : 0)) expected[0] = 0.5 ** (repeat - 1)
        assert.deepEqual(out[c], expected)
      }
    }
    out = output(); fresh([[]], [out], params)
    assert.ok(out.every(channel => channel.every(x => x === 0)), 'a fresh instance has no old tail')
  }
})


test('mixer — empty/equal-length inputs return a fresh exact sum; mismatches reject before mutation', () => {
  assert.deepEqual(fx.mixer([]), new Float64Array(0))
  const a = Float32Array.of(1, -0.5), b = Float64Array.of(0.25, 1)
  const mixed = fx.mixer([{ buffer: a }, { buffer: b, gain: 2 }])
  assert.deepEqual(mixed, Float64Array.of(1.5, 1.5))
  assert.notEqual(mixed, a); assert.notEqual(mixed, b)
  assert.deepEqual(a, Float32Array.of(1, -0.5)); assert.deepEqual(b, Float64Array.of(0.25, 1))
  assert.deepEqual(fx.mixer([{ buffer: new Float32Array(0) }]), new Float64Array(0))
  for (const length of [0, 1, 3]) {
    assert.throws(() => fx.mixer([{ buffer: a }, { buffer: new Float64Array(length) }]), /buffer lengths must match/)
    assert.deepEqual(a, Float32Array.of(1, -0.5))
  }
})

// CONTRACT 1.0 over the family: state made by the processor, every param live but one that sets the latency or the size
// of what is allocated, tails declared, streaming where the algorithm allows it

// the kernels before their state left `process` (effect-lofi 1.1.6, effect-sbr 1.2.1, effect-subbass 1.2.0,
// effect-distortion 1.1.5, effect-rotary 0.1.2, effect-tapestop 0.1.2 with `at` on its nearest frame): frames 1000,
// 2000, 3000 and 4095 of signal(Float64Array, 4096)
const kept = {
  lofi: [0.2836473938558673, 0.41358521094412143, 0.31524918597903656, -0.16442362968615745],
  sbr: [0.1547783377871543, 0.19525522962438896, 0.09337244072686879, -0.13851632751150406],
  subbass: [0.15480650041607805, 0.19232593017047311, 0.08802107444862586, -0.1401189223487335],
  'distortion soft': [1, 1, 0.9684548706885463, -1],
  'distortion hard': [1, 1, 0.8512477033837756, -1],
  'distortion foldback': [0.5915189595646417, 0.21596381981863289, 0.8512477033837756, -0.7394927002064724],
  'distortion tanh': [0.8871711402975117, 0.9451275995843657, 0.6917207368698779, -0.8512039067191511],
  'rotary left': [-0.22518254145481725, -0.2039095972559546, -0.03309299757766222, 0.21410028877756537],
  'rotary right': [-0.2182202571052931, -0.16388903248241318, 0.01092905613936511, 0.2126910828921249],
  tapestop: [-0.15831113450768725, 0.15251155551910656, -0.17333148655485625, 0.013865762198643074],
}
test('lofi, sbr, subbass, distortion, rotary, tapestop – the sound as before their state left process', () => {
  // within 1e-12, as the phase tests above: the last bits of Math.sin, tanh and pow vary between V8 versions
  const near = (y, name) => [1000, 2000, 3000, 4095].forEach((i, k) => assert.ok(Math.abs(y[i] - kept[name][k]) < 1e-12, `${name}, frame ${i}: ${y[i]}, before ${kept[name][k]}`))
  for (const name of ['lofi', 'sbr', 'subbass']) near(fx[name](signal(Float64Array, 4096)), name)
  for (const type of ['soft', 'hard', 'foldback', 'tanh']) near(fx.distortion(signal(Float64Array, 4096), { type, drive: 0.9 }), `distortion ${type}`)
  const [l, r] = fx.rotary(signal(Float64Array, 4096), signal(Float64Array, 4096), { depth: 0.8, micSpread: 1 })
  near(l, 'rotary left'); near(r, 'rotary right')
  near(fx.tapeStop(signal(Float64Array, 4096), { time: 0.09, flutter: 0.5, fs: 48000 }), 'tapestop')
})

// CONTRACT 1.0, process: "Allocate nothing". A warm process() in a child Node with a 1 MB young generation, counted over
// 2^16 blocks of 8 frames: a collection is 1 MB, so 16 bytes a block show. Each processor at its defaults, at the
// branches its settings pick, and with each param that resizes, reshapes or moves a read changing every block (the
// host's tempo too, where sync reads it). The cases run one after another in one process, as a host makes instances:
// state a kernel completed itself gave a second instance another shape, and V8 then allocated (multitap). Where V8
// boxes a number moves with its version, so this holds where it was measured: Node 20, 22 and 25
const held = ['autowah', 'bitcrusher', 'chorus', 'delay', 'distortion', 'exciter', 'flanger', 'freqshift', 'gain', 'graindelay', 'lofi', 'multitap', 'noiseshaper', 'phaser', 'pingpong', 'ringmod', 'rotary', 'sbr', 'slew', 'stutter', 'subbass', 'tapestop', 'tremolo', 'vibrato', 'wah']
test('the processors allocate nothing in process, at their defaults and as their live params move', { skip: +process.versions.node.split('.')[0] < 20 && 'measured on Node 20 and later' }, () => {
  const cases = [
    ...held.map(name => [name]),
    ['distortion', { type: 'tanh' }], ['distortion', { type: 'foldback', drive: 1 }], ['distortion', { type: 'hard' }], ['wah', { mode: 'manual' }],
    ['lofi', { noise: 1, crackle: 1, drive: 1 }], ['tapestop', { flutter: 1, time: 0.05 }], ['tapestop', { direction: 'start', flutter: 0.5, time: 0.05 }],
    ['chorus', {}, 'delay', 0.002, 0.05], ['chorus', {}, 'voices', 1, 8], ['flanger', {}, 'delay', 0.0001, 0.02], ['phaser', {}, 'stages', 2, 12],
    ['vibrato', {}, 'depth', 0, 1], ['rotary', {}, 'crossover', 200, 3000], ['rotary', {}, 'depth', 0, 1], ['rotary', {}, 'micSpread', 0, 3],
    ['delay', {}, 'time', 0.001, 4], ['delay', { sync: '1/8' }], ['delay', { sync: '1/8' }, 'bpm', 60, 180], ['delay', {}, 'sync', 'off', '1/4t'],
    ['pingpong', {}, 'time', 0.01, 2], ['pingpong', { sync: '1/8d' }, 'bpm', 90, 140], ['multitap', {}, 'feedback', 0, 0.9],
    ['stutter', {}, 'interval', 0.05, 2], ['stutter', {}, 'slice', 0.01, 1], ['graindelay', { pitch: 7, jitter: 5, spray: 0.1 }],
    ['graindelay', {}, 'time', 0.02, 1.5], ['graindelay', {}, 'pitch', -24, 24], ['graindelay', {}, 'grain', 0.01, 0.3],
  ].map(([name, set = {}, key, a, b]) => [import.meta.resolve(`@audio/effect-${name}/audio`), name, set, key, a, b])
  const child = `
    import { PerformanceObserver } from 'node:perf_hooks'
    const counts = []
    for (const [url, name, set, key, a, b] of JSON.parse(process.argv[1])) {
      const m = (await import(url))[name], given = () => Object.fromEntries(Object.entries(m.params).map(([k, s]) => [k, s.type === 'number' ? Float32Array.of(set[k] ?? s.default) : set[k] ?? s.default]))
      const params = given(), transport = { playing: false, bpm: 120, beat: 0, barStart: 0, timeSig: [4, 4] }
      const proc = m({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 32, params: given(), buffers: {}, transport })
      const n = m.channels?.inputs ?? 2, src = Array.from({ length: n }, (_, c) => Float32Array.from({ length: 512 }, (_, i) => 0.5 * Math.sin(i * 0.1 + c) + 0.1 * Math.sin(i * 1.7)))
      const ins = Array.from({ length: 64 }, (_, k) => [src.map(c => c.subarray(k * 8, k * 8 + 8))]), outs = [Array.from({ length: m.channels?.outputs ?? n }, () => new Float32Array(8))]
      const v = key && typeof a === 'number' && key !== 'bpm' ? params[key] : null, to = Float32Array.of(a ?? 0, b ?? 0)
      const move = !key ? i => {} : key === 'bpm' ? i => { transport.bpm = i & 1 ? b : a } : v ? i => { v[0] = to[i & 1] } : i => { params[key] = i & 1 ? b : a }
      const run = blocks => { for (let i = 0; i < blocks; i++) { move(i); proc(ins[i & 63], outs, params) } }
      run(1 << 15); globalThis.gc()
      let gcs = 0; const seen = new PerformanceObserver(list => { gcs += list.getEntries().length }); seen.observe({ entryTypes: ['gc'] })
      run(1 << 16); await new Promise(done => setTimeout(done, 20)); seen.disconnect()
      counts.push(gcs)
    }
    console.log(JSON.stringify(counts))`
  const counts = JSON.parse(execFileSync(process.execPath, ['--max-semi-space-size=1', '--expose-gc', '--no-concurrent-recompilation', '--input-type=module', '-e', child, JSON.stringify(cases)], { encoding: 'utf8' }))
  cases.forEach(([, name, set, key, a, b], k) => assert.equal(counts[k], 0, `${name} ${JSON.stringify(set)}${key ? `, ${key} ${a} ↔ ${b} each block` : ''}: ${counts[k]} collections in 2^16 blocks`))
})

// The same, with two instances of each processor in turn, as a host makes them: the first at its defaults, the second
// moving all its live params each block between two values that are not whole numbers (0.3183 and 0.7071 of the way
// along each range, log-spaced where the param is log, on the step where it has one), an enum between its first and
// last value; the delay lines also with sync on and the tempo moving, 97 ↔ 141 bpm. The test above moves params
// between whole numbers on one instance, and cannot see these: an FIR made on an object of another shape (freqshift's)
// leaves V8 boxing two numbers a block for a second instance; a one-key state `{ dB }` shares its shape with every such
// object, a host's params among them, and boxes any fraction (gain's); a fraction passed to a function V8 does not
// inline is boxed at each call (rotary's crossover). The tempo moves between whole numbers: a fractional tempo for a
// second instance, after a first that held a whole one, has the read of `ctx.transport.bpm` box each read, 16 bytes a
// block, on Node 25 and 20. That is how V8 treats the host's object (a transport made with a whole tempo), not the
// processor's state
test('the processors allocate nothing in process while a second instance moves all its live params through fractions', { skip: +process.versions.node.split('.')[0] < 20 && 'measured on Node 20 and later' }, () => {
  const cases = [...held.map(name => [name]), ['delay', { sync: '1/8d' }, 97, 141], ['pingpong', { sync: '1/8d' }, 97, 141]]
    .map(([name, set = {}, a, b]) => [import.meta.resolve(`@audio/effect-${name}/audio`), name, set, a, b])
  const child = `
    import { PerformanceObserver } from 'node:perf_hooks'
    const counts = []
    for (const [url, name, set, a, b] of JSON.parse(process.argv[1])) {
      const m = (await import(url))[name], given = () => Object.fromEntries(Object.entries(m.params).map(([k, s]) => [k, s.type === 'number' ? Float32Array.of(set[k] ?? s.default) : set[k] ?? s.default]))
      const along = (s, r) => { const v = s.curve === 'log' ? s.min * (s.max / s.min) ** r : s.min + (s.max - s.min) * r; return s.step ? s.min + Math.round((v - s.min) / s.step) * s.step : v }
      for (const moving of [false, true]) {
        const params = given(), transport = { playing: false, bpm: 120, beat: 0, barStart: 0, timeSig: [4, 4] }
        const proc = m({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 2, params: given(), buffers: {}, transport })
        const n = m.channels?.inputs ?? 2, src = Array.from({ length: n }, (_, c) => Float32Array.from({ length: 512 }, (_, i) => 0.5 * Math.sin(i * 0.1 + c) + 0.1 * Math.sin(i * 1.7)))
        const ins = Array.from({ length: 64 }, (_, k) => [src.map(c => c.subarray(k * 8, k * 8 + 8))]), outs = [Array.from({ length: m.channels?.outputs ?? n }, () => new Float32Array(8))]
        const setters = !moving ? [] : Object.entries(m.params).filter(([k, s]) => !s.restart && !(k in set)).map(([k, s]) => s.type === 'number'
          ? (v => i => { params[k][0] = v[i & 1] })(Float32Array.of(along(s, 0.3183), along(s, 0.7071)))
          : (v => i => { params[k] = v[i & 1] })(s.type === 'enum' ? [s.values[0], s.values[s.values.length - 1]] : [false, true]))
        if (moving && a != null) setters.push(i => { transport.bpm = i & 1 ? b : a })
        const run = blocks => { for (let i = 0; i < blocks; i++) { for (let j = 0; j < setters.length; j++) setters[j](i); proc(ins[i & 63], outs, params) } }
        run(1 << 15); globalThis.gc()
        let gcs = 0; const seen = new PerformanceObserver(list => { gcs += list.getEntries().length }); seen.observe({ entryTypes: ['gc'] })
        run(1 << 16); await new Promise(done => setTimeout(done, 20)); seen.disconnect()
        counts.push(gcs)
      }
    }
    console.log(JSON.stringify(counts))`
  const counts = JSON.parse(execFileSync(process.execPath, ['--max-semi-space-size=1', '--expose-gc', '--no-concurrent-recompilation', '--input-type=module', '-e', child, JSON.stringify(cases)], { encoding: 'utf8' }))
  cases.forEach(([, name, set], k) => {
    assert.equal(counts[2 * k], 0, `${name} ${JSON.stringify(set)}, the first instance: ${counts[2 * k]} collections in 2^16 blocks`)
    assert.equal(counts[2 * k + 1], 0, `${name} ${JSON.stringify(set)}, the second, moving: ${counts[2 * k + 1]} collections in 2^16 blocks`)
  })
})

// CONTRACT 1.0: a host takes `tail` with the values in force, and a planning snapshot holds a value that is not finite
// for automation whose values are not known yet (effect-delay's tail, its test above and its README): the tail then
// reserves the worst of that param's range. Every processor with a tail function, each number param in turn NaN,
// Infinity and −Infinity, the others at their defaults with each enum at each of its values: a finite tail, not shorter
// than the tail at any of 33 values spread over the param's range (its ends included; log-spaced where the param is
// log). In a child with a time limit, as a tail that loops on NaN never returns. Through the formulas alone a NaN gives
// NaN (which a host takes as no tail), 0, or a tail too short (the flanger's feedback read as none), and a mix of
// −Infinity reads as a known dry mix
test('every tail: a value not known yet reserves a finite tail, as long as the tail anywhere in that param\'s range', () => {
  const child = `
    const out = [], seen = []
    for (const [name, url] of JSON.parse(process.argv[1])) {
      const f = (await import(url))[name]
      if (typeof f.tail !== 'function') continue
      seen.push(name)
      const specs = f.params, combos = Object.entries(specs).filter(([, s]) => s.type === 'enum').reduce((all, [k, s]) => all.flatMap(o => s.values.map(v => ({ ...o, [k]: v }))), [{}])
      const at = set => f.tail({ sampleRate: 48000, params: Object.fromEntries(Object.entries(specs).map(([k, s]) => [k, s.type === 'number' ? Float32Array.of(k in set ? set[k] : s.default) : k in set ? set[k] : s.default])), buffers: {} })
      for (const combo of combos) for (const [k, s] of Object.entries(specs)) {
        if (s.type !== 'number') continue
        let worst = 0
        for (let i = 0; i <= 32; i++) worst = Math.max(worst, at({ ...combo, [k]: Math.fround(s.curve === 'log' ? s.min * (s.max / s.min) ** (i / 32) : s.min + (s.max - s.min) * i / 32) }))
        for (const v of [NaN, Infinity, -Infinity]) {
          const t = at({ ...combo, [k]: v })
          if (!(Number.isFinite(t) && t >= worst * (1 - 1e-9))) out.push(name + ' ' + JSON.stringify(combo) + ' ' + k + ' ' + v + ': ' + t + ' s, ' + worst + ' s somewhere in the range')
        }
      }
    }
    console.log(JSON.stringify({ out, seen }))`
  const { out, seen } = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', child, JSON.stringify(held.map(name => [name, import.meta.resolve(`@audio/effect-${name}/audio`)]))], { encoding: 'utf8', timeout: 120000 }))
  assert.deepEqual(seen, ['autowah', 'chorus', 'delay', 'exciter', 'flanger', 'graindelay', 'lofi', 'multitap', 'phaser', 'pingpong', 'rotary', 'sbr', 'slew', 'stutter', 'subbass', 'tapestop', 'vibrato', 'wah'])
  assert.deepEqual(out, [])
})

// CONTRACT 1.0: tail, "seconds the output takes to fall 60 dB after the input stops", here the frames until the rest of
// Σ|h| is under 1e-3 (each manifest says how). Measured as the validator measures it: the RMS over 64-frame windows of
// what a noise burst leaves (or a tone of `hz` held a quarter second), against the burst's own RMS (the tone's largest
// window). The declared tail covers the decay at the slowest settings; for a two-pole filter that holds still, it is the
// decay of a tone held at its resonance, which starts the ring at the filter's peak gain, within a few percent and a
// window. Numbers in `to` take their values from the call where the burst ends
const decay = (factory, set, sampleRate, seconds, to = {}, hz = 0) => {
  const N = Math.round(seconds * sampleRate), B = Math.round(0.25 * sampleRate), W = 64
  let r = 7; const x = Float32Array.from({ length: N }, (_, i) => i >= B ? 0 : hz ? 0.5 * Math.sin(2 * Math.PI * hz * i / sampleRate) : (r = (r * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5)
  const render = input => {
    const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
    const process = factory({ sampleRate, maxBlockSize: 128, params }), out = [new Float32Array(N), new Float32Array(N)]
    for (let i = 0; i < N; i += 128) {
      if (i + 128 > B) for (const k in to) params[k][0] = to[k]
      process([[input, input].map(c => c.subarray(i, i + 128))], [out.map(c => c.subarray(i, i + 128))], params)
    }
    return out
  }
  const a = render(x), b = render(new Float32Array(N))
  let e = 0; for (let i = 0; i < B; i++) e += x[i] ** 2
  let top = 0; for (let i = 0; i + W <= B; i += W) { let s = 0; for (let k = i; k < i + W; k++) s += x[k] ** 2; top = Math.max(top, Math.sqrt(s / W)) }
  const floor = (hz ? top : Math.sqrt(e / B)) * 1e-3
  let last = B
  for (let i = B; i + W <= N; i += W) if (a.some((o, c) => { let s = 0; for (let k = i; k < i + W; k++) s += (o[k] - b[c][k]) ** 2; return !(Math.sqrt(s / W) <= floor) })) last = i + W
  return (last - B) / sampleRate
}
test('autowah, wah, exciter, sbr, phaser, subbass, tapestop, slew – the tail covers the decay, and is it where a filter holds still', () => {
  const sampleRate = 44100
  for (const [name, factory, set, still] of [
    ['autowah', autowahFactory, { base: 50, Q: 20 }], ['autowah', autowahFactory, {}],
    ['wah', wahFactory, { mode: 'manual', fc: 200, Q: 20 }, 200], ['wah', wahFactory, { mode: 'manual', fc: 1500, Q: 8 }, 1500], ['wah', wahFactory, { fc: 200, depth: 3, Q: 20, rate: 0.05 }], ['wah', wahFactory, {}],
    ['exciter', exciterFactory, { fc: 500, drive: 1, amount: 1 }], ['sbr', sbrFactory, { fc: 2000, amount: 1, drive: 1 }],
    // the phaser at its slowest, then with its LFO held near its lowest point (channel 1 at -90, 0.02 Hz)
    ['phaser', phaserFactory, {}], ['phaser', phaserFactory, { fc: 100, depth: 0, feedback: 0.9, stages: 12 }], ['phaser', phaserFactory, { fc: 100, depth: 0.95, feedback: 0.9, stages: 12, rate: 0.02, phase: -90 }],
    ['subbass', subbassFactory, { fc: 30, keep: 0, amount: 1, drive: 1 }], ['subbass', subbassFactory, {}],
    ['tapestop', tapestopFactory, {}], ['tapestop', tapestopFactory, { direction: 'start', time: 0.2 }],
    ['slew', slewFactory, { rise: 10, fall: 10 }], ['slew', slewFactory, { rise: 20000, fall: 40 }],
  ]) {
    const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
    // no window from the tail on above the level, as the validator reads it: the last one above ends within a window of it
    const tail = factory.tail({ sampleRate, params }), took = decay(factory, set, sampleRate, tail + 0.5)
    assert.ok(took < tail + 64 / sampleRate, `${name} ${JSON.stringify(set)}: 60 dB down after ${took} s, declares ${tail} s`)
    if (!still) continue
    const rang = decay(factory, set, sampleRate, tail + 0.5, {}, still)
    assert.ok(rang <= tail + 64 / sampleRate && tail <= rang * 1.05 + 64 / sampleRate, `${name} ${JSON.stringify(set)}: declares ${tail} s, a tone held at ${still} Hz rings ${rang} s`)
  }
})

test('phaser – a planning snapshot\'s NaN takes the end of its range that rings longest, as the delay\'s tail does', () => {
  // the tail sums the sweep's fractions of its frozen ring until they reach 1: a NaN rate, feedback, fc or stages keeps
  // that sum from ever reaching it, and the call would never return
  const at = set => phaserFactory.tail({ sampleRate: 48000, params: Object.fromEntries(Object.entries(phaserFactory.params).map(([k, p]) => [k, Float32Array.of(set[k] ?? p.default)])) })
  const worst = { rate: phaserFactory.params.rate.min, depth: 1, stages: 12, feedback: phaserFactory.params.feedback.max, fc: 100 }
  for (const [k, v] of Object.entries(worst)) {
    const tail = at({ [k]: NaN }), want = at({ [k]: v })
    assert.ok(Number.isFinite(tail) && Math.abs(tail - want) <= 1e-6 * want, `${k} NaN: ${tail} s, at its worst ${want} s`)
  }
})

// a render through the host factory at 48 kHz in calls of `call` frames, at its manifest defaults with `set` over them,
// the param `name` at `from` until frame `at` and `to` from there; channel 0
const steps = (factory, x, name, from, to, at, set = {}, call = 128) => {
  const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
  const process = factory({ sampleRate: 48000, maxBlockSize: call, params }), out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i += call) { params[name][0] = i < at ? from : to; process([[x.subarray(i, i + call)]], [[out.subarray(i, i + call)]], params) }
  return out
}
const far = (a, b, from = 0) => { let m = 0; for (let i = from; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m }
const tone = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 1000 * i / 48000))

// `delay` moves every read as depth and phase do, so it is smoothed and glided as they are, with the ring made for
// delay.max: as the size of the ring it was a restart setting
for (const [name, factory, pairs] of [['chorus', chorusFactory, [[0.003, 0.02], [0.05, 0.002]]], ['flanger', flangerFactory, [[0.02, 0.0001], [0.003, 0.0005]]]]) {
  test(`${name} – delay: live, a change glides over its smoothing, the same in calls of 32 frames as of 1`, () => {
    assert.ok(!factory.params.delay.restart && !factory.params.delay.flags, 'a host may automate it')
    assert.equal(factory.params.delay.smoothing, 0.02)
    // within 1e-5: each call's Float32 delay is at most half an ulp (1.9e-9 s at 0.05) off the values 1-frame calls
    // take; through the read's reach per second of delay (fs · (1 + depth): the chorus 72000 samples at its 0.5 mix,
    // the flanger 81600, twice that through its feedback) on this tone's steepest slope (0.065 a sample), that is at
    // most 4.4e-6 (chorus) and 9.9e-6 (flanger). Measured: 1.9e-6 and 3.9e-6
    for (const [from, to] of pairs) {
      const a = ramp(factory, tone, from, to, 1000, 32, 'delay')[1], b = ramp(factory, tone, from, to, 1000, 1, 'delay')[1]
      assert.ok(far(a, b) < 1e-5, `${from} → ${to}: max |32-frame − 1-frame| = ${far(a, b)}`)
      // the change is heard: from frame 4000, or where the reads' centre lands on `to` if later, the render is the render
      // at `to`, and far from the one at `from`. The centre moves at most 0.5 / (1 + depth) of a frame a frame as the
      // delay grows and 1 / (1 + depth) as it shrinks (a read's speed between half and double), from frame 1000 on; the
      // flanger's loop settles from its landing in under a hundred passes
      const atTo = ramp(factory, tone, to, to, 1000, 1, 'delay')[1], atFrom = ramp(factory, tone, from, from, 1000, 1, 'delay')[1]
      const land = Math.max(4000, 1000 + Math.ceil(Math.abs(to - from) * 48000 * (1 + factory.params.depth.default) / (to > from ? 0.5 : 1)) + 2)
      assert.ok(far(a, atTo, land) < 1e-6 && far(a, atFrom, land) > 0.2, `${from} → ${to}: from frame ${land}, ${far(a, atTo, land)} from the render at ${to}, ${far(a, atFrom, land)} from that at ${from}`)
      // a delay that holds leaves every read where it was, whatever the calls: bit for bit
      assert.deepEqual(ramp(factory, tone, to, to, 1000, 32, 'delay')[1], atTo)
    }
  })
}

// a render through a factory at 48 kHz on two channels, in calls cut(i) frames long from frame i (one starts at `at`):
// the param `name` at `from` until frame `at` and `to` from there, `set` over the defaults
const cuts = (factory, x, name, from, to, at, cut, set = {}) => {
  const given = () => Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(k === name ? from : set[k] ?? p.default) : set[k] ?? p.default]))
  const params = given(), process = factory({ sampleRate: 48000, maxBlockSize: 4096, maxChannels: 2, params: given() }), out = [new Float32Array(x.length), new Float32Array(x.length)]
  for (let i = 0, n; i < x.length; i += n) {
    n = Math.min(x.length - i, i < at ? Math.min(cut(i), at - i) : cut(i))
    params[name][0] = i < at ? from : to
    process([[x, x].map(c => c.subarray(i, i + n))], [out.map(c => c.subarray(i, i + n))], params)
  }
  return out
}
const calls = [['1', () => 1], ['32', () => 32], ['128', () => 128], ['one of 4096', i => i === 4096 ? 4096 : 128]]

test('chorus – voices: live, a new count crossfades over 20 ms from the voices before to as many again, however the calls are cut', () => {
  assert.ok(!chorusFactory.params.voices.restart && !chorusFactory.params.voices.flags, 'a host may automate it')
  // 3 voices, then 7 from frame 4096: before it the 3-voice render; over the 960 frames from it (20 ms at 48 kHz) the
  // line from that render to the 7-voice one (the new voices spaced from voice 0, as a fresh instance spaces them),
  // weighed k / 960 at its k-th frame; then the 7-voice render. On channel 1 each set reads at its own lead, `phase`
  // over its own count, so the line holds there too. The same in calls of 1, 32 and 128 frames and in one of 4096:
  // a fade across the one call after the change lasts as long as that call, a step in a call of one frame (×355 on the
  // jump measure at 220 Hz). Within 1e-6: the renders and the output are Float32, each within 2^-24 of a
  // value below 1 (the line between two of them within 1.2e-7 of the exact one); the new set's phases, summed in
  // another order than a fresh instance's, move a read by far less. As the size of the phase array, voices was a
  // restart setting
  const x = signal(Float32Array, 8192), at = 4096, L = 960
  const three = cuts(chorusFactory, x, 'voices', 3, 3, at, () => 128), seven = cuts(chorusFactory, x, 'voices', 7, 7, at, () => 128)
  for (const [label, cut] of calls) {
    const y = cuts(chorusFactory, x, 'voices', 3, 7, at, cut)
    for (const c of [0, 1]) for (let i = 0; i < x.length; i++) {
      const s = i < at ? 0 : Math.min(1, (i - at + 1) / L), want = three[c][i] + (seven[c][i] - three[c][i]) * s
      assert.ok(Math.abs(y[c][i] - want) < 1e-6, `calls of ${label}, channel ${c}, frame ${i}: ${y[c][i]}, the line gives ${want}`)
    }
  }
  // The jump measure over the change, in calls of one frame, 220 Hz. With A, B the two renders, E = B − A and g the
  // fade's weight, y = A + g·E, so Δ²y = (1 − g_i)Δ²A + g_iΔ²B + 2(g_i − g_{i−1})E_{i−1} − (g_i − g_{i−2})E_{i−2}: at
  // most max(|Δ²A|, |Δ²B|) + (2 max|ΔE| + max|E|) / L over the fade, and 2^-21 for the Float32 roundings (the bound
  // ×0.93 to ×1.86 at these instants, measured at most ×0.91)
  const w = 2 * Math.PI * 220 / 48000, N = 48000, sine = Float32Array.from({ length: N }, (_, i) => 0.5 * Math.sin(w * i))
  const A = cuts(chorusFactory, sine, 'voices', 3, 3, 0, () => 128), B = cuts(chorusFactory, sine, 'voices', 7, 7, 0, () => 128)
  const ref = Math.max(...[...A, ...B].map(y => d2(y, N - 14400, N)))
  for (let k = 0; k < 4; k++) {
    const at = 24000 + k * 997, y = cuts(chorusFactory, sine, 'voices', 3, 7, at, () => 1)
    for (const c of [0, 1]) {
      let curve = 0, e = 0, de = 0
      for (let i = at - 2; i < at + L + 2; i++) {
        curve = Math.max(curve, Math.abs(A[c][i] - 2 * A[c][i - 1] + A[c][i - 2]), Math.abs(B[c][i] - 2 * B[c][i - 1] + B[c][i - 2]))
        e = Math.max(e, Math.abs(B[c][i] - A[c][i])); de = Math.max(de, Math.abs(B[c][i] - A[c][i] - B[c][i - 1] + A[c][i - 1]))
      }
      const measured = d2(y[c], at, at + L + 2) / ref, bound = (curve + (2 * de + e) / L + 2 ** -21) / ref
      assert.ok(measured <= bound, `channel ${c}, at ${at}: ×${measured.toFixed(1)}, the fade's bound ×${bound.toFixed(1)}`)
    }
  }
})

test('phaser – stages: live, a new count crossfades over 20 ms, the stages that enter starting from silence', () => {
  assert.ok(!phaserFactory.params.stages.restart && !phaserFactory.params.stages.flags, 'a host may automate it')
  // `from` stages, then `to` from frame 2048, in calls of 128: before that call the `from`-stage render; over the fade's
  // 960 frames (20 ms) no step larger than either render's own (switched within one frame, 12 → 2 steps 0.163 against
  // 0.085); once what the change left has died away (the tail at `to` stages), the `to`-stage render
  for (const [from, to] of [[4, 8], [12, 2]]) {
    const tail = phaserFactory.tail({ sampleRate: 48000, params: Object.fromEntries(Object.entries(phaserFactory.params).map(([k, p]) => [k, Float32Array.of(k === 'stages' ? to : p.default)])) })
    const n = 3008 + Math.ceil(tail * 48000) + 2000, x = Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin(i * 0.07) + 0.2 * Math.sin(i * 0.31))
    const a = steps(phaserFactory, x, 'stages', from, to, 2048), was = steps(phaserFactory, x, 'stages', from, from, 2048), now = steps(phaserFactory, x, 'stages', to, to, 2048)
    assert.deepEqual(a.subarray(0, 2048), was.subarray(0, 2048))
    let step = 0, own = 0
    for (let i = 1; i < 2048; i++) own = Math.max(own, Math.abs(was[i] - was[i - 1]), Math.abs(now[i] - now[i - 1]))
    for (let i = 2048; i < 3009; i++) step = Math.max(step, Math.abs(a[i] - a[i - 1]))
    assert.ok(step <= own, `${from} → ${to}: largest step over the change ${step}, the renders' own ${own}`)
    assert.ok(far(a, now, n - 2000) < 1e-3 && far(a, was, n - 2000) > 0.1, `${from} → ${to}: the end ${far(a, now, n - 2000)} from the ${to}-stage render, ${far(a, was, n - 2000)} from the ${from}-stage one`)
  }
})

// the phaser of phaser.js written out over the whole input on channel 0 (whose LFO leads by nothing): `from` stages until
// frame `at`, `to` from there, faded over L frames. Each frame: the LFO, f = fc·(1 + depth·sin), the allpass
// coefficient a = (t − 1) / (t + 1), t = tan(π f / fs); the input plus the feedback of the last output through the
// cascade of the larger count, each stage y = a·x + x1 − a·y1, the smaller count's output taken on the way; stages that
// enter from silence; the old count's output to the new one's by k / L at the k-th frame of the fade. Returns the output
// and u, v: the input with the old count's output and with the new one's, halved (the output itself outside the fade)
const phased = (x, set, from, to, at, L) => {
  const fs = 48000, f32 = k => Math.fround(set[k] ?? phaserFactory.params[k].default)
  const rate = f32('rate'), depth = f32('depth'), feedback = f32('feedback'), fc = f32('fc'), inc = 2 * Math.PI * rate / fs
  const n = x.length, y = new Float64Array(n), u = new Float64Array(n), v = new Float64Array(n), st = new Float64Array(2 * Math.max(from, to))
  let phase = 0, fb = 0
  for (let i = 0; i < n; i++) {
    const lfo = Math.sin(phase)
    phase += inc
    if (phase > 2 * Math.PI) phase -= 2 * Math.PI
    const f = fc * (1 + depth * lfo), t = Math.tan(Math.PI * f / fs), a = (t - 1) / (t + 1)
    if (i === at && to > from) st.fill(0, 2 * from, 2 * to)
    const k = i - at + 1, fading = k >= 1 && k <= L, hi = fading ? Math.max(from, to) : k < 1 ? from : to, lo = fading ? Math.min(from, to) : hi
    let z = x[i] + feedback * fb, tap = z
    for (let s = 0; s < hi; s++) {
      if (s === lo) tap = z
      const o = a * z + st[2 * s] - a * st[2 * s + 1]
      st[2 * s] = z; st[2 * s + 1] = o; z = o
    }
    let out = z
    if (fading) {
      const old = from < to ? tap : z, now = from < to ? z : tap
      out = old + (now - old) * (k / L)
      u[i] = (x[i] + old) * 0.5; v[i] = (x[i] + now) * 0.5
    } else u[i] = v[i] = (x[i] + out) * 0.5
    fb = out
    y[i] = (x[i] + out) * 0.5
  }
  return { y, u, v }
}

test('phaser – stages: the crossfade lasts 20 ms however the calls are cut, as the phaser written out computes it', () => {
  // 4 → 8 and 12 → 2 stages at frame 4096: in calls of 1, 32 and 128 frames and in one of 4096, channel 0 is what
  // `phased` computes, bit for bit (the same arithmetic frame by frame, rounded once to Float32). A fade across the one
  // call after the change lasts as long as that call: a step in a call of one frame, ×108 on the jump measure at 220 Hz
  const x = Float32Array.from({ length: 8192 }, (_, i) => 0.5 * Math.sin(i * 0.07) + 0.2 * Math.sin(i * 0.31)), L = 960
  for (const [from, to] of [[4, 8], [12, 2]]) {
    const want = Float32Array.from(phased(x, {}, from, to, 4096, L).y)
    for (const [label, cut] of calls) assert.deepEqual(cuts(phaserFactory, x, 'stages', from, to, 4096, cut)[0], want, `${from} → ${to} in calls of ${label}`)
  }
  // The jump measure in calls of one frame at 220 Hz, 4 → 10. With g the fade's weight and e = v − u,
  // y = u + g·e, so Δ²y = (1 − g_i)Δ²u + g_iΔ²v + 2(g_i − g_{i−1})e_{i−1} − (g_i − g_{i−2})e_{i−2}: a fade of L frames adds
  // at most (2 max|Δe| + max|e|) / L to the curvature of what the two cascades give (u and v from `phased`, as the
  // feedback runs through the faded output), and 2^-22 for the Float32 output (the bound ×1.6 to ×5.1 at these
  // instants, each above its own measure; measured at most ×2.5)
  const w = 2 * Math.PI * 220 / 48000, N = 48000, sine = Float32Array.from({ length: N }, (_, i) => 0.5 * Math.sin(w * i))
  const ref = Math.max(...[4, 10].map(s => d2(cuts(phaserFactory, sine, 'stages', s, s, 0, () => 128)[0], N - 14400, N)))
  for (let k = 0; k < 4; k++) {
    const at = 24000 + k * 997, y = cuts(phaserFactory, sine, 'stages', 4, 10, at, () => 1)[0], { u, v } = phased(sine, {}, 4, 10, at, L)
    const g = i => i < at ? 0 : Math.min(1, (i - at + 1) / L), e = i => v[i] - u[i]
    let bound = 0
    for (let i = at; i < at + L + 2; i++) bound = Math.max(bound, (1 - g(i)) * Math.abs(u[i] - 2 * u[i - 1] + u[i - 2]) + g(i) * Math.abs(v[i] - 2 * v[i - 1] + v[i - 2]) + Math.abs(2 * (g(i) - g(i - 1)) * e(i - 1) - (g(i) - g(i - 2)) * e(i - 2)))
    const measured = d2(y, at, at + L + 2) / ref
    assert.ok(measured <= (bound + 2 ** -22) / ref, `at ${at}: ×${measured.toFixed(1)}, the fade's bound ×${((bound + 2 ** -22) / ref).toFixed(1)}`)
  }
})

test('chorus, phaser – a count asked during a crossfade follows when that fade ends, however the calls are cut', () => {
  // 3 → 7 voices (4 → 10 stages) at frame 4096, then 2 at frame 4336, 5 ms on, at 48 kHz: the fade under way runs its
  // 960 frames as if nothing more were asked, so until it ends both channels are the render with the first change alone,
  // bit for bit; the second count fades in after it. The same in calls of 1, 32 and 128 frames and in one of 4096, each
  // cut where a count changes, as a host splits a block where a value jumps. A fade begun again at the second change
  // would respace the set fading in mid-fade, a step
  const x = signal(Float32Array, 8192), at = 4096, then = 4336, L = 960
  const twice = (factory, name, a, b, c, cut) => {
    const given = () => Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(k === name ? a : p.default) : p.default]))
    const params = given(), process = factory({ sampleRate: 48000, maxBlockSize: 4096, maxChannels: 2, params: given() }), out = [new Float32Array(x.length), new Float32Array(x.length)]
    for (let i = 0, n; i < x.length; i += n) {
      n = Math.min(cut(i), (i < at ? at : i < then ? then : x.length) - i)
      params[name][0] = i < at ? a : i < then ? b : c
      process([[x, x].map(ch => ch.subarray(i, i + n))], [out.map(ch => ch.subarray(i, i + n))], params)
    }
    return out
  }
  for (const [factory, name, a, b, c] of [[chorusFactory, 'voices', 3, 7, 2], [phaserFactory, 'stages', 4, 10, 2]]) {
    const once = cuts(factory, x, name, a, b, at, () => 128), y = twice(factory, name, a, b, c, () => 128)
    for (const ch of [0, 1]) assert.deepEqual(y[ch].subarray(0, at + L), once[ch].subarray(0, at + L), `${name} ${a} → ${b} → ${c}, channel ${ch}: the first fade runs on`)
    assert.ok(far(y[0], once[0], at + L) > 0.01, `${name} ${a} → ${b} → ${c}: the second count is heard once the first fade ends`)
    for (const [label, cut] of calls) assert.deepEqual(twice(factory, name, a, b, c, cut), y, `${name} ${a} → ${b} → ${c} in calls of ${label}`)
  }
})

test('freqshift, tapestop – a restart mark only where the value sets the latency, in its 1.0 form', () => {
  // freqshift's taps set its latency, (taps − 1) / 2; tapestop's time, curve, direction and flutter set how far its read
  // may run ahead of the input (its latency) and its ring. The rest of the family is live
  assert.equal(freqshiftFactory.params.taps.restart, true)
  assert.equal(freqshiftFactory.params.taps.flags, undefined)
  for (const k of ['time', 'curve', 'direction', 'flutter']) assert.equal(tapestopFactory.params[k].restart, true, k)
  for (const [name, factory] of Object.entries({ chorus: chorusFactory, flanger: flangerFactory, phaser: phaserFactory, vibrato: vibratoFactory, rotary: rotaryFactory, tapestop: tapestopFactory }))
    for (const [k, s] of Object.entries(factory.params)) if (!(name === 'tapestop' && k !== 'at')) assert.ok(!s.restart && !s.flags, `${name} ${k} is live`)
})

test('tapestop – streams: in blocks of any size, the whole-buffer kernel\'s output, as late as its declared latency', () => {
  // its read runs ahead of the input only as far as flutter speeds the tape past it at the stop's start: a latency, not
  // a need for the whole signal. A kernel written over the whole buffer was the only reason for streaming: false
  assert.equal(tapestopFactory.streaming, undefined)
  const x = [signal(Float32Array, 9600), signal(Float32Array, 9600).reverse()], n = x[0].length
  for (const set of [{}, { time: 0.05, flutter: 1 }, { time: 0.1, curve: 0.25, flutter: 0.7 }, { direction: 'start', time: 0.05, flutter: 0.5 }, { at: 0.03, curve: 3 }]) {
    const params = Object.fromEntries(Object.entries(tapestopFactory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
    const lat = tapestopFactory.latency({ sampleRate: 48000, params })
    if (set.flutter && set.direction !== 'start') assert.ok(lat > 0, `${JSON.stringify(set)}: the read runs ahead, latency ${lat}`)
    else assert.equal(lat, 0)
    // the kernel given the values the host hands the manifest, as Float32
    const opts = { fs: 48000, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? v : v[0]])) }
    const want = x.map(c => Float32Array.from(fx.tapeStop(Float64Array.from(c), opts)))
    for (const block of [1, 64, 127, 128, 1024]) {
      const process = tapestopFactory({ sampleRate: 48000, maxBlockSize: block, params }), input = x.map(c => { const d = new Float32Array(n + lat); d.set(c); return d })
      const out = x.map(() => new Float32Array(n + lat))
      for (let i = 0; i < n + lat; i += block) process([input.map(c => c.subarray(i, i + block))], [out.map(c => c.subarray(i, i + block))], params)
      out.forEach((c, k) => { assert.deepEqual(c.subarray(0, lat), new Float32Array(lat)); assert.deepEqual(c.subarray(lat), want[k], `${JSON.stringify(set)}, blocks of ${block}`) })
    }
  }
})

// rotary's depth and micSpread move its rotors' delay reads, depth its directivity gains too: smoothed and glided as the
// chorus's depth and phase are. Unsmoothed, a step moves the right mic's read within one sample (up to ×458 the largest
// second difference of a render without it, at 220 Hz)
for (const [name, pairs] of [['depth', [[0.3, 0.9], [1, 0]]], ['micSpread', [[0, 3.14159], [1.5708, 0.2]]]]) {
  test(`rotary – ${name}: a change glides over its smoothing, the same in calls of 32 frames as of 1`, () => {
    assert.equal(rotaryFactory.params[name].smoothing, 0.02)
    // within 1e-6: each call's Float32 value is at most half an ulp off the values 1-frame calls take, and the horn's
    // read moves 12.6 samples per unit of depth (0.09 m / 343 m/s at 48 kHz), no more per radian of spread. Measured:
    // under 1e-7
    for (const [from, to] of pairs) {
      const a = ramp(rotaryFactory, tone, from, to, 1000, 32, name)[1], b = ramp(rotaryFactory, tone, from, to, 1000, 1, name)[1]
      assert.ok(far(a, b) < 1e-6, `${from} → ${to}: max |32-frame − 1-frame| = ${far(a, b)}`)
      const atTo = ramp(rotaryFactory, tone, to, to, 1000, 1, name)[1], atFrom = ramp(rotaryFactory, tone, from, from, 1000, 1, name)[1]
      assert.ok(far(a, atTo, 4000) < 1e-6 && far(a, atFrom, 4000) > 0.01, `${from} → ${to}: the end ${far(a, atTo, 4000)} from the render at ${to}, ${far(a, atFrom, 4000)} from that at ${from}`)
      assert.deepEqual(ramp(rotaryFactory, tone, to, to, 1000, 32, name)[1], atTo)
    }
  })
}

test('rotary – a live crossover is redesigned in place, as @audio/eq-crossover designs it; the in-place form returns nothing', () => {
  for (const fs of [8000, 44100, 48000, 192000]) for (const fc of [0, 200, 801.5, 3000, fs / 2]) {
    const p = { fs, crossover: 800 }
    rotaryInPlace(new Float64Array(0), new Float64Array(0), p)
    const sections = p._sos.flat()
    p.crossover = fc
    assert.equal(rotaryInPlace(Float64Array.of(0.5), Float64Array.of(0.5), p), undefined)
    p._sos.flat().forEach((s, k) => assert.equal(s, sections[k], 'the same sections, rewritten'))
    assert.deepEqual(p._sos, crossover([fc], 4, fs), `${fc} Hz at ${fs}`)
  }
  const a = [signal(Float64Array, 4096), signal(Float64Array, 4096)], b = a.map(c => c.slice()), opts = { depth: 0.8, crossover: 1200 }
  fx.rotary(a[0], a[1], { ...opts }); rotaryInPlace(b[0], b[1], { ...opts })
  assert.deepEqual(b, a)
})

test('vibrato – its ring is made once for depth 1: a depth rising faster than the read moves still reads the true past', () => {
  // against the same LFO, glide and linear interpolation over the whole input (zeros before it), with no ring. A ring
  // that grows with depth holds silence where such reads land: 0.49 off for 0.1 then 1 in one call of 64 frames, 0.47
  // for a curve from 0.1 to 1 over 240 frames
  const fs = 48000, maxSwing = 0.006, inc = 2 * Math.PI * 7 / fs   // vibrato.js maxSwing
  const at = (h, pos) => { const i = Math.floor(pos), f = pos - i, a = h[i] ?? 0, b = h[i + 1] ?? 0; return a + f * (b - a) }
  const x = Float64Array.from({ length: 9600 }, (_, i) => 0.2 * Math.sin(i * 0.07) + 0.3 * Math.sin(i * 0.011))
  const calm = Array.from({ length: 40 }, () => [0.1, 100]), deep = Array.from({ length: 60 }, () => [1, 100])   // to the end
  for (const calls of [[...calm, [1, 64], ...deep], [...calm, ...Array.from({ length: 8 }, (_, k) => [0.1 + 0.9 * (k + 1) / 8, 30]), ...deep]]) {
    const y = x.slice(), ref = new Float64Array(x.length), p = { rate: 7, fs }
    for (let t = 0, ph = 0, was, k = 0; k < calls.length && t < x.length; k++) {
      const [depth, n] = calls[k], l = Math.min(n, x.length - t), from = was ?? depth
      p.depth = depth
      fx.vibrato(y.subarray(t, t + l), p)
      for (let i = 0; i < l; i++) {
        ref[t + i] = at(x, t + i - (from + (depth - from) * (i + 1) / l) * maxSwing * fs * (1 + Math.sin(ph)))
        ph += inc; if (ph > 2 * Math.PI) ph -= 2 * Math.PI
      }
      was = depth; t += l
    }
    assert.ok(far(y, ref) < 1e-12, `max |kernel − reference| = ${far(y, ref)}`)
  }
})

// The delay lines. Their times were restart settings because each kernel sized its line by the time and read it at a
// whole frame: now the factory makes each line for the time's max, a time is read between frames, and a change of time
// moves the read from where the last call left it

test('delay, pingpong, multitap, stutter, graindelay – no restart mark: every param is live', () => {
  for (const [name, factory] of Object.entries({ delay: delayFactory, pingpong: pingpongFactory, multitap: multitapFactory, stutter: stutterFactory, graindelay: graindelayFactory }))
    for (const [k, s] of Object.entries(factory.params)) assert.ok(!s.restart && !s.flags, `${name} ${k} is live`)
})

// The family's jump measure: the largest |second difference| of y over frames a to b
const d2 = (y, a, b) => { let m = 0; for (let i = Math.max(2, a); i < Math.min(b, y.length); i++) m = Math.max(m, Math.abs(y[i] - 2 * y[i - 1] + y[i - 2])); return m }
// Its bound over a read that moves. A tone A sin(ωn) read p_i frames back comes out A sin(ω(i − p_i)) plus the two-point
// read's error, at most A ω² / 8 (the interpolation error f''(ξ)/2 · (x − x0)(x − x1), Burden and Faires, Numerical
// Analysis, Theorem 3.3, at most h²/8 · max|f''| for samples h = 1 apart). Two frames in a row step the phase by a and
// b, each between lo·ω and hi·ω while the read runs at speeds lo to hi, and the second difference of A sin(φ) over them
// is at most A · hypot(2 − cos a − cos b, sin a − sin b) ≤ A · hypot(2 − 2 cos hi·ω, sin hi·ω − sin lo·ω) for
// hi·ω ≤ π/2; plus 4 · A ω² / 8 from the read's error and 4 · 2^-24 A from the Float32 output. In units of A
const bent = (w, lo, hi) => Math.hypot(2 - 2 * Math.cos(hi * w), Math.sin(hi * w) - Math.sin(lo * w)) + w * w / 2 + 2 ** -22

// a render through a factory at 48 kHz in calls of `call` frames, with a stub ctx whose transport the test sets: the
// tempo bpm(i) at the head of the call at frame i. `set` over the manifest defaults; channel 0 of [x, x]
const played = (factory, x, set, bpm = () => 120, call = 128) => {
  const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
  const transport = { playing: true, bpm: 120, beat: 0, barStart: 0, timeSig: [4, 4] }
  const process = factory({ sampleRate: 48000, maxBlockSize: call, maxChannels: 2, params, buffers: {}, transport }), out = [new Float32Array(x.length), new Float32Array(x.length)]
  for (let i = 0; i < x.length; i += call) { transport.bpm = bpm(i); process([[x, x].map(c => c.subarray(i, i + call))], [out.map(c => c.subarray(i, i + call))], params) }
  return out[0]
}

for (const [name, factory] of [['delay', delayFactory], ['pingpong', pingpongFactory]]) {
  test(`${name} – time: live, a change glides over its smoothing, the same in calls of 32 frames as of 1`, () => {
    assert.equal(factory.params.time.smoothing, 0.02)
    // within 1e-5: each call's Float32 time is at most half an ulp (1.9e-9 s below 0.0625 s) off the values 1-frame
    // calls take, 8.9e-5 of a frame at 48 kHz; on this tone's steepest slope (0.065 a sample), through the wet half of
    // the mix and the repeats of the feedback (1 / (1 − 0.4) at most), that is at most 4.8e-6
    // (times that are not whole periods of the 1 kHz tone, whose renders would be the same sine)
    const x = Float32Array.from({ length: 96000 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 1000 * i / 48000))
    for (const [from, to] of [[0.05, 0.0617], [0.06, 0.0113]]) {
      const a = ramp(factory, x, from, to, 4000, 32, 'time')[0], b = ramp(factory, x, from, to, 4000, 1, 'time')[0]
      assert.ok(far(a, b) < 1e-5, `${from} → ${to}: max |32-frame − 1-frame| = ${far(a, b)}`)
      // the change is heard: once the repeats of the bend have died away under the feedback (0.4^25 by frame 80000),
      // the render at `to`
      const atTo = ramp(factory, x, to, to, 4000, 1, 'time')[0], atFrom = ramp(factory, x, from, from, 4000, 1, 'time')[0]
      assert.ok(far(a, atTo, 80000) < 1e-6 && far(a, atFrom, 80000) > 0.1, `${from} → ${to}: the end ${far(a, atTo, 80000)} from the render at ${to}, ${far(a, atFrom, 80000)} from that at ${from}`)
      // a time that holds reads where it read, whatever the calls: bit for bit
      assert.deepEqual(ramp(factory, x, to, to, 4000, 32, 'time')[0], atTo)
    }
  })

  test(`${name} – sync: a note at the host's tempo, '1/8' at 120 bpm 0.25 s; 'off' leaves time in charge, as without sync`, () => {
    assert.deepEqual(factory.params.sync, { type: 'enum', values: ['off', '1/2', '1/4', '1/4t', '1/8d', '1/8', '1/8t', '1/16'], default: 'off' })
    // a quarter note is one beat, 60 / bpm seconds (CONTRACT 1.0, Context: bpm is quarter notes a minute); d is dotted,
    // half as long again; t a triplet, two thirds. At 120 and 80 bpm every one is a whole frame at 48 kHz: '1/8' at 120
    // is 0.25 s, frame 12000
    const quarters = { '1/2': 2, '1/4': 1, '1/4t': 2 / 3, '1/8d': 3 / 4, '1/8': 1 / 2, '1/8t': 1 / 3, '1/16': 1 / 4 }
    const x = new Float32Array(96000); x[0] = 1
    for (const bpm of [120, 80]) for (const [note, q] of Object.entries(quarters)) {
      const y = played(factory, x, { sync: note, feedback: 0, mix: 1 }, () => bpm), at = Math.round(q * 60 / bpm * 48000)
      if (note === '1/8' && bpm === 120) assert.equal(at, 0.25 * 48000)
      assert.deepEqual([...y.keys()].filter(i => y[i] !== 0).map(i => [i, y[i]]), [[at, 1]], `${note} at ${bpm} bpm`)
    }
    // 'off': a host that knows no sync passes none; the same render, bit for bit, while time moves and the tempo too
    const tone = Float32Array.from({ length: 24000 }, (_, i) => 0.5 * Math.sin(i * 0.05) + 0.2 * Math.sin(i * 0.31))
    const go = sync => {
      const params = { time: Float32Array.of(0.05), feedback: Float32Array.of(0.4), mix: Float32Array.of(0.6), ...sync && { sync } }, transport = { playing: true, bpm: 120, beat: 0, barStart: 0, timeSig: [4, 4] }
      const process = factory({ sampleRate: 48000, maxBlockSize: 32, maxChannels: 2, params, buffers: {}, transport }), out = [new Float32Array(24000), new Float32Array(24000)]
      for (let i = 0; i < 24000; i += 32) {
        params.time[0] = 0.05 + 0.03 * Math.sin(i / 3000); transport.bpm = 60 + i % 97
        process([[tone, tone].map(c => c.subarray(i, i + 32))], [out.map(c => c.subarray(i, i + 32))], params)
      }
      return out
    }
    assert.deepEqual(go('off'), go())
    // the tail follows the time in force; with sync on that is a note at a tempo that a tail handed no transport does
    // not know, so it bounds it by the longest time the line holds (with a transport: the test after the next)
    const at = set => factory.tail({ sampleRate: 48000, params: Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default])) })
    assert.equal(at({ sync: '1/16' }), at({ time: factory.params.time.max }))
    assert.equal(at({ time: 0.1 }), at({ time: 0.1, sync: 'off' }))
    assert.ok(at({ time: 0.1 }) < at({ time: 0.2 }))
  })

  test(`${name} – sync: a new tempo moves the echo by a bend at the read's bound, no click`, () => {
    // 120 → 126 bpm at frame `at`, '1/8', a 220 Hz tone, the echo alone (mix 1, no feedback): 0.25 s becomes 0.238 s,
    // 571 frames nearer. The kernel takes the new time as it comes and moves its read there a frame a frame at most,
    // double speed: 572 frames. Before the change the render at 120 bpm; once the bend is over, the render at 126, bit
    // for bit. Over it, the family's jump measure (d2): the largest |second difference| from the change to 40 ms after
    // it, over the larger of the renders' at either tempo, at most `bent` for speeds 1 to 2 (×35.4 here; measured up to
    // ×34.0). A tempo ramped over 20 ms would move the read 0.595 frames a frame instead: the bound ×23.2, the measure
    // ×20.7. A switch within one frame makes a step: median ×1532 at 220 Hz over 24 instants (how big depends on where
    // the tone is when it switches)
    const w = 2 * Math.PI * 220 / 48000, x = Float32Array.from({ length: 48000 }, (_, i) => 0.5 * Math.sin(w * i)), set = { sync: '1/8', feedback: 0, mix: 1 }
    const slow = played(factory, x, set, () => 120), fast = played(factory, x, set, () => 126), switched = []
    let bound
    for (let k = 0; k < 8; k++) {
      const at = 16384 + k * 1280, y = played(factory, x, set, i => i < at ? 120 : 126), base = Math.max(d2(slow, at, at + 1920), d2(fast, at, at + 1920))
      assert.deepEqual(y.subarray(0, at), slow.subarray(0, at))
      assert.deepEqual(y.subarray(at + 1024), fast.subarray(at + 1024))
      const glided = d2(y, at, at + 1920) / base
      bound = bent(w, 1, 2) * 0.5 / base
      assert.ok(glided <= bound, `at ${at}: ×${glided.toFixed(1)} glided, the bend's bound ×${bound.toFixed(1)}`)
      switched.push(d2(Float32Array.from(x, (_, i) => i < at ? slow[i] : fast[i]), at, at + 1920) / base)
    }
    switched.sort((a, b) => a - b)
    assert.ok(switched[4] > 10 * bound, `a switch: median ×${switched[4].toFixed(0)}, the bend's bound ×${bound.toFixed(1)}`)
  })
}

// a render through a factory at 48 kHz, stub ctx, in calls cut(i) frames long from frame i (one starts at `at`): `set`
// over the defaults (`bpm` the host's tempo), and from frame `at` the values in `to`: a time as a host ramps it
// (CONTRACT 1.0, Parameters: a linear ramp over `smoothing`, no call longer than 32 frames while it moves), a sync value
// or a tempo at once; channel 0 of [x, x]
const moved = (factory, x, set, to, at, cut = () => 128) => {
  const given = () => Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
  const params = given(), transport = { playing: true, bpm: set.bpm ?? 120, beat: 0, barStart: 0, timeSig: [4, 4] }
  const process = factory({ sampleRate: 48000, maxBlockSize: 4096, maxChannels: 2, params: given(), buffers: {}, transport }), out = [new Float32Array(x.length), new Float32Array(x.length)]
  const t0 = params.time[0], frames = factory.params.time.smoothing * 48000
  for (let i = 0, n; i < x.length; i += n) {
    n = Math.min(x.length - i, i < at ? Math.min(128, at - i) : cut(i))
    if (i >= at) {
      if ('time' in to) { if (i < at + frames) n = Math.min(n, 32); params.time[0] = t0 + (to.time - t0) * Math.min(1, (i + n - at) / frames) }
      if ('sync' in to) params.sync = to.sync
      if ('bpm' in to) transport.bpm = to.bpm
    }
    process([[x, x].map(c => c.subarray(i, i + n))], [out.map(c => c.subarray(i, i + n))], params)
  }
  return out[0]
}

test('delay, pingpong – a far move of time, tempo or sync: the read runs between half and double speed for as long as the move needs, then sits on the new time', () => {
  // Large moves, which a ramp of 20 ms would race through, up to 87.5 frames a frame: ×331 to ×4330 on the jump measure
  // at 220 Hz, as sharp as a switch in one frame (×1000 to ×1450) or more. The read moves at most half a frame a frame
  // while the time grows (speeds 0.5 to 1, an octave down at most) and a frame a frame while it shrinks (1 to 2, an
  // octave up), so over the move the measure is at most `bent` for those
  // speeds (×17.9 growing and ×35.4 shrinking at 220 Hz, ×4.4 growing at 1 kHz; measured up to ×17.4, ×34.8 and ×3.7).
  // The echo alone (mix 1, no feedback):
  // before the change the render at the old setting; from the frame where the read has covered the move at its bound,
  // the render at the new one, bit for bit, and not a frame sooner. Times in frames: 0.25 s is 12000 at 48 kHz, the
  // Float32 0.9371 s 44980.8; '1/16' at 120 bpm 6000, '1/8d' 18000, '1/2' 48000, '1/2' at 60 bpm 96000
  const frames = s => s.sync && s.sync !== 'off' ? { '1/2': 2, '1/8d': 0.75, '1/16': 0.25 }[s.sync] * 60 / (s.bpm ?? 120) * 48000 : Math.fround(s.time ?? 0.25) * 48000
  for (const [factory, hz, set, to] of [
    [delayFactory, 220, { time: 0.25 }, { time: 0.9371 }], [delayFactory, 1000, { time: 0.25 }, { time: 0.9371 }], [pingpongFactory, 220, { time: 0.25 }, { time: 0.9371 }],
    [delayFactory, 220, { sync: '1/16' }, { sync: '1/8d' }], [delayFactory, 220, { sync: '1/2' }, { bpm: 60 }], [delayFactory, 220, { bpm: 60 }, { sync: '1/2' }],
    [delayFactory, 220, { time: 0.9371 }, { time: 0.25 }], [pingpongFactory, 220, { sync: '1/2' }, { sync: '1/16' }],
  ]) {
    const from = frames(set), dest = frames({ ...set, ...to }), grow = dest > from, K = Math.ceil(Math.abs(dest - from) / (grow ? 0.5 : 1))
    const w = 2 * Math.PI * hz / 48000, N = 96000 + 5 * 1031 + K + 2000 + 24000, x = Float32Array.from({ length: N }, (_, i) => 0.5 * Math.sin(w * i)), still = { ...set, feedback: 0, mix: 1 }
    const was = moved(factory, x, still, {}, N), now = moved(factory, x, { ...still, ...to }, {}, N), ref = Math.max(d2(was, N - 14400, N), d2(now, N - 14400, N))
    const label = `${factory === delayFactory ? 'delay' : 'pingpong'} ${JSON.stringify(set)} → ${JSON.stringify(to)}, ${hz} Hz`
    for (let k = 0; k < 6; k++) {
      const at = 96000 + k * 1031, y = moved(factory, x, still, to, at)
      assert.deepEqual(y.subarray(0, at), was.subarray(0, at), `${label}: before the change`)
      // the read is on the new time from the K-th frame of the move: the K − 1 before it are steps of the bound
      assert.deepEqual(y.subarray(at + K - 1), now.subarray(at + K - 1), `${label}: from frame ${K - 1} of the move`)
      assert.ok(y.subarray(at + K - 65, at + K - 1).some((v, i) => v !== now[at + K - 65 + i]), `${label}: still moving before frame ${K - 1}`)
      const measured = d2(y, at, at + K + 2000) / ref, bound = bent(w, grow ? 0.5 : 1, grow ? 1 : 2) * 0.5 / ref
      assert.ok(measured <= bound, `${label} at ${at}: ×${measured.toFixed(1)}, the bound ×${bound.toFixed(1)}`)
    }
  }
})

test('delay, pingpong – a far move sounds the same however a host cuts its calls', () => {
  // The read's path is the same in every cut: from where it was, the bound's step a frame towards the time asked, and
  // the time itself once within a step of it; each frame's read is computed alike whatever call it falls in, so no
  // rounding enters and the samples are the same, bit for bit. A time ramped by the host in calls of 32 frames and of
  // 1, a sync change in calls of 1, 32 or 128 frames or in one of 4096, growing and shrinking, with feedback and a mix
  // so the bend's repeats are heard too; and the kernel called directly with a time that jumps, in calls of 1, 32 or
  // one of 4096. Until the read's speed was bounded, the 1-frame and 32-frame ramps of 0.25 → 0.9371 s were 0.37 apart
  const x = Float32Array.from({ length: 150000 }, (_, i) => 0.4 * Math.sin(i * 0.031) + 0.2 * Math.sin(i * 0.77)), at = 30080
  for (const [name, factory] of [['delay', delayFactory], ['pingpong', pingpongFactory]]) {
    const set = { feedback: 0.4, mix: 0.7 }
    for (const [from, to] of [[0.25, 0.9371], [0.9371, 0.123]]) {
      const a = moved(factory, x, { ...set, time: from }, { time: to }, at, () => 32)
      assert.deepEqual(moved(factory, x, { ...set, time: from }, { time: to }, at, () => 1), a, `${name} ${from} → ${to}: a ramp in calls of 1`)
    }
    for (const [from, to] of [['1/16', '1/2'], ['1/2', '1/16']]) {
      const a = moved(factory, x, { ...set, sync: from }, { sync: to }, at, () => 32)
      for (const [label, cut] of [['1', () => 1], ['128', () => 128], ['one of 4096', i => i === at ? 4096 : 128]])
        assert.deepEqual(moved(factory, x, { ...set, sync: from }, { sync: to }, at, cut), a, `${name} ${from} → ${to} in calls of ${label}`)
    }
  }
  const direct = (time, n) => {
    const p = { fs: 48000, time: 0.25, feedback: 0.4, mix: 0.7 }, y = Float64Array.from(x.subarray(0, 80000))
    for (let i = 0, k; i < y.length; i += k) { k = i < at ? Math.min(128, at - i) : n; p.time = i < at ? 0.25 : time; fx.delay(y.subarray(i, i + k), p) }
    return y
  }
  for (const time of [0.9371, 0.123]) for (const n of [1, 4096]) assert.deepEqual(direct(time, n), direct(time, 32), `the kernel: 0.25 → ${time} in calls of ${n}`)
})

test('delay, pingpong – with sync on, the tail follows the tempo the host hands it, and the line\'s length where it hands none', () => {
  // CONTRACT 1.0: the setting a host hands `tail` carries its transport. A note at that tempo is a time like any other:
  // '1/8' at 120 bpm is 0.25 s, '1/4' at 96 is 0.625 s, '1/2' at 60 is 2 s (each a Float32 exactly, so the tail at that
  // time with sync off is the same number). With no transport, or a tempo that is not a finite positive number (one not
  // known yet, as any value that is not finite), the time is the longest the line holds
  for (const factory of [delayFactory, pingpongFactory]) {
    const at = (set, transport) => factory.tail({ sampleRate: 48000, params: Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default])), buffers: {}, ...transport && { transport } })
    for (const [sync, bpm, time] of [['1/8', 120, 0.25], ['1/4', 96, 0.625], ['1/2', 60, 2]])
      assert.equal(at({ sync }, { playing: true, bpm, beat: 0, barStart: 0, timeSig: [4, 4] }), at({ time }), `${sync} at ${bpm} bpm`)
    for (const transport of [undefined, ...[NaN, 0, Infinity].map(bpm => ({ playing: false, bpm, beat: 0, barStart: 0, timeSig: [4, 4] }))])
      assert.equal(at({ sync: '1/8' }, transport), at({ time: factory.params.time.max }), transport ? `a tempo of ${transport.bpm}` : 'no transport')
  }
})

test('delay, pingpong – the tail at the new time covers the decay while the read slows to half speed', () => {
  // The family's decay measure (above) with the time grown where the burst ends, so the read is still slowing through
  // what the line holds when the input stops. The read never reaches farther back than the new time, so each pass is
  // read again within it, and the passes the tail counts at the new time still bound the decay (measured 3.5 to 5.5 s
  // against 7 to 9 s). A shrinking move under way when the input stops is not covered: the tail is a function of the
  // settings and cannot see the read on its way (the family's readme says so, at the delay)
  for (const sampleRate of [44100, 48000]) for (const [name, factory, set, from, to] of [
    ['delay', delayFactory, { feedback: 0.3 }, 0.05, 1], ['delay', delayFactory, { feedback: 0.6 }, 0.02, 0.5],
    ['pingpong', pingpongFactory, {}, 0.05, 1], ['pingpong', pingpongFactory, { feedback: 0.6 }, 0.02, 0.5],
  ]) {
    const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(k === 'time' ? to : set[k] ?? p.default) : set[k] ?? p.default]))
    const tail = factory.tail({ sampleRate, params }), took = decay(factory, { ...set, time: from }, sampleRate, tail + 0.5, { time: to })
    assert.ok(took <= tail + 64 / sampleRate, `${name} ${JSON.stringify(set)} ${from} → ${to} s at ${sampleRate}: 60 dB down after ${took} s, declares ${tail} s`)
  }
})

test('pingpong – the in-place form returns nothing and does what the default does', () => {
  const a = [signal(Float64Array, 4096), signal(Float64Array, 4096).reverse()], b = a.map(c => c.slice()), opts = { time: 0.0123, feedback: 0.6 }
  fx.pingPong(a[0], a[1], { ...opts })
  assert.equal(pingPongInPlace(b[0], b[1], { ...opts }), undefined)
  assert.deepEqual(b, a)
})

test('multitap – the factory makes each channel\'s state as the kernel makes its own: the same sound, bit for bit', () => {
  // at 22.05 kHz the 0.25 s tap is 5512.5 frames, on its nearest frame 5513 as the kernel puts it
  for (const sampleRate of [22050, 44100, 48000]) {
    const x = [signal(Float32Array, 30000), signal(Float32Array, 30000).reverse()], params = { feedback: Float32Array.of(0.7) }
    const process = multitapFactory({ sampleRate, maxBlockSize: 128, maxChannels: 2, params }), out = x.map(() => new Float32Array(30000))
    for (let i = 0; i < 30000; i += 128) process([x.map(c => c.subarray(i, i + 128))], [out.map(c => c.subarray(i, i + 128))], params)
    const p = [{ fs: sampleRate, feedback: params.feedback[0] }, { fs: sampleRate, feedback: params.feedback[0] }]
    assert.deepEqual(out, x.map((c, k) => fx.multitap(c.slice(), p[k])), `${sampleRate} Hz`)
  }
})

test('gain – the factory applies the kernel\'s scale itself: the same sound, bit for bit', () => {
  // the manifest no longer hands gain.js an options object `{ dB }` (its field boxed each fraction, the test of the
  // second instance above); this holds the two equal, at whole and fractional gains, in place and from another buffer
  const x = [signal(Float32Array, 4096), signal(Float32Array, 4096).reverse()]
  for (const dB of [0, -60, 24, -33.2628, 6.0206, Math.fround(-0.6036)]) {
    const params = { dB: Float32Array.of(dB) }, process = gainFactory({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 2, params }), out = x.map(() => new Float32Array(4096)), same = x.map(c => c.slice())
    for (let i = 0; i < 4096; i += 128) {
      process([x.map(c => c.subarray(i, i + 128))], [out.map(c => c.subarray(i, i + 128))], params)
      process([same.map(c => c.subarray(i, i + 128))], [same.map(c => c.subarray(i, i + 128))], params)
    }
    const want = x.map(c => fx.gain(c.slice(), { dB: params.dB[0] }))
    assert.deepEqual(out, want, `${dB} dB`)
    assert.deepEqual(same, want, `${dB} dB, in place`)
  }
})

test('stutter – interval and slice: live; a change takes effect where the next cycle starts, as a fresh start from there', () => {
  // in calls of 128 at 48 kHz, the value changed from the call at or after frame 30000: the cycle under way ends as it
  // began, the render at the old value; from where the next cycle starts, what a fresh instance at the new value gives
  // fed the input from there (a cycle captures before it repeats, so nothing before it is heard), bit for bit
  const x = signal(Float32Array, 96000)
  for (const [name, from, to] of [['interval', 0.5, 0.3], ['interval', 0.3, 0.7], ['slice', 0.125, 0.05], ['slice', 0.05, 0.2]]) {
    const a = steps(stutterFactory, x, name, from, to, 30000), was = steps(stutterFactory, x, name, from, from, 30000)
    const cycle = Math.round((name === 'interval' ? from : stutterFactory.params.interval.default) * 48000), next = Math.ceil(30080 / cycle) * cycle
    assert.deepEqual(a.subarray(0, next), was.subarray(0, next), `${name} ${from} → ${to}: the cycle under way`)
    assert.deepEqual(a.subarray(next), steps(stutterFactory, x.subarray(next), name, to, to, 0), `${name} ${from} → ${to}: from frame ${next}`)
  }
})

// the grain delay of graindelay.js over the whole input, zeros before it, no line, for no spray, jitter or feedback: head
// A's grains begin at frames 0, g, 2g…, head B's half a grain (g >> 1 frames) later; a grain k frames in reads
// off − k·(rate − 1) back, off the delay or, for a grain reading faster than the line runs, as far back as it must begin
// so that its read never passes the write; each read weighted by its Hann window
const grains = (x, fs, time, pitch, grain, mix) => {
  const g = Math.max(32, (grain * fs) | 0), rate = 2 ** (pitch / 12), off = rate > 1 ? Math.max(time * fs, 1 + (g - 1) * (rate - 1)) : time * fs
  return Float64Array.from(x, (v, i) => {
    let wet = 0
    for (const start of [0, g >> 1]) {
      if (i < start) continue
      const k = (i - start) % g, back = off - k * (rate - 1), D = Math.floor(back), f = back - D, a = x[i - D] ?? 0, b = x[i - D - 1] ?? 0
      wet += (a + f * (b - a)) * (0.5 - 0.5 * Math.cos(2 * Math.PI * k / g))
    }
    return v * (1 - mix) + wet * mix
  })
}

test('graindelay – a grain\'s read never passes the write, and the line holds the farthest read: against the grains computed over the whole input', () => {
  // a grain an octave up for 80 ms reads 160 ms of the line, so it must begin at least 80 ms back: asked for 20 ms, the
  // code as found let the read pass the write and play what the line held a line's length before (0.4 to 1.6 off)
  const x = Float64Array.from({ length: 48000 }, (_, i) => 0.3 * Math.sin(i * 0.013) + 0.2 * Math.sin(i * 0.17))
  for (const [time, pitch, grain] of [[0.02, 12, 0.08], [0.25, 0, 0.08], [0.05, -12, 0.1], [0.02, 24, 0.3], [0.1, 7, 0.0101]]) {
    const y = fx.grainDelay(x.slice(), { time, pitch, grain, spray: 0, jitter: 0, feedback: 0, mix: 0.8, fs: 48000 })
    assert.ok(far(y, grains(x, 48000, time, pitch, grain, 0.8)) < 1e-12, `time ${time}, pitch ${pitch}, grain ${grain}: ${far(y, grains(x, 48000, time, pitch, grain, 0.8))}`)
  }
  // through the factory, its line made for every param's max: the farthest reads at the ends of the ranges
  const max = graindelayFactory.params, z = Float32Array.from({ length: 96000 }, (_, i) => 0.3 * Math.sin(i * 0.013) + 0.2 * Math.sin(i * 0.17))
  for (const set of [{ time: max.time.max, pitch: max.pitch.min, grain: max.grain.max }, { time: max.time.min, pitch: max.pitch.max, grain: max.grain.max }]) {
    const params = Object.fromEntries(Object.entries(max).map(([k, p]) => [k, Float32Array.of(set[k] ?? (k === 'spray' || k === 'jitter' || k === 'feedback' ? 0 : p.default))]))
    const process = graindelayFactory({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 1, params }), out = new Float32Array(z.length)
    for (let i = 0; i < z.length; i += 128) process([[z.subarray(i, i + 128)]], [[out.subarray(i, i + 128)]], params)
    const want = Float32Array.from(grains(z, 48000, params.time[0], params.pitch[0], params.grain[0], params.mix[0]))
    assert.ok(far(out, want) < 1e-6, `${JSON.stringify(set)}: ${far(out, want)}`)
  }
})

test('graindelay – time, pitch: live; a change reaches the grains that begin after it; values that hold, bit for bit whatever the calls', () => {
  // no spray, jitter or feedback, so a grain's sound is set where it begins: until the first grain after the change the
  // render at the old value, and once the grains begun before it have ended, the render at the new one
  const x = signal(Float32Array, 24000)
  for (const [name, from, to] of [['time', 0.25, 0.1], ['time', 0.05, 0.3], ['pitch', 0, 7], ['pitch', 5, -12]]) {
    const set = { spray: 0, jitter: 0, feedback: 0, [name]: from }
    const a = steps(graindelayFactory, x, name, from, to, 9000, set), was = steps(graindelayFactory, x, name, from, from, 9000, set), now = steps(graindelayFactory, x, name, to, to, 9000, set)
    assert.ok(far(now, was, 13216) > 0.05, `${name} ${from} and ${to} sound different`)
    // the change reaches the call at frame 9088; head A's grains begin every g frames from 0, head B's from g >> 1, g as
    // graindelay.js takes the grain (the host's Float32 0.08 s is 3839.99991 frames, so 3839)
    const g = Math.max(32, (Math.fround(0.08) * 48000) | 0)
    let first = Infinity
    for (let s = 0; s < 24000; s += g) for (const t of [s, s + (g >> 1)]) if (t >= 9088) first = Math.min(first, t)
    assert.deepEqual(a.subarray(0, first), was.subarray(0, first), `${name} ${from} → ${to}: before`)
    assert.deepEqual(a.subarray(9088 + 128 + g), now.subarray(9088 + 128 + g), `${name} ${from} → ${to}: after`)
    for (const call of [1, 32, 1024]) assert.deepEqual(steps(graindelayFactory, x, name, to, to, 9000, set, call), now, `${name} ${to} in calls of ${call}`)
  }
})

test('graindelay – grain: live; a new length stretches both windows from where they are, so they still sum to one', () => {
  // at pitch 0 with no spray and no feedback each head reads the same sample, the input `time` back, and their Hann
  // windows, half a grain apart, sum to one: the output is the input delayed, across the change too. Before, a grain
  // length was a restart setting, and a direct call with a new one made the line anew (silence) or left the windows
  // out of step. (Lengths of an even number of frames as graindelay.js takes them: it truncates the grain to frames, so
  // the Float32 0.08 s is 3839, and an odd length staggers the heads a frame short of half, a ripple of 4e-4)
  const x = signal(Float32Array, 48000), set = { time: 0.125, spray: 0, jitter: 0, feedback: 0, mix: 1 }
  for (const [from, to] of [[0.1, 0.05], [0.05, 0.3], [0.2, 0.0123]]) {
    const y = steps(graindelayFactory, x, 'grain', from, to, 20000, { ...set, grain: from }), d = 0.125 * 48000
    // the kernel called directly, given a line long enough for both lengths and the length changed between the same
    // calls: what the factory gives, as it hands the new length on
    const p = { ...set, grain: Math.fround(from), fs: 48000, seed: 0x9e3779b9, _buf: new Float64Array(24000) }, z = x.slice()
    for (let i = 0; i < x.length; i += 128) { p.grain = Math.fround(i < 20000 ? from : to); fx.grainDelay(z.subarray(i, i + 128), p) }
    assert.deepEqual(z, y, `${from} → ${to}: the factory and the kernel`)
    let off = 0
    for (let i = d + Math.round(from * 48000); i < x.length; i++) off = Math.max(off, Math.abs(y[i] - x[i - d]))
    assert.ok(off < 1e-6, `${from} → ${to}: max |output − input delayed| = ${off}`)
  }
})

test('delay, pingpong, multitap, stutter, graindelay – the tail covers the decay', () => {
  // as the tail test above, within one 64-frame window of the measure: multitap at no feedback drains its 0.5 s tap and
  // its last sample lands in the window after it
  const sampleRate = 44100
  for (const [name, factory, set] of [
    ['delay', delayFactory, {}], ['delay', delayFactory, { time: 0.05, feedback: 0.9 }], ['delay', delayFactory, { time: 0.0123, feedback: 0.6 }],
    ['pingpong', pingpongFactory, {}], ['pingpong', pingpongFactory, { time: 0.0117, feedback: 0.6 }],
    ['multitap', multitapFactory, {}], ['multitap', multitapFactory, { feedback: 0.3 }], ['multitap', multitapFactory, { feedback: 0.9 }],
    ['stutter', stutterFactory, { interval: 2, slice: 1 }],
    ['graindelay', graindelayFactory, {}], ['graindelay', graindelayFactory, { feedback: 0 }], ['graindelay', graindelayFactory, { time: 0.1, pitch: -24, grain: 0.3, feedback: 0.6 }],
    ['graindelay', graindelayFactory, { time: 0.02, pitch: 24, jitter: 12, grain: 0.3, feedback: 0.5 }],
  ]) {
    const params = Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
    const tail = typeof factory.tail === 'function' ? factory.tail({ sampleRate, params }) : factory.tail, took = decay(factory, set, sampleRate, tail + 0.5)
    assert.ok(took <= tail + 64 / sampleRate, `${name} ${JSON.stringify(set)}: 60 dB down after ${took} s, declares ${tail} s`)
  }
  // multitap from its own impulse response: with no feedback the drain alone, its 0.5 s tap; with feedback the frames
  // after the impulse until the rest of Σ|h| of what the factory puts out is under 1e-3, within a frame for the Float32
  // output's rounding (the rest of what comes out of a peak-1 input, CONTRACT 1.0: 60 dB under the input's level). The
  // response is rendered for twice the tail and a second, past which its rest is under 1e-6
  const at = fb => multitapFactory.tail({ sampleRate, params: { feedback: Float32Array.of(fb) } })
  assert.equal(at(0), 0.5)
  for (const fb of [0.3, 0.9]) {
    const N = Math.round((2 * at(Math.fround(fb)) + 1) * sampleRate), x = new Float32Array(N), y = new Float32Array(N), params = { feedback: Float32Array.of(fb) }
    x[0] = 1
    const process = multitapFactory({ sampleRate, maxBlockSize: 128, params })
    for (let i = 0; i < N; i += 128) process([[x.subarray(i, i + 128)]], [[y.subarray(i, i + 128)]], params)
    let left = 0, t = N - 1
    while (t > 0 && left + Math.abs(y[t]) <= 1e-3) left += Math.abs(y[t--])
    assert.ok(Math.abs(at(Math.fround(fb)) * sampleRate - t) <= 1, `feedback ${fb}: declares ${at(Math.fround(fb)) * sampleRate} frames, the rest of Σ|h| is under 1e-3 from frame ${t}`)
  }
})

// What a stopped input leaves, as the validator reads a ring (CONTRACT 1.0: tail, until the output stays 60 dB under the
// input's level): x(i, c) for i < stop, then silence, through the factory in 128-frame calls, less what silence alone
// leaves; the RMS of each 64-frame window against 1e-3 of `level`. The declared tail and latency in frames, the ring
// (from stop + latency to the end of the last window above), and `late`: a window from stop + latency + the tail (128
// frames at least) on still above
const paramsOf = (factory, set) => Object.fromEntries(Object.entries(factory.params).map(([k, p]) => [k, p.type === 'number' ? Float32Array.of(set[k] ?? p.default) : set[k] ?? p.default]))
const left = (factory, set, sampleRate, x, stop, level) => {
  const params = paramsOf(factory, set), ctx = { sampleRate, maxBlockSize: 128, maxChannels: 2, params, buffers: {} }
  const T = Math.ceil(factory.tail(ctx) * sampleRate), L = typeof factory.latency === 'function' ? factory.latency(ctx) : factory.latency ?? 0
  const N = stop + L + Math.max(128, T) + 4096, W = 64, C = factory.channels?.inputs === 1 ? 1 : 2
  const render = live => {
    const process = factory(ctx), ins = Array.from({ length: C }, (_, c) => Float32Array.from({ length: N }, (_, i) => live && i < stop ? x(i, c) : 0)), out = [new Float32Array(N), new Float32Array(N)]
    for (let i = 0; i < N; i += 128) process([ins.map(v => v.subarray(i, i + 128))], [out.map(v => v.subarray(i, i + 128))], params)
    return out
  }
  const a = render(true), b = render(false), loud = i => a.some((o, c) => { let s = 0; for (let k = i; k < i + W; k++) s += (o[k] - b[c][k]) ** 2; return !(Math.sqrt(s / W) <= 1e-3 * level) })
  let last = stop, late = false
  for (let i = stop; i + W <= N; i += W) if (loud(i)) last = i + W
  for (let i = stop + L + Math.max(128, T); i + W <= N && !late; i += W) late = loud(i)
  return { T, L, ring: last - stop - L, late }
}
// The frequency an impulse response is loudest at, 0 Hz or one of 200 log-spaced from 20 Hz to 0.45 of the rate, by a
// Goertzel sum over its first 2^14 frames; `scale` sets the impulse's height (a quiet one meets a saturator's slope at 0)
const loudest = (factory, set, sampleRate, scale = 1) => {
  const params = paramsOf(factory, set), N = 1 << 14, h = new Float64Array(N), C = factory.channels?.inputs === 1 ? 1 : 2
  for (const live of [true, false]) {
    const process = factory({ sampleRate, maxBlockSize: 128, maxChannels: 2, params }), ins = Array.from({ length: C }, () => new Float32Array(N)), out = [new Float32Array(N), new Float32Array(N)]
    if (live) for (const c of ins) c[0] = scale
    for (let i = 0; i < N; i += 128) process([ins.map(v => v.subarray(i, i + 128))], [out.map(v => v.subarray(i, i + 128))], params)
    for (let i = 0; i < N; i++) h[i] += live ? out[0][i] : -out[0][i]
  }
  let best = -1, hz = 0
  for (let k = 0; k <= 200; k++) {
    const f = k ? 20 * (0.45 * sampleRate / 20) ** ((k - 1) / 199) : 0, c = 2 * Math.cos(2 * Math.PI * f / sampleRate)
    let s1 = 0, s2 = 0
    for (let j = 0; j < N; j++) { const s = h[j] + c * s1 - s2; s2 = s1; s1 = s }
    const p = s1 * s1 + s2 * s2 - c * s1 * s2
    if (p > best) best = p, hz = f
  }
  return hz
}
const TAILED = { autowah: autowahFactory, chorus: chorusFactory, delay: delayFactory, exciter: exciterFactory, flanger: flangerFactory, graindelay: graindelayFactory, lofi: lofiFactory, multitap: multitapFactory, phaser: phaserFactory, pingpong: pingpongFactory, rotary: rotaryFactory, sbr: sbrFactory, slew: slewFactory, stutter: stutterFactory, subbass: subbassFactory, tapestop: tapestopFactory, vibrato: vibratoFactory, wah: wahFactory }

// Every tail function, at its defaults and at two settings drawn as the validator draws them (each number at an end half
// the time), at 22.05, 44.1 and 96 kHz, with the four inputs the validator reads a ring by, a DC step among them: a noise
// burst and an impulse stopping at a quarter second, a DC and a tone at the loudest frequency held half the tail (a
// quarter to one second). Never short: no window from the tail on above 60 dB under each input's level. A tone held at a
// resonance or a DC into a loop starts the ring at the filter's or the loop's gain, which the tails counted from the
// poles alone left out (wah at Q 15, autowah, the phaser at feedback 0.69, pingpong at feedback 0.9 all fell short). A
// setting whose tail is over 2 s is drawn again, up to 20 times: the decay tests above hold the long loops
test('every tail: a noise burst, an impulse, a held DC and a tone held at the loudest frequency leave the output 60 dB under their level within it, at random settings and three rates', () => {
  let u = 2026; const rnd = () => (u = (u * 1664525 + 1013904223) >>> 0) / 4294967296
  const draw = f => Object.fromEntries(Object.entries(f.params).map(([k, p]) => { const r = rnd(), v = rnd(); return [k, p.type === 'enum' ? p.values[Math.floor(v * p.values.length)] : r < 0.25 ? p.min : r < 0.5 ? p.max : p.step ? p.min + Math.round((p.max - p.min) * v / p.step) * p.step : p.curve === 'log' ? p.min * (p.max / p.min) ** v : p.min + (p.max - p.min) * v] }))
  const short = []
  let judged = 0
  for (const [name, factory] of Object.entries(TAILED)) for (const sampleRate of [22050, 44100, 96000]) for (let s = 0; s < 3; s++) {
    let set = {}, tail = factory.tail({ sampleRate, params: paramsOf(factory, set) })
    for (let k = 0; s && (k === 0 || tail > 2) && k < 20; k++) { set = draw(factory); tail = factory.tail({ sampleRate, params: paramsOf(factory, set) }) }
    if (tail > 2) continue
    const B = Math.round(0.25 * sampleRate), hold = Math.round(Math.min(1, Math.max(0.25, tail / 2)) * sampleRate), hz = loudest(factory, set, sampleRate)
    let r = 7; const noise = Float32Array.from({ length: B }, () => (r = (r * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5)
    let top = 0; for (let i = 0; i + 64 <= hold; i += 64) { let e = 0; for (let k = i; k < i + 64; k++) e += (0.5 * Math.sin(2 * Math.PI * hz * k / sampleRate)) ** 2; top = Math.max(top, Math.sqrt(e / 64)) }
    for (const [what, x, stop, level] of [
      ['burst', i => noise[i], B, Math.sqrt(noise.reduce((e, v) => e + v * v, 0) / B)],
      ['impulse', i => i === B - 1 ? 1 : 0, B, 1 / 8],
      ['dc', () => 0.5, hold, 0.5],
      ...hz ? [[`tone of ${hz.toFixed(0)} Hz`, i => 0.5 * Math.sin(2 * Math.PI * hz * i / sampleRate), hold, top]] : [],
    ]) {
      const m = left(factory, set, sampleRate, x, stop, level)
      if (m.late) short.push(`${name} ${sampleRate} ${JSON.stringify(set)} ${what}: rings ${m.ring} frames, declares ${m.T}`)
    }
    judged++
  }
  assert.deepEqual(short, [])
  assert.ok(judged >= 140, `${judged} settings judged`)
})

// Within twice the longest ring, where that is over 128 frames (the validator's advice: audio pads a render by the
// tail), each tail fed the input that rings longest: a DC or a tone held at the peak of a loop or a filter that holds
// still; a quiet one where an envelope or a saturator sets the gain (its slope at 0: the envelope at rest, the filter at
// its base); for an LFO, inputs stopping at 8 points of its cycle; for stutter and tapestop, 15 points of an interval
// or of the stop; a DC of −1 against the slew's slower rate. Each input's level is its largest 64-frame window's RMS
// over the quarter second before it stops, as the validator reads a held tone. And never short of it
test('every tail: within twice the longest ring, where that is over 128 frames, each fed the input that rings longest', () => {
  const fs = 44100, sec = s => Math.round(s * fs), dc = v => () => v, sine = (hz, a = 0.5) => i => a * Math.sin(2 * Math.PI * hz * i / fs)
  const cycle = (from, n, span) => Array.from({ length: n }, (_, k) => sec(from + k * span / n))
  const cases = [
    ['delay', { time: 0.01, feedback: 0.9, mix: 1 }, [[dc(0.5), [sec(0.5)]]]],
    ['pingpong', { time: 0.02, feedback: 0.8, mix: 1 }, [[dc(0.5), [sec(0.5)]]]],
    ['multitap', { feedback: 0.5 }, [[dc(0.5), [sec(1)]]]],
    ['graindelay', { time: 0.05, spray: 0, feedback: 0.6, mix: 1, grain: 0.05 }, [[dc(0.5), [sec(0.5)]]]],
    ['flanger', { depth: 0, delay: 0.01, feedback: 0.9 }, [[dc(0.5), [sec(0.5)]]]],
    ['flanger', { depth: 1, delay: 0.01, feedback: 0.7, rate: 2 }, [[dc(0.5), cycle(0.5, 8, 0.5)]]],
    ['chorus', { depth: 0, delay: 0.01 }, [[dc(0.5), [sec(0.25)]]]],
    ['chorus', { depth: 1, delay: 0.02, rate: 2 }, [[dc(0.5), cycle(0.25, 8, 0.5)]]],
    ['vibrato', { depth: 1, rate: 2 }, [[dc(0.5), cycle(0.25, 8, 0.5)]]],
    ['phaser', { depth: 0, fc: 300, feedback: 0.7, stages: 6 }, [[dc(0.5), [sec(0.5)]]]],
    ['phaser', { depth: 0.7, fc: 1000, feedback: 0.5, stages: 4, rate: 2 }, [[dc(0.5), cycle(0.5, 8, 0.5)]]],
    ['wah', { mode: 'manual', fc: 400, Q: 10 }, [[sine(400), [sec(0.5)]]]],
    ['wah', { mode: 'auto', fc: 1000, depth: 1, Q: 8, rate: 2 }, [[dc(0.5), cycle(0.5, 8, 0.5)]]],
    ['autowah', { base: 100, range: 100, Q: 10, sens: 0.5, release: 0.01 }, [[sine(100, 5e-4), [sec(0.5)]]]],
    ['exciter', { fc: 1000, drive: 1, amount: 1 }, [['quiet', [sec(0.5)]]]],
    ['sbr', { fc: 2000, amount: 1, drive: 1 }, [['quiet', [sec(0.5)]]]],
    ['subbass', { fc: 60, amount: 1, drive: 0, keep: 0 }, [[dc(0.5), [sec(0.5)]]]],
    ['lofi', { highpass: 20, lowpass: 18000, drive: 0, noise: 0, crackle: 0 }, [[dc(0.5), [sec(0.5)]]]],
    ['rotary', { crossover: 200, depth: 0, mix: 1, hornSpeed: 0, drumSpeed: 0 }, [[dc(0.5), [sec(0.5)]]]],
    ['slew', { rise: 10, fall: 1000 }, [[dc(-1), [sec(0.2)]]]],
    ['stutter', { interval: 0.2, slice: 0.07 }, [[dc(0.5), cycle(0.4 + 0.2 / 16, 15, 0.2 * 15 / 16)]]],
    ['tapestop', { time: 0.5 }, [[dc(0.5), cycle(0.5 / 16, 15, 0.5 * 15 / 16)]]],
  ]
  for (const [name, set, inputs] of cases) {
    const factory = TAILED[name]
    let most = 0, T = 0
    for (let [x, stops] of inputs) {
      // quiet: a tone held at the loudest frequency of a quiet impulse's response, 60 dB down, where a saturator is linear
      if (x === 'quiet') x = sine(loudest(factory, set, fs, 1e-3), 5e-4)
      for (const stop of stops) {
        let level = 0
        for (let i = stop - sec(0.25); i + 64 <= stop; i += 64) { let e = 0; for (let k = i; k < i + 64; k++) e += x(k, 0) ** 2; level = Math.max(level, Math.sqrt(e / 64)) }
        const m = left(factory, set, fs, x, stop, level)
        most = Math.max(most, m.ring); T = m.T
        assert.ok(!m.late, `${name} ${JSON.stringify(set)}: rings ${m.ring} frames stopping at ${stop}, declares ${m.T}`)
      }
    }
    assert.ok(T <= Math.max(128, 2 * most), `${name} ${JSON.stringify(set)}: declares ${T} frames, the longest ring ${most}`)
  }
})

// At depth 1 the phaser's sweep reaches 0 Hz, where its allpasses hold what they have: a ring there stalls, and the tail
// counts the stall (each step at its slower end). A DC stopped as channel 1's LFO comes down to its lowest point, slowly
// (0.02 Hz; `phase` -180 puts channel 1 half a cycle from channel 0, sin(θ − π), lowest at θ = π/2), rings on through it
test('phaser – at depth 1 the sweep stalls at 0 Hz: a DC stopped on its way down rings within the tail', () => {
  const fs = 22050, set = { rate: 0.02, depth: 1, stages: 2, feedback: 0.3, fc: 5000, phase: -180 }, lowest = Math.round(fs / (4 * Math.fround(0.02)))
  for (const before of [16384, 12288, 8192]) {
    const m = left(phaserFactory, set, fs, () => 0.5, lowest - before, 0.5)
    assert.ok(!m.late, `stopped ${before} frames before the lowest point: rings ${m.ring} frames, declares ${m.T}`)
  }
})

// A contract host's render as a value moves (CONTRACT 1.0, Parameters, Time; What a host owes, 3): `from` until frame
// `at`, where a call begins, then a linear ramp to `to` over the param's smoothing, each call handed the ramp's value at
// its first frame, no call longer than 32 frames while it moves, 128-frame calls on the grid otherwise; channel 0
const hosted = (factory, x, set, name, from, to, at, sampleRate) => {
  const params = paramsOf(factory, { ...set, [name]: from }), N = factory.params[name].smoothing * sampleRate
  const process = factory({ sampleRate, maxBlockSize: 128, maxChannels: 2, params }), out = [new Float32Array(x.length), new Float32Array(x.length)]
  for (let i = 0, n; i < x.length; i += n) {
    n = Math.min(x.length - i, i < at ? Math.min(128 - i % 128, at - i) : i < at + N ? 32 : 128 - i % 128)
    params[name][0] = i < at ? from : from + (to - from) * Math.min(1, (i - at) / N)
    process([[x, x].map(c => c.subarray(i, i + n))], [out.map(c => c.subarray(i, i + n))], params)
  }
  return out[0]
}
const hum = (fs, hz = 220, A = 0.5) => Float32Array.from({ length: 32768 }, (_, i) => A * Math.sin(2 * Math.PI * hz * i / fs))

// A value that scales the signal glides along the host's ramp, sample by sample: gain's dB from −39 to 3 (the validator's
// quarter to three quarters of its range), at a call on the 128-frame grid and off it, 220 Hz at 44.1 kHz. The output is
// g·x with g = 10^(dB/20) on the ramp, so Δ²y = g Δ²x + 2 Δg Δx + Δ²g x (the product's second difference): |Δ²x| ≤
// A·4 sin²(ω/2), |Δx| ≤ A·2 sin(ω/2), |Δg| ≤ g1·ln r / N on the exponential a dB ramp makes over N frames and |Δ²g| as
// much at its two corners, r = g1 / g0; and 2^-22 A for the Float32 output. Each call held for its call, as the host hands
// them, steps the gain by 32 frames of ramp at once: ×162 to ×233 on the validator's measure. From the frame the glide has
// held the value 32 frames, the render is the steady one, bit for bit
test('gain – a new dB glides along the host\'s ramp sample by sample: the jump measure under the bound of the exponential it draws', () => {
  const fs = 44100, A = 0.5, w = 2 * Math.PI * 220 / fs, x = hum(fs, 220, A), N = gainFactory.params.dB.smoothing * fs
  const g1 = 10 ** (3 / 20), lr = 42 / 20 * Math.LN10, bound = g1 * A * (4 * Math.sin(w / 2) ** 2 + 4 * Math.sin(w / 2) * lr / N + lr / N + 2 ** -22)
  const steady = hosted(gainFactory, x, {}, 'dB', 3, 3, 0, fs)
  for (const at of [22016, 22077]) {
    const y = hosted(gainFactory, x, {}, 'dB', -39, 3, at, fs), moved = d2(y, at, at + N + 32 + 160), ref = d2(steady, at - 8192, at)
    assert.ok(moved <= bound, `at ${at}: |Δ²| ${moved}, bound ${bound} (×${(moved / ref).toFixed(2)} against ×${(bound / ref).toFixed(2)})`)
    const held = Math.ceil((at + N + 32) / 128) * 128 + 128
    assert.deepEqual(y.subarray(held), steady.subarray(held), `at ${at}: the steady render from frame ${held}`)
  }
})

// A value that moves a read moves it between half and double speed: the chorus's delay from 14 to 38 ms (the validator's
// jump), one voice at depth 0 so that the read is the centre, 220 Hz at 44.1 kHz. The host's 20 ms ramp asks the centre
// to move 1.2 frames a frame, which ran the read backwards; held to half a frame a frame, the read runs at 0.5 to 1 of
// the line's speed, and the output (x + e) / 2 has |Δ²| ≤ (A·4 sin²(ω/2) + A·bent(ω, 0.5, 1)) / 2 and 2^-22 A for the
// input's rounding. The move lasts the 1058 frames of centre over half a frame a frame, and from there the render is the
// steady one at 38 ms
test('chorus – a new delay moves the read between half and double speed: the jump measure under the bound of a read at those speeds', () => {
  const fs = 44100, A = 0.5, w = 2 * Math.PI * 220 / fs, x = hum(fs, 220, A), set = { voices: 1, depth: 0 }
  const bound = (A * (4 * Math.sin(w / 2) ** 2 + 2 ** -22) + A * bent(w, 0.5, 1)) / 2, steady = hosted(chorusFactory, x, set, 'delay', 0.038, 0.038, 0, fs)
  for (const at of [22016, 22077]) {
    const y = hosted(chorusFactory, x, set, 'delay', 0.014, 0.038, at, fs), end = at + 64 + Math.ceil((Math.fround(0.038) - Math.fround(0.014)) * fs / 0.5)
    assert.ok(d2(y, at, end + 160) <= bound, `at ${at}: |Δ²| ${d2(y, at, end + 160)}, bound ${bound}`)
    assert.ok(far(y, steady, end + 2 * Math.round(0.038 * fs)) < 1e-6, `at ${at}: ${far(y, steady, end + 2 * Math.round(0.038 * fs))} from the steady render after the move`)
  }
})
