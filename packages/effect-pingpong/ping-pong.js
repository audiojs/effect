/**
 * Ping-pong delay — stereo: left and right delays alternate.
 * Takes two channel buffers, modifies both in-place.
 */

// The delay in samples a time asks for, at least one so the feedback loop stays causal. A host passes a time as a
// Float32: 10 ms arrives as 0.009999999776, 479.99999 frames at 48 kHz. Within a Float32 step (2^-23 of it) of a whole
// frame it is that frame, so such a time reads one sample, bit for bit as a line of whole frames read it; any other
// time reads between two samples
export function delaySamples (time, fs) {
	let d = time * fs, r = Math.round(d)
	if (Math.abs(d - r) <= r * 2 ** -23) d = r
	return Math.max(1, d)
}

// How far the reads may move in a frame, as a tape delay's head runs no slower than half speed and no faster than
// double while its time moves: the echoes bend an octave at most, down while the time grows (by at most half a frame a
// frame, so a move takes twice the increase) and up while it shrinks (a frame a frame, as long as the decrease)
const GROW = 0.5, SHRINK = 1

export default function pingPong (left, right, params = {}) {
	pingPongInPlace(left, right, params)
	return [left, right]
}

// ping-pong without the pair it returns: what a host's block loop calls, as it may allocate nothing. `mixes`, when
// given, holds the mix for each frame (the /audio manifest's glide of a moving mix), in place of params.mix
export function pingPongInPlace (left, right, params = {}, mixes) {
	if (left.length !== right.length) throw new RangeError('channel lengths must match')
	let time = params.time ?? 0.25
	let feedback = params.feedback ?? 0.4
	let mix = params.mix ?? 0.5
	let fs = params.fs ?? 44100

	if (!Number.isFinite(time) || time < 0) throw new RangeError('time must be a finite non-negative number of seconds')
	if (!Number.isFinite(fs) || fs <= 0) throw new RangeError('fs must be a finite positive sample rate')
	let d = delaySamples(time, fs)
	if (!(Math.floor(d) + 2 <= Number.MAX_SAFE_INTEGER)) throw new RangeError('delay length must be a safe integer')
	if (!left.length) return

	// a read d samples back takes the samples floor(d) and floor(d) + 1 back. Rings made for a longer time hold this
	// one, so a shorter time keeps every sample at its age; rings too short for it are made anew, empty. Where the last
	// call ended: the time it asked for, and where its reads were (NaN before the first call)
	let ended = params._glide ??= new Float64Array(2).fill(NaN)
	if (!params._bufL || params._bufL.length < Math.floor(d) + 2) {
		params._bufL = new Float64Array(Math.floor(d) + 2)
		params._bufR = new Float64Array(Math.floor(d) + 2)
		params._ptr = 0
		ended[0] = ended[1] = NaN
	}
	let bufL = params._bufL, bufR = params._bufR, N = bufL.length, ptr = params._ptr
	// a new time is reached across this call from the one the last call ended on, so the reads glide (a tape delay's
	// bend) instead of jumping; a host ramps a smoothed `time` in short calls, and this joins its steps into one line.
	// The reads follow that line at the speed it asks, up to GROW and SHRINK; a farther move goes on at that speed
	// across the calls that follow, until the reads are on the time
	let from = ended[0] === ended[0] ? ended[0] : d, glide = d - from, at = ended[1] >= 1 ? ended[1] : from

	for (let i = 0, l = left.length; i < l; i++) {
		let want = from + glide * (i + 1) / l
		at = want > at + GROW ? at + GROW : want < at - SHRINK ? at - SHRINK : want
		let D = Math.floor(at), f = at - D
		let r = ptr - D
		if (r < 0) r += N
		let dL = bufL[r]
		let dR = bufR[r]
		if (f) {
			let s = r ? r - 1 : N - 1
			dL += f * (bufL[s] - dL)
			dR += f * (bufR[s] - dR)
		}

		// Cross-feed: left delay feeds right, right feeds left
		bufL[ptr] = left[i] + feedback * dR
		bufR[ptr] = right[i] + feedback * dL

		let m = mixes ? mixes[i] : mix
		left[i] = left[i] * (1 - m) + dL * m
		right[i] = right[i] * (1 - m) + dR * m

		if (++ptr === N) ptr = 0
	}

	params._ptr = ptr
	ended[0] = d
	ended[1] = at
}
