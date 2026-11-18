// atom manifest — timeline-positional effect: the stop begins `at` seconds into the stream,
// and the read falls behind the input from there. It streams: the kernel keeps the input it
// still has to read in a ring, made here for the instance's `time`, and runs `latency`
// frames late, as far as flutter can run the read ahead of the input at the stop's start (none
// without flutter or in 'start'). time, curve, direction and flutter set that latency and the
// ring, so they are fixed for an instance; `at` is read each call until the stop has begun.
// `seed` is a kernel-only option (batch determinism knob) and stays off the manifest, same as
// effect-multitap's fixed `taps` layout — every declared param here is a plain number/enum.

import { tapestopStream, lead } from './tapestop.js'

export const tapestop = (ctx) => {
	const chP = [], fs = ctx.sampleRate, latency = tapestop.latency(ctx)
	const time = ctx.params.time[0], curve = ctx.params.curve[0], direction = ctx.params.direction, flutter = ctx.params.flutter[0]
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs, at: 0, time, curve, direction, flutter, latency, _ring: new Float32Array(Math.ceil(time * fs) + latency + 3), _n: 0, _read: 0, _start: -1, _rnd: 0x9e3779b9 })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.at = params.at[0]
			out[c].set(inp[c])
			tapestopStream(out[c], p)
		}
	}
}
tapestop.channels = 'any'
tapestop.latency = ({ sampleRate, params }) => lead(sampleRate, { time: params.time[0], curve: params.curve[0], direction: params.direction, flutter: params.flutter[0] })
// A planning snapshot's number that is not finite (a value not known yet) reserves the longer of the tails at the ends
// of its range, as effect-delay's tail reserves its maxima: as `time` itself it was NaN, which a host takes as no tail.
// Both ends are tried: the lag below grows with time and curve and is linear in flutter
const reserve = (f, tail) => function known (s) {
	for (const k in f.params) if (f.params[k].type === 'number' && !Number.isFinite(s.params[k]?.[0])) {
		const at = v => known({ ...s, params: { ...s.params, [k]: Float32Array.of(v) } })
		return Math.max(at(f.params[k].min), at(f.params[k].max))
	}
	return tail(s)
}
// Once the input stops, the read goes on through what it has not reached (the tail, CONTRACT 1.0). At the stop's end it
// is as far behind the input as the frames it ran less the input it read, and an input that stops just where the read
// then is rings that long ('stop'); spinning up, it stays that far behind ('start'). The read's course is the kernel's
// (tapestop.js: the rate (1 − t / time)^curve or (t / time)^curve, and the seeded flutter), run here, and a frame more
// for the read between two samples. A ring of 128 frames or less needs no tail
tapestop.tail = reserve(tapestop, ({ sampleRate: fs, params }) => {
	let time = params.time[0], curve = params.curve[0], flutter = params.flutter[0], up = params.direction === 'start', K = Math.ceil(time * fs), rnd = 0x9e3779b9, ran = 0
	for (let k = 0; k < K; k++) {
		let rate = Math.pow(up ? k / fs / time : 1 - k / fs / time, curve)
		if (flutter > 0) { rnd = (rnd * 1664525 + 1013904223) >>> 0; rate *= 1 + flutter * 0.1 * (2 * (rnd / 4294967296) - 1) }
		ran += rate < 0 ? 0 : rate
	}
	let frames = Math.ceil(K - ran) + 1
	return frames > 128 ? frames / fs : 0
})
tapestop.params = {
	at:        { type: 'number', min: 0, max: 60, default: 0, unit: 's' },
	time:      { type: 'number', min: 0.05, max: 10, default: 1, unit: 's', restart: true },
	curve:     { type: 'number', min: 0.25, max: 4, default: 1, restart: true },
	direction: { type: 'enum', values: ['stop', 'start'], default: 'stop', restart: true },
	flutter:   { type: 'number', min: 0, max: 1, default: 0, restart: true },
}
