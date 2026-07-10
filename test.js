import test from 'node:test'
import { strict as assert } from 'node:assert'
import { bandpass as biquadBandpass, process as biquadProcess } from '@audio/biquad'

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

// ── Rotary speaker — Leslie: crossover-split horn/drum rotors, each producing Doppler
// (FM via modulated delay) + directivity AM. Kernel is (left, right, params): mono-in
// is expressed by pre-filling both channels with the same dry signal (pingpong shape).

function rotaryStereo (mono, params) {
	let left = Float64Array.from(mono), right = Float64Array.from(mono)
	fx.rotary(left, right, params)
	return [left, right]
}
function envelope (d, fs, cutoff = 20) {
	let out = new Float64Array(d.length), a = 1 - Math.exp(-2 * Math.PI * cutoff / fs), y = 0
	for (let i = 0; i < d.length; i++) { y += a * (Math.abs(d[i]) - y); out[i] = y }
	return out
}
function demean (d, from, to) {
	let m = 0
	for (let i = from; i < to; i++) m += d[i]
	m /= (to - from)
	let out = new Float64Array(d.length)
	for (let i = from; i < to; i++) out[i] = d[i] - m
	return out
}
// coarse spectral peak via Goertzel scan — sufficient resolution for LFO-rate (<15 Hz) reads
function peakFreq (d, fs, from, to, fmin = 0.2, fmax = 12, step = 0.02) {
	let best = fmin, bestE = -1
	for (let f = fmin; f <= fmax; f += step) {
		let e = goertzel(d, f, fs, from, to)
		if (e > bestE) { bestE = e; best = f }
	}
	return best
}
function rms (d, from = 0, to = d.length) {
	let s = 0
	for (let i = from; i < to; i++) s += d[i] * d[i]
	return Math.sqrt(s / (to - from))
}

test('rotary — Doppler sidebands appear at the horn rotor rate', () => {
	let fs = 44100, N = 5 * fs
	let mono = sine(3000, N, fs)
	let [left] = rotaryStereo(mono, { fs, hornSpeed: 6.7, drumSpeed: 5.9, crossover: 800, depth: 1 })
	let winN = 65536, from = N - winN, to = N // tail window — past any startup transient
	let lo = goertzel(left, 3000 - 6.7, fs, from, to)
	let hi = goertzel(left, 3000 + 6.7, fs, from, to)
	let floorRef = goertzel(left, 3000 + 50, fs, from, to)
	ok(20 * Math.log10(lo / floorRef) >= 20, `low sideband ${(20 * Math.log10(lo / floorRef)).toFixed(1)} dB above floor`)
	ok(20 * Math.log10(hi / floorRef) >= 20, `high sideband ${(20 * Math.log10(hi / floorRef)).toFixed(1)} dB above floor`)
})

test('rotary — horn and drum rotors modulate at independent, crossover-routed rates', () => {
	let fs = 44100, N = 5 * fs
	let mono = new Float64Array(N)
	for (let i = 0; i < N; i++) mono[i] = 0.5 * Math.sin(2 * Math.PI * 150 * i / fs) + 0.5 * Math.sin(2 * Math.PI * 3000 * i / fs)
	// fast inertia isolates crossover-routing structure from the glide behavior (tested separately)
	let [left] = rotaryStereo(mono, { fs, hornSpeed: 8, drumSpeed: 2, crossover: 800, depth: 1, hornInertia: 0.05, drumInertia: 0.05 })

	let lowBand = Float64Array.from(left); biquadProcess(lowBand, biquadBandpass(150, 5, fs))
	let hiBand = Float64Array.from(left); biquadProcess(hiBand, biquadBandpass(3000, 5, fs))
	let from = Math.round(0.5 * fs), to = N
	let lowPeak = peakFreq(demean(envelope(lowBand, fs, 20), from, to), fs, from, to)
	let hiPeak = peakFreq(demean(envelope(hiBand, fs, 20), from, to), fs, from, to)
	ok(Math.abs(lowPeak - 2) <= 0.5, `150 Hz tone envelope modulates at drum rate: ${lowPeak.toFixed(2)} Hz (expect ~2)`)
	ok(Math.abs(hiPeak - 8) <= 0.5, `3 kHz tone envelope modulates at horn rate: ${hiPeak.toFixed(2)} Hz (expect ~8)`)
})

