/**
 * Vibrato — pitch modulation via modulated delay line
 */

let {sin, floor, PI} = Math

// depth is 0..1 (mirrors chorus/flanger), scaling a fixed max delay-time swing —
// same shape as chorus's `delaySamples * (1 + depth * sin(...))`, except here the
// swing itself (not a separate `delay` param) is what depth modulates.
// maxSwing derived to preserve the pre-unification default: old depth was seconds
// directly at implicit full modulation (× 1.0); 0.003s × 1.0 ≙ 0.5 × maxSwing ⇒ maxSwing = 0.006s.
const maxSwing = 0.006

export default function vibrato (data, params = {}) {
	let rate = params.rate == null ? 5 : params.rate
	let depth = params.depth == null ? 0.5 : params.depth   // 0..1
	// stereo: channel c's LFO runs c × `phase` degrees ahead of channel 0's; default 0 moves the channels together, 180
	// sets them farthest apart, as Ableton Live 12's Chorus-Ensemble in Vibrato mode: "Offset adjusts the amount of phase
	// offset between the waveforms for the left and right channel. At 180°, the channels will be perfectly out of phase."
	let offset = params.phase == null ? 0 : params.phase
	let channel = params.channel || 0  // index of the channel this call processes
	let fs = params.fs || 44100
	let lead = channel ? channel * offset * PI / 180 : 0  // rad; 0 on channel 0, so a mono signal never depends on phase
	// a new lead is reached across this call from the one the last call ended on, so the read glides instead of jumping;
	// a host ramps a smoothed `phase` in short calls, and this joins its steps into one line
	// where the last call ended, for this one to glide from: NaN before the first call (only finite values are kept,
	// in a Float64Array: kept as numbers on the params object, they boxed in V8 once two instances had run)
	let ended = params._glide ??= new Float64Array(2).fill(NaN)
	let from = ended[0] === ended[0] ? ended[0] : lead, glide = lead - from
	// depth sets how far the read swings, so a new depth glides across the call in the same way
	let depthFrom = ended[1] === ended[1] ? ended[1] : depth, depthGlide = depth - depthFrom

	// the ring holds the farthest read, 2·swing·fs at depth 1, and the sample past it: sized once, so a depth that moves
	// within 0..1 reads every sample at its age. A deeper one (a direct call past the range) makes a ring for it anew
	let need = (Math.max(1, depth, depthFrom) * maxSwing * 2 * fs + 2) | 0
	if (!params.buffer || params.buffer.length < need) {
		params.buffer = new Float64Array(need)
		params.ptr = 0
		params._phase = 0
	}
	let buf = params.buffer, ptr = params.ptr, phase = params._phase, maxDelay = buf.length
	let inc = 2 * PI * rate / fs

	for (let i = 0, l = data.length; i < l; i++) {
		buf[ptr] = data[i]

		let d = (depthFrom + depthGlide * (i + 1) / l) * maxSwing * fs * (1 + sin(phase + from + glide * (i + 1) / l))
		phase += inc
		if (phase > 2 * PI) phase -= 2 * PI

		// total wrap — robust for any d/ptr after live param changes
		let readPos = ((ptr - d) % maxDelay + maxDelay) % maxDelay

		let idx = floor(readPos)
		let frac = readPos - idx
		let a = buf[idx % maxDelay]
		let b = buf[(idx + 1) % maxDelay]
		data[i] = a + frac * (b - a)

		ptr = (ptr + 1) % maxDelay
	}

	params.ptr = ptr
	params._phase = phase
	// kept only when finite, so the next call never glides from a value that is not finite
	if (data.length && Number.isFinite(lead)) ended[0] = lead
	if (data.length && Number.isFinite(depth)) ended[1] = depth

	return data
}
