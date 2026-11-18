/**
 * Multi-tap delay — multiple delay taps at different times and gains.
 */

const defaults = [{ time: 0.25, gain: 0.5 }, { time: 0.5, gain: 0.3 }]

// the summed reads of the taps from the ring buf, of N samples, written next at ptr. A function of its own: as a loop
// inside the sample loop it had V8 allocate at every block
function tapsAt (buf, N, ptr, taps) {
	let wet = 0
	for (let k = 0; k < taps.length; k++) {
		let t = taps[k]
		wet += buf[(ptr - t.d + N) % N] * t.gain
	}
	return wet
}

export default function multitap (data, params = {}) {
	let taps = params.taps || defaults
	let feedback = params.feedback ?? 0
	let fs = params.fs || 44100

	// recompute tap offsets only when params change — steady-state calls allocate nothing.
	// Tracked by reference: replace the taps array to change taps (in-place mutation isn't seen).
	if (params._taps !== taps || params._fs !== fs) {
		let maxDelay = 1  // ≥1 so the ring buffer is never zero-length (taps at time 0)
		params._tapSamples = taps.map(t => {
			let d = Math.round(t.time * fs) | 0  // nearest frame: a Float32 time truncated lands a frame early
			if (d > maxDelay) maxDelay = d
			return { d, gain: t.gain ?? 0.5 }
		})
		params._maxDelay = maxDelay
		params._taps = taps
		params._fs = fs
	}
	let tapSamples = params._tapSamples

	if (!params.buffer || params.buffer.length < params._maxDelay) {
		params.buffer = new Float64Array(params._maxDelay)
		params.ptr = 0
	}
	let buf = params.buffer, N = buf.length, ptr = params.ptr

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		let wet = tapsAt(buf, N, ptr, tapSamples)
		buf[ptr] = x + feedback * wet
		ptr = (ptr + 1) % N
		data[i] = x + wet
	}

	params.ptr = ptr

	return data
}
