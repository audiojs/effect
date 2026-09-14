/**
 * Mixer — sums multiple buffers with gains.
 * Takes an array of { buffer, gain } objects, returns a new buffer.
 */

export default function mixer (inputs, params = {}) {
	let len = inputs.length ? inputs[0].buffer.length : 0
	for (let input of inputs)
		if (input.buffer.length !== len) throw new RangeError('buffer lengths must match')
	let out = new Float64Array(len)

	for (let input of inputs) {
		let buf = input.buffer
		let g = input.gain ?? 1
		for (let i = 0; i < len; i++) out[i] += buf[i] * g
	}

	return out
}
