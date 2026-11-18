// atom manifest — wraps the chorus atom; state rides per-channel params objects, made here: the
// ring for the longest delay (delay.max, as the host hands it, a Float32) and the LFO phases for
// the most voices, so the first block sets nothing up and every param is live. A new delay
// glides across the call as depth and phase do, its centre moving no faster than the reads'
// half and double speed allow; a new voice count crossfades over 20 ms, however the host cuts
// its calls. Each channel's state carries its index, so its voices run `phase` degrees of
// their spacing (360/voices of LFO) ahead of the channel before.

import chorusFn from './chorus.js'

export const chorus = (ctx) => {
	const chP = [], { delay, voices } = chorus.params, v = ctx.params
	const ring = Math.floor(Math.fround(delay.max) * 2 * ctx.sampleRate) + 2   // as chorus.js sizes it for a delay
	// every field the block writes and the kernel keeps, from the start: added later, they would give a second
	// instance's objects another shape, and the code V8 then makes for the kernel boxes numbers
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, channel: c, rate: v.rate[0], depth: v.depth[0], delay: v.delay[0], voices: v.voices[0], phase: v.phase[0], buffer: new Float64Array(ring), ptr: 0, _phases: new Float64Array(voices.max), _next: new Float64Array(voices.max), _voices: new Int32Array(3), _glide: new Float64Array(4).fill(NaN) })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.delay = params.delay[0]
			p.voices = params.voices[0]
			p.phase = params.phase[0]
			out[c].set(inp[c])
			chorusFn(out[c], p)
		}
	}
}
chorus.channels = 'any'
// The voices read at most delay · (1 + depth) back (chorus.js), between two samples, and nothing feeds back: the input
// has left the output once the farthest read has passed it (the tail, CONTRACT 1.0). A planning snapshot's number that
// is not finite takes its max as a host hands it (a Float32), the farthest read; a ring of 128 frames or less needs no
// tail
chorus.tail = ({ sampleRate: fs, params }) => {
	let at = (v, s) => Number.isFinite(v) ? v : Math.fround(s.max), frames = Math.ceil(at(params.delay[0], chorus.params.delay) * fs * (1 + at(params.depth[0], chorus.params.depth)))
	return frames > 128 ? frames / fs : 0
}
chorus.params = {
	rate:   { type: 'number', min: 0.05, max: 10, default: 1.5, unit: 'Hz', curve: 'log' },
	depth:  { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
	delay:  { type: 'number', min: 0.002, max: 0.05, default: 0.02, unit: 's', smoothing: 0.02 },
	voices: { type: 'number', min: 1, max: 8, default: 3, step: 1 },
	phase:  { type: 'number', min: -180, max: 180, default: 90, unit: 'deg', smoothing: 0.02 },
}
