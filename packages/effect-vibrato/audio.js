// atom manifest — wraps the vibrato atom; state rides per-channel params objects.
// `depth` (0..1, scales a fixed max delay-time swing — see vibrato.js maxSwing) is live,
// as rate/phase are: its ring is made here for depth 1, as vibrato.js sizes it, so the first
// block sets nothing up. Each channel's state carries its index, so its LFO runs `phase`
// degrees ahead of the channel before.

import vibratoFn from './vibrato.js'

export const vibrato = (ctx) => {
	const chP = [], ring = (0.006 * 2 * ctx.sampleRate + 2) | 0   // 2 × maxSwing at depth 1, and the sample past it
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, channel: c, buffer: new Float64Array(ring), ptr: 0, _phase: 0, _glide: new Float64Array(2).fill(NaN) })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rate = params.rate[0]
			p.depth = params.depth[0]
			p.phase = params.phase[0]
			out[c].set(inp[c])
			vibratoFn(out[c], p)
		}
	}
}
vibrato.channels = 'any'
// The read swings to 2 · depth · 0.006 s back at most (vibrato.js, maxSwing), between two samples, and nothing feeds
// back: the input has left the output once that read has passed it (the tail, CONTRACT 1.0). A planning snapshot's
// depth that is not finite takes its max; a ring of 128 frames or less needs no tail
vibrato.tail = ({ sampleRate: fs, params }) => {
	let depth = Number.isFinite(params.depth[0]) ? params.depth[0] : vibrato.params.depth.max, frames = Math.ceil(2 * depth * 0.006 * fs)
	return frames > 128 ? frames / fs : 0
}
vibrato.params = {
	rate:  { type: 'number', min: 0.1, max: 15, default: 5, unit: 'Hz', curve: 'log' },
	depth: { type: 'number', min: 0, max: 1, default: 0.5, smoothing: 0.02 },
	phase: { type: 'number', min: -180, max: 180, default: 0, unit: 'deg', smoothing: 0.02 },
}
