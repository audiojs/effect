/**
 * Rotary speaker (Leslie) simulation — two independently-spinning rotors (treble horn,
 * bass drum) below a crossover split, each producing Doppler pitch modulation (FM, via
 * a modulated delay line) and directivity amplitude modulation (AM) as it turns past a
 * fixed virtual microphone. Stereo comes from two mics at different angles around the
 * same rotors, not from two separate delay lines.
 *
 * Reference: J.O. Smith, S. Serafin, J. Abel, D. Berners, "Doppler Simulation and the
 * Leslie," Proc. DAFx-02. Chorale/tremolo rotor rates follow the classic Leslie 122
 * horn/drum speeds documented there and in manufacturer service literature.
 *
 * Mono in, stereo out: caller pre-fills both `left` and `right` with the same dry mono
 * signal (mirrors the effect-pingpong in-place stereo shape); the kernel averages them
 * back to mono internally, then writes distinct L/R.
 */

import crossoverFn from '@audio/eq-crossover'
import { step, state } from '@audio/biquad'

let { cos, sin, tan, floor, exp, PI } = Math
let PI2 = 2 * PI

// Leslie 122 rotor rates (Hz) — DAFx-02 §2 / manufacturer lore.
let CHORALE = { horn: 0.8, drum: 0.7 }
let TREMOLO = { horn: 6.7, drum: 5.9 }
let C = 343 // speed of sound, m/s

function readDelay (buf, N, ptr, d) {
	let pos = ((ptr - d) % N + N) % N
	let i0 = floor(pos), frac = pos - i0
	let a = buf[i0], b = buf[(i0 + 1) % N]
	return a + frac * (b - a)
}

// x through one band's sections, each with its state. A function of its own: as a loop inside the sample loop it had
// V8 box a number at every sample
function band (sos, st, x) {
	for (let s = 0; s < sos.length; s++) x = step(sos[s], st[s], x)
	return x
}

// the LR4 crossover at fc written over the sections crossoverFn made, so a live split allocates nothing: each band two
// copies of digital-filter's 2nd-order Butterworth section (its bilinear form at the prototype pole −sin(π/4) +
// j cos(π/4), as @audio/eq-crossover designs it; a test holds the two equal), with its edge sections at 0 and Nyquist.
// fc and fs arrive in `split`, a typed array: V8 does not inline this function, and a split between whole hertz passed
// as an argument was boxed at each call, 16 bytes a block while the crossover moves
const split = new Float64Array(2)
function lr4 (sos, split) {
	let fc = split[0], fs = split[1], lo = sos[0][0], hi = sos[1][0]
	if (fc <= 0 || fc >= fs / 2) {
		let pass = fc > 0
		lo.b0 = pass ? 1 : 0; lo.b1 = lo.b2 = lo.a1 = lo.a2 = 0
		hi.b0 = pass ? 0 : 1; hi.b1 = hi.b2 = hi.a1 = hi.a2 = 0
	} else {
		let sigma = -sin(PI / 4), omega = cos(PI / 4), pmag2 = sigma * sigma + omega * omega, bs = -2 * sigma
		let K = 1 / tan(PI * fc / fs), A = K * K + bs * K + pmag2
		lo.b0 = pmag2 / A; lo.b1 = 2 * pmag2 / A; lo.b2 = pmag2 / A; lo.a1 = 2 * (pmag2 - K * K) / A; lo.a2 = (K * K - bs * K + pmag2) / A
		let B1 = bs / pmag2, B0 = 1 / pmag2, H = K * K + B1 * K + B0
		hi.b0 = K * K / H; hi.b1 = -2 * K * K / H; hi.b2 = K * K / H; hi.a1 = 2 * (B0 - K * K) / H; hi.a2 = (K * K - B1 * K + B0) / H
	}
	same(sos[0][1], lo); same(sos[1][1], hi)
}
const same = (to, from) => { to.b0 = from.b0; to.b1 = from.b1; to.b2 = from.b2; to.a1 = from.a1; to.a2 = from.a2 }

export default function rotary (left, right, params = {}) {
	rotaryInPlace(left, right, params)
	return [left, right]
}

