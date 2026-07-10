/**
 * Vibrato — pitch modulation via modulated delay line
 */

let {sin, floor, PI} = Math

// depth is 0..1 (mirrors chorus/flanger), scaling a fixed max delay-time swing —
// same shape as chorus's `delaySamples * (1 + depth * sin(...))`, except here the
// swing itself (not a separate `delay` param) is what depth modulates.
// maxSwing derived to preserve the pre-unification default: old depth was seconds
// directly at implicit full modulation (× 1.0); 0.003s × 1.0 ≙ 0.5 × maxSwing ⇒ maxSwing = 0.006s.
const maxSwing = 0.006

export default function vibrato (data, params) {
	let rate = params.rate == null ? 5 : params.rate
	let depth = params.depth == null ? 0.5 : params.depth   // 0..1
	let fs = params.fs || 44100

	let swing = depth * maxSwing   // seconds
	let maxDelay = (swing * 2 * fs + 2) | 0
	let delaySamples = swing * fs

	if (!params.buffer || params.buffer.length < maxDelay) {
		params.buffer = new Float64Array(maxDelay)
		params.ptr = 0
		params._phase = 0
	}
	let buf = params.buffer, ptr = params.ptr, phase = params._phase
	if (ptr >= maxDelay) ptr = 0  // depth shrank live — re-enter the active ring
	let inc = 2 * PI * rate / fs

	for (let i = 0, l = data.length; i < l; i++) {
		buf[ptr] = data[i]

		let d = delaySamples * (1 + sin(phase))
		phase += inc
		if (phase > 2 * PI) phase -= 2 * PI

		// total wrap — robust for any d/ptr after live param changes
		let readPos = ((ptr - d) % maxDelay + maxDelay) % maxDelay

		let idx = floor(readPos)
		let frac = readPos - idx
		let a = buf[idx % maxDelay]
		let b = buf[(idx + 1) % maxDelay]
		data[i] = a + frac * (b - a)

		ptr = (ptr + 1) % maxDelay
	}

	params.ptr = ptr
	params._phase = phase

	return data
}
