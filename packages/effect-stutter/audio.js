// atom manifest — wraps the stutter atom; state rides per-channel params objects, made
// here with the capture buffer for the longest slice (slice.max, as the host hands it, a
// Float32), so every param is live. A new interval or slice takes effect where the next
// cycle starts; decay/mix at once.

import stutterFn from './stutter.js'

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

export const stutter = (ctx) => {
	const chP = [], v = ctx.params, fs = ctx.sampleRate
	const most = Math.max(32, Math.round(Math.fround(stutter.params.slice.max) * fs))   // as stutter.js sizes a slice
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs, interval: v.interval[0], slice: v.slice[0], decay: v.decay[0], mix: v.mix[0], _slice: new Float64Array(most), _pos: 0, _cycle: new Int32Array(2) })
	// decay and mix scale the signal: each is smoothed (20 ms) and glided sample by sample (glide, above), its values for
	// the call a lane of `lanes`; while neither moves the kernel runs on the values
	const M = ctx.maxBlockSize, g = new Float64Array(2 * GLIDE).fill(NaN), lanes = new Float64Array(2 * M)
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const n = inp[0].length, moving = glide(g, 0, params.decay, lanes, 0, n, 0) | glide(g, 1, params.mix, lanes, M, n, 0)
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.interval = params.interval[0]
			p.slice = params.slice[0]
			p.decay = params.decay[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			stutterFn(out[c], p, moving ? lanes : undefined, M)
		}
	}
}
stutter.channels = 'any'
// Once the input stops, the cycle under way plays its slice on until its interval ends (stutter.js), the m-th repeat at
// mix · (1 − decay)^m of it, and the next cycle captures silence (the tail, CONTRACT 1.0). A slice of s frames in an
// interval of i begins its m-th repeat m · s into the cycle, and ceil(i / s) − 1 repeats begin in it: an input that
// stops k frames into the cycle is heard again in the last of them, k frames in, until it ends there, or to the
// interval's end where it stopped after the capture. So the ring is s times the last repeat over 1e-3: the last that
// begins, or the one before the r-th, r = log(1e-3 / mix) / log(1 − decay) rounded up, where they fall that far first.
// A slice as long as the interval repeats nothing. A planning snapshot's number that is not finite takes what rings
// longest: the longest interval, the whole interval for a slice, no decay, all wet. A ring of 128 frames or less needs
// no tail
stutter.tail = ({ sampleRate: fs, params }) => {
	let known = v => Number.isFinite(v), iN = Math.max(1, Math.round((known(params.interval[0]) ? params.interval[0] : stutter.params.interval.max) * fs) | 0)
	let sN = Math.max(32, Math.min(Math.round(params.slice[0] * fs) | 0, iN)), decay = known(params.decay[0]) ? params.decay[0] : 0, mix = known(params.mix[0]) ? params.mix[0] : 1
	if (!known(params.slice[0])) return iN > 128 ? iN / fs : 0
	if (sN >= iN || !(mix > 1e-3)) return 0
	let r = decay > 0 ? Math.ceil(Math.log(1e-3 / mix) / Math.log(1 - decay)) : Infinity, frames = sN * Math.max(0, Math.min(Math.ceil(iN / sN) - 1, r - 1))
	return frames > 128 ? frames / fs : 0
}
stutter.params = {
	interval: { type: 'number', min: 0.05, max: 2, default: 0.5, unit: 's' },
	slice:    { type: 'number', min: 0.01, max: 1, default: 0.125, unit: 's' },
	decay:    { type: 'number', min: 0, max: 1, default: 0, smoothing: 0.02 },
	mix:      { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
