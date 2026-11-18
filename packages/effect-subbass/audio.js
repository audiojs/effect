// atom manifest — wraps the subbass atom; SVF filter state, no sizing params —
// every param stays live, per-channel state is just the running filter integrators,
// made here so the first block sets nothing up.

import subbassFn from './subbass.js'

// A value that scales the signal, glided sample by sample so that a host's steps of it join into one line. A host hands
// each call the value at its first frame and, while a value moves (a `smoothing` ramp), calls with 32 frames at most
// (contract 1.0: Parameters, Time; What a host owes, 3). So the line through the values the calls bring, each at its
// call's first frame, is known 32 frames behind any call's first frame, however the host cut the calls; the glide plays
// it 32 frames late. Straight from the value of one call to the next's, it is the host's ramp itself, in the value's
// own unit, the same whether the host calls with 1, 32 or a mix of frames; drawn between each call's end and the next
// (a glide across each call), a ramp cut 32, 4, 32 would put 32 frames of it into 4. A value that follows a call of
// more than 32 frames came with no ramp: it is reached in a straight line over 32 frames. The first call of an
// instance starts on its value, and a value held 32 frames is the value itself, so a value that does not move is bit
// for bit what the kernel makes of it alone.
// `g`: the memory, GLIDE slots a value from j·GLIDE (made NaN): the value the last call brought, where in the ring its
// first frame is, its frames, the frames the line had been at that value before it (64 once held and the ring all of
// it; counted to 63 at most, so that a long call after a move cannot reach 64 before the ring is made all of it), how
// many of `row`'s hold it, then the line, a frame a slot, in a ring of 64. `src`: the param's array. The line's values
// for this call's `n` frames go to `row` from `at`: as they are, or with `lin` 1 the gain e^(v·ln10/20) of a value in
// dB, per sample, so the gain follows the host's ramp of the dB value. Returns 1 while they move, 0 when every one is
// the value (then `row` holds it, filled once, and a caller may run its kernel on the value alone). Only arrays and
// whole numbers cross the call.
const GLIDE = 69
function glide (g, j, src, row, at, n, lin) {
	let o = j * GLIDE, r = o + 5, v = src[0], was = g[o]
	if (!(was === was)) { g[o] = v; g[o + 1] = 0; g[o + 2] = n; g[o + 3] = 0; g[o + 4] = 0 }
	else if (v !== was || g[o + 3] < 64) {
		let len = g[o + 2], L = len < 32 ? len : 32, w = (g[o + 1] + len) & 63, d = v - was, held = v === was ? Math.min(g[o + 3] + len, 63) : 0
		for (let q = 0; q < L; q++) g[r + ((w - L + q) & 63)] = was + d * q / L
		g[r + w] = v
		g[o] = v; g[o + 1] = w; g[o + 2] = n; g[o + 3] = held; g[o + 4] = 0
		if (held < 32) {
			for (let i = 0; i < n; i++) {
				let u = i < 32 ? g[r + ((w + i - 32) & 63)] : v
				row[at + i] = lin ? Math.exp(u * (Math.LN10 / 20)) : u
			}
			return 1
		}
	} else { g[o + 1] = (g[o + 1] + g[o + 2]) & 63; g[o + 2] = n }
	// held 32 frames: the ring made all of the value once (a move from it reads the line from there), the row filled
	// with it as far as no call since it was held has filled it; from then on a call only moves the ring's position
	if (g[o + 3] < 64) { for (let q = 0; q < 64; q++) g[r + q] = v; g[o + 3] = 64 }
	if (g[o + 4] < n) {
		let u = lin ? Math.exp(v * (Math.LN10 / 20)) : v
		for (let i = 0; i < n; i++) row[at + i] = u
		g[o + 4] = n
	}
	return 0
}

