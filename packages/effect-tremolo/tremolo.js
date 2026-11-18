/**
 * Tremolo — amplitude modulation via LFO
 */

let {sin, PI} = Math

// `depths`, when given, holds the depth for each sample of `data` (the /audio manifest's glide of a moving depth), in
// place of params.depth
export default function tremolo (data, params = {}, depths) {
	let rate = params.rate == null ? 5 : params.rate
	let depth = params.depth == null ? 0.5 : params.depth
	// stereo: channel c's LFO runs c × `phase` degrees ahead of channel 0's; default 0 moves the channels together, and
	// 180 is an auto-pan, as Ableton Live 12's Auto Pan-Tremolo: "In Phase mode, the LFO waveforms for the left and right
	// channels can be offset by a set number of degrees. At 180°, the LFOs are perfectly out of phase so that when one
	// LFO reaches its peak value, the other is at its minimum."
	let offset = params.phase == null ? 0 : params.phase
	let channel = params.channel || 0  // index of the channel this call processes
	let fs = params.fs || 44100
	let lead = channel ? channel * offset * PI / 180 : 0  // rad; 0 on channel 0, so a mono signal never depends on phase
	// a new lead is reached across this call from the one the last call ended on, so the gain glides instead of jumping;
	// a host ramps a smoothed `phase` in short calls, and this joins its steps into one line
	// where the last call ended, for this one to glide from: NaN before the first call (only finite values are kept,
	// in a Float64Array: kept as numbers on the params object, they boxed in V8 once two instances had run)
	let ended = params._glide ??= new Float64Array(1).fill(NaN)
	let from = ended[0] === ended[0] ? ended[0] : lead, glide = lead - from

	if (params._phase == null) params._phase = 0
	let phase = params._phase
	let inc = 2 * PI * rate / fs

	for (let i = 0, l = data.length; i < l; i++) {
		let mod = 1 - (depths ? depths[i] : depth) * (0.5 + 0.5 * sin(phase + from + glide * (i + 1) / l))
		phase += inc
		if (phase > 2 * PI) phase -= 2 * PI
		data[i] *= mod
	}

	params._phase = phase
	// kept only when finite, so the next call never glides from a value that is not finite
	if (data.length && Number.isFinite(lead)) ended[0] = lead

	return data
}
