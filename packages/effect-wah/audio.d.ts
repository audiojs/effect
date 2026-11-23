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

/** Chainable-host options for 'wah' */
export interface WahOptions {
  /** 0.05..10 Hz (default 1.5) */
  "rate"?: Auto
  /** 0..3 oct (default 0.8) */
  "depth"?: Auto
  /** 200..3000 Hz (default 1000) */
  "fc"?: Auto
  /** 0.5..20 (default 5) */
  "Q"?: Auto
  /** default "auto" */
  "mode"?: "auto" | "manual"
  /** -180..180 deg (default 0) */
  "phase"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const wah: {
  (ctx: Ctx): Process
  channels: "any"
  tail: (at: { sampleRate: number, params: Live, buffers?: {}, transport: Transport }) => number
  params: {
    /** 0.05..10 Hz (default 1.5) */
    "rate": { type: "number", min: 0.05, max: 10, default: 1.5, unit: "Hz", curve: "log" }
    /** 0..3 oct (default 0.8) */
    "depth": { type: "number", min: 0, max: 3, default: 0.8, unit: "oct" }
    /** 200..3000 Hz (default 1000) */
    "fc": { type: "number", min: 200, max: 3000, default: 1000, unit: "Hz", curve: "log", smoothing: 0.02 }
    /** 0.5..20 (default 5) */
    "Q": { type: "number", min: 0.5, max: 20, default: 5 }
    /** default "auto" */
    "mode": { type: "enum", values: ["auto","manual"], default: "auto" }
    /** -180..180 deg (default 0) */
    "phase": { type: "number", min: -180, max: 180, default: 0, unit: "deg", smoothing: 0.02 }
  }
}
