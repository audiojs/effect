// atom manifest — wraps the ping-pong atom. Inherently stereo: the kernel
// cross-feeds left/right delay lines, so this declares a fixed 2-channel bus and holds
// one shared state object (not per-channel). `time` sizes both delay lines at
// construction (flags: restart); feedback/mix are live.

import pingPongFn from './ping-pong.js'

export const pingpong = (ctx) => {
	const p = { fs: ctx.sampleRate, time: ctx.params.time[0] }
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		p.feedback = params.feedback[0]
		p.mix = params.mix[0]
		for (let c = 0; c < 2; c++) {
			if (inp?.[c]?.length) out[c].set(inp[c])
			else out[c].fill(0)
		}
		pingPongFn(out[0], out[1], p)
	}
}
pingpong.channels = 2
pingpong.tail = ({ sampleRate, params }) => {
	const fb = Math.abs(params.feedback[0])
	const time = Math.max(1, Math.floor(params.time[0] * sampleRate)) / sampleRate
	return time * (fb === 0 ? 1 : 1 + Math.ceil(Math.log(1e-3) / Math.log(fb)))
} // Time to decay by 60 dB at the supplied settings; not a hard silence boundary.
pingpong.params = {
	time:     { type: 'number', min: 0.01, max: 2, default: 0.25, unit: 's', flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.4 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
}
