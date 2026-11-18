/**
 * Flanger — modulated short delay with feedback
 */

let {sin, floor, PI} = Math

// How far the centre of the read may move in a frame while the delay moves, as effect-delay's read moves while its time
// does: a tape head runs no slower than half speed and no faster than double. The read sits d · (1 + dp · sin) back, so
// the centre d moves by at most GROW / (1 + dp) a frame as it grows and SHRINK / (1 + dp) as it shrinks, and the move
// bends the read by an octave at most, besides its LFO
const GROW = 0.5, SHRINK = 1

export default function flanger (data, params = {}) {
	let rate = params.rate == null ? 0.3 : params.rate
	let depth = params.depth == null ? 0.7 : params.depth
	let delay = params.delay == null ? 0.003 : params.delay  // seconds
	let feedback = params.feedback == null ? 0.5 : params.feedback
	// stereo: channel c's LFO runs c × `phase` degrees ahead of channel 0's (Logic Pro's Phase: 0 moves the channels
	// together, ±180 sets them farthest apart); default 90, quadrature, as Korg's X5DR Quadrature Chorus
	let offset = params.phase == null ? 90 : params.phase
	let channel = params.channel || 0  // index of the channel this call processes
	let fs = params.fs || 44100

	// the read comes before this sample's write, so the ring holds delays 1 to maxDelay. A read at d takes the samples
	// ceil(d) and ceil(d) − 1 back; the farthest d, 2·delay·fs at depth 1 (a hair over when rounding lifts it past a
	// whole number), needs floor(2·delay·fs) + 1 back, and the nearest is held at 1, as the feedback loop cannot read
	// the sample it is about to write
	let maxDelay = Math.floor(delay * 2 * fs) + 1
	let delaySamples = delay * fs
	let lead = channel ? channel * offset * PI / 180 : 0  // rad; 0 on channel 0, so a mono signal never depends on phase
	// a new lead is reached across this call from the one the last call ended on, so the read glides instead of jumping;
	// a host ramps a smoothed `phase` in short calls, and this joins its steps into one line
	// where the last call ended, for this one to glide from: NaN before the first call (only finite values are kept,
	// in a Float64Array: kept as numbers on the params object, they boxed in V8 once two instances had run)
	let ended = params._glide ??= new Float64Array(4).fill(NaN)
	let from = ended[0] === ended[0] ? ended[0] : lead, glide = lead - from
	// depth moves the read too, so a new depth glides across the call in the same way, and so does the delay, its centre
	// following that line at the speed it asks, up to GROW and SHRINK, a farther move going on across the calls that
	// follow until it is on the delay (where the centre was is kept, in frames)
	let depthFrom = ended[1] === ended[1] ? ended[1] : depth, depthGlide = depth - depthFrom
	let delayFrom = ended[2] === ended[2] ? ended[2] : delaySamples, delayGlide = delaySamples - delayFrom, at = ended[3] === ended[3] ? ended[3] : delayFrom

	// a ring made for a longer delay holds this one: its whole length is the ring, so a shorter delay keeps every
	// sample at its age. A longer delay than it holds makes a ring for it anew
	if (!params.buffer || params.buffer.length < maxDelay) {
		params.buffer = new Float64Array(maxDelay)
		params.ptr = 0
		params._phase = 0
	}
	let buf = params.buffer, ptr = params.ptr, phase = params._phase, N = buf.length
	let inc = 2 * PI * rate / fs

	for (let i = 0, l = data.length; i < l; i++) {
		let lfo = sin(phase + from + glide * (i + 1) / l)
		phase += inc
		if (phase > 2 * PI) phase -= 2 * PI

		let dp = depthFrom + depthGlide * (i + 1) / l, want = delayFrom + delayGlide * (i + 1) / l
		at = want > at + GROW / (1 + dp) ? at + GROW / (1 + dp) : want < at - SHRINK / (1 + dp) ? at - SHRINK / (1 + dp) : want
		let d = Math.max(1, at * (1 + dp * lfo))
		// ptr − d is negative near the ring's start; the ring holds every d of depth 0 to 1
		let readPos = ((ptr - d) % N + N) % N

		let idx = floor(readPos)
		let frac = readPos - idx
		let a = buf[idx % N]
		let b = buf[(idx + 1) % N]
		let delayed = a + frac * (b - a)

		let x = data[i]
		buf[ptr] = x + feedback * delayed
		ptr = (ptr + 1) % N
		data[i] = x + delayed
	}

	params.ptr = ptr
	params._phase = phase
	// kept only when finite, so the next call never glides from a value that is not finite
	if (data.length && Number.isFinite(lead)) ended[0] = lead
	if (data.length && Number.isFinite(depth)) ended[1] = depth
	if (data.length && Number.isFinite(delaySamples)) ended[2] = delaySamples
	if (data.length && at === at) ended[3] = at

	return data
}
