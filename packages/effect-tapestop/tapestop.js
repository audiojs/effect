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
 * this stays a pure function of (data, opts) — no persistent state on opts. tapestopStream
 * is the same stop over a stream, its state on opts, `lead` frames late.
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
	let atN = Math.max(0, Math.min(n, Math.round(at * fs) | 0))  // nearest frame: a Float32 `at` truncated starts a frame early
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

// The same tape stop as a stream: what the whole-buffer call writes, `latency` frames late, its state carried on `opts`
// from call to call. The input is kept in a ring (`opts._ring`, made on the first call when absent) holding as far as
// the read falls behind, `time` of input, and the frames it may run ahead (see lead). The stop begins at frame `at` of
// the stream, read each call until it has begun
export function tapestopStream (data, opts) {
	let at = opts.at ?? 0
	let time = opts.time ?? 1
	let curve = opts.curve ?? 1
	let direction = opts.direction ?? 'stop'
	let flutter = opts.flutter ?? 0
	let fs = opts.fs || 44100
	let latency = opts.latency ?? 0

	if (!opts._ring) {
		opts._ring = new Float64Array(Math.ceil(time * fs) + latency + 3)
		opts._n = 0; opts._read = 0; opts._start = -1
		opts._rnd = (opts.seed ?? 0x9e3779b9) >>> 0
	}
	let ring = opts._ring, R = ring.length, n = opts._n, readPos = opts._read, start = opts._start, rnd = opts._rnd
	let atN = Math.max(0, Math.round(at * fs) | 0)
	let spinUp = direction === 'start'

	for (let i = 0, l = data.length; i < l; i++, n++) {
		ring[n % R] = data[i]
		let j = n - latency  // the frame written now
		if (j < 0) { data[i] = 0; continue }
		if (start < 0 && j >= atN) start = readPos = j
		if (start < 0) { data[i] = ring[j % R]; continue } // dry lead-in, bit-exact

		let t = (j - start) / fs
		let rate
		if (spinUp) {
			rate = t < time ? pow(t / time, curve) : 1
		} else {
			if (t >= time) { data[i] = 0; continue } // stopped: silence, not a held sample
			rate = pow(1 - t / time, curve)
		}
		// the seeded LCG, written out: through a function its state was boxed at every call
		if (flutter > 0 && t < time) { rnd = (rnd * 1664525 + 1013904223) >>> 0; rate *= 1 + flutter * 0.1 * (2 * (rnd / 4294967296) - 1) }
		if (rate < 0) rate = 0

		let i0 = floor(readPos), frac = readPos - i0
		let a = ring[i0 % R], b = ring[(i0 + 1) % R]
		data[i] = a + frac * (b - a)

		readPos += rate
	}

	opts._n = n; opts._read = readPos; opts._start = start; opts._rnd = rnd
	return data
}

// The most frames past the one it writes that the read takes input from, at these settings: how late the stream must
// run. The read runs ahead only in 'stop' with flutter, while (1 + 0.1·flutter)·(1 − t/time)^curve can lift the rate
// past 1 at the stop's start; it is found by running the read as the kernel does, and one frame is added for the
// rounding of a read position counted from another start
export function lead (fs = 44100, { time = 1, curve = 1, direction = 'stop', flutter = 0, seed = 0x9e3779b9 } = {}) {
	if (direction === 'start' || !(flutter > 0)) return 0
	let rnd = seed >>> 0, readPos = 0, most = 0
	let end = Math.min(Math.ceil(time * fs), Math.ceil(time * fs * (1 - (1 + 0.1 * flutter) ** (-1 / curve))) + 2)
	for (let k = 0; k < end; k++) {
		let t = k / fs
		let rate = pow(1 - t / time, curve)
		rnd = (rnd * 1664525 + 1013904223) >>> 0
		rate *= 1 + flutter * 0.1 * (2 * (rnd / 4294967296) - 1)
		if (rate < 0) rate = 0
		let i0 = floor(readPos), need = readPos > i0 ? i0 + 1 - k : i0 - k
		if (need > most) most = need
		readPos += rate
	}
	return most && most + 1
}
