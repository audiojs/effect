// atom manifest — wraps the ping-pong atom. Inherently stereo: the kernel
// cross-feeds left/right delay lines, so this declares a fixed 2-channel bus and holds
// one shared state object (not per-channel), made here with both rings for the longest
// time (time.max, as the host hands it, a Float32), so `time` is live: a new time glides
// across the call from where the last call ended, and the reads run no slower than half
// speed and no faster than double until they are there, the bend of a tape delay: a far
// move bends the echoes by an octave at most, down for twice the increase, up for as long
// as the decrease, and one that reverses under way turns from an octave down to an octave
// up in a frame. `time.smoothing` is the host's ramp for a new time: the reads follow it as
// asked while each call's step asks at most half a frame a frame farther or a frame nearer
// (10 ms longer or 20 ms shorter over 20 ms where every call of the ramp is 32 frames; less
// where a host cuts a call of the ramp shorter), and a farther move takes as long as the
// bound needs. `sync` sets the time to a note at the host's tempo (ctx.transport.bpm),
// held to the rings; a new tempo or note is handed to the kernel as it comes, glided across
// the call after it, or at the bound's speed where that is slower. 'off' (default) leaves
// `time` in charge, as without it. feedback/mix are live: mix scales the signal, so a new mix
// is glided sample by sample (glide, below) along the host's ramp.
// Each block calls the in-place form, which returns no pair.

import { pingPongInPlace, delaySamples } from './ping-pong.js'

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

// quarter notes in each of sync's values, in their order ('off' 0): d is dotted (half as long again), t a triplet (two
// thirds). Looked up by position: a keyed load by the value's name had V8 box the number it read once two instances
// had asked for different names
const QUARTERS = Float64Array.of(0, 2, 1, 2 / 3, 0.75, 0.5, 1 / 3, 0.25)
// the seconds sync's k-th value lasts at `bpm` quarter notes a minute, held to the rings
const noted = (k, bpm) => Math.min(pingpong.params.time.max, Math.max(pingpong.params.time.min, QUARTERS[k] * 60 / bpm))

export const pingpong = (ctx) => {
	const { time, sync } = pingpong.params, fs = ctx.sampleRate
	const ring = Math.floor(delaySamples(Math.fround(time.max), fs)) + 2   // as ping-pong.js sizes it for a time
	const p = { fs, time: ctx.params.time[0], feedback: ctx.params.feedback[0], mix: ctx.params.mix[0], _bufL: new Float64Array(ring), _bufR: new Float64Array(ring), _ptr: 0, _glide: new Float64Array(2).fill(NaN) }
	const g = new Float64Array(GLIDE).fill(NaN), mixes = new Float64Array(ctx.maxBlockSize)
	return (inputs, outputs, params) => {
		// `noted` written out: called here, V8 did not always inline it, and boxed the time it returned
		const inp = inputs[0], out = outputs[0], bpm = ctx.transport?.bpm, k = sync.values.indexOf(params.sync)
		p.time = k > 0 ? Math.min(time.max, Math.max(time.min, QUARTERS[k] * 60 / (bpm > 0 ? bpm : 120))) : params.time[0]
		p.feedback = params.feedback[0]
		p.mix = params.mix[0]
		for (let c = 0; c < 2; c++) {
			if (inp?.[c]?.length) out[c].set(inp[c])
			else out[c].fill(0)
		}
		pingPongInPlace(out[0], out[1], p, glide(g, 0, params.mix, mixes, 0, out[0].length, 0) ? mixes : undefined)
	}
}
pingpong.channels = 2
// The echoes a loop of feedback fb leaves, the m-th back at gain · fb^(m − 1), until the rest of them is under 1e-3 (the
// tail, CONTRACT 1.0: 60 dB under the input's level): after n the rest of Σ|h| is gain · fb^n / (1 − fb), which a held
// DC meets, its echoes piled up to gain / (1 − fb) times it. None where they start under 1e-3; one where nothing feeds back
const echoes = (fb, gain) => gain / (1 - fb) <= 1e-3 ? 0 : fb > 0 ? Math.max(1, Math.ceil(Math.log(1e-3 * (1 - fb) / gain) / Math.log(fb))) : 1
pingpong.tail = ({ sampleRate, params, transport }) => {
	// with sync on the time is a note at the host's tempo: at transport.bpm where the host hands over a finite one, else
	// the longest it may be (an infinite tempo read as known gave the shortest). A planning snapshot's NaN (automation
	// whose values are not known yet) reserves the maximum, as effect-delay's tail does: through the logarithm below it
	// gave a NaN tail, which a host takes as none. An echo comes back each `time`, on the other channel, at
	// mix · fb^(m − 1), a read between frames spreading it over the next frame; a ring of 128 frames or less needs no
	// tail (CONTRACT 1.0)
	const { feedback: f, time: t, sync } = pingpong.params, k = sync.values.indexOf(params.sync), bpm = transport?.bpm
	const fb = Number.isFinite(params.feedback[0]) ? Math.abs(params.feedback[0]) : f.max, mix = Number.isFinite(params.mix?.[0]) ? Math.min(1, Math.abs(params.mix[0])) : 1
	const frames = Math.ceil(delaySamples(k > 0 ? (Number.isFinite(bpm) && bpm > 0 ? noted(k, bpm) : t.max) : Number.isFinite(params.time[0]) ? params.time[0] : t.max, sampleRate)) * echoes(fb, mix)
	return frames > 128 ? frames / sampleRate : 0
} // Time to decay by 60 dB at the supplied settings; not a hard silence boundary.
pingpong.params = {
	time:     { type: 'number', min: 0.01, max: 2, default: 0.25, unit: 's', smoothing: 0.02 },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.4 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
	sync:     { type: 'enum', values: ['off', '1/2', '1/4', '1/4t', '1/8d', '1/8', '1/8t', '1/16'], default: 'off' },
}
