// atom manifest — wraps the slew-limiter atom; purely reactive rate-of-change
// clamp, no sizing params — every param stays live, per-channel state is just the
// running output sample. The factory gives it as NaN, unseeded: a number from the start, so V8
// keeps it in place (added on the first block as 0, then made a double, it boxed once a second
// instance had run).

import slewLimiterFn from './slew-limiter.js'

export const slew = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, y: NaN })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.rise = params.rise[0]
			p.fall = params.fall[0]
			out[c].set(inp[c])
			slewLimiterFn(out[c], p)
		}
	}
}
slew.channels = 'any'
// once the input stops, the output falls to 0 at `fall` a second (or rises at `rise`, from below): a full-scale output,
// |y| ≤ 1, is there within 1 / min(rise, fall) seconds, and a held DC of ±1 against the slower of the two takes all of
// it. Louder signals take longer, in proportion. A ring of 128 frames or less needs no tail (CONTRACT 1.0).
// A planning snapshot's number that is not finite (automation whose values are not known yet) reserves the longer of
// the tails at the ends of its range, as effect-delay's tail reserves its maxima: through the formula it gave NaN, which
// a host takes as no tail, cutting the decay. Both ends are tried: the tail is longest at one or the other
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
slew.tail = reserve(slew, ({ sampleRate: fs, params }) => { let frames = Math.ceil(fs / Math.min(params.rise[0], params.fall[0])); return frames > 128 ? frames / fs : 0 })
slew.params = {
	rise: { type: 'number', min: 10, max: 20000, default: 1000, curve: 'log' },
	fall: { type: 'number', min: 10, max: 20000, default: 1000, curve: 'log' },
}
