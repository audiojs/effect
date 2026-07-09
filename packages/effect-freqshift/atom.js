// atom manifest — wraps the frequency-shifter atom (Hilbert-FIR SSB shift).
// `taps` sizes the FIR and sets the fixed group delay (flags: restart) — declared
// latency mirrors the limiter pilot. NOTE: the kernel's dry/wet mix blends an undelayed
// dry sample against the (taps-1)/2-sample-delayed wet path (see kernel defect notes in
// the family report) — alignment is only exact at mix=1.

import frequencyShifterFn from './frequency-shifter.js'

export const freqshift = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, taps: ctx.params.taps[0] })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.shift = params.shift[0]
			p.mix = params.mix[0]
			out[c].set(inp[c])
			frequencyShifterFn(out[c], p)
		}
	}
}
freqshift.channels = 'any'
freqshift.latency = (ctx) => (ctx.params.taps[0] - 1) >> 1
freqshift.params = {
	shift: { type: 'number', min: -2000, max: 2000, default: 100, unit: 'Hz' },
	mix:   { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
	taps:  { type: 'number', min: 17, max: 255, default: 65, step: 2, flags: ['restart'] },
}
