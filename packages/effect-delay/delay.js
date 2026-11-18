/**
 * Simple delay — mix of dry signal with delayed copy.
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

// How far the read may move in a frame, as a tape delay's head runs no slower than half speed and no faster than double
// while its time moves: the echo bends an octave at most, down while the time grows (by at most half a frame a frame,
// so a move takes twice the increase) and up while it shrinks (a frame a frame, as long as the decrease). Read at
// 87.5 frames a frame, as a 20 ms ramp from 0.25 s to 2 s asked, the read raced through the line, a zip at least as
// sharp as a hard switch
const GROW = 0.5, SHRINK = 1

// `mixes`, when given, holds the mix for each sample of `data` (the /audio manifest's glide of a moving mix), in place
// of params.mix
export default function delay (data, params = {}, mixes) {
	let time = params.time ?? 0.25          // seconds
	let feedback = params.feedback ?? 0.3
	let mix = params.mix ?? 0.5
	let fs = params.fs ?? 44100

	if (!Number.isFinite(time) || time < 0) throw new RangeError('time must be a finite non-negative number of seconds')
	if (!Number.isFinite(fs) || fs <= 0) throw new RangeError('fs must be a finite positive sample rate')
	let d = delaySamples(time, fs)
	if (!(Math.floor(d) + 2 <= Number.MAX_SAFE_INTEGER)) throw new RangeError('delay length must be a safe integer')
	if (!data.length) return data

	// a read d samples back takes the samples floor(d) and floor(d) + 1 back. A ring made for a longer time holds this
	// one, so a shorter time keeps every sample at its age; a ring too short for it is made anew, empty. Where the last
	// call ended: the time it asked for, and where its read was (NaN before the first call)
	let ended = params._glide ??= new Float64Array(2).fill(NaN)
	if (!params.buffer || params.buffer.length < Math.floor(d) + 2) {
		params.buffer = new Float64Array(Math.floor(d) + 2)
		params.ptr = 0
		ended[0] = ended[1] = NaN
	}
	let buf = params.buffer, N = buf.length, ptr = params.ptr
	// a new time is reached across this call from the one the last call ended on, so the read glides (a tape delay's
	// bend) instead of jumping; a host ramps a smoothed `time` in short calls, and this joins its steps into one line.
	// The read follows that line at the speed it asks, up to GROW and SHRINK; a farther move goes on at that speed
	// across the calls that follow, until the read is on the time
	let from = ended[0] === ended[0] ? ended[0] : d, glide = d - from, at = ended[1] >= 1 ? ended[1] : from

	for (let i = 0, l = data.length; i < l; i++) {
		let want = from + glide * (i + 1) / l
		at = want > at + GROW ? at + GROW : want < at - SHRINK ? at - SHRINK : want
		let D = Math.floor(at), f = at - D
		let r = ptr - D
		if (r < 0) r += N
		let delayed = buf[r]
		if (f) delayed += f * (buf[r ? r - 1 : N - 1] - delayed)
		let x = data[i]
		buf[ptr] = x + feedback * delayed
		if (++ptr === N) ptr = 0
		let m = mixes ? mixes[i] : mix
		data[i] = x * (1 - m) + delayed * m
	}

	params.ptr = ptr
	ended[0] = d
	ended[1] = at

	return data
}
