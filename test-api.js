import test from 'node:test'
import assert from 'node:assert/strict'
import * as fx from '@audio/effect'
import { delay as delayFactory } from '@audio/effect-delay/audio'
import { pingpong as pingpongFactory } from '@audio/effect-pingpong/audio'

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

for (const name of ['delay', 'pingPong']) {
  const process = fx[name], isStereo = name === 'pingPong'
  const run = (a, b, opts) => isStereo ? process(a, b, opts) : process(a, opts)
  test(`${name} — exact impulse echoes, sample-rate units and causal minimum delay`, () => {
    for (const Type of [Float32Array, Float64Array]) {
      for (const fs of [44100, 48000, 96000]) {
        for (const time of [0, 0.25 / fs, 1 / fs, 0.001]) for (const feedback of [0, -0.5, 0.5, 1]) {
          const d = Math.max(1, Math.floor(time * fs)), n = d * 5 + 1
          const input = new Type(n), right = new Type(n); input[0] = 1
          const opts = { fs, time, feedback, mix: 0.75 }
          run(input, right, opts)
          const expected = new Type(n), expectedRight = new Type(n); expected[0] = 0.25
          for (let repeat = 1; repeat * d < n; repeat++) {
            const channel = isStereo && repeat % 2 === 0 ? expectedRight : expected
            channel[repeat * d] = 0.75 * feedback ** (repeat - 1)
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

  test(`${name} — changing effective length resets; unchanged length and empty writes preserve history`, () => {
    const fs = 8, opts = { fs, time: 0.5, feedback: 0, mix: 1 }
    run(Float64Array.of(1, 0, 0), new Float64Array(3), opts)
    const saved = structuredClone(opts)
    run(new Float64Array(0), new Float64Array(0), opts)
    assert.deepEqual(opts, saved)
    // Same integer length must keep the old impulse; no reallocation in steady state.
    opts.time = 0.51
    const a = new Float64Array(2); run(a, new Float64Array(2), opts)
    assert.deepEqual(a, Float64Array.of(0, 1))
    for (const time of [0.125, 0.75, 0]) {
      opts.time = 0.5
      run(Float64Array.of(1, 0, 0), new Float64Array(3), opts)
      opts.time = time
      const silence = new Float64Array(8), right = new Float64Array(8)
      run(silence, right, opts)
      assert.deepEqual(silence, new Float64Array(8)); assert.deepEqual(right, new Float64Array(8))
    }
    // Changing fs changes the effective ring size too.
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

test('delay factories — tail follows settings, reaches -60 dB, and includes long feedback echoes', () => {
  for (const factory of [delayFactory, pingpongFactory]) {
    for (const sampleRate of [44100, 48000, 96000]) {
      for (const feedback of [0, 0.3, factory.params.feedback.max]) {
        const params = { time: Float32Array.of(factory.params.time.max), feedback: Float32Array.of(feedback) }
        const time = Math.floor(params.time[0] * sampleRate) / sampleRate
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

test('delay factories — disconnected inputs drain tails, channels and instances remain independent', () => {
  for (const factory of [delayFactory, pingpongFactory]) {
    const params = { time: Float32Array.of(0.001), feedback: Float32Array.of(0.5), mix: Float32Array.of(1) }
    const sampleRate = 48000, d = Math.floor(params.time[0] * sampleRate)
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
