// audio-module manifest — wraps the stutter atom; state rides per-channel params
// objects. interval/slice size the capture buffer at construction (flags: restart);
// decay/mix are live.

import stutterFn from './stutter.js'

export const stutter = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, interval: ctx.params.interval[0], slice: ctx.params.slice[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.decay = params.decay[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			stutterFn(out[c], p)
		}
	}
}
stutter.channels = 'any'
stutter.tail = 2 // hard bound: the capture cycle overwrites the slice with silence every interval.max(2s)
stutter.params = {
	interval: { type: 'number', min: 0.05, max: 2, default: 0.5, unit: 's', flags: ['restart'] },
	slice:    { type: 'number', min: 0.01, max: 1, default: 0.125, unit: 's', flags: ['restart'] },
	decay:    { type: 'number', min: 0, max: 1, default: 0 },
	mix:      { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
