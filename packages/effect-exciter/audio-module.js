// audio-module manifest — wraps the exciter atom; SVF filter state, no sizing params —
// every param stays live, per-channel state is just the running filter integrators.

import exciterFn from './exciter.js'

export const exciter = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.freq = params.freq[0]
			p.drive = params.drive[0]
			p.amount = params.amount[0]
			out[c].set(inp[c])
			exciterFn(out[c], p)
		}
	}
}
exciter.channels = 'any'
exciter.params = {
	freq:   { type: 'number', min: 500, max: 8000, default: 3000, unit: 'Hz', curve: 'log' },
	drive:  { type: 'number', min: 0, max: 1, default: 0.5 },
	amount: { type: 'number', min: 0, max: 1, default: 0.5 },
}
