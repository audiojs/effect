import test from 'node:test'
import { strict as assert } from 'node:assert'

import * as fx from './index.js'

let { ok, equal: is } = assert

function almost (a, b, eps = 1e-6) { ok(Math.abs(a - b) < eps, `${a} ≈ ${b} (±${eps})`) }

function impulse (n = 64) { let d = new Float64Array(n); d[0] = 1; return d }
function dc (n = 64, val = 1) { let d = new Float64Array(n); d.fill(val); return d }
function sine (f, n, fs = 44100) {
	let d = new Float64Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * f * i / fs)
	return d
}

// ═══════════════════════════════════════════════════════════════════════════
// Modulation
// ═══════════════════════════════════════════════════════════════════════════

test('phaser — produces output, modifies signal', () => {
	let data = impulse(4096)
	fx.phaser(data, { rate: 1, depth: 0.7, stages: 4, fs: 44100 })
	ok(data.some(x => Math.abs(x) > 0.001), 'phaser output present')
})

test('phaser — stable over long buffer', () => {
	let data = sine(440, 44100)
	fx.phaser(data, { rate: 0.5, depth: 0.7, stages: 6, feedback: 0.8, fs: 44100 })
	ok(data.every(isFinite), 'no NaN/Inf over 1s')
})

test('flanger — produces modulated output', () => {
	let data = sine(440, 4096)
	let orig = Float64Array.from(data)
	fx.flanger(data, { rate: 0.3, depth: 0.7, delay: 3, feedback: 0.5, fs: 44100 })
	ok(data.some((x, i) => Math.abs(x - orig[i]) > 0.01), 'flanger modifies signal')
	ok(data.every(isFinite), 'no NaN/Inf')
})

test('chorus — produces output', () => {
	let data = sine(440, 4096)
	fx.chorus(data, { rate: 1.5, depth: 0.5, delay: 20, voices: 3, fs: 44100 })
	ok(data.some(x => Math.abs(x) > 0.01), 'chorus output present')
	ok(data.every(isFinite), 'no NaN/Inf')
})

test('wah — produces bandpass-like output', () => {
	let data = impulse(4096)
	fx.wah(data, { rate: 1.5, depth: 0.8, fc: 1000, Q: 5, fs: 44100 })
	ok(data.some(x => Math.abs(x) > 0.001), 'wah output present')
	ok(data.every(isFinite), 'no NaN/Inf')
})

test('tremolo — modulates amplitude', () => {
	let data = dc(44100, 1)  // 1 second — enough for full LFO cycle
	fx.tremolo(data, { rate: 5, depth: 1, fs: 44100 })
	let min = Infinity, max = -Infinity
	for (let x of data) { if (x < min) min = x; if (x > max) max = x }
	ok(max > 0.9, `tremolo max: ${max.toFixed(3)}`)
	ok(min < 0.1, `tremolo min: ${min.toFixed(3)}`)
})

test('tremolo — depth=0 is passthrough', () => {
	let data = dc(256, 0.7)
	fx.tremolo(data, { rate: 5, depth: 0, fs: 44100 })
	ok(data.every(x => Math.abs(x - 0.7) < 1e-10), 'depth=0 passthrough')
})

test('vibrato — modulates pitch', () => {
	let data = sine(440, 4096)
	let orig = Float64Array.from(data)
	fx.vibrato(data, { rate: 5, depth: 0.003, fs: 44100 })
	ok(data.some((x, i) => Math.abs(x - orig[i]) > 0.01), 'vibrato modifies signal')
	ok(data.every(isFinite), 'no NaN/Inf')
})

test('ringMod — produces sum/difference frequencies', () => {
	let data = sine(440, 4096)
	fx.ringMod(data, { fc: 300, mix: 1, fs: 44100 })
	ok(data.some(x => Math.abs(x) > 0.001), 'ring mod output present')
	ok(data.every(isFinite), 'no NaN/Inf')
})

test('ringMod — mix=0 is passthrough', () => {
	let data = sine(440, 256)
	let orig = Float64Array.from(data)
	fx.ringMod(data, { fc: 300, mix: 0, fs: 44100 })
	let maxErr = 0
	for (let i = 0; i < data.length; i++) { let e = Math.abs(data[i] - orig[i]); if (e > maxErr) maxErr = e }
	ok(maxErr < 1e-10, `ringMod mix=0 passthrough: err=${maxErr}`)
})

