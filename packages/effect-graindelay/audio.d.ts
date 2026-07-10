// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
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
  tail: (ctx: { sampleRate: number, params: Live }) => number
  params: {
    /** 0.02..1.5 s (default 0.25) [restart] */
    "time": { type: "number", default: 0.25 }
    /** 0..0.1 s (default 0.02) [restart] */
    "spray": { type: "number", default: 0.02 }
    /** -24..24 st (default 0) [restart] */
    "pitch": { type: "number", default: 0 }
    /** 0..12 st (default 0) [restart] */
    "jitter": { type: "number", default: 0 }
    /** 0.01..0.3 s (default 0.08) [restart] */
    "grain": { type: "number", default: 0.08 }
    /** 0..0.9 (default 0.3) */
    "feedback": { type: "number", default: 0.3 }
    /** 0..1 (default 0.5) */
    "mix": { type: "number", default: 0.5 }
  }
}
