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

let { cos, floor, exp, PI } = Math
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

export default function rotary (left, right, params) {
	let mix = params.mix == null ? 1 : params.mix
	if (mix <= 0) return [left, right] // exact bypass — zero latency, nothing to compensate

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
	// this in the realtime path: no allocation there); redesigned only when the split
	// frequency or sample rate actually moves. LR4 section count is fixed for a single
	// split, so the persistent filter *state* (below) stays valid across a redesign.
	if (!params._sos || params._sosFreq !== xoFreq || params._sosFs !== fs) {
		params._sos = crossoverFn([xoFreq], 4, fs) // [low, high] = [drum band, horn band]
		params._sosFreq = xoFreq
		params._sosFs = fs
	}
	let [lowSOS, highSOS] = params._sos

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

	for (let i = 0, l = left.length; i < l; i++) {
		let mono = (left[i] + right[i]) * 0.5

		let lo = mono, hi = mono
		for (let s = 0; s < lowSOS.length; s++) lo = step(lowSOS[s], lpState[s], lo)
		for (let s = 0; s < highSOS.length; s++) hi = step(highSOS[s], hpState[s], hi)

		hornF += (hornTarget - hornF) * hornCoef
		drumF += (drumTarget - drumF) * drumCoef
		hornPhase += PI2 * hornF / fs
		if (hornPhase >= PI2) hornPhase -= PI2; else if (hornPhase < 0) hornPhase += PI2
		drumPhase += PI2 * drumF / fs
		if (drumPhase >= PI2) drumPhase -= PI2; else if (drumPhase < 0) drumPhase += PI2

		hornBuf[hornPtr] = hi
		drumBuf[drumPtr] = lo

		// mic L @ angle 0, mic R @ angle micSpread — same rotor phase, shifted per mic.
		let hAngleL = hornPhase, dAngleL = drumPhase
		let hAngleR = hornPhase + micSpread, dAngleR = drumPhase + micSpread

		let hDelL = d0HornN * (1 + depth * cos(hAngleL))
		let dDelL = d0DrumN * (1 + depth * cos(dAngleL))
		let hDelR = d0HornN * (1 + depth * cos(hAngleR))
		let dDelR = d0DrumN * (1 + depth * cos(dAngleR))

		let hGainL = 1 + depth * hornM * cos(hAngleL)
		let dGainL = 1 + depth * drumM * cos(dAngleL)
		let hGainR = 1 + depth * hornM * cos(hAngleR)
		let dGainR = 1 + depth * drumM * cos(dAngleR)

		let wetL = hGainL * readDelay(hornBuf, hornN, hornPtr, hDelL) + dGainL * readDelay(drumBuf, drumN, drumPtr, dDelL)
		let wetR = hGainR * readDelay(hornBuf, hornN, hornPtr, hDelR) + dGainR * readDelay(drumBuf, drumN, drumPtr, dDelR)

		left[i] = mono * (1 - mix) + wetL * mix
		right[i] = mono * (1 - mix) + wetR * mix

		hornPtr = (hornPtr + 1) % hornN
		drumPtr = (drumPtr + 1) % drumN
	}

	params._hornPtr = hornPtr; params._drumPtr = drumPtr
	params._hornPhase = hornPhase; params._drumPhase = drumPhase
	params._hornF = hornF; params._drumF = drumF

	return [left, right]
}