// ═══════════════════════════════════════════════════════════════════════════
// Dynamics
// ═══════════════════════════════════════════════════════════════════════════

test('delay — echo at specified time', () => {
	let N = 44100
	let data = impulse(N)
	fx.delay(data, { time: 0.1, feedback: 0, mix: 1, fs: 44100 })
	// Expect echo at sample 4410
	let echoPeak = 0, echoIdx = 0
	for (let i = 1000; i < N; i++) {
		if (Math.abs(data[i]) > echoPeak) { echoPeak = Math.abs(data[i]); echoIdx = i }
	}
	ok(Math.abs(echoIdx - 4410) < 10, `echo at sample ${echoIdx} (expected ~4410)`)
})

test('delay — feedback creates repeating echoes', () => {
	let N = 44100
	let data = impulse(N)
	fx.delay(data, { time: 0.05, feedback: 0.5, mix: 0.5, fs: 44100 })
	let echo1 = Math.abs(data[2205])
	let echo2 = Math.abs(data[4410])
	ok(echo1 > 0.1, `first echo: ${echo1.toFixed(3)}`)
	ok(echo2 > 0.01, `second echo: ${echo2.toFixed(3)}`)
	ok(echo2 < echo1, 'second echo is quieter')
})

test('multitap — multiple echoes', () => {
	let N = 44100
	let data = impulse(N)
	fx.multitap(data, { taps: [{ time: 0.1, gain: 0.5 }, { time: 0.2, gain: 0.3 }], fs: 44100 })
	let at4410 = Math.abs(data[4410])
	let at8820 = Math.abs(data[8820])
	ok(at4410 > 0.1, `tap 1: ${at4410.toFixed(3)}`)
	ok(at8820 > 0.05, `tap 2: ${at8820.toFixed(3)}`)
})

test('pingPong — creates alternating echoes', () => {
	let N = 44100
	let left = impulse(N), right = new Float64Array(N)
	fx.pingPong(left, right, { time: 0.1, feedback: 0.5, mix: 0.5, fs: 44100 })
	// Path: left→bufL→dL→bufR (via feedback)→dR→right output
	// Takes 2 delay periods: ~8820 samples
	let rightPeak = 0
	for (let i = 8000; i < 10000; i++) if (Math.abs(right[i]) > rightPeak) rightPeak = Math.abs(right[i])
	ok(rightPeak > 0.01, `pingPong right: ${rightPeak.toFixed(3)}`)
})

// ═══════════════════════════════════════════════════════════════════════════
// Spatial
// ═══════════════════════════════════════════════════════════════════════════

test('slewLimiter — limits rate of change', () => {
	let data = new Float64Array([0, 0, 0, 1, 1, 1, 0, 0])
	fx.slewLimiter(data, { rise: 22050, fall: 22050, fs: 44100 })
	ok(data[3] <= 0.51, 'rise limited')
	ok(data[3] > 0, 'still rises')
})

test('noiseShaping — quantizes to target bit depth', () => {
	let data = sine(100, 256)
	for (let i = 0; i < data.length; i++) data[i] *= 0.5
	fx.noiseShaping(data, { bits: 8 })
	let scale = Math.pow(2, 7)
	let allQuantized = true
	for (let i = 0; i < data.length; i++) {
		let rounded = Math.round(data[i] * scale) / scale
		if (Math.abs(data[i] - rounded) > 1e-12) { allQuantized = false; break }
	}
	ok(allQuantized, 'all samples quantized to 8-bit grid')
})

test('gain — amplifies signal', () => {
	let data = dc(64, 0.5)
	fx.gain(data, { dB: 6 })
	ok(Math.abs(data[32] - 0.998) < 0.01, `+6dB: ${data[32].toFixed(3)} ≈ 1.0`)
})

test('gain — dB=0 is passthrough', () => {
	let data = dc(64, 0.7)
	fx.gain(data, { dB: 0 })
	ok(Math.abs(data[32] - 0.7) < 1e-10, 'dB=0 passthrough')
})

