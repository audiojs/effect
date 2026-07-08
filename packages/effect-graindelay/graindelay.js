/**
 * Granular delay — grains read from the delay line with per-grain delay scatter and
 * pitch transposition (Ableton Grain Delay class). Two staggered Hann-windowed heads
 * retrigger every half grain; feedback writes the wet grain stream back into the line.
 */

let { sin, cos, PI } = Math

export default function graindelay (data, params) {
	let time = params.time ?? 0.25           // base delay, s
	let spray = params.spray ?? 0.02         // random extra delay per grain, s
	let pitch = params.pitch ?? 0            // semitones, per-grain transposition
	let jitter = params.jitter ?? 0          // random pitch scatter, semitones
	let grain = params.grain ?? 0.08         // grain length, s
	let feedback = params.feedback ?? 0.3
	let mix = params.mix ?? 0.5
	let fs = params.fs || 44100

	let gN = Math.max(32, (grain * fs) | 0)
	let size = Math.ceil((time + spray + grain) * fs * 2 ** Math.max(0, (pitch + jitter) / 12)) + gN + 2
	if (!params._buf || params._buf.length < size) {
		params._buf = new Float64Array(size)
		params._w = 0
		params._rnd = params.seed ?? 0x9e3779b9
		// two heads, staggered by half a grain
		params._heads = [{ n: 0 }, { n: -(gN >> 1) }].map(h => ({ ...h, start: 0, off: time * fs, rate: 1 }))
	}
	let buf = params._buf, w = params._w, heads = params._heads
	let N = buf.length
	let rnd = () => ((params._rnd = (params._rnd * 1664525 + 1013904223) >>> 0) / 4294967296)

	for (let i = 0, l = data.length; i < l; i++) {
		let x = data[i]
		let wet = 0
		for (let h of heads) {
			if (h.n < 0) { h.n++; continue }       // stagger warmup
			if (h.n === 0) {                       // retrigger: new scatter + rate
				h.start = w
				h.off = (time + spray * rnd()) * fs
				h.rate = 2 ** ((pitch + jitter * (rnd() * 2 - 1)) / 12)
			}
			let pos = h.start - h.off + h.n * h.rate
			let base = Math.floor(pos), frac = pos - base
			let a = buf[((base % N) + N) % N], b = buf[(((base + 1) % N) + N) % N]
			let win = 0.5 - 0.5 * cos(2 * PI * h.n / gN)
			wet += (a + frac * (b - a)) * win
			if (++h.n >= gN) h.n = 0               // grain done → retrigger next sample
		}
		buf[w] = x + feedback * wet
		w = (w + 1) % N
		data[i] = x * (1 - mix) + wet * mix
	}
	params._w = w
	return data
}
