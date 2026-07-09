// atom manifest — wraps the phaser atom; state rides per-channel params objects.
// `stages` sizes the allpass chain at construction (flags: restart — the kernel never
// re-checks _ap's length against a new stage count, so a live increase would read past
// the array); rate/depth/feedback/fc are live.

import phaserFn from './phaser.js'

export const phaser = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, stages: ctx.params.stages[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.feedback = params.feedback[0]
			p.fc = params.fc[0]
			out[c].set(inp[c])
			phaserFn(out[c], p)
		}
	}
}
phaser.channels = 'any'
phaser.params = {
	rate:     { type: 'number', min: 0.02, max: 10, default: 0.5, unit: 'Hz', curve: 'log' },
	depth:    { type: 'number', min: 0, max: 1, default: 0.7 },
	stages:   { type: 'number', min: 2, max: 12, default: 4, step: 2, flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.5 },
	fc:       { type: 'number', min: 100, max: 5000, default: 1000, unit: 'Hz', curve: 'log' },
}