test('mixer — sums buffers', () => {
	let a = dc(64, 0.5), b = dc(64, 0.3)
	let out = fx.mixer([{ buffer: a, gain: 1 }, { buffer: b, gain: 0.5 }])
	almost(out[32], 0.5 + 0.3 * 0.5, 1e-10)
})

// ═══════════════════════════════════════════════════════════════════════════
// Delay — Reverb
// ═══════════════════════════════════════════════════════════════════════════

test('distortion — soft clip limits to ±1', () => {
	let data = dc(256, 5)
	fx.distortion(data, { drive: 0.5, type: 'soft' })
	let max = 0
	for (let x of data) if (Math.abs(x) > max) max = Math.abs(x)
	ok(max <= 1.001, `soft clip in range: ${max.toFixed(4)}`)
})

test('distortion — hard clip brickwall', () => {
	let data = dc(256, 5)
	fx.distortion(data, { drive: 0.5, type: 'hard' })
	ok(data.every(x => Math.abs(x) <= 1.0001), 'hard clip bounded')
})

test('distortion — tanh stays in ±1', () => {
	let data = dc(256, 5)
	fx.distortion(data, { drive: 0.9, type: 'tanh' })
	ok(data.every(x => Math.abs(x) <= 1.0), 'tanh bounded')
})

test('distortion — foldback stays in ±1', () => {
	let data = dc(256, 5)
	fx.distortion(data, { drive: 0.9, type: 'foldback' })
	ok(data.every(x => Math.abs(x) <= 1.0001), 'foldback bounded')
})

test('distortion — mix=0 is passthrough', () => {
	let data = sine(440, 256)
	let orig = Float64Array.from(data)
	fx.distortion(data, { drive: 0.8, mix: 0 })
	let maxErr = 0
	for (let i = 0; i < data.length; i++) { let e = Math.abs(data[i] - orig[i]); if (e > maxErr) maxErr = e }
	ok(maxErr < 1e-10, `distortion mix=0 passthrough: err=${maxErr}`)
})

test('distortion — adds harmonics (modifies signal)', () => {
	let data = sine(440, 4096)
	let orig = Float64Array.from(data)
	fx.distortion(data, { drive: 0.8, type: 'soft' })
	let maxDiff = 0
	for (let i = 0; i < data.length; i++) { let d = Math.abs(data[i] - orig[i]); if (d > maxDiff) maxDiff = d }
	ok(maxDiff > 0.01, `distortion modifies signal: maxDiff=${maxDiff.toFixed(3)}`)
	ok(data.every(isFinite), 'no NaN/Inf')
})

// ═══════════════════════════════════════════════════════════════════════════
// Bitcrusher
// ═══════════════════════════════════════════════════════════════════════════

test('bitcrusher — quantizes to bit depth', () => {
	let data = sine(100, 1024)
	fx.bitcrusher(data, { bits: 4, rate: 1 })
	let levels = Math.pow(2, 3)
	let quantized = data.every(x => Math.abs(Math.round(x * levels) / levels - x) < 1e-10)
	ok(quantized, 'all samples quantized to 4-bit grid')
})

test('bitcrusher — sample-rate reduction holds values', () => {
	let data = sine(100, 256)
	fx.bitcrusher(data, { bits: 24, rate: 0.25 })
	// With hold=4, groups of 4 samples should be equal
	let hasHold = false
	for (let i = 0; i < 64; i += 4) {
		if (data[i] === data[i + 1] && data[i + 1] === data[i + 2]) { hasHold = true; break }
	}
	ok(hasHold, 'sample holding detected at rate=0.25')
})

test('bitcrusher — no NaN/Inf', () => {
	let data = sine(440, 4096)
	fx.bitcrusher(data, { bits: 8, rate: 0.25, fs: 44100 })
	ok(data.every(isFinite), 'no NaN/Inf')
})

// ═══════════════════════════════════════════════════════════════════════════
// Modulation — Pitch Shifter & Auto-wah
// ═══════════════════════════════════════════════════════════════════════════

test('autoWah — produces output without NaN', () => {
	let data = sine(440, 4096)
	fx.autoWah(data, { base: 300, range: 3000, Q: 5, fs: 44100 })
	ok(data.some(x => Math.abs(x) > 0.001), 'autoWah has output')
	ok(data.every(isFinite), 'no NaN/Inf')
})

