// atom manifest — wraps the multitap atom. `taps` is an array-of-objects param
// on the kernel — array values can't cross the module param boundary (number/enum/bool
// only), so the tap layout is fixed at the kernel's own default (0.25s/0.5 gain,
// 0.5s/0.3 gain) and only `feedback` is exposed live.

import multitapFn from './multitap.js'

const TAPS = [{ time: 0.25, gain: 0.5 }, { time: 0.5, gain: 0.3 }]

export const multitap = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++) chP.push({ fs: ctx.sampleRate, taps: TAPS })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.feedback = params.feedback[0]
			out[c].set(inp[c])
			multitapFn(out[c], p)
		}
	}
}
multitap.channels = 'any'
multitap.tail = ({ params }) => { let fb = params.feedback[0]; let reps = fb > 0 ? Math.log(1e-3) / Math.log(fb) : 1; return (reps + 1) * 0.5 } // RT60 from live feedback × longest fixed tap (0.5s)
multitap.params = {
	feedback: { type: 'number', min: 0, max: 0.9, default: 0 },
}
