// atom manifest — wraps the multitap atom. `taps` is an array-of-objects param
// on the kernel — array values can't cross the module param boundary (number/enum/bool
// only), so the tap layout is fixed at the kernel's own default (0.25s/0.5 gain,
// 0.5s/0.3 gain) and only `feedback` is exposed live. Each channel's state is made here
// whole, every field the kernel keeps in it from the start, so the first block sets
// nothing up and the kernel never adds a field: state it completed itself (in the first
// block, or in calls of no frames here) gave a second instance's objects another shape,
// and V8 then allocated at every block. The channels share one tap table.

import multitapFn from './multitap.js'

const TAPS = [{ time: 0.25, gain: 0.5 }, { time: 0.5, gain: 0.3 }]

export const multitap = (ctx) => {
	const chP = [], fs = ctx.sampleRate
	// the tap table as multitap.js makes it: each time on its nearest frame, the longest at least 1
	const table = TAPS.map(t => ({ d: Math.round(t.time * fs) | 0, gain: t.gain ?? 0.5 })), most = Math.max(1, ...table.map(t => t.d))
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs, taps: TAPS, feedback: ctx.params.feedback[0], _tapSamples: table, _maxDelay: most, _taps: TAPS, _fs: fs, buffer: new Float64Array(most), ptr: 0 })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.feedback = params.feedback[0]
			out[c].set(inp[c])
			multitapFn(out[c], p)
		}
	}
}
multitap.channels = 'any'
// The tail (CONTRACT 1.0: until the output stays 60 dB under the input's level): the frames after an input stops until
// the rest of Σ|h| is under 1e-3, so that a peak-1 input leaves at most that. With feedback fb the line holds
// w[n] = x[n] + fb·Σ g·w[n − d] and the output adds the taps' Σ g·w[n − d]: an impulse response no part of which is
// negative (no gain is, nor the feedback), so Σ|h| is the taps' gain at DC, G / (1 − fb·G) with G = Σ g (a held DC
// meets it: its echoes pile up to that), and its rest is that less what has come out. A planning snapshot's NaN
// feedback takes its max
multitap.tail = ({ sampleRate, params }) => {
	const fb = Number.isFinite(params.feedback[0]) ? params.feedback[0] : multitap.params.feedback.max
	const g = TAPS.map(t => t.gain), d = TAPS.map(t => Math.round(t.time * sampleRate) | 0), M = Math.max(...d) + 1, w = new Float64Array(M)
	let G = g.reduce((a, b) => a + b, 0), left = G / (1 - fb * G), n = 0
	for (; ; n++) {
		let wet = 0
		for (let k = 0; k < d.length; k++) if (n >= d[k]) wet += g[k] * w[(n - d[k]) % M]
		w[n % M] = (n ? 0 : 1) + fb * wet
		if ((left -= wet) <= 1e-3) break
	}
	return n > 128 ? n / sampleRate : 0
}
multitap.params = {
	feedback: { type: 'number', min: 0, max: 0.9, default: 0 },
}
