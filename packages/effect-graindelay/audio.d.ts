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

/** Chainable-host options for 'graindelay' */
export interface GraindelayOptions {
  /** 0.02..1.5 s (default 0.25) */
  "time"?: Auto
  /** 0..0.1 s (default 0.02) */
  "spray"?: Auto
  /** -24..24 st (default 0) */
  "pitch"?: Auto
  /** 0..12 st (default 0) */
  "jitter"?: Auto
  /** 0.01..0.3 s (default 0.08) */
  "grain"?: Auto
  /** 0..0.9 (default 0.3) */
  "feedback"?: Auto
  /** 0..1 (default 0.5) */
  "mix"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const graindelay: {
  (ctx: Ctx): Process
  channels: "any"
  tail: (at: { sampleRate: number, params: Live, buffers?: {}, transport: Transport }) => number
  params: {
    /** 0.02..1.5 s (default 0.25) */
    "time": { type: "number", min: 0.02, max: 1.5, default: 0.25, unit: "s" }
    /** 0..0.1 s (default 0.02) */
    "spray": { type: "number", min: 0, max: 0.1, default: 0.02, unit: "s" }
    /** -24..24 st (default 0) */
    "pitch": { type: "number", min: -24, max: 24, default: 0, unit: "st" }
    /** 0..12 st (default 0) */
    "jitter": { type: "number", min: 0, max: 12, default: 0, unit: "st" }
    /** 0.01..0.3 s (default 0.08) */
    "grain": { type: "number", min: 0.01, max: 0.3, default: 0.08, unit: "s" }
    /** 0..0.9 (default 0.3) */
    "feedback": { type: "number", min: 0, max: 0.9, default: 0.3 }
    /** 0..1 (default 0.5) */
    "mix": { type: "number", min: 0, max: 1, default: 0.5, smoothing: 0.02 }
  }
}
