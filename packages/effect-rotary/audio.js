// atom manifest — wraps the rotary atom. Physically mono-in/stereo-out (one Leslie
// cabinet, two virtual mics), so the bus is declared { inputs: 1, outputs: 2 }. No
// param resizes the delay rings (sized off the fixed horn/drum radii, not off any
// live param) — nothing here needs a restart. The state (rings, crossover, rotors) is
// made here by a call of no frames, so the first block sets nothing up, and each block
// calls the in-place form, which returns no pair. Every option the block writes is in the
// object from the start: added on the first block, they left a second instance with another
// shape, and V8 boxed numbers in the code it then made. depth and micSpread move the rotors'
// delay reads: smoothed, and glided across each call by the kernel. crossover redesigns the
// split each call, smoothed so that a host ramps it.

import { rotaryInPlace } from './rotary.js'
import crossoverFn from '@audio/eq-crossover'

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

export const rotary = (ctx) => {
	const v = ctx.params
	// the state is made at mix 1: at mix 0 the kernel passes the input as it is and makes nothing, which the first block
	// after it would then make. mix scales the signal: a new mix is glided sample by sample (glide, above) along the
	// host's ramp, and the kernel runs while it moves
	const p = { fs: ctx.sampleRate, hornSpeed: v.hornSpeed[0], drumSpeed: v.drumSpeed[0], crossover: v.crossover[0], depth: v.depth[0], hornInertia: v.hornInertia[0], drumInertia: v.drumInertia[0], micSpread: v.micSpread[0], mix: 1 }
	rotaryInPlace(new Float32Array(0), new Float32Array(0), p)
	p.mix = v.mix[0]
	const g = new Float64Array(GLIDE).fill(NaN), mixes = new Float64Array(ctx.maxBlockSize)
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		p.hornSpeed = params.hornSpeed[0]
		p.drumSpeed = params.drumSpeed[0]
		p.crossover = params.crossover[0]
		p.depth = params.depth[0]
		p.hornInertia = params.hornInertia[0]
		p.drumInertia = params.drumInertia[0]
		p.micSpread = params.micSpread[0]
		p.mix = params.mix[0]
		out[0].set(inp[0])
		out[1].set(inp[0]) // mono duplicated to both channels — kernel averages back down internally
		rotaryInPlace(out[0], out[1], p, glide(g, 0, params.mix, mixes, 0, inp[0].length, 0) ? mixes : undefined)
	}
}
rotary.channels = { inputs: 1, outputs: 2 }
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
// one band of the crossover, its second-order sections run as rotary.js runs them
const band = sos => () => {
	let z = new Float64Array(2 * sos.length)
	return [x => { for (let i = 0; i < sos.length; i++) { let c = sos[i], y = c.b0 * x + z[2 * i]; z[2 * i] = c.b1 * x - c.a1 * y + z[2 * i + 1]; z[2 * i + 1] = c.b2 * x - c.a2 * y; x = y } return x }, () => z.reduce((e, v) => e + v * v, 0)]
}
// A planning snapshot's number that is not finite (automation whose values are not known yet) reserves the longer of
// the tails at the ends of its range, as effect-delay's tail reserves its maxima. Both ends are tried: the tail is
// longest at one or the other
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
// What the input leaves (rotary.js) is mix of the wet: each LR4 band of the crossover read from its rotor's ring at
// most r / 343 · (1 + depth) s back (horn r 0.09 m, drum 0.05 m), between two samples, at a gain of 1 + depth · 0.5
// (horn) and 1 + depth · 0.25 (drum) at most; the dry mono ends with the input, and mix 0 passes it alone. The tail is
// the longer band's read and rest, each under half of 1e-3 over its gain; a ring of 128 frames or less needs no tail
rotary.tail = reserve(rotary, ({ sampleRate: fs, params }) => {
	let mix = params.mix[0], depth = Math.min(1, Math.max(0, params.depth[0]))
	if (!(mix > 0)) return 0
	let [lo, hi] = crossoverFn([params.crossover[0]], 4, fs), read = r => Math.ceil(r / 343 * (1 + depth) * fs)
	let n = Math.max(read(0.09) + rest(band(hi), 5e-4 / (mix * (1 + depth * 0.5))), read(0.05) + rest(band(lo), 5e-4 / (mix * (1 + depth * 0.25))))
	return n > 128 ? n / fs : 0
})
rotary.params = {
	hornSpeed:   { type: 'number', min: 0, max: 10, default: 0.8, unit: 'Hz' },   // 0.8 chorale (rest) · 6.7 tremolo · 0 off
	drumSpeed:   { type: 'number', min: 0, max: 10, default: 0.7, unit: 'Hz' },   // 0.7 chorale (rest) · 5.9 tremolo · 0 off
	crossover:   { type: 'number', min: 200, max: 3000, default: 800, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	depth:       { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
	hornInertia: { type: 'number', min: 0.05, max: 3, default: 0.6, unit: 's' },
	drumInertia: { type: 'number', min: 0.05, max: 6, default: 2.5, unit: 's' },
	micSpread:   { type: 'number', min: 0, max: 3.14159, default: 1.5708, unit: 'rad', smoothing: 0.02 },
	mix:         { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
