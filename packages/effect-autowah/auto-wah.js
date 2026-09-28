/**
 * Auto-wah — envelope follower drives resonant bandpass cutoff.
 * Signal level controls filter sweep from base up through range.
 */

let {abs, exp, tan, min, PI} = Math

export default function autoWah (data, params = {}) {
	let base = params.base ?? 300       // minimum cutoff Hz
	let range = params.range ?? 3000    // sweep range Hz
	let Q = params.Q ?? 5               // filter resonance
	let attack = params.attack ?? 0.002 // envelope attack (seconds)
	let release = params.release ?? 0.1 // envelope release (seconds)
	let sens = params.sens ?? 2         // input sensitivity
	let fs = params.fs || 44100

	let aA = exp(-1 / (attack * fs))
	let aR = exp(-1 / (release * fs))

	if (params._env == null) {
		params._env = 0
		params._lp = 0
		params._bp = 0
	}
	let env = params._env, lp = params._lp, bp = params._bp
	let k = 1 / Q, top = 0.49 * fs

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		let level = abs(x) * sens

		// Envelope follower with asymmetric attack/release
		if (level > env) env = aA * env + (1 - aA) * level
		else env = aR * env + (1 - aR) * level

		// Envelope → cutoff frequency
		let freq = base + range * min(1, env)

		// Trapezoidal state-variable bandpass (Zavalishin, The Art of VA Filter Design, ch. 3–4; Simper 2013):
		// stable at any Q, any freq below Nyquist, where Chamberlin's form diverged once f² + 2f/Q > 4
		let g = tan(PI * min(freq, top) / fs)
		let v1 = (bp + g * (x - lp)) / (1 + g * (g + k)), v2 = lp + g * v1
		bp = 2 * v1 - bp
		lp = 2 * v2 - lp
		data[i] = v1
	}

	params._env = env
	params._lp = lp
	params._bp = bp

	return data
}
