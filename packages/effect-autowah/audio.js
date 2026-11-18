// atom manifest — wraps the auto-wah atom; envelope-driven filter, no sizing
// params — every param stays live, per-channel state is just the running filter/envelope,
// made here so the first block sets nothing up.

import autoWahFn from './auto-wah.js'

export const autowah = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, _env: 0, _lp: 0, _bp: 0 })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.base = params.base[0]
			p.range = params.range[0]
			p.Q = params.Q[0]
			p.attack = params.attack[0]
			p.release = params.release[0]
			p.sens = params.sens[0]
			out[c].set(inp[c])
			autoWahFn(out[c], p)
		}
	}
}
autowah.channels = 'any'
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
// the bandpass frozen at f, as auto-wah.js runs it: the trapezoidal SVF at g = tan(π f / fs), damping k
const bandpass = (f, k, fs) => () => {
	let g = Math.tan(Math.PI * Math.min(f, 0.49 * fs) / fs), lp = 0, bp = 0
	return [x => { let v1 = (bp + g * (x - lp)) / (1 + g * (g + k)), v2 = lp + g * v1; bp = 2 * v1 - bp; lp = 2 * v2 - lp; return v1 }, () => lp * lp + bp * bp]
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
// the bandpass rings longest at the end of its sweep farthest from fs/4: at `base`, where the envelope falls once the
// input stops, or at the top it may have reached. A ring of 128 frames or less needs no tail (CONTRACT 1.0)
autowah.tail = reserve(autowah, ({ sampleRate: fs, params }) => {
	let k = 1 / params.Q[0], base = params.base[0], n = Math.max(rest(bandpass(base, k, fs), 1e-3), rest(bandpass(base + params.range[0], k, fs), 1e-3))
	return n > 128 ? n / fs : 0
})
autowah.params = {
	base:    { type: 'number', min: 50, max: 1000, default: 300, unit: 'Hz', curve: 'log' },
	range:   { type: 'number', min: 100, max: 6000, default: 3000, unit: 'Hz', curve: 'log' },
	Q:       { type: 'number', min: 0.5, max: 20, default: 5 },
	attack:  { type: 'number', min: 0.0005, max: 0.05, default: 0.002, unit: 's' },
	release: { type: 'number', min: 0.01, max: 1, default: 0.1, unit: 's' },
	sens:    { type: 'number', min: 0.5, max: 10, default: 2 },
}
