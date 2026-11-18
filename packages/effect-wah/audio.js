// atom manifest — wraps the wah-wah atom; envelope-free swept/static bandpass,
// no sizing params — every param stays live. `mode` picks LFO-swept ('auto') vs a
// fixed pedal position ('manual', freq pinned at fc). The filter and LFO state is made here,
// so the first block sets nothing up. fc is smoothed (20 ms) and glided across the call by the
// kernel, which retunes the filter every sample.
// Each channel's state carries its index, so its LFO runs `phase` degrees ahead of the channel before.

import wahFn from './wah.js'

export const wah = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, channel: c, _lp: 0, _bp: 0, _phase: 0, _glide: new Float64Array(2).fill(NaN) })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.fc = params.fc[0]
			p.Q = params.Q[0]
			p.mode = params.mode
			p.phase = params.phase[0]
			out[c].set(inp[c])
			wahFn(out[c], p)
		}
	}
}
wah.channels = 'any'
// The tail (CONTRACT 1.0: until the output stays 60 dB under the input's level) by the rule for a fixed linear filter:
// the frames after an input stops until the rest of Σ|h| is under eps, h the filter's impulse response. A peak-1 input
// then leaves at most eps, and a held tone at the resonance comes within a few percent of it, so the gain the ring
// starts at (a bandpass's Q, at its peak) is in the count: counted from the poles alone, a ring at Q 15 fell 60 dB of
// its own and was still 24 dB over the input. `make` returns [tick, energy]: tick(x) runs a frame, energy() sums the
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
// the bandpass frozen at f, as wah.js runs it: the trapezoidal SVF at g = tan(π f / fs), damping k; and −ln r a frame of
// its poles' radius r, r² = (1 − kg + g²) / (1 + kg + g²)
const bandpass = (f, k, fs) => () => {
	let g = Math.tan(Math.PI * Math.min(f, 0.49 * fs) / fs), lp = 0, bp = 0
	return [x => { let v1 = (bp + g * (x - lp)) / (1 + g * (g + k)), v2 = lp + g * v1; bp = 2 * v1 - bp; lp = 2 * v2 - lp; return v1 }, () => lp * lp + bp * bp]
}
const speed = (f, k, fs) => { let g = Math.tan(Math.PI * Math.min(f, 0.49 * fs) / fs); return Math.log((1 + k * g + g * g) / (1 - k * g + g * g)) / 2 }
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
// A planning snapshot's number that is not finite (automation whose values are not known yet) reserves the longer of
// the tails at the ends of its range, as effect-delay's tail reserves its maxima: through the formula it gave NaN, which
// a host takes as no tail, cutting the decay. Both ends are tried: the ring is longest at one or the other
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
// In 'manual' the filter holds at fc; in 'auto' the LFO sweeps it over fc · 2^(depth · sin) (wah.js), and each point's
// frozen ring is κ time constants of its poles, κ the most the frozen ring takes at the sweep's ends and centre, where
// it is counted exactly (the gain it starts at, and its rise, are in it). A ring of 128 frames or less needs no tail
// (CONTRACT 1.0)
wah.tail = reserve(wah, ({ sampleRate: fs, params }) => {
	let fc = params.fc[0], k = 1 / params.Q[0], depth = params.mode === 'manual' ? 0 : params.depth[0], f = lfo => fc * 2 ** (depth * lfo)
	if (!(depth > 0)) { let n = rest(bandpass(fc, k, fs), 1e-3); return n > 128 ? n / fs : 0 }
	let kappa = Math.max(...[-1, 0, 1].map(lfo => rest(bandpass(f(lfo), k, fs), 1e-3) * speed(f(lfo), k, fs)))
	let n = swept(lfo => kappa / speed(f(lfo), k, fs), fs / (64 * params.rate[0]))
	return n > 128 ? n / fs : 0
})
wah.params = {
	rate:  { type: 'number', min: 0.05, max: 10, default: 1.5, unit: 'Hz', curve: 'log' },
	depth: { type: 'number', min: 0, max: 3, default: 0.8, unit: 'oct' },
	fc:    { type: 'number', min: 200, max: 3000, default: 1000, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	Q:     { type: 'number', min: 0.5, max: 20, default: 5 },
	mode:  { type: 'enum', values: ['auto', 'manual'], default: 'auto' },
	phase: { type: 'number', min: -180, max: 180, default: 0, unit: 'deg', smoothing: 0.02 },
}
