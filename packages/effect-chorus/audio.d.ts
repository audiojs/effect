// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'chorus' */
export interface ChorusOptions {
  /** 0.05..10 Hz (default 1.5) */
  "rate"?: Auto
  /** 0..1 (default 0.5) */
  "depth"?: Auto
  /** 2..50 ms (default 20) */
  "delay"?: Auto
  /** 1..8 (default 3) */
  "voices"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const chorus: {
  (ctx: Ctx): Process
  channels: "any"
  tail: 0.1
  params: {
    /** 0.05..10 Hz (default 1.5) */
    "rate": { type: "number", default: 1.5 }
    /** 0..1 (default 0.5) */
    "depth": { type: "number", default: 0.5 }
    /** 2..50 ms (default 20) [restart] */
    "delay": { type: "number", default: 20 }
    /** 1..8 (default 3) [restart] */
    "voices": { type: "number", default: 3 }
  }
}
