// atom manifest — wraps the lofi atom; buffer size is fs-only (not param-
// dependent, safe at any wow/flutter setting), so every param stays live. Each channel
// gets a distinct noise seed so stereo material isn't crushed to a mono-identical
// hiss/crackle bed. The kernel's state is made here, its ring as lofi.js sizes it, so the
// first block sets nothing up. wow and flutter move the read: smoothed (20 ms) and glided
// across the call by the kernel, the read no slower than half speed and no faster than
// double. lowpass and highpass retune the filters each call, smoothed so that a host ramps
// them.

import lofiFn from './lofi.js'

export const lofi = (ctx) => {
	const chP = [], ring = (((0.004 * ctx.sampleRate) | 0) + 4) * 2
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) {
		const seed = (0x2545f491 ^ (c * 0x9e3779b9)) >>> 0
		chP.push({ fs: ctx.sampleRate, seed, _buf: new Float64Array(ring), _w: 0, _ph1: 0, _ph2: 0, _lp1: 0, _lp2: 0, _lp3: 0, _hp: 0, _rnd: seed, _crk: 0, _glide: new Float64Array(3).fill(NaN) })
	}
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.wow = params.wow[0]
			p.flutter = params.flutter[0]
			p.noise = params.noise[0]
			p.crackle = params.crackle[0]
			p.lowpass = params.lowpass[0]
			p.highpass = params.highpass[0]
			p.drive = params.drive[0]
			out[c].set(inp[c])
			lofiFn(out[c], p)
		}
	}
}
lofi.channels = 'any'
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
// the bandwidth frozen as lofi.js runs it: three one-pole lowpasses of coefficient aLp, then the output less a
// one-pole lowpass of coefficient aHp of it (the highpass floor)
const bandwidth = (aLp, aHp) => () => {
	let l1 = 0, l2 = 0, l3 = 0, hp = 0
	return [x => { l1 += aLp * (x - l1); l2 += aLp * (l1 - l2); l3 += aLp * (l2 - l3); hp += aHp * (l3 - hp); return l3 - hp }, () => l1 * l1 + l2 * l2 + l3 * l3 + hp * hp]
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
// What the input leaves (lofi.js): the read, 0.002 + 0.0015 · wow + 0.0002 · flutter s back at most, between two
// samples; the tape saturation tanh(g · x) / tanh(g), g = 1 + 4 · drive, whose slope at 0, g / tanh(g), a quiet input
// meets; the hiss and the crackle, the same whatever the input; then the bandwidth. The tail is the read and the
// bandwidth's rest under 1e-3 over that slope; a ring of 128 frames or less needs no tail
lofi.tail = reserve(lofi, ({ sampleRate: fs, params }) => {
	let g = 1 + 4 * params.drive[0], slope = params.drive[0] > 0 ? g / Math.tanh(g) : 1, read = Math.ceil((0.002 + 0.0015 * params.wow[0] + 0.0002 * params.flutter[0]) * fs)
	let n = read + rest(bandwidth(1 - Math.exp(-2 * Math.PI * params.lowpass[0] / fs), 1 - Math.exp(-2 * Math.PI * params.highpass[0] / fs)), 1e-3 / slope)
	return n > 128 ? n / fs : 0
})
lofi.params = {
	wow:      { type: 'number', min: 0, max: 1, default: 0.3, smoothing: 0.02 },
	flutter:  { type: 'number', min: 0, max: 1, default: 0.2, smoothing: 0.02 },
	noise:    { type: 'number', min: 0, max: 1, default: 0.1 },
	crackle:  { type: 'number', min: 0, max: 1, default: 0.1 },
	lowpass:  { type: 'number', min: 500, max: 18000, default: 6000, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	highpass: { type: 'number', min: 20, max: 500, default: 60, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	drive:    { type: 'number', min: 0, max: 1, default: 0.3 },
}
