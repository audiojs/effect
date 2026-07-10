// atom manifest — wraps the ping-pong atom. Inherently stereo: the kernel
// cross-feeds left/right delay lines, so this declares a fixed 2-channel bus and holds
// one shared state object (not per-channel). `time` sizes both delay lines at
// construction (flags: restart); feedback/mix are live.

import pingPongFn from './ping-pong.js'

export const pingpong = (ctx) => {
	const p = { fs: ctx.sampleRate, time: ctx.params.time[0] }
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || inp.length < 2) return
		p.feedback = params.feedback[0]
		p.mix = params.mix[0]
		out[0].set(inp[0])
		out[1].set(inp[1])
		pingPongFn(out[0], out[1], p)
	}
}
pingpong.channels = 2
pingpong.tail = ({ params }) => { let fb = params.feedback[0]; let reps = fb > 0 ? Math.log(1e-3) / Math.log(fb) : 1; return (reps + 1) * params.time[0] } // RT60 from live feedback × live time
pingpong.params = {
	time:     { type: 'number', min: 0.01, max: 2, default: 0.25, unit: 's', flags: ['restart'] },
	feedback: { type: 'number', min: 0, max: 0.9, default: 0.4 },
	mix:      { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
}
