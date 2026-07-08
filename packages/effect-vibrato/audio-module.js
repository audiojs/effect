// audio-module manifest — wraps the vibrato atom; state rides per-channel params objects.
// `depth` (modulation excursion, seconds) sizes the delay buffer at construction
// (flags: restart); rate is live.

import vibratoFn from './vibrato.js'

export const vibrato = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, depth: ctx.params.depth[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			out[c].set(inp[c])
			vibratoFn(out[c], p)
		}
	}
}
vibrato.channels = 'any'
vibrato.tail = 0.05 // no feedback — hard drain bound: maxDelay ≈ 2 × depth.max(20ms) = 40ms
vibrato.params = {
	rate:  { type: 'number', min: 0.1, max: 15, default: 5, unit: 'Hz', curve: 'log' },
	depth: { type: 'number', min: 0.0005, max: 0.02, default: 0.003, unit: 's', flags: ['restart'] },
}
