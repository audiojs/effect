// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'rotary' */
export interface RotaryOptions {
  /** 0..10 Hz (default 0.8) */
  "hornSpeed"?: Auto
  /** 0..10 Hz (default 0.7) */
  "drumSpeed"?: Auto
  /** 200..3000 Hz (default 800) */
  "crossover"?: Auto
  /** 0..1 (default 1) */
  "depth"?: Auto
  /** 0.05..3 s (default 0.6) */
  "hornInertia"?: Auto
  /** 0.05..6 s (default 2.5) */
  "drumInertia"?: Auto
  /** 0..3.14159 rad (default 1.5708) */
  "micSpread"?: Auto
  /** 0..1 (default 1) */
  "mix"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const rotary: {
  (ctx: Ctx): Process
  channels: {"inputs":1,"outputs":2}
  tail: 0.05
  params: {
    /** 0..10 Hz (default 0.8) */
    "hornSpeed": { type: "number", default: 0.8 }
    /** 0..10 Hz (default 0.7) */
    "drumSpeed": { type: "number", default: 0.7 }
    /** 200..3000 Hz (default 800) */
    "crossover": { type: "number", default: 800 }
    /** 0..1 (default 1) */
    "depth": { type: "number", default: 1 }
    /** 0.05..3 s (default 0.6) */
    "hornInertia": { type: "number", default: 0.6 }
    /** 0.05..6 s (default 2.5) */
    "drumInertia": { type: "number", default: 2.5 }
    /** 0..3.14159 rad (default 1.5708) */
    "micSpread": { type: "number", default: 1.5708 }
    /** 0..1 (default 1) */
    "mix": { type: "number", default: 1 }
  }
}
