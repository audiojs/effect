// atom manifest — wraps the delay atom; state rides per-channel params objects.
// `time` sizes the delay line at construction (flags: restart); feedback/mix are live.

import delayFn from './delay.js'

export const delay = (ctx) => {
	const chP = []
	const time = ctx.params.time[0]
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, time })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		for (let c = 0; c < out.length; c++) {
			const p = chP[c] ||= { fs: ctx.sampleRate, time }
			p.feedback = params.feedback[0]
			p.mix = params.mix[0]
			if (inp?.[c]?.length) out[c].set(inp[c])
			else out[c].fill(0)
			delayFn(out[c], p)
		}
	}
}
delay.channels = 'any'
delay.tail = ({ sampleRate, params }) => {
	const fb = Math.abs(params.feedback[0])
	const time = Math.max(1, Math.floor(params.time[0] * sampleRate)) / sampleRate
	return time * (fb === 0 ? 1 : 1 + Math.ceil(Math.log(1e-3) / Math.log(fb)))
} // Time to decay by 60 dB at the supplied settings; not a hard silence boundary.
delay.params = {
	time:     { type: 'number', min: 0.001, max: 4, default: 0.25, unit: 's', flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.95, default: 0.3 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
}
