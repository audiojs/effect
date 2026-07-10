/**
 * Flanger — modulated short delay with feedback
 */

let {sin, floor, PI} = Math

export default function flanger (data, params) {
	let rate = params.rate == null ? 0.3 : params.rate
	let depth = params.depth == null ? 0.7 : params.depth
	let delay = params.delay == null ? 0.003 : params.delay  // seconds
	let feedback = params.feedback == null ? 0.5 : params.feedback
	let fs = params.fs || 44100

	let maxDelay = (delay * 2 * fs) | 0
	let delaySamples = delay * fs

	if (!params.buffer || params.buffer.length < maxDelay) {
		params.buffer = new Float64Array(maxDelay)
		params.ptr = 0
		params._phase = 0
	}
	let buf = params.buffer, ptr = params.ptr, phase = params._phase
	if (ptr >= maxDelay) ptr = 0  // delay shrank live — re-enter the active ring
	let inc = 2 * PI * rate / fs

	for (let i = 0, l = data.length; i < l; i++) {
		let lfo = sin(phase)
		phase += inc
		if (phase > 2 * PI) phase -= 2 * PI

		let d = delaySamples * (1 + depth * lfo)
		// total wrap — d may reach/exceed maxDelay (depth ≈ 1 vs floored buffer size)
		let readPos = ((ptr - d) % maxDelay + maxDelay) % maxDelay

		let idx = floor(readPos)
		let frac = readPos - idx
		let a = buf[idx % maxDelay]
		let b = buf[(idx + 1) % maxDelay]
		let delayed = a + frac * (b - a)

		let x = data[i]
		buf[ptr] = x + feedback * delayed
		ptr = (ptr + 1) % maxDelay
		data[i] = x + delayed
	}

	params.ptr = ptr
	params._phase = phase

	return data
}
