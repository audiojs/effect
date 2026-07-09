// atom manifest — wraps the sbr atom; SVF filter state, no sizing params —
// every param stays live, per-channel state is just the running filter integrators.

import sbrFn from './sbr.js'

export const sbr = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.cutoff = params.cutoff[0]
			p.amount = params.amount[0]
			p.drive = params.drive[0]
			out[c].set(inp[c])
			sbrFn(out[c], p)
		}
	}
}
sbr.channels = 'any'
sbr.params = {
	cutoff: { type: 'number', min: 2000, max: 16000, default: 8000, unit: 'Hz', curve: 'log' },
	amount: { type: 'number', min: 0, max: 1, default: 0.5 },
	drive:  { type: 'number', min: 0, max: 1, default: 0.5 },
}
