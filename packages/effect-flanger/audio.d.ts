// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
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
  tail: (at: { sampleRate: number, params: Live, buffers: {} }) => number
  params: {
    /** 0.02..5 Hz (default 0.3) */
    "rate": { type: "number", default: 0.3 }
    /** 0..1 (default 0.7) */
    "depth": { type: "number", default: 0.7 }
    /** 0.0001..0.02 s (default 0.003) */
    "delay": { type: "number", default: 0.003 }
    /** 0..0.9 (default 0.5) */
    "feedback": { type: "number", default: 0.5 }
    /** -180..180 deg (default 90) */
    "phase": { type: "number", default: 90 }
  }
}
