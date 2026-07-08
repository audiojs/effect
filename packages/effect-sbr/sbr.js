/**
 * Spectral band replication (aural-exciter family) — recover bandwidth lost to lossy
 * encoding: take the top octave still present below `cutoff`, regenerate its harmonic
 * series with a waveshaper (harmonics land above cutoff), highpass at cutoff, and mix
 * at a level tracking the source band's envelope. De-Slop-style HF reconstruction.
 */

let { sin, tanh, exp, PI } = Math

function svf (s, x, f, q) {
	s.l += f * s.b
	let h = x - s.l - q * s.b
	s.b += f * h
	return h                                 // highpass leg
}

export default function sbr (data, params) {
	let cutoff = params.cutoff ?? 8000       // where the source content dies, Hz
	let amount = params.amount ?? 0.5        // replication level 0..1
	let drive = params.drive ?? 0.5
	let fs = params.fs || 44100

	if (!params._src) {
		params._src = { l: 0, b: 0 }           // source band: bandpass cutoff/2..cutoff
		params._hp1 = { l: 0, b: 0 }           // output highpass at cutoff (2 cascaded)
		params._hp2 = { l: 0, b: 0 }
		params._env = 0; params._henv = 0; params._dc = 0
	}
	let fSrc = 2 * sin(PI * Math.min(cutoff * 0.7, fs / 4) / fs)
	let fCut = 2 * sin(PI * Math.min(cutoff, fs / 4) / fs)
	let g = 2 + drive * 8
	let aEnv = 1 - exp(-2 * PI * 20 / fs)

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		// source band = bandpass leg around the top of the surviving spectrum
		svf(params._src, x, fSrc, 0.7)
		let band = params._src.b
		// harmonic series extends past cutoff; even (|x|) + odd (tanh), DC-blocked
		let h = tanh(band * g) * 0.6 + Math.abs(band) * g * 0.55
		params._dc += 0.002 * (h - params._dc)
		h -= params._dc
		h = svf(params._hp1, h, fCut, 0.7)
		h = svf(params._hp2, h, fCut, 0.7)
		// envelope-match: replicated HF follows the source band's energy
		params._env += aEnv * (band * band - params._env)
		params._henv += aEnv * (h * h - params._henv)
		let norm = params._henv > 1e-12 ? Math.sqrt(params._env / params._henv) : 0
		data[i] = x + amount * Math.min(4, norm) * 0.5 * h
	}
	return data
}
