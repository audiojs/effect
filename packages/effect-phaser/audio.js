// atom manifest — wraps the phaser atom; state rides per-channel params objects, made here
// for the most stages (stages.max), so the first block sets nothing up. Every param is live:
// a change of `stages` crossfades over 20 ms from the old cascade to the new, however the host
// cuts its calls. Each channel's state carries its index, so its LFO runs `phase` degrees ahead
// of the channel before.

import phaserFn from './phaser.js'

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

export const phaser = (ctx) => {
	const chP = [], v = ctx.params
	// every field the block writes and the kernel keeps, from the start: added later, they would give a second
	// instance's objects another shape, and the code V8 then makes for the kernel boxes numbers
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, channel: c, rate: v.rate[0], depth: v.depth[0], stages: v.stages[0], feedback: v.feedback[0], fc: v.fc[0], phase: v.phase[0], _ap: new Float64Array(phaser.params.stages.max * 2), _phase: 0, _fb: 0, _stages: new Int32Array(3), _glide: new Float64Array(2).fill(NaN) })
	// feedback scales the loop: smoothed (20 ms) and glided sample by sample (glide, above), its values for the call in
	// `feedbacks`; while it holds the kernel runs on the value
	const g = new Float64Array(GLIDE).fill(NaN), feedbacks = new Float64Array(ctx.maxBlockSize)
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const moving = glide(g, 0, params.feedback, feedbacks, 0, inp[0].length, 0)
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.stages = params.stages[0]
			p.feedback = params.feedback[0]
			p.fc = params.fc[0]
			p.phase = params.phase[0]
			out[c].set(inp[c])
			phaserFn(out[c], p, moving ? feedbacks : undefined)
		}
	}
}
phaser.channels = 'any'
// The tail (CONTRACT 1.0: until the output stays 60 dB under the input's level) by the rule for a fixed linear filter:
// the frames after an input stops until the rest of Σ|h| is under eps, h the impulse response. A peak-1 input then
// leaves at most eps, and a held tone at a resonance, or DC into a loop, comes within a few percent of it, so the gain
// the ring starts at is in the count: DC into the loop at feedback 0.69 starts it 6.5 dB over the input, and from the
// slowest pole alone the tail fell that short. `make` returns [tick, energy]: tick(x) runs a frame, energy() sums the
// squares of the state. h runs until that energy has fallen 200 dB from its largest, past which what is left is
// negligible, then again from the impulse, the rest being the sum less what has passed; Infinity where it has not
// fallen so far in 2^22 frames
const rest = (make, eps) => {
	let [tick, energy] = make(), sum = 0, top = 0, n = 0
	for (; n < 2 ** 22; n++) { sum += Math.abs(tick(n ? 0 : 1)); let e = energy(); if (e > top) top = e; else if (n > 64 && e <= 1e-20 * top) break }
	if (n === 2 ** 22) return Infinity
	tick = make()[0]
	for (let j = 0; j < n; j++) if ((sum -= Math.abs(tick(j ? 0 : 1))) <= eps) return j
	return n
}
// the phaser frozen at f, as phaser.js runs it: S first-order allpasses at a = (t − 1) / (t + 1), t = tan(π f / fs), the
// feedback g around them through a frame's delay, and the input added, the sum halved
const frozen = (f, S, g, fs) => () => {
	let t = Math.tan(Math.PI * f / fs), a = (t - 1) / (t + 1), ap = new Float64Array(2 * S), fb = 0
	return [x => {
		let u = x + g * fb
		for (let s = 0; s < S; s++) { let y = a * u + ap[2 * s] - a * ap[2 * s + 1]; ap[2 * s] = u; ap[2 * s + 1] = y; u = y }
		fb = u
		return (x + u) * 0.5
	}, () => ap.reduce((e, v) => e + v * v, fb * fb)]
}
// −ln r a frame of the frozen phaser's slowest pole: each allpass has its pole at p = (1 − t) / (1 + t), and the
// feedback g around S of them puts the slowest at r = (q + p) / (1 + q p), q = (g / r)^(1/S) (a fixed point; g = 0
// leaves r = p). 0 − ln r, not −ln r: where the sweep reaches 0 Hz (depth 1) r is 1, and κ / −0 is −Infinity, which
// the sweep below would read as the faster end of its step; κ / +0 is +Infinity, the ring that stalls there
const speed = (f, S, g, fs) => {
	let t = Math.tan(Math.PI * f / fs), p = Math.abs((1 - t) / (1 + t)), r = 1
	for (let k = 0; k < 8; k++) { let q = (g / r) ** (1 / S); r = (q + p) / (1 + q * p) }
	return 0 - Math.log(r)
}
// A sweep's tail, in frames: the frozen ring T at 64 points of the LFO's cycle, ring(lfo) for lfo the sine there, a
// point every dt frames. From the point where the input stops, each step takes dt / T of the ring (T of the slower end
// of the step), and the ring ends where that sums to 1; the tail is the longest of the 64 starts. Held, it is T
function swept (ring, dt) {
	let T = Array.from({ length: 64 }, (_, k) => ring(Math.sin(2 * Math.PI * k / 64))), v = T.map((t, k) => 1 / Math.max(t, T[(k + 1) % 64]))
	let cycle = v.reduce((a, b) => a + b, 0) * dt, most = 0
	if (!(cycle > 0)) return Infinity
	for (let k0 = 0; k0 < 64; k0++) {
		let laps = Math.max(0, Math.floor(1 / cycle) - 1), sum = laps * cycle, k = k0
		while (sum + v[k % 64] * dt < 1) sum += v[k++ % 64] * dt
		most = Math.max(most, (laps * 64 + k - k0) * dt + (1 - sum) / v[k % 64])
	}
	return most
}
// The LFO moves the allpasses over f = fc (1 + depth · sin) (phaser.js), and each point's frozen ring is κ time
// constants of its slowest pole: κ the most the frozen phaser takes at the sweep's ends and centre, where it is counted
// exactly (the gain it starts at and its stages' spread are in it; a point whose ring runs past 2^22 frames is left out),
// and at least what the held DC takes, the loop's loudest, (2 − g) / (2 − 2g) times the input. A planning snapshot's NaN
// (automation whose values are not known yet) takes the end of its range that rings longest, as effect-delay's tail
// reserves its maxima. A ring of 128 frames or less needs no tail (CONTRACT 1.0)
phaser.tail = ({ sampleRate: fs, params }) => {
	let { stages, feedback, fc: f0, depth: d0, rate: r0 } = phaser.params, or = (v, worst) => Number.isFinite(v) ? v : worst
	let S = or(params.stages[0], stages.max) | 0, g = or(params.feedback[0], feedback.max), fc = or(params.fc[0], f0.min)
	let depth = or(params.depth[0], d0.max), rate = or(params.rate[0], r0.min), f = lfo => fc * (1 + depth * lfo)
	if (!(depth > 0)) { let n = rest(frozen(fc, S, g, fs), 1e-3); return n > 128 ? n / fs : 0 }
	let kappa = Math.log(1000 * (2 - g) / (2 - 2 * g))
	for (let lfo of [-1, 0, 1]) { let v = speed(f(lfo), S, g, fs); if (v * 2 ** 22 > 50) kappa = Math.max(kappa, rest(frozen(f(lfo), S, g, fs), 1e-3) * v) }
	let n = swept(lfo => kappa / speed(f(lfo), S, g, fs), fs / (64 * rate))
	return n > 128 ? n / fs : 0
}
phaser.params = {
	rate:     { type: 'number', min: 0.02, max: 10, default: 0.5, unit: 'Hz', curve: 'log' },
	depth:    { type: 'number', min: 0, max: 1, default: 0.7 },
	stages:   { type: 'number', min: 2, max: 12, default: 4, step: 2 },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.5, smoothing: 0.02 },
	fc:       { type: 'number', min: 100, max: 5000, default: 1000, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	phase:    { type: 'number', min: -180, max: 180, default: 90, unit: 'deg', smoothing: 0.02 },
}
