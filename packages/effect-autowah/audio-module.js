// audio-module manifest — wraps the auto-wah atom; envelope-driven filter, no sizing
// params — every param stays live, per-channel state is just the running filter/envelope.

import autoWahFn from './auto-wah.js'

export const autowah = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
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
autowah.params = {
	base:    { type: 'number', min: 50, max: 1000, default: 300, unit: 'Hz', curve: 'log' },
	range:   { type: 'number', min: 100, max: 6000, default: 3000, unit: 'Hz', curve: 'log' },
	Q:       { type: 'number', min: 0.5, max: 20, default: 5 },
	attack:  { type: 'number', min: 0.0005, max: 0.05, default: 0.002, unit: 's' },
	release: { type: 'number', min: 0.01, max: 1, default: 0.1, unit: 's' },
	sens:    { type: 'number', min: 0.5, max: 10, default: 2 },
}
