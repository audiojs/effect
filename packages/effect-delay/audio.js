// atom manifest — wraps the delay atom; state rides per-channel params objects.
// `time` sizes the delay line at construction (flags: restart); feedback/mix are live.

import delayFn from './delay.js'

export const delay = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, time: ctx.params.time[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.feedback = params.feedback[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			delayFn(out[c], p)
		}
	}
}
delay.channels = 'any'
delay.tail = 8
delay.params = {
	time:     { type: 'number', min: 0.001, max: 4, default: 0.25, unit: 's', flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.95, default: 0.3 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
}
