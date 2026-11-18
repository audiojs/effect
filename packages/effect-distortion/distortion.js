/**
 * Distortion / saturation — non-linear waveshaping.
 * types: 'soft' (cubic), 'hard' (brickwall), 'tanh', 'foldback'
 */

let {abs, sign, tanh, min, max} = Math

export default function distortion (data, params = {}) {
	let drive = params.drive ?? 0.5    // distortion amount (0–1)
	let type = params.type || 'soft'   // 'soft' | 'hard' | 'tanh' | 'foldback'
	let mix = params.mix ?? 1          // wet/dry

	let gain = 1 + drive * 9           // 1× to 10×

	// a loop for each curve, the curve picked once a call: picked in the sample loop, the tanh and foldback curves had
	// V8 box a number at every sample
	if (type === 'soft') for (let i = 0, l = data.length; i < l; i++) {
		// Cubic soft clip: smooth saturation, unity gain at |x|=1
		let x = data[i], xg = x * gain, ax = abs(xg)
		data[i] = x * (1 - mix) + (ax >= 1 ? sign(xg) : xg * (1 - ax * ax / 3) * 1.5) * mix
	}
	else if (type === 'hard') for (let i = 0, l = data.length; i < l; i++) {
		// Hard clip: brickwall limiter
		let x = data[i]
		data[i] = x * (1 - mix) + max(-1, min(1, x * gain)) * mix
	}
	else if (type === 'foldback') for (let i = 0, l = data.length; i < l; i++) {
		// Wavefolding: reflects signal back at ±1 boundary
		let x = data[i], y = x * gain
		while (abs(y) > 1) {
			if (y > 1) y = 2 - y
			else y = -2 - y
		}
		data[i] = x * (1 - mix) + y * mix
	}
	// tanh: hyperbolic tangent — asymptotically soft
	else for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		data[i] = x * (1 - mix) + tanh(x * gain) * mix
	}

	return data
}