// rotary without the pair it returns: what a host's block loop calls, as it may allocate nothing. `mixes`, when given,
// holds the mix for each frame (the /audio manifest's glide of a moving mix), in place of params.mix
export function rotaryInPlace (left, right, params = {}, mixes) {
	if (left.length !== right.length) throw new RangeError('channel lengths must match')
	let mix = params.mix == null ? 1 : params.mix
	if (mix <= 0 && !mixes) return // exact bypass — zero latency, nothing to compensate

	let fs = params.fs || 44100
	let xoFreq = params.crossover == null ? 800 : params.crossover
	let depth = params.depth == null ? 1 : params.depth
	depth = depth < 0 ? 0 : depth > 1 ? 1 : depth
	let hornInertia = Math.max(1e-3, params.hornInertia == null ? 0.6 : params.hornInertia)
	let drumInertia = Math.max(1e-3, params.drumInertia == null ? 2.5 : params.drumInertia)
	let micSpread = params.micSpread == null ? PI / 2 : params.micSpread
	let hornRadius = params.hornRadius == null ? 0.09 : params.hornRadius
	let drumRadius = params.drumRadius == null ? 0.05 : params.drumRadius
	let hornM = params.hornAM == null ? 0.5 : params.hornAM
	let drumM = params.drumAM == null ? 0.25 : params.drumAM

	// target speed resolution: explicit hornSpeed/drumSpeed (manifest form) wins;
	// else `speed` enum ('tremolo' | 'chorale' | 'off') or {horn, drum} object.
	let hornTarget, drumTarget
	if (params.hornSpeed != null || params.drumSpeed != null) {
		hornTarget = params.hornSpeed ?? CHORALE.horn
		drumTarget = params.drumSpeed ?? CHORALE.drum
	} else {
		let speed = params.speed ?? 'chorale'
		if (typeof speed === 'object') { hornTarget = speed.horn ?? CHORALE.horn; drumTarget = speed.drum ?? CHORALE.drum }
		else if (speed === 'tremolo') { hornTarget = TREMOLO.horn; drumTarget = TREMOLO.drum }
		else if (speed === 'off') { hornTarget = 0; drumTarget = 0 }
		else { hornTarget = CHORALE.horn; drumTarget = CHORALE.drum } // 'chorale' + fallback
	}

	let d0Horn = hornRadius / C // seconds — peak mic-axis path-length delay
	let d0Drum = drumRadius / C
	let d0HornN = d0Horn * fs   // samples
	let d0DrumN = d0Drum * fs

	// crossover coefficients — designed once and cached on params (per-block hosts call
	// this in the realtime path: no allocation there); redesigned in place only when the split
	// frequency or sample rate actually moves. LR4 section count is fixed for a single
	// split, so the persistent filter *state* (below) stays valid across a redesign.
	if (!params._sos || params._sosFreq !== xoFreq || params._sosFs !== fs) {
		if (!params._sos || !Number.isFinite(xoFreq)) params._sos = crossoverFn([xoFreq], 4, fs) // [low, high] = [drum band, horn band]
		else { split[0] = xoFreq; split[1] = fs; lr4(params._sos, split) }
		params._sosFreq = xoFreq
		params._sosFs = fs
	}
	let lowSOS = params._sos[0], highSOS = params._sos[1]

	if (!params._hornBuf) {
		// sized once for depth ∈ [0,1] worst case (2·d0); independent of live depth/xoFreq.
		params._hornRingN = ((2 * d0HornN) | 0) + 4
		params._drumRingN = ((2 * d0DrumN) | 0) + 4
		params._hornBuf = new Float64Array(params._hornRingN)
		params._drumBuf = new Float64Array(params._drumRingN)
		params._hornPtr = 0
		params._drumPtr = 0
		params._hornPhase = 0
		params._drumPhase = 0
		params._hornF = 0 // rotors start at rest — spin up through inertia like the real thing
		params._drumF = 0
		params._lpState = lowSOS.map(() => state())
		params._hpState = highSOS.map(() => state())
	}
	let hornBuf = params._hornBuf, drumBuf = params._drumBuf
	let hornN = params._hornRingN, drumN = params._drumRingN
	let hornPtr = params._hornPtr, drumPtr = params._drumPtr
	let hornPhase = params._hornPhase, drumPhase = params._drumPhase
	let hornF = params._hornF, drumF = params._drumF
	let lpState = params._lpState, hpState = params._hpState

	// inertia glide: f += (target − f)·(1 − exp(−1/(τ·fs))) per sample (DAFx-02 §3.2 —
	// heavier drum spins up/down slower than the lighter horn).
	let hornCoef = 1 - exp(-1 / (hornInertia * fs))
	let drumCoef = 1 - exp(-1 / (drumInertia * fs))
	// depth and micSpread move the reads (depth the directivity gains too), so a new value is reached across this call
	// from the one the last call ended on, as the chorus's depth and phase are: a host ramps a smoothed value in short
	// calls, and this joins its steps into one line
	// where the last call ended, for this one to glide from: NaN before the first call (only finite values are kept,
	// in a Float64Array: kept as numbers on the params object, they boxed in V8 once two instances had run)
	let ended = params._glide ??= new Float64Array(2).fill(NaN)
	let depthFrom = ended[0] === ended[0] ? ended[0] : depth, depthGlide = depth - depthFrom
	let spreadFrom = ended[1] === ended[1] ? ended[1] : micSpread, spreadGlide = micSpread - spreadFrom

	for (let i = 0, l = left.length; i < l; i++) {
		let mono = (left[i] + right[i]) * 0.5

		let lo = band(lowSOS, lpState, mono), hi = band(highSOS, hpState, mono)

		hornF += (hornTarget - hornF) * hornCoef
		drumF += (drumTarget - drumF) * drumCoef
		hornPhase += PI2 * hornF / fs
		if (hornPhase >= PI2) hornPhase -= PI2; else if (hornPhase < 0) hornPhase += PI2
		drumPhase += PI2 * drumF / fs
		if (drumPhase >= PI2) drumPhase -= PI2; else if (drumPhase < 0) drumPhase += PI2

		hornBuf[hornPtr] = hi
		drumBuf[drumPtr] = lo

		// mic L @ angle 0, mic R @ angle micSpread — same rotor phase, shifted per mic.
		let dp = depthFrom + depthGlide * (i + 1) / l, sp = spreadFrom + spreadGlide * (i + 1) / l
		let hAngleL = hornPhase, dAngleL = drumPhase
		let hAngleR = hornPhase + sp, dAngleR = drumPhase + sp

		let hDelL = d0HornN * (1 + dp * cos(hAngleL))
		let dDelL = d0DrumN * (1 + dp * cos(dAngleL))
		let hDelR = d0HornN * (1 + dp * cos(hAngleR))
		let dDelR = d0DrumN * (1 + dp * cos(dAngleR))

		let hGainL = 1 + dp * hornM * cos(hAngleL)
		let dGainL = 1 + dp * drumM * cos(dAngleL)
		let hGainR = 1 + dp * hornM * cos(hAngleR)
		let dGainR = 1 + dp * drumM * cos(dAngleR)

		let wetL = hGainL * readDelay(hornBuf, hornN, hornPtr, hDelL) + dGainL * readDelay(drumBuf, drumN, drumPtr, dDelL)
		let wetR = hGainR * readDelay(hornBuf, hornN, hornPtr, hDelR) + dGainR * readDelay(drumBuf, drumN, drumPtr, dDelR)

		let m = mixes ? mixes[i] : mix
		left[i] = mono * (1 - m) + wetL * m
		right[i] = mono * (1 - m) + wetR * m

		hornPtr = (hornPtr + 1) % hornN
		drumPtr = (drumPtr + 1) % drumN
	}

	params._hornPtr = hornPtr; params._drumPtr = drumPtr
	params._hornPhase = hornPhase; params._drumPhase = drumPhase
	params._hornF = hornF; params._drumF = drumF
	// kept only when finite, so the next call never glides from a value that is not finite
	if (left.length && Number.isFinite(depth)) ended[0] = depth
	if (left.length && Number.isFinite(micSpread)) ended[1] = micSpread
}
