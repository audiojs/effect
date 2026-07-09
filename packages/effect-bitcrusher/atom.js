// atom manifest — wraps the bitcrusher atom; stateful hold/phase but no sizing
// params — every param stays live, per-channel state is just the held sample + phase.

import bitcrusherFn from './bitcrusher.js'

export const bitcrusher = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.bits = params.bits[0]
			p.rate = params.rate[0]
			out[c].set(inp[c])
			bitcrusherFn(out[c], p)
		}
	}
}
bitcrusher.channels = 'any'
bitcrusher.params = {
	bits: { type: 'number', min: 1, max: 24, default: 8, step: 1 },
	rate: { type: 'number', min: 0.01, max: 1, default: 0.25 },
}
