// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/plugin. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Transport = Readonly<{ playing: boolean, bpm: number, beat: number, barStart: number, timeSig: [number, number] }>
/** What a host hands a processor it builds: the contract's Context (CONTRACT.d.ts, 1.0) */
type Ctx = { readonly sampleRate: number, readonly maxBlockSize: number, readonly maxChannels: number, readonly layouts?: { readonly inputs: readonly (string | undefined)[], readonly outputs: readonly (string | undefined)[] }, readonly params: Live, readonly buffers: Readonly<Record<string, Float32Array[] | undefined>>, readonly events?: readonly { time: number, kind: 'on' | 'off', midi: number, velocity: number, id: number }[], emit(name: string, value: number): void, readonly transport: Transport }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'flanger' */
export interface FlangerOptions {
  /** 0.02..5 Hz (default 0.3) */
  "rate"?: Auto
  /** 0..1 (default 0.7) */
  "depth"?: Auto
  /** 0.0001..0.02 s (default 0.003) */
  "delay"?: Auto
  /** 0..0.9 (default 0.5) */
  "feedback"?: Auto
  /** -180..180 deg (default 90) */
  "phase"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const flanger: {
  (ctx: Ctx): Process
  channels: "any"
  tail: (at: { sampleRate: number, params: Live, buffers?: {}, transport: Transport }) => number
  params: {
    /** 0.02..5 Hz (default 0.3) */
    "rate": { type: "number", min: 0.02, max: 5, default: 0.3, unit: "Hz", curve: "log" }
    /** 0..1 (default 0.7) */
    "depth": { type: "number", min: 0, max: 1, default: 0.7, smoothing: 0.02 }
    /** 0.0001..0.02 s (default 0.003) */
    "delay": { type: "number", min: 0.0001, max: 0.02, default: 0.003, unit: "s", smoothing: 0.02 }
    /** 0..0.9 (default 0.5) */
    "feedback": { type: "number", min: 0, max: 0.9, default: 0.5 }
    /** -180..180 deg (default 90) */
    "phase": { type: "number", min: -180, max: 180, default: 90, unit: "deg", smoothing: 0.02 }
  }
}
