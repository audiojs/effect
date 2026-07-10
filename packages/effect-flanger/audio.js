// atom manifest — wraps the flanger atom; state rides per-channel params objects.
// `delay` sizes the buffer at construction (flags: restart); rate/depth/feedback are live.

import flangerFn from './flanger.js'

export const flanger = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, delay: ctx.params.delay[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.feedback = params.feedback[0]
			out[c].set(inp[c])
			flangerFn(out[c], p)
		}
	}
}
flanger.channels = 'any'
flanger.tail = ({ params }) => { let fb = params.feedback[0]; let reps = fb > 0 ? Math.log(1e-3) / Math.log(fb) : 1; return Math.max(0.05, (reps + 1) * 0.02) } // RT60 from live feedback × delay.max(20ms)
flanger.params = {
	rate:     { type: 'number', min: 0.02, max: 5, default: 0.3, unit: 'Hz', curve: 'log' },
	depth:    { type: 'number', min: 0, max: 1, default: 0.7 },
	delay:    { type: 'number', min: 0.1, max: 20, default: 3, unit: 'ms', flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.5 },
}
