// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'phaser' */
export interface PhaserOptions {
  /** 0.02..10 Hz (default 0.5) */
  "rate"?: Auto
  /** 0..1 (default 0.7) */
  "depth"?: Auto
  /** 2..12 (default 4) */
  "stages"?: Auto
  /** 0..0.9 (default 0.5) */
  "feedback"?: Auto
  /** 100..5000 Hz (default 1000) */
  "fc"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const phaser: {
  (ctx: Ctx): Process
  channels: "any"
  params: {
    /** 0.02..10 Hz (default 0.5) */
    "rate": { type: "number", default: 0.5 }
    /** 0..1 (default 0.7) */
    "depth": { type: "number", default: 0.7 }
    /** 2..12 (default 4) [restart] */
    "stages": { type: "number", default: 4 }
    /** 0..0.9 (default 0.5) */
    "feedback": { type: "number", default: 0.5 }
    /** 100..5000 Hz (default 1000) */
    "fc": { type: "number", default: 1000 }
  }
}
