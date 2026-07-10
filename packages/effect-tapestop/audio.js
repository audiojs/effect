// atom manifest — whole-render, timeline-positional effect (like @audio/dynamics-multiband):
// the read-pointer integration spans the full buffer, so this declares streaming: false
// and the host materializes the whole timeline and calls process once. `seed` is a
// kernel-only option (batch determinism knob) and stays off the manifest, same as
// effect-multitap's fixed `taps` layout — every declared param here is a plain number/enum.

import tapestopFn from './tapestop.js'

export const tapestop = (ctx) => {
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const opts = {
			fs: ctx.sampleRate,
			at: params.at[0],
			time: params.time[0],
			curve: params.curve[0],
			direction: params.direction,
			flutter: params.flutter[0],
		}
		for (let c = 0; c < inp.length; c++) {
			out[c].set(inp[c])
			tapestopFn(out[c], opts)
		}
	}
}
tapestop.channels = 'any'
tapestop.streaming = false
tapestop.params = {
	at:        { type: 'number', min: 0, max: 60, default: 0, unit: 's' },
	time:      { type: 'number', min: 0.05, max: 10, default: 1, unit: 's' },
	curve:     { type: 'number', min: 0.25, max: 4, default: 1 },
	direction: { type: 'enum', values: ['stop', 'start'], default: 'stop' },
	flutter:   { type: 'number', min: 0, max: 1, default: 0 },
}
