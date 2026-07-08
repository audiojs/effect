// audio-module manifest — wraps the slew-limiter atom; purely reactive rate-of-change
// clamp, no sizing params — every param stays live, per-channel state is just the
// running output sample.

import slewLimiterFn from './slew-limiter.js'

export const slew = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rise = params.rise[0]
			p.fall = params.fall[0]
			out[c].set(inp[c])
			slewLimiterFn(out[c], p)
		}
	}
}
slew.channels = 'any'
slew.params = {
	rise: { type: 'number', min: 10, max: 20000, default: 1000, curve: 'log' },
	fall: { type: 'number', min: 10, max: 20000, default: 1000, curve: 'log' },
}
