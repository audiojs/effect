// atom manifest — wraps the chorus atom; state rides per-channel params objects.
// `delay`/`voices` size the buffer at construction (flags: restart — voices also sidesteps
// a kernel gap: _phases isn't resized when voices grows without delay also growing);
// rate/depth are live.

import chorusFn from './chorus.js'

export const chorus = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, delay: ctx.params.delay[0], voices: ctx.params.voices[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			out[c].set(inp[c])
			chorusFn(out[c], p)
		}
	}
}
chorus.channels = 'any'
chorus.tail = 0.1 // no feedback — hard drain bound: maxDelay = 2 × delay.max(0.05s) = 100ms
chorus.params = {
	rate:   { type: 'number', min: 0.05, max: 10, default: 1.5, unit: 'Hz', curve: 'log' },
	depth:  { type: 'number', min: 0, max: 1, default: 0.5 },
	delay:  { type: 'number', min: 0.002, max: 0.05, default: 0.02, unit: 's', flags: ['restart'] },
	voices: { type: 'number', min: 1, max: 8, default: 3, step: 1, flags: ['restart'] },
}
