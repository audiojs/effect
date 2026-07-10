/**
 * Multi-tap delay — multiple delay taps at different times and gains.
 */

export default function multitap (data, params) {
	let taps = params.taps || [{ time: 0.25, gain: 0.5 }, { time: 0.5, gain: 0.3 }]
	let feedback = params.feedback ?? 0
	let fs = params.fs || 44100

	// recompute tap offsets only when params change — steady-state calls allocate nothing.
	// Tracked by reference: replace the taps array to change taps (in-place mutation isn't seen).
	if (params._taps !== taps || params._fs !== fs) {
		let maxDelay = 1  // ≥1 so the ring buffer is never zero-length (taps at time 0)
		params._tapSamples = taps.map(t => {
			let d = (t.time * fs) | 0
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
	let buf = params.buffer, ptr = params.ptr

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		let wet = 0
		for (let t of tapSamples) {
			let idx = (ptr - t.d + buf.length) % buf.length
			wet += buf[idx] * t.gain
		}
		buf[ptr] = x + feedback * wet
		ptr = (ptr + 1) % buf.length
		data[i] = x + wet
	}

	params.ptr = ptr

	return data
}
