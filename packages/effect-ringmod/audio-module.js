// audio-module manifest — wraps the ring-mod atom; pure oscillator multiply, no sizing
// params — every param stays live, per-channel state is just the running carrier phase.

import ringModFn from './ring-mod.js'

export const ringmod = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.fc = params.fc[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			ringModFn(out[c], p)
		}
	}
}
ringmod.channels = 'any'
ringmod.params = {
	fc:  { type: 'number', min: 1, max: 5000, default: 440, unit: 'Hz', curve: 'log' },
	mix: { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
