// atom manifest — wraps the distortion waveshaper per @audio/compile CONTRACT.
// Stateless per-sample transfer curve — drive/type/mix are live, no per-channel state
// (matches @audio/dynamics-softclip's stateless pattern).

import distortionFn from './distortion.js'

export const distortion = (ctx) => {
	const p = { fs: ctx.sampleRate }
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		p.drive = params.drive[0]
		p.type = params.type
		p.mix = params.mix[0]
		for (let c = 0; c < inp.length; c++) {
			out[c].set(inp[c])
			distortionFn(out[c], p)
		}
	}
}
distortion.channels = 'any'
distortion.params = {
	drive: { type: 'number', min: 0, max: 1, default: 0.5 },
	type:  { type: 'enum', values: ['soft', 'hard', 'tanh', 'foldback'], default: 'soft' },
	mix:   { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
