// atom manifest — wraps the gain atom; stateless per-sample scale, no per-channel state.

import gainFn from './gain.js'

export const gain = (ctx) => {
	const p = {}
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		p.dB = params.dB[0]
		for (let c = 0; c < inp.length; c++) {
			out[c].set(inp[c])
			gainFn(out[c], p)
		}
	}
}
gain.channels = 'any'
gain.params = {
	dB: { type: 'number', min: -60, max: 24, default: 0, unit: 'dB', smoothing: 0.01 },
}
