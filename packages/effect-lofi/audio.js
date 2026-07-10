// atom manifest — wraps the lofi atom; buffer size is fs-only (not param-
// dependent, safe at any wow/flutter setting), so every param stays live. Each channel
// gets a distinct noise seed so stereo material isn't crushed to a mono-identical
// hiss/crackle bed.

import lofiFn from './lofi.js'

export const lofi = (ctx) => {
	const chP = []
	for (let c = 0, N = ctx.maxChannels ?? 8; c < N; c++)
		chP.push({ fs: ctx.sampleRate, seed: (0x2545f491 ^ (c * 0x9e3779b9)) >>> 0 })
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		for (let c = 0; c < inp.length; c++) {
			const p = chP[c]
			p.wow = params.wow[0]
			p.flutter = params.flutter[0]
			p.noise = params.noise[0]
			p.crackle = params.crackle[0]
			p.lowpass = params.lowpass[0]
			p.highpass = params.highpass[0]
			p.drive = params.drive[0]
			out[c].set(inp[c])
			lofiFn(out[c], p)
		}
	}
}
lofi.channels = 'any'
lofi.tail = 0.1 // highpass one-pole settle at highpass.min(20Hz): RT60 ≈ 55ms + 4ms delay buffer
lofi.params = {
	wow:      { type: 'number', min: 0, max: 1, default: 0.3 },
	flutter:  { type: 'number', min: 0, max: 1, default: 0.2 },
	noise:    { type: 'number', min: 0, max: 1, default: 0.1 },
	crackle:  { type: 'number', min: 0, max: 1, default: 0.1 },
	lowpass:  { type: 'number', min: 500, max: 18000, default: 6000, unit: 'Hz', curve: 'log' },
	highpass: { type: 'number', min: 20, max: 500, default: 60, unit: 'Hz', curve: 'log' },
	drive:    { type: 'number', min: 0, max: 1, default: 0.3 },
}
