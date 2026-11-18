// atom manifest — wraps the flanger atom; state rides per-channel params objects, made here:
// the ring for the longest delay (delay.max, as the host hands it, a Float32), so the first block
// sets nothing up and every param is live. A new delay glides across the call as depth and phase do,
// its centre moving no faster than the read's half and double speed allow.
// Each channel's state carries its index, so its LFO runs `phase` degrees ahead of the channel before.

import flangerFn from './flanger.js'

export const flanger = (ctx) => {
	const chP = [], ring = Math.floor(Math.fround(flanger.params.delay.max) * 2 * ctx.sampleRate) + 1   // as flanger.js sizes it for a delay
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, channel: c, buffer: new Float64Array(ring), ptr: 0, _phase: 0, _glide: new Float64Array(4).fill(NaN) })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.delay = params.delay[0]
			p.feedback = params.feedback[0]
			p.phase = params.phase[0]
			out[c].set(inp[c])
			flangerFn(out[c], p)
		}
	}
}
flanger.channels = 'any'
// A planning snapshot's number that is not finite (automation whose values are not known yet) reserves the longer of
// the tails at the ends of its range, as effect-delay's tail reserves its maxima: a NaN feedback read as none gives
// 5 ms at the defaults (48 kHz), where 0.9 rings 0.45 s. Both ends are tried: the tail is longest at one or the other
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
// The echoes a loop of feedback fb leaves, the m-th back at fb^(m − 1) beside the dry input, until the rest of them is
// under 1e-3 (the tail, CONTRACT 1.0: 60 dB under the input's level): after n the rest of Σ|h| is fb^n / (1 − fb),
// which a held DC meets. One where nothing feeds back
const echoes = fb => fb > 0 ? Math.max(1, Math.ceil(Math.log(1e-3 * (1 - fb)) / Math.log(fb))) : 1
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
// The read sits delay · (1 + depth · sin) back (flanger.js), one frame at least, between two samples: an echo comes
// back each ceil of that, so the frozen ring is the echoes times it, and as the LFO moves it a pass takes as long as
// the read is far. A ring of 128 frames or less needs no tail (CONTRACT 1.0)
flanger.tail = reserve(flanger, ({ sampleRate: fs, params }) => {
	let n = echoes(params.feedback[0]), depth = params.depth[0], d = lfo => Math.ceil(Math.max(1, params.delay[0] * fs * (1 + depth * lfo)))
	let frames = depth > 0 ? swept(lfo => n * d(lfo), fs / (64 * params.rate[0])) : n * d(0)
	return frames > 128 ? frames / fs : 0
})
flanger.params = {
	rate:     { type: 'number', min: 0.02, max: 5, default: 0.3, unit: 'Hz', curve: 'log' },
	depth:    { type: 'number', min: 0, max: 1, default: 0.7, smoothing: 0.02 },
	delay:    { type: 'number', min: 0.0001, max: 0.02, default: 0.003, unit: 's', smoothing: 0.02 },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.5 },
	phase:    { type: 'number', min: -180, max: 180, default: 90, unit: 'deg', smoothing: 0.02 },
}