test('rotary — AM depth grows monotonically with depth', () => {
	let fs = 44100, N = 2 * fs
	let mono = sine(3000, N, fs)
	let from = Math.round(0.3 * fs), to = N
	let ratios = [0.2, 0.6, 1.0].map(depth => {
		let [left] = rotaryStereo(mono, { fs, hornSpeed: 6.7, drumSpeed: 5.9, depth, hornInertia: 0.02, crossover: 800 })
		let env = envelope(left, fs, 30)
		let mn = Infinity, mx = -Infinity
		for (let i = from; i < to; i++) { if (env[i] < mn) mn = env[i]; if (env[i] > mx) mx = env[i] }
		return mx / mn
	})
	ok(ratios[0] < ratios[1] && ratios[1] < ratios[2], `peak/trough grows with depth: ${ratios.map(r => r.toFixed(2))}`)
})

test('rotary — speed change glides through the inertia model (chorale → tremolo)', () => {
	let fs = 44100, T = 3 * fs
	let p = { fs, hornSpeed: 0.8, drumSpeed: 0.7, depth: 1, crossover: 800 } // chorale — let it settle
	fx.rotary(Float64Array.from(sine(3000, T, fs)), Float64Array.from(sine(3000, T, fs)), p)

	p.hornSpeed = 6.7; p.drumSpeed = 5.9 // switch to tremolo mid-stream — state (incl. rotor rate) persists on p
	let mono2 = sine(3000, T, fs)
	let [left2] = rotaryStereo(mono2, p)

	let env = envelope(left2, fs, 40)
	let earlyFrom = 0, earlyTo = Math.round(0.4 * fs)
	let lateFrom = T - fs, lateTo = T
	let early = peakFreq(demean(env, earlyFrom, earlyTo), fs, earlyFrom, earlyTo)
	let late = peakFreq(demean(env, lateFrom, lateTo), fs, lateFrom, lateTo)
	ok(late >= 2 * early, `late rate (${late}) ≥ 2× early rate (${early})`)
	ok(early >= 0.8 && early <= 6.7, `early rate ${early} within [0.8, 6.7]`)
	ok(late >= 0.8 && late <= 6.7, `late rate ${late} within [0.8, 6.7]`)
})

test('rotary — L/R mics decorrelate without gross mono cancellation', () => {
	let fs = 44100, N = 2 * fs
	let mono = new Float64Array(N)
	for (let i = 0; i < N; i++) mono[i] = 0.6 * Math.sin(2 * Math.PI * 3000 * i / fs) + 0.3 * Math.sin(2 * Math.PI * 300 * i / fs)
	let [left, right] = rotaryStereo(mono, { fs, hornSpeed: 6.7, drumSpeed: 5.9, depth: 1, crossover: 800 })
	let from = Math.round(0.3 * fs)
	let diff = new Float64Array(N), sum = new Float64Array(N)
	for (let i = 0; i < N; i++) { diff[i] = left[i] - right[i]; sum[i] = left[i] + right[i] }
	let rmsL = rms(left, from), rmsDiff = rms(diff, from), rmsSum = rms(sum, from)
	ok(20 * Math.log10(rmsDiff / rmsL) >= -20, `L−R decorrelation: ${(20 * Math.log10(rmsDiff / rmsL)).toFixed(1)} dB`)
	ok(Math.abs(20 * Math.log10(rmsSum / (2 * rmsL))) <= 3, `L+R vs 2×L: ${(20 * Math.log10(rmsSum / (2 * rmsL))).toFixed(2)} dB`)
})

test('rotary — mix=0 is exact bypass (zero latency)', () => {
	let fs = 44100, N = 4096
	let mono = sine(440, N, fs)
	let [left, right] = rotaryStereo(mono, { fs, mix: 0, hornSpeed: 6.7, drumSpeed: 5.9 })
	let maxErr = 0
	for (let i = 0; i < N; i++) maxErr = Math.max(maxErr, Math.abs(left[i] - mono[i]), Math.abs(right[i] - mono[i]))
	ok(maxErr < 1e-10, `mix=0 exact bypass: err=${maxErr}`)
})

