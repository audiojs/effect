// atom manifest — wraps the wah-wah atom; envelope-free swept/static bandpass,
// no sizing params — every param stays live. `mode` picks LFO-swept ('auto') vs a
// fixed pedal position ('manual', freq pinned at fc).

import wahFn from './wah.js'

export const wah = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
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
			out[c].set(inp[c])
			wahFn(out[c], p)
		}
	}
}
wah.channels = 'any'
wah.params = {
	rate:  { type: 'number', min: 0.05, max: 10, default: 1.5, unit: 'Hz', curve: 'log' },
	depth: { type: 'number', min: 0, max: 3, default: 0.8, unit: 'oct' },
	fc:    { type: 'number', min: 200, max: 3000, default: 1000, unit: 'Hz', curve: 'log' },
	Q:     { type: 'number', min: 0.5, max: 20, default: 5 },
	mode:  { type: 'enum', values: ['auto', 'manual'], default: 'auto' },
}
