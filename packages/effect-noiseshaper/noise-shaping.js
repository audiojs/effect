/**
 * Noise shaping — error-feedback dithering for bit-depth reduction.
 */

export default function noiseShaping (data, params = {}) {
	let bits = params.bits || 16
	let scale = Math.pow(2, bits - 1)

	if (!params._fb) params._fb = 0
	let fb = params._fb

	for (let i = 0; i < data.length; i++) {
		let x = data[i] + fb
		let q = Math.round(x * scale) / scale
		// feed back the quantizer's own error: the output error is then e[n] − e[n−1],
		// bounded by one step and shaped toward Nyquist (measuring it against the input
		// fed the correction back into itself: it random-walked, 19× full scale at 1 bit)
		fb = x - q
		data[i] = q
	}

	params._fb = fb
	return data
}