export const subbass = (ctx) => {
	const chP = [], M = ctx.maxBlockSize
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, _sub: new Float64Array(2), _out: new Float64Array(2), _dc: 0 })
	// amount, drive and keep scale the signal: each is smoothed (20 ms) and glided sample by sample (glide, above), its
	// values for the call a lane of `lanes`; while none moves the kernel runs on the values
	const g = new Float64Array(3 * GLIDE).fill(NaN), lanes = new Float64Array(3 * M)
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const n = inp[0].length, moving = glide(g, 0, params.amount, lanes, 0, n, 0) | glide(g, 1, params.drive, lanes, M, n, 0) | glide(g, 2, params.keep, lanes, 2 * M, n, 0)
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.fc = params.fc[0]
			p.amount = params.amount[0]
			p.drive = params.drive[0]
			p.keep = params.keep[0]
			out[c].set(inp[c])
			subbassFn(out[c], p, moving ? lanes : undefined, M)
		}
	}
}
subbass.channels = 'any'
// The tail (CONTRACT 1.0: until the output stays 60 dB under the input's level) by the rule for a fixed linear filter:
// the frames after an input stops until the rest of Σ|h| is under eps, h the impulse response. A peak-1 input then
// leaves at most eps, and a held tone at a resonance, or DC into a loop, comes within a few percent of it, so the gain
// the ring starts at is in the count. `make` returns [tick, energy]: tick(x) runs a frame, energy() sums the squares of
// the state. h runs until that energy has fallen 200 dB from its largest, past which what is left is negligible, then
// again from the impulse, the rest being the sum less what has passed; Infinity where it has not fallen so far in 2^22
// frames
const rest = (make, eps) => {
	let [tick, energy] = make(), sum = 0, top = 0, n = 0
	for (; n < 2 ** 22; n++) { sum += Math.abs(tick(n ? 0 : 1)); let e = energy(); if (e > top) top = e; else if (n > 64 && e <= 1e-20 * top) break }
	if (n === 2 ** 22) return Infinity
	tick = make()[0]
	for (let j = 0; j < n; j++) if ((sum -= Math.abs(tick(j ? 0 : 1))) <= eps) return j
	return n
}
// the two paths frozen as subbass.js runs them, each Chamberlin SVF at f = 2 sin(π fc / fs): the sub lowpass (damping
// 1.2), and after it the harmonic path, the waveshaper a gain here (counted outside), the DC tracker and the bandpass
// at 2.5 fc (damping 0.8)
const lowpass = f => () => { let l = 0, b = 0; return [x => { l += f * b; b += f * (x - l - 1.2 * b); return l }, () => l * l + b * b] }
const harmonic = (f, f2, aDc) => () => {
	let l = 0, b = 0, dc = 0, L = 0, P = 0
	return [x => { l += f * b; b += f * (x - l - 1.2 * b); dc += aDc * (l - dc); L += f2 * P; P += f2 * (l - dc - L - 0.8 * P); return P }, () => l * l + b * b + dc * dc + L * L + P * P]
}
// A planning snapshot's number that is not finite (automation whose values are not known yet) reserves the longer of
// the tails at the ends of its range, as effect-delay's tail reserves its maxima: through the formula it gave no tail
// (a NaN amount reads as none, a NaN fc as a ring of NaN), cutting the decay. Both ends are tried: the tail is longest
// at one or the other
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
// What the input leaves (subbass.js) is −(1 − keep) of the sub and 2 · amount of the harmonic path, its waveshaper
// tanh(g · s) · 0.6 + |s| · g · 0.4, g = 1 + 6 · drive, at most g · |s|, its slope at 0, which a quiet input meets. Each
// path's rest is held under half of 1e-3 over its gain. A ring of 128 frames or less needs no tail (CONTRACT 1.0)
subbass.tail = reserve(subbass, ({ sampleRate: fs, params }) => {
	let fc = params.fc[0], f = 2 * Math.sin(Math.PI * Math.min(fc, fs / 4) / fs), f2 = 2 * Math.sin(Math.PI * Math.min(fc * 2.5, fs / 4) / fs)
	let dry = 1 - params.keep[0], wet = 2 * params.amount[0] * (1 + 6 * params.drive[0]), aDc = 1 - Math.exp(-2 * Math.PI * 10 / fs)
	let n = Math.max(dry > 0 ? rest(lowpass(f), 5e-4 / dry) : 0, wet > 0 ? rest(harmonic(f, f2, aDc), 5e-4 / wet) : 0)
	return n > 128 ? n / fs : 0
})
subbass.params = {
	fc:     { type: 'number', min: 30, max: 200, default: 80, unit: 'Hz', curve: 'log', alias: 'freq' },
	amount: { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
	drive:  { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
	keep:   { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
