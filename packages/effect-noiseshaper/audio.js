// atom manifest — wraps the noise-shaping atom; single-sample error-feedback
// loop, no sizing params — every param stays live, per-channel state is just the
// running feedback error term.

import noiseShapingFn from './noise-shaping.js'

export const noiseshaper = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.bits = params.bits[0]
			out[c].set(inp[c])
			noiseShapingFn(out[c], p)
		}
	}
}
noiseshaper.channels = 'any'
noiseshaper.params = {
	bits: { type: 'number', min: 1, max: 24, default: 16, step: 1 },
}
