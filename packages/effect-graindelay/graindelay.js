/**
 * Granular delay — grains read from the delay line with per-grain delay scatter and
 * pitch transposition (Ableton Grain Delay class). Two staggered Hann-windowed heads
 * retrigger every half grain; feedback writes the wet grain stream back into the line.
 */

let { cos, PI } = Math

// The two heads' sum at sample i of a call of l, at the line's write position w, from the line buf of N samples, left
// in H[8]. Head o of H holds its window position, the samples since its grain began, its delay and its rate; G the
// settings the last call ended on and this call's (time, spray, pitch, jitter at 0–3 and 5–8) and the sample rate (9);
// R the generator. A grain takes its delay and rate where it begins, from the settings glided to that sample. A
// function of its own, as a loop inside the sample loop had V8 allocate at every block; too long for V8 to inline, so
// no fractional number crosses its call (V8 would box it)
function grainsAt (buf, N, w, H, G, R, gN, i, l) {
	let wet = 0, u = (i + 1) / l, fs = G[9]
	for (let o = 0; o < 8; o += 4) {
		let n = H[o]
		if (n < 0) { H[o] = n + 1; continue }  // stagger warmup
		if (H[o + 1] === 0) {                  // retrigger: new scatter + rate
			let time = G[0] + (G[5] - G[0]) * u, spray = G[1] + (G[6] - G[1]) * u
			let pitch = G[2] + (G[7] - G[2]) * u, jitter = G[3] + (G[8] - G[3]) * u
			let off = (time + spray * ((R[0] = (R[0] * 1664525 + 1013904223) >>> 0) / 4294967296)) * fs
			let rate = 2 ** ((pitch + jitter * (((R[0] = (R[0] * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1)) / 12)
			// a grain that reads faster than the line runs begins far enough back that its read never passes the write
			if (rate > 1) off = Math.max(off, 1 + (gN - 1) * (rate - 1))
			H[o + 2] = off; H[o + 3] = rate
		}
		// the read, back from the write: the grain's delay, less what its rate gained on the line since it began
		let k = H[o + 1], back = H[o + 2] - k * (H[o + 3] - 1)
		back = back < 1 ? 1 : back > N - 1 ? N - 1 : back
		let D = Math.floor(back), f = back - D, r = w - D
		if (r < 0) r += N
		let a = buf[r], b = buf[r ? r - 1 : N - 1]
		let win = 0.5 - 0.5 * cos(2 * PI * n / gN)
		wet += (a + f * (b - a)) * win
		if (++n >= gN) { n -= gN; k = -1 }     // grain done → retrigger next sample
		H[o] = n; H[o + 1] = k + 1
	}
	H[8] = wet
}

// `mixes`, when given, holds the mix for each sample of `data` (the /audio manifest's glide of a moving mix), in place
// of params.mix
export default function graindelay (data, params = {}, mixes) {
	let time = params.time ?? 0.25           // base delay, s
	let spray = params.spray ?? 0.02         // random extra delay per grain, s
	let pitch = params.pitch ?? 0            // semitones, per-grain transposition
	let jitter = params.jitter ?? 0          // random pitch scatter, semitones
	let grain = params.grain ?? 0.08         // grain length, s
	let feedback = params.feedback ?? 0.3
	let mix = params.mix ?? 0.5
	let fs = params.fs || 44100

	let gN = Math.max(32, (grain * fs) | 0)
	// the farthest read: a grain's delay with its spray and, reading slower than the line runs, a grain more; or as far
	// back as a grain reading faster begins. A line made for longer holds it (the /audio factory makes it for every
	// param's max); one too short is made anew, empty, and the heads start again
	let size = Math.ceil(Math.max((time + spray) * fs + gN, 1 + (gN - 1) * (2 ** (Math.max(0, pitch + jitter) / 12) - 1))) + 2
	if (!params._buf || params._buf.length < size) {
		params._buf = new Float64Array(size)
		params._heads = null
	}
	if (!params._heads) {
		params._w = 0
		params._rnd = Float64Array.of(params.seed ?? 0x9e3779b9)
		// two heads, staggered by half a grain, and their sum
		params._heads = Float64Array.of(0, 0, 0, 1, -(gN >> 1), 0, 0, 1, 0)
		params._glide = Float64Array.of(NaN, NaN, NaN, NaN, gN, 0, 0, 0, 0, fs)
	}
	if (!data.length) return data
	let buf = params._buf, w = params._w, H = params._heads, G = params._glide, R = params._rnd
	let N = buf.length
	G[9] = fs

	// a new grain length stretches both windows from where they are: each head keeps its place in its grain, so the two
	// windows stay half a grain apart and sum to one, and none jumps
	if (G[4] !== gN) { H[0] *= gN / G[4]; H[4] *= gN / G[4]; G[4] = gN }
	// the settings a grain takes glide across the call from those the last call ended on (only finite ones are kept)
	G[5] = time; G[6] = spray; G[7] = pitch; G[8] = jitter
	for (let k = 0; k < 4; k++) if (G[k] !== G[k]) G[k] = G[k + 5]

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		grainsAt(buf, N, w, H, G, R, gN, i, l)
		let wet = H[8]
		buf[w] = x + feedback * wet
		if (++w === N) w = 0
		let m = mixes ? mixes[i] : mix
		data[i] = x * (1 - m) + wet * m
	}
	params._w = w
	for (let k = 0; k < 4; k++) if (Number.isFinite(G[k + 5])) G[k] = G[k + 5]
	return data
}
