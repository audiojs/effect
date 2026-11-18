/**
 * Spectral band replication (aural-exciter family) — recover bandwidth lost to lossy
 * encoding: take the top octave still present below `fc`, regenerate its harmonic
 * series with a waveshaper (harmonics land above fc), highpass at fc, and mix
 * at a level tracking the source band's envelope. De-Slop-style HF reconstruction.
 */

let { tan, tanh, exp, min, PI } = Math

// trapezoidal state-variable filter tick (Zavalishin, The Art of VA Filter Design, ch. 3–4; Simper 2013):
// w = tan(π fc / fs), damping k, a = 1 / (1 + w (w + k)); s = [l, b, bp], its integrator states and the bandpass leg
// it sets; returns the highpass leg.
// Stable at any cutoff below Nyquist: Chamberlin's form needed cutoffs held under fs/4, where it rang at Nyquist.
function svf (s, x, w, k, a) {
	let v1 = a * (s[1] + w * (x - s[0])), v2 = s[0] + w * v1
	s[1] = 2 * v1 - s[1]; s[0] = 2 * v2 - s[0]; s[2] = v1
	return x - k * v1 - v2
}

// `lanes`, when given, holds amount and drive for each sample of `data`, M apart (the /audio manifest's glide of moving
// values), in place of the params'
export default function sbr (data, params = {}, lanes, M) {
	let fc = params.fc ?? params.cutoff ?? 8000   // where the source content dies, Hz (`cutoff`: former name)
	let amount = params.amount ?? 0.5        // replication level 0..1
	let drive = params.drive ?? 0.5
	let fs = params.fs || 44100

	if (!params._src) {
		params._src = new Float64Array(3)    // source band: bandpass fc/2..fc
		params._hp1 = new Float64Array(3)    // output highpass at fc (2 cascaded)
		params._hp2 = new Float64Array(3)
		params._env = 0; params._henv = 0; params._dc = 0
	}
	let src = params._src, hp1 = params._hp1, hp2 = params._hp2
	let env = params._env, henv = params._henv, dc = params._dc
	let wSrc = tan(PI * min(fc * 0.7, 0.49 * fs) / fs), aSrc = 1 / (1 + wSrc * (wSrc + 0.7))
	let wCut = tan(PI * min(fc, 0.49 * fs) / fs), aCut = 1 / (1 + wCut * (wCut + 0.7))
	let g = 2 + drive * 8
	let aEnv = 1 - exp(-2 * PI * 20 / fs)

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		// source band = bandpass leg around the top of the surviving spectrum
		svf(src, x, wSrc, 0.7, aSrc)
		let band = src[2]
		// harmonic series extends past fc; even (|x|) + odd (tanh), DC-blocked
		let gi = lanes ? 2 + lanes[M + i] * 8 : g
		let h = tanh(band * gi) * 0.6 + Math.abs(band) * gi * 0.55
		dc += 0.002 * (h - dc)
		h -= dc
		h = svf(hp1, h, wCut, 0.7, aCut)
		h = svf(hp2, h, wCut, 0.7, aCut)
		// envelope-match: replicated HF follows the source band's energy
		env += aEnv * (band * band - env)
		henv += aEnv * (h * h - henv)
		let norm = henv > 1e-12 ? Math.sqrt(env / henv) : 0
		data[i] = x + (lanes ? lanes[i] : amount) * Math.min(4, norm) * 0.5 * h
	}
	params._env = env; params._henv = henv; params._dc = dc
	return data
}
