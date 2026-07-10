/**
 * Tape-stop / spin-down (and spin-up) — variable-rate playback with a decelerating
 * (or accelerating) read pointer, turntable/tape-deck style.
 *
 * Physics: a free-spinning platter/reel under constant friction (braking or motor)
 * torque has constant angular deceleration, so angular velocity decays linearly —
 * ω(t) = ω0·(1 − t/T). Playback speed follows the same profile; `curve` generalizes
 * it to non-constant torque (curve=1 is the physical constant-torque case).
 *
 * Batch kernel: whole-buffer read-pointer integration needs no cross-call state, so
 * this stays a pure function of (data, opts) — no persistent state on opts.
 */

let { floor, pow } = Math

export default function tapestop (data, opts = {}) {
	let at = opts.at ?? 0
	let time = opts.time ?? 1
	let curve = opts.curve ?? 1
	let direction = opts.direction ?? 'stop'
	let flutter = opts.flutter ?? 0
	let fs = opts.fs || 44100
	let seed = (opts.seed ?? 0x9e3779b9) >>> 0

	let n = data.length
	let atN = Math.max(0, Math.min(n, (at * fs) | 0))
	let src = Float64Array.from(data) // snapshot — `data` is overwritten in place while reading `src`

	let rnd = seed
	let noise = () => ((rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296) // seeded LCG — deterministic flutter

	for (let i = 0; i < atN; i++) data[i] = src[i] // dry lead-in, bit-exact

	let readPos = atN
	let spinUp = direction === 'start'

	for (let i = atN; i < n; i++) {
		let t = (i - atN) / fs
		let rate
		if (spinUp) {
			rate = t < time ? pow(t / time, curve) : 1
		} else {
			if (t >= time) { data[i] = 0; continue } // stopped — silence, not a held sample
			rate = pow(1 - t / time, curve)
		}
		if (flutter > 0 && t < time) rate *= 1 + flutter * 0.1 * (2 * noise() - 1)
		if (rate < 0) rate = 0

		let i0 = floor(readPos), frac = readPos - i0
		let a = src[i0], b = i0 + 1 < n ? src[i0 + 1] : a
		data[i] = a + frac * (b - a)

		readPos += rate
	}

	return data
}
