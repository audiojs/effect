/**
 * Ping-pong delay — stereo: left and right delays alternate.
 * Takes two channel buffers, modifies both in-place.
 */

export default function pingPong (left, right, params = {}) {
	if (left.length !== right.length) throw new RangeError('channel lengths must match')
	let time = params.time ?? 0.25
	let feedback = params.feedback ?? 0.4
	let mix = params.mix ?? 0.5
	let fs = params.fs ?? 44100

	if (!Number.isFinite(time) || time < 0) throw new RangeError('time must be a finite non-negative number of seconds')
	if (!Number.isFinite(fs) || fs <= 0) throw new RangeError('fs must be a finite positive sample rate')
	let delaySamples = Math.max(1, Math.floor(time * fs))
	if (!Number.isSafeInteger(delaySamples)) throw new RangeError('delay length must be a safe integer')
	if (!left.length) return [left, right]

	if (!params._bufL || params._bufL.length !== delaySamples) {
		params._bufL = new Float64Array(delaySamples)
		params._bufR = new Float64Array(delaySamples)
		params._ptr = 0
	}
	let bufL = params._bufL, bufR = params._bufR, ptr = params._ptr

	for (let i = 0, l = left.length; i < l; i++) {
		let dL = bufL[ptr]
		let dR = bufR[ptr]

		// Cross-feed: left delay feeds right, right feeds left
		bufL[ptr] = left[i] + feedback * dR
		bufR[ptr] = right[i] + feedback * dL

		left[i] = left[i] * (1 - mix) + dL * mix
		right[i] = right[i] * (1 - mix) + dR * mix

		ptr = (ptr + 1) % delaySamples
	}

	params._ptr = ptr

	return [left, right]
}
