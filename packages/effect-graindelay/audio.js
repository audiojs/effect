// atom manifest — wraps the graindelay atom; state rides per-channel params objects,
// made here with the line for every param's max (as the host hands them, Float32s), so
// every param is live: a grain takes time/spray/pitch/jitter where it begins, glided
// across the call from where the last call ended, and a new grain length stretches both
// windows from where they are; feedback/mix are live, and mix, which scales the signal, is
// glided sample by sample (glide, below) along the host's ramp. Each channel gets a
// distinct grain-scatter seed.

import graindelayFn from './graindelay.js'

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

export const graindelay = (ctx) => {
	const chP = [], v = ctx.params, fs = ctx.sampleRate, { time, spray, pitch, jitter, grain } = graindelay.params
	// as graindelay.js sizes the line, at every param's max
	const most = Math.max(32, (Math.fround(grain.max) * fs) | 0)
	const size = Math.ceil(Math.max((Math.fround(time.max) + Math.fround(spray.max)) * fs + most, 1 + (most - 1) * (2 ** ((pitch.max + jitter.max) / 12) - 1))) + 2
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) {
		const p = {
			fs,
			time: v.time[0], spray: v.spray[0], pitch: v.pitch[0], jitter: v.jitter[0], grain: v.grain[0],
			feedback: v.feedback[0], mix: v.mix[0],
			seed: (0x9e3779b9 ^ (c * 0x2545f491)) >>> 0, _buf: new Float64Array(size),
		}
		graindelayFn(new Float64Array(0), p)   // the heads, generator and glide memory, made by a call of no frames
		chP.push(p)
	}
	const g = new Float64Array(GLIDE).fill(NaN), mixes = new Float64Array(ctx.maxBlockSize)
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const moving = glide(g, 0, params.mix, mixes, 0, inp[0].length, 0)
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.time = params.time[0]
			p.spray = params.spray[0]
			p.pitch = params.pitch[0]
			p.jitter = params.jitter[0]
			p.grain = params.grain[0]
			p.feedback = params.feedback[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			graindelayFn(out[c], p, moving ? mixes : undefined)
		}
	}
}
graindelay.channels = 'any'
// A grain reads at most `far` back: its delay with its spray and, reading slower than the line runs, a grain more; or
// as far back as a grain reading faster begins (graindelay.js). Each read is between two samples of the line and the
// two windows sum to w at most: 1, or 1 + sin(π / 2g) where a grain of g frames is odd and the second head starts
// (g − 1) / 2 behind. So each pass through the line brings back q = feedback · w of it at most; the line holds at most
// 1 / (1 − q) of a peak-1 input when it stops, and m passes later the output is at most mix · w · q^m / (1 − q), which
// a held DC meets. The tail (CONTRACT 1.0) is the passes until that is under 1e-3, as `echoes` counts them
// A planning snapshot's number that is not finite (automation whose values are not known yet) reserves the longer of
// the tails at the ends of its range, as effect-delay's tail reserves its maxima: through the formula a NaN time,
// spray, pitch or jitter gave NaN, which a host takes as no tail, and a NaN feedback or grain one too short. Both ends
// are tried: the farthest read is farthest at one or the other
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
// the echoes of a loop that brings back fb of itself a pass, its output gain · fb^m / (1 − fb) at most m passes on, until
// that is under 1e-3: none where it starts under it, one where nothing feeds back
const echoes = (fb, gain) => gain / (1 - fb) <= 1e-3 ? 0 : fb > 0 ? Math.max(1, Math.ceil(Math.log(1e-3 * (1 - fb) / gain) / Math.log(fb))) : 1
// A ring of 128 frames or less needs no tail (CONTRACT 1.0)
graindelay.tail = reserve(graindelay, ({ sampleRate, params }) => {
	const fb = params.feedback[0], g = Math.max(32, (params.grain[0] * sampleRate) | 0), w = g % 2 ? 1 + Math.sin(Math.PI / (2 * g)) : 1
	const slow = 2 ** ((params.pitch[0] - params.jitter[0]) / 12), fast = 2 ** (Math.max(0, params.pitch[0] + params.jitter[0]) / 12)
	const far = Math.max((params.time[0] + params.spray[0]) * sampleRate + g * Math.max(0, 1 - slow), 1 + (g - 1) * (fast - 1))
	const frames = Math.ceil(far) * echoes(fb * w, Math.min(1, params.mix[0]) * w)
	return frames > 128 ? frames / sampleRate : 0
})
graindelay.params = {
	time:     { type: 'number', min: 0.02, max: 1.5, default: 0.25, unit: 's' },
	spray:    { type: 'number', min: 0, max: 0.1, default: 0.02, unit: 's' },
	pitch:    { type: 'number', min: -24, max: 24, default: 0, unit: 'st' },
	jitter:   { type: 'number', min: 0, max: 12, default: 0, unit: 'st' },
	grain:    { type: 'number', min: 0.01, max: 0.3, default: 0.08, unit: 's' },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.3 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
}