test('rotary — streaming continuity across split buffers; no NaN/Inf, length preserved', () => {
	let fs = 44100, N = 8192, half = N >> 1
	let full = sine(440, N, fs)
	let pFull = { fs, hornSpeed: 6.7, drumSpeed: 5.9, depth: 1 }
	let [fullL] = rotaryStereo(full, pFull)

	let pCont = { fs, hornSpeed: 6.7, drumSpeed: 5.9, depth: 1 }
	let [aL] = rotaryStereo(sine(440, half, fs), pCont)
	let secondHalf = new Float64Array(half)
	for (let i = 0; i < half; i++) secondHalf[i] = Math.sin(2 * Math.PI * 440 * (i + half) / fs)
	let [bL] = rotaryStereo(secondHalf, pCont)

	let maxErr = 0
	for (let i = 0; i < half; i++) maxErr = Math.max(maxErr, Math.abs(aL[i] - fullL[i]), Math.abs(bL[i] - fullL[half + i]))
	ok(maxErr < 1e-9, `split-buffer continuity matches one continuous call: err=${maxErr}`)
	ok(fullL.length === N && aL.length === half, 'length preserved')
	ok(fullL.every(Number.isFinite) && aL.every(Number.isFinite) && bL.every(Number.isFinite), 'no NaN/Inf')
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

test('frequencyShifter — mix=0 is the delay-aligned dry (constant latency at every mix)', () => {
	// Dry and wet share the Hilbert group delay M, so the declared atom latency
	// holds for any mix — an undelayed mix-0 dry would arrive M samples early
	// after host latency compensation (and comb against the wet at 0 < mix < 1).
	let taps = 65, M = (taps - 1) >> 1
	let data = sine(440, 4096)
	let orig = Float64Array.from(data)
	fx.frequencyShifter(data, { shift: 100, mix: 0, taps, fs: 44100 })
	let maxErr = 0
	for (let i = M; i < data.length; i++) { let d = Math.abs(data[i] - orig[i - M]); if (d > maxErr) maxErr = d }
	ok(maxErr < 1e-10, `mix=0 ≡ M-delayed input: err=${maxErr}`)
})

// ═══════════════════════════════════════════════════════════════════════════
// Auto-panner
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// Texture / bandwidth
// ═══════════════════════════════════════════════════════════════════════════

function goertzel (d, f, fs = 44100, from = 2048, to = d.length - 2048) {
	let w = 2 * Math.PI * f / fs, cw = Math.cos(w), s1 = 0, s2 = 0
	for (let i = from; i < to; i++) { let s0 = d[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 }
	return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / (to - from)
}

test('graindelay — delayed grains appear, dry-only until delay time', () => {
	let n = 44100, d = new Float64Array(n)
	for (let i = 0; i < 4410; i++) d[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
	fx.grainDelay(d, { time: 0.25, mix: 0.5, feedback: 0, fs: 44100 })
	let pre = 0, post = 0
	for (let i = 5000; i < 10000; i++) pre = Math.max(pre, Math.abs(d[i]))
	for (let i = 11500; i < 16000; i++) post = Math.max(post, Math.abs(d[i]))
	ok(pre < 0.01, `silent between source and delay (${pre.toFixed(4)})`)
	ok(post > 0.05, `grains land after 0.25 s (${post.toFixed(3)})`)
})

test('graindelay — pitch: +12 st grains read at 2× rate (octave up)', () => {
	let n = 44100, d = new Float64Array(n)
	for (let i = 0; i < 22050; i++) d[i] = 0.8 * Math.sin(2 * Math.PI * 440 * i / 44100)
	fx.grainDelay(d, { time: 0.1, pitch: 12, spray: 0, jitter: 0, mix: 1, feedback: 0, fs: 44100 })
	ok(goertzel(d, 880, 44100, 8820, 22050) > goertzel(d, 440, 44100, 8820, 22050) * 2, 'octave dominates')
})

test('stutter — slice repeats fill the interval', () => {
	let n = 44100, d = new Float64Array(n)
	// impulse train only inside the first slice (0..0.125 s)
	for (let i = 0; i < 5512; i += 500) d[i] = 1
	fx.stutter(d, { interval: 0.5, slice: 0.125, mix: 1, fs: 44100 })
	let hits = 0
	for (let i = 5513; i < 22050; i++) if (Math.abs(d[i]) > 0.5) hits++
	ok(hits >= 20, `repeats present after capture (${hits} hits)`)
})

test('stutter — decay attenuates successive repeats', () => {
	let n = 44100, d = new Float64Array(n)
	for (let i = 0; i < 5512; i++) d[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
	fx.stutter(d, { interval: 1, slice: 0.125, decay: 0.5, mix: 1, fs: 44100 })
	let r1 = 0, r3 = 0
	for (let i = 5600; i < 10800; i++) r1 = Math.max(r1, Math.abs(d[i]))
	for (let i = 16700; i < 21800; i++) r3 = Math.max(r3, Math.abs(d[i]))
	ok(r3 < r1 * 0.5, `later repeats quieter (${r3.toFixed(3)} < ${r1.toFixed(3)})`)
})

test('lofi — bandwidth ceiling kills 12 kHz, keeps 500 Hz', () => {
	let n = 44100
	let d = new Float64Array(n)
	for (let i = 0; i < n; i++) d[i] = 0.4 * (Math.sin(2 * Math.PI * 500 * i / 44100) + Math.sin(2 * Math.PI * 12000 * i / 44100))
	fx.lofi(d, { lowpass: 3000, wow: 0, flutter: 0, noise: 0, crackle: 0, drive: 0, fs: 44100 })
	ok(goertzel(d, 12000) < goertzel(d, 500) * 0.15, 'HF crushed, program kept')
})

test('lofi — wow modulation spreads a pure tone', () => {
	let n = 88200, d = new Float64Array(n)
	for (let i = 0; i < n; i++) d[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * i / 44100)
	let dry = goertzel(d, 1000)
	fx.lofi(d, { wow: 1, flutter: 0, noise: 0, crackle: 0, drive: 0, lowpass: 20000, fs: 44100 })
	ok(goertzel(d, 1000) < dry * 0.9, 'carrier smeared by pitch drift')
	ok(d.every(isFinite))
})

test('subbass — generates low-mid harmonics from a 60 Hz sub', () => {
	let n = 44100, d = new Float64Array(n)
	for (let i = 0; i < n; i++) d[i] = 0.7 * Math.sin(2 * Math.PI * 60 * i / 44100)
	let h2dry = goertzel(d, 120), h3dry = goertzel(d, 180)
	fx.subbass(d, { freq: 80, amount: 0.8, drive: 0.7, fs: 44100 })
	ok(goertzel(d, 120) > h2dry * 3 || goertzel(d, 180) > h3dry * 3, 'harmonic series appears')
	ok(d.every(isFinite))
})

test('sbr — regenerates content above the cutoff', () => {
	let n = 44100, d = new Float64Array(n)
	// program dies at 4 kHz (simulated lossy ceiling): 3 kHz tone only
	for (let i = 0; i < n; i++) d[i] = 0.6 * Math.sin(2 * Math.PI * 3000 * i / 44100)
	let above = goertzel(d, 6000)
	fx.sbr(d, { cutoff: 4000, amount: 0.8, drive: 0.7, fs: 44100 })
	ok(goertzel(d, 6000) > above * 5 + 1e-6, 'harmonics land above cutoff')
	almost(goertzel(d, 3000) / 0.3, 1, 0.15)  // program band substantially intact
	ok(d.every(isFinite))
})

// ═══════════════════════════════════════════════════════════════════════════
// Live-resize / mix-alignment regressions (kernel defects flagged by manifest verification)
// ═══════════════════════════════════════════════════════════════════════════

test('chorus — depth 1 stays finite (read distance may reach ring size)', () => {
	let p = { rate: 2, depth: 1, delay: 20, voices: 3, fs: 44100 }
	let data = sine(440, 44100)
	fx.chorus(data, p)
	ok(data.every(Number.isFinite), 'no NaN at full depth')
})

test('chorus — live voices increase keeps state finite', () => {
	let p = { rate: 1.5, depth: 0.5, delay: 20, voices: 2, fs: 44100 }
	fx.chorus(sine(440, 4096), p)
	p.voices = 5
	let data = sine(440, 4096)
	fx.chorus(data, p)
	ok(data.every(Number.isFinite), 'no NaN after voices grew')
})

test('chorus/flanger/vibrato — live delay/depth shrink keeps ring pointer valid', () => {
	let pc = { rate: 1.5, depth: 0.5, delay: 30, fs: 44100 }
	fx.chorus(sine(440, 4096), pc)
	pc.delay = 5
	let d1 = sine(440, 4096); fx.chorus(d1, pc)
	ok(d1.every(Number.isFinite), 'chorus survives delay shrink')

	let pf = { rate: 0.3, depth: 1, delay: 6, feedback: 0.5, fs: 44100 }
	fx.flanger(sine(440, 4096), pf)
	pf.delay = 1
	let d2 = sine(440, 4096); fx.flanger(d2, pf)
	ok(d2.every(Number.isFinite), 'flanger survives delay shrink at full depth')

	let pv = { rate: 5, depth: 0.005, fs: 44100 }
	fx.vibrato(sine(440, 4096), pv)
	pv.depth = 0.001
	let d3 = sine(440, 4096); fx.vibrato(d3, pv)
	ok(d3.every(Number.isFinite), 'vibrato survives depth shrink')
})

test('phaser — live stages change keeps cascade finite', () => {
	let p = { rate: 0.5, depth: 0.7, stages: 4, feedback: 0.5, fs: 44100 }
	fx.phaser(sine(440, 4096), p)
	p.stages = 8
	let data = sine(440, 4096)
	fx.phaser(data, p)
	ok(data.every(Number.isFinite), 'no NaN after stages grew')
})

test('multitap — steady-state calls reuse tap table; zero-time tap stays finite', () => {
	let taps = [{ time: 0.01, gain: 0.5 }]
	let p = { taps, fs: 44100 }
	fx.multitap(new Float64Array(512), p)
	let table = p._tapSamples
	fx.multitap(new Float64Array(512), p)
	ok(p._tapSamples === table, 'tap table cached across calls (no per-call allocation)')

	let z = { taps: [{ time: 0, gain: 0.5 }], fs: 44100 }
	let data = impulse(256)
	fx.multitap(data, z)
	ok(data.every(Number.isFinite), 'zero-length delay guarded')
})

test('frequencyShifter — dry/wet blend is group-delay aligned (no comb at mix<1)', () => {
	// shift 0 → wet ≡ delayed dry, so ANY mix must equal the input delayed by (taps-1)/2.
	// The old kernel blended undelayed dry: mix .5 combed (≈ (x[i] + x[i−M])/2).
	let taps = 65, M = (taps - 1) >> 1, n = 8192
	let inp = sine(1000, n)
	let data = inp.slice()
	fx.frequencyShifter(data, { shift: 0, mix: 0.5, taps, fs: 44100 })
	let maxErr = 0
	for (let i = taps; i < n; i++) maxErr = Math.max(maxErr, Math.abs(data[i] - inp[i - M]))
	ok(maxErr < 1e-3, `mix .5 output ≡ M-delayed input (maxErr ${maxErr.toExponential(2)})`)
})

// ═══════════════════════════════════════════════════════════════════════════
// Tape stop — batch, whole-render: variable-rate playback via a decelerating (or
// accelerating) read pointer. streaming: false in the manifest — kernel itself is a
// pure (data, opts) function, so every test calls it directly.
// ═══════════════════════════════════════════════════════════════════════════

// instantaneous frequency via zero-crossing spacing in a window centered at `centerT`
function instFreq (d, fs, centerT, winMs = 50) {
	let win = (winMs / 1000 * fs) | 0
	let center = (centerT * fs) | 0
	let from = Math.max(0, center - (win >> 1)), to = Math.min(d.length, center + (win >> 1))
	let cross = []
	for (let i = from + 1; i < to; i++) if (d[i - 1] < 0 && d[i] >= 0) cross.push(i + (0 - d[i - 1]) / (d[i] - d[i - 1]))
	if (cross.length < 2) return NaN
	let sum = 0
	for (let i = 1; i < cross.length; i++) sum += cross[i] - cross[i - 1]
	return fs / (sum / (cross.length - 1))
}

test('tapestop — linear (curve=1) pitch trajectory follows f0·(1 − t/time)', () => {
	let fs = 44100, N = Math.round(1.5 * fs)
	let data = sine(1000, N, fs)
	fx.tapeStop(data, { at: 0, time: 1, curve: 1, fs })
	for (let t of [0.2, 0.5, 0.8]) {
		let f = instFreq(data, fs, t)
		let expect = 1000 * (1 - t)
		ok(Math.abs(f - expect) / expect < 0.04, `t=${t}: ${f.toFixed(1)} Hz ≈ ${expect} Hz`)
	}
})

test('tapestop — consumed input over a linear ramp sits at ≈ time/2', () => {
	let fs = 44100, N = Math.round(1.5 * fs), time = 1
	let data = new Float64Array(N)
	for (let i = 0; i < N; i++) data[i] = i // ramp — output value directly encodes input position read
	fx.tapeStop(data, { at: 0, time, curve: 1, fs })
	let max = 0
	for (let i = 0; i < N; i++) if (data[i] > max) max = data[i]
	let expect = (time / 2) * fs
	ok(Math.abs(max - expect) / expect < 0.02, `max output ${max.toFixed(0)} ≈ ramp[T/2]=${expect}`)
})

test('tapestop — silence after the stop completes', () => {
	let fs = 44100, N = Math.round(1.5 * fs)
	let data = sine(1000, N, fs)
	fx.tapeStop(data, { at: 0, time: 1, curve: 1, fs })
	let from = Math.round(1.01 * fs)
	ok(rms(data, from, N) === 0, 'output silent after time elapses')
})

test('tapestop — content before `at` is bit-identical to input', () => {
	let fs = 44100, N = fs
	let data = sine(1000, N, fs)
	let orig = Float64Array.from(data)
	fx.tapeStop(data, { at: 0.5, time: 1, curve: 1, fs })
	let atN = Math.round(0.5 * fs)
	let maxErr = 0
	for (let i = 0; i < atN; i++) maxErr = Math.max(maxErr, Math.abs(data[i] - orig[i]))
	ok(maxErr === 0, `pre-'at' region unchanged: err=${maxErr}`)
})

test('tapestop — curve=2 falls faster than curve=1 (linear) early in the ramp', () => {
	let fs = 44100, N = Math.round(1.5 * fs)
	let data = sine(1000, N, fs)
	fx.tapeStop(data, { at: 0, time: 1, curve: 2, fs })
	let f = instFreq(data, fs, 0.5)
	ok(f < 500, `curve=2 freq@0.5s = ${f.toFixed(1)} Hz < 500 Hz (linear case)`)
})

test('tapestop — spin-up (direction: start) ramps 0 → f0', () => {
	let fs = 44100, N = fs
	let data = sine(1000, N, fs)
	fx.tapeStop(data, { at: 0, time: 0.5, curve: 1, direction: 'start', fs })
	let early = instFreq(data, fs, 0.1)
	let late = instFreq(data, fs, 0.7)
	ok(early < 500, `t=0.1 well below f0: ${early.toFixed(1)} Hz`)
	ok(Math.abs(late - 1000) / 1000 < 0.02, `t=0.7 (past ramp) ≈ f0: ${late.toFixed(1)} Hz`)
})

test('tapestop — flutter is seeded-deterministic', () => {
	let fs = 44100, N = fs
	let mk = () => sine(1000, N, fs)

	let a = mk(), b = mk()
	fx.tapeStop(a, { at: 0, time: 1, flutter: 0.5, seed: 42, fs })
	fx.tapeStop(b, { at: 0, time: 1, flutter: 0.5, seed: 42, fs })
	ok(a.every((v, i) => v === b[i]), 'same seed → identical output')

	let c = mk()
	fx.tapeStop(c, { at: 0, time: 1, flutter: 0.5, seed: 43, fs })
	ok(a.some((v, i) => v !== c[i]), 'different seed → different output')

	let d = mk(), e = mk()
	fx.tapeStop(d, { at: 0, time: 1, flutter: 0, fs })
	fx.tapeStop(e, { at: 0, time: 1, flutter: 0, fs })
	ok(d.every((v, i) => v === e[i]), 'flutter=0 deterministic regardless of seed')
})

test('tapestop — length preserved, no NaN/Inf', () => {
	let fs = 44100, N = 22050
	let data = sine(1000, N, fs)
	fx.tapeStop(data, { at: 0.2, time: 0.5, flutter: 0.3, fs })
	ok(data.length === N, 'length preserved')
	ok(data.every(Number.isFinite), 'no NaN/Inf')
})
