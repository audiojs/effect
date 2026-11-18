// atom manifest — wraps the exciter atom; SVF filter state, no sizing params —
// every param stays live, per-channel state is just the running filter integrators,
// made here so the first block sets nothing up. fc retunes the highpass each call, smoothed so
// that a host ramps it.

import exciterFn from './exciter.js'

export const exciter = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, _lp: 0, _bp: 0 })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.fc = params.fc[0]
			p.drive = params.drive[0]
			p.amount = params.amount[0]
			out[c].set(inp[c])
			exciterFn(out[c], p)
		}
	}
}
exciter.channels = 'any'
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
// the highpass frozen at f, as exciter.js runs it: the trapezoidal SVF at g = tan(π f / fs), damping k
const highpass = (f, k, fs) => () => {
	let g = Math.tan(Math.PI * Math.min(f, 0.49 * fs) / fs), a = 1 / (1 + g * (g + k)), lp = 0, bp = 0
	return [x => { let v1 = a * (bp + g * (x - lp)), v2 = lp + g * v1; bp = 2 * v1 - bp; lp = 2 * v2 - lp; return x - k * v1 - v2 }, () => lp * lp + bp * bp]
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
// What the input leaves is 0.5 · amount · tanh(g · hp), g = 1 + 9 · drive (exciter.js): at most 0.5 · amount · g · |hp|,
// the saturator's slope at 0, which a quiet input meets; so the highpass's rest is held under 1e-3 over that gain. A ring
// of 128 frames or less needs no tail (CONTRACT 1.0)
exciter.tail = reserve(exciter, ({ sampleRate: fs, params }) => {
	let gain = 0.5 * params.amount[0] * (1 + 9 * params.drive[0]), n = gain > 1e-3 ? rest(highpass(params.fc[0], 0.5, fs), 1e-3 / gain) : 0
	return n > 128 ? n / fs : 0
})
exciter.params = {
	fc:     { type: 'number', min: 500, max: 8000, default: 3000, unit: 'Hz', curve: 'log', alias: 'freq', smoothing: 0.02 },
	drive:  { type: 'number', min: 0, max: 1, default: 0.5 },
	amount: { type: 'number', min: 0, max: 1, default: 0.5 },
}
