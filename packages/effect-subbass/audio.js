// atom manifest — wraps the subbass atom; SVF filter state, no sizing params —
// every param stays live, per-channel state is just the running filter integrators.

import subbassFn from './subbass.js'

export const subbass = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.freq = params.freq[0]
			p.amount = params.amount[0]
			p.drive = params.drive[0]
			p.keep = params.keep[0]
			out[c].set(inp[c])
			subbassFn(out[c], p)
		}
	}
}
subbass.channels = 'any'
subbass.params = {
	freq:   { type: 'number', min: 30, max: 200, default: 80, unit: 'Hz', curve: 'log' },
	amount: { type: 'number', min: 0, max: 1, default: 0.5 },
	drive:  { type: 'number', min: 0, max: 1, default: 0.5 },
	keep:   { type: 'number', min: 0, max: 1, default: 1 },
}
