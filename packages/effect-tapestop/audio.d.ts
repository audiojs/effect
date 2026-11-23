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

/** Chainable-host options for 'tapestop' */
export interface TapestopOptions {
  /** 0..60 s (default 0) */
  "at"?: Auto
  /** 0.05..10 s (default 1) */
  "time"?: Auto
  /** 0.25..4 (default 1) */
  "curve"?: Auto
  /** default "stop" */
  "direction"?: "stop" | "start"
  /** 0..1 (default 0) */
  "flutter"?: Auto
  duration?: number | string
}

export declare const tapestop: {
  (ctx: Ctx): Process
  channels: "any"
  latency: (at: { sampleRate: number, params: Live, buffers?: {}, transport: Transport }) => number
  tail: (at: { sampleRate: number, params: Live, buffers?: {}, transport: Transport }) => number
  params: {
    /** 0..60 s (default 0) */
    "at": { type: "number", min: 0, max: 60, default: 0, unit: "s" }
    /** 0.05..10 s (default 1) [restart] */
    "time": { type: "number", min: 0.05, max: 10, default: 1, unit: "s", restart: true }
    /** 0.25..4 (default 1) [restart] */
    "curve": { type: "number", min: 0.25, max: 4, default: 1, restart: true }
    /** default "stop" [restart] */
    "direction": { type: "enum", values: ["stop","start"], default: "stop", restart: true }
    /** 0..1 (default 0) [restart] */
    "flutter": { type: "number", min: 0, max: 1, default: 0, restart: true }
  }
}
