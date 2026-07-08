// audio-module manifest — wraps the graindelay atom; state rides per-channel params
// objects. time/spray/pitch/jitter/grain all feed the buffer-size calc (flags: restart
// — a live change reallocates and silently drops the buffered history, an audible
// glitch); feedback/mix are live. Each channel gets a distinct grain-scatter seed.

import graindelayFn from './graindelay.js'

export const graindelay = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({
			fs: ctx.sampleRate,
			time: ctx.params.time[0], spray: ctx.params.spray[0],
			pitch: ctx.params.pitch[0], jitter: ctx.params.jitter[0], grain: ctx.params.grain[0],
			seed: (0x9e3779b9 ^ (c * 0x2545f491)) >>> 0,
		})
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.feedback = params.feedback[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			graindelayFn(out[c], p)
		}
	}
}
graindelay.channels = 'any'
graindelay.tail = 100 // RT60 at feedback.max(0.9): ≈66 repeats × time.max(1.5s) ≈ 99s
graindelay.params = {
	time:     { type: 'number', min: 0.02, max: 1.5, default: 0.25, unit: 's', flags: ['restart'] },
	spray:    { type: 'number', min: 0, max: 0.1, default: 0.02, unit: 's', flags: ['restart'] },
	pitch:    { type: 'number', min: -24, max: 24, default: 0, unit: 'st', flags: ['restart'] },
	jitter:   { type: 'number', min: 0, max: 12, default: 0, unit: 'st', flags: ['restart'] },
	grain:    { type: 'number', min: 0.01, max: 0.3, default: 0.08, unit: 's', flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.3 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
}
