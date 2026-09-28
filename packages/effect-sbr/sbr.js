/**
 * Spectral band replication (aural-exciter family) — recover bandwidth lost to lossy
 * encoding: take the top octave still present below `fc`, regenerate its harmonic
 * series with a waveshaper (harmonics land above fc), highpass at fc, and mix
 * at a level tracking the source band's envelope. De-Slop-style HF reconstruction.
 */

let { tan, tanh, exp, min, PI } = Math

// trapezoidal state-variable filter tick (Zavalishin, The Art of VA Filter Design, ch. 3–4; Simper 2013):
// c from svfCoefs, s = { l, b } its integrator states; sets s.bp (the bandpass leg), returns the highpass leg.
// Stable at any cutoff below Nyquist: Chamberlin's form needed cutoffs held under fs/4, where it rang at Nyquist.
function svf (s, x, c) {
	let v1 = c.a * (s.b + c.w * (x - s.l)), v2 = s.l + c.w * v1
	s.b = 2 * v1 - s.b; s.l = 2 * v2 - s.l; s.bp = v1
	return x - c.k * v1 - v2
}
const svfCoefs = (fc, fs, k) => { let w = tan(PI * min(fc, 0.49 * fs) / fs); return { w, k, a: 1 / (1 + w * (w + k)) } }

export default function sbr (data, params = {}) {
	let fc = params.fc ?? params.cutoff ?? 8000   // where the source content dies, Hz (`cutoff`: former name)
	let amount = params.amount ?? 0.5        // replication level 0..1
	let drive = params.drive ?? 0.5
	let fs = params.fs || 44100

	if (!params._src) {
		params._src = { l: 0, b: 0, bp: 0 }    // source band: bandpass fc/2..fc
		params._hp1 = { l: 0, b: 0, bp: 0 }    // output highpass at fc (2 cascaded)
		params._hp2 = { l: 0, b: 0, bp: 0 }
		params._env = 0; params._henv = 0; params._dc = 0
	}
	let cSrc = svfCoefs(fc * 0.7, fs, 0.7)
	let cCut = svfCoefs(fc, fs, 0.7)
	let g = 2 + drive * 8
	let aEnv = 1 - exp(-2 * PI * 20 / fs)

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		// source band = bandpass leg around the top of the surviving spectrum
		svf(params._src, x, cSrc)
		let band = params._src.bp
		// harmonic series extends past fc; even (|x|) + odd (tanh), DC-blocked
		let h = tanh(band * g) * 0.6 + Math.abs(band) * g * 0.55
		params._dc += 0.002 * (h - params._dc)
		h -= params._dc
		h = svf(params._hp1, h, cCut)
		h = svf(params._hp2, h, cCut)
		// envelope-match: replicated HF follows the source band's energy
		params._env += aEnv * (band * band - params._env)
		params._henv += aEnv * (h * h - params._henv)
		let norm = params._henv > 1e-12 ? Math.sqrt(params._env / params._henv) : 0
		data[i] = x + amount * Math.min(4, norm) * 0.5 * h
	}
	return data
}
