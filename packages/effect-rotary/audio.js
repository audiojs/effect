// atom manifest — wraps the rotary atom. Physically mono-in/stereo-out (one Leslie
// cabinet, two virtual mics), so the bus is declared { inputs: 1, outputs: 2 }. No
// param resizes the delay rings (sized off the fixed horn/drum radii, not off any
// live param) — nothing here needs `flags: ['restart']`.

import rotaryFn from './rotary.js'

export const rotary = (ctx) => {
	const p = { fs: ctx.sampleRate }
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		p.hornSpeed = params.hornSpeed[0]
		p.drumSpeed = params.drumSpeed[0]
		p.crossover = params.crossover[0]
		p.depth = params.depth[0]
		p.hornInertia = params.hornInertia[0]
		p.drumInertia = params.drumInertia[0]
		p.micSpread = params.micSpread[0]
		p.mix = params.mix[0]
		out[0].set(inp[0])
		out[1].set(inp[0]) // mono duplicated to both channels — kernel averages back down internally
		rotaryFn(out[0], out[1], p)
	}
}
rotary.channels = { inputs: 1, outputs: 2 }
rotary.tail = 0.05 // no feedback — hard drain bound: 2× the larger rotor delay ring, generously padded
rotary.params = {
	hornSpeed:   { type: 'number', min: 0, max: 10, default: 0.8, unit: 'Hz' },   // 0.8 chorale (rest) · 6.7 tremolo · 0 off
	drumSpeed:   { type: 'number', min: 0, max: 10, default: 0.7, unit: 'Hz' },   // 0.7 chorale (rest) · 5.9 tremolo · 0 off
	crossover:   { type: 'number', min: 200, max: 3000, default: 800, unit: 'Hz', curve: 'log' },
	depth:       { type: 'number', min: 0, max: 1, default: 1 },
	hornInertia: { type: 'number', min: 0.05, max: 3, default: 0.6, unit: 's' },
	drumInertia: { type: 'number', min: 0.05, max: 6, default: 2.5, unit: 's' },
	micSpread:   { type: 'number', min: 0, max: 3.14159, default: 1.5708, unit: 'rad' },
	mix:         { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}
