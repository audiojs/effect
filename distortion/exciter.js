/**
 * Exciter — psychoacoustic harmonic synthesis for presence/air.
 * Highpass extracts high-band, soft saturation generates harmonics,
 * mixed back into dry signal. Aphex-style aural exciter.
 */

let {sin, tanh, PI} = Math

export default function exciter (data, params) {
	let freq   = params.freq   ?? 3000   // highpass cutoff Hz
	let drive  = params.drive  ?? 0.5    // saturation 0–1 → 1×–10× gain
	let amount = params.amount ?? 0.5    // exciter mix 0–1
	let fs     = params.fs     || 44100

	if (params._lp == null) {
		params._lp = 0
		params._bp = 0
	}
	let lp = params._lp, bp = params._bp
	let f = 2 * sin(PI * freq / fs)
	let q = 0.5                          // moderate damping
	let g = 1 + drive * 9                // 1×–10×

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		// Chamberlin SVF — highpass tap generates high-band
		lp += f * bp
		let hp = x - lp - q * bp
		bp += f * hp
		// Tanh saturation synthesizes harmonics above `freq`
		data[i] = x + amount * tanh(hp * g) * 0.5
	}

	params._lp = lp
	params._bp = bp

	return data
}