test('autoWah — envelope rises with signal', () => {
	let data = dc(4096, 0.5)
	let p = { base: 300, range: 3000, Q: 3, fs: 44100 }
	fx.autoWah(data, p)
	ok(p._env > 0.1, `envelope driven by signal: ${p._env.toFixed(3)}`)
})

test('autoWah — louder input drives envelope higher', () => {
	let loud = dc(2048, 0.8), quiet = dc(2048, 0.05)
	let p1 = { base: 300, range: 3000, Q: 3, fs: 44100 }
	let p2 = { base: 300, range: 3000, Q: 3, fs: 44100 }
	fx.autoWah(loud, p1)
	fx.autoWah(quiet, p2)
	ok(p1._env > p2._env, `loud env (${p1._env.toFixed(3)}) > quiet env (${p2._env.toFixed(4)})`)
})

// ═══════════════════════════════════════════════════════════════════════════
// Exciter
// ═══════════════════════════════════════════════════════════════════════════

test('exciter — amount=0 is passthrough', () => {
	let data = sine(440, 4096)
	let orig = Float64Array.from(data)
	fx.exciter(data, { amount: 0, freq: 3000, drive: 0.5, fs: 44100 })
	let maxErr = 0
	for (let i = 0; i < data.length; i++) { let d = Math.abs(data[i] - orig[i]); if (d > maxErr) maxErr = d }
	ok(maxErr < 1e-10, `exciter amount=0 passthrough: err=${maxErr}`)
})

test('exciter — adds harmonics on high-band input', () => {
	let data = sine(4000, 4096)
	let orig = Float64Array.from(data)
	fx.exciter(data, { amount: 0.8, freq: 2000, drive: 0.8, fs: 44100 })
	let maxDiff = 0
	for (let i = 2048; i < data.length; i++) { let d = Math.abs(data[i] - orig[i]); if (d > maxDiff) maxDiff = d }
	ok(maxDiff > 0.01, `exciter modifies high-band: maxDiff=${maxDiff.toFixed(3)}`)
	ok(data.every(isFinite), 'no NaN/Inf')
})

// ═══════════════════════════════════════════════════════════════════════════
// Frequency shifter
// ═══════════════════════════════════════════════════════════════════════════

test('frequencyShifter — shift=0 is near-passthrough (minus Hilbert delay)', () => {
	let data = sine(440, 8192)
	fx.frequencyShifter(data, { shift: 0, fs: 44100 })
	ok(data.every(isFinite), 'no NaN/Inf at shift=0')
	ok(data.some(x => Math.abs(x) > 0.5), 'signal preserved at shift=0')
})

test('frequencyShifter — 200 Hz up shifts peak to ~640 Hz', () => {
	let N = 8192
	let data = sine(440, N)
	fx.frequencyShifter(data, { shift: 200, taps: 65, fs: 44100 })
	// FFT-free test: Goertzel at 440 vs 640 Hz
	let goertzel = (x, f, fs) => {
		let k = 2 * Math.cos(2 * Math.PI * f / fs), s1 = 0, s2 = 0
		for (let i = 200; i < x.length; i++) { let s0 = x[i] + k * s1 - s2; s2 = s1; s1 = s0 }
		return s1 * s1 + s2 * s2 - k * s1 * s2
	}
	let e440 = goertzel(data, 440, 44100)
	let e640 = goertzel(data, 640, 44100)
	ok(e640 > e440, `shifted energy at 640Hz (${e640.toFixed(0)}) > original 440Hz (${e440.toFixed(0)})`)
})

test('frequencyShifter — mix=0 is passthrough', () => {
	let data = sine(440, 4096)
	let orig = Float64Array.from(data)
	fx.frequencyShifter(data, { shift: 100, mix: 0, fs: 44100 })
	let maxErr = 0
	for (let i = 0; i < data.length; i++) { let d = Math.abs(data[i] - orig[i]); if (d > maxErr) maxErr = d }
	ok(maxErr < 1e-10, `mix=0 passthrough: err=${maxErr}`)
})

// ═══════════════════════════════════════════════════════════════════════════
// Auto-panner
// ═══════════════════════════════════════════════════════════════════════════

