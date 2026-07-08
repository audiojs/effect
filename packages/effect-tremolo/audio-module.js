// audio-module manifest — wraps the tremolo atom; purely per-sample LFO, no sizing
// params — every param stays live, per-channel state is just the running LFO phase.

import tremoloFn from './tremolo.js'

export const tremolo = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			out[c].set(inp[c])
			tremoloFn(out[c], p)
		}
	}
}
tremolo.channels = 'any'
tremolo.params = {
	rate:  { type: 'number', min: 0.1, max: 20, default: 5, unit: 'Hz', curve: 'log' },
	depth: { type: 'number', min: 0, max: 1, default: 0.5 },
}
