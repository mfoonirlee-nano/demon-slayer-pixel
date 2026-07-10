/* eslint-disable no-magic-numbers -- RIFF/WAV PCM fields use fixed byte offsets and widths. */

import { Buffer } from "node:buffer";

const CHANNEL_COUNT = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

export function encodeMonoPcm16Wav(pcm, sampleRate) {
  const dataBytes = pcm.length * BYTES_PER_SAMPLE;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(CHANNEL_COUNT, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * CHANNEL_COUNT * BYTES_PER_SAMPLE, 28);
  wav.writeUInt16LE(CHANNEL_COUNT * BYTES_PER_SAMPLE, 32);
  wav.writeUInt16LE(BITS_PER_SAMPLE, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataBytes, 40);

  for (let index = 0; index < pcm.length; index += 1) {
    wav.writeInt16LE(pcm[index], 44 + index * BYTES_PER_SAMPLE);
  }
  return wav;
}

export function measureAndValidatePcm(name, pcm, pcmMax, peakLimit) {
  if (pcm.length === 0) throw new Error(`${name}: no samples generated`);
  if (pcm[0] !== 0) throw new Error(`${name}: first sample is not zero`);
  if (pcm[pcm.length - 1] !== 0) throw new Error(`${name}: final sample is not zero`);
  let peak = 0;
  let sumSquares = 0;
  for (const sample of pcm) {
    peak = Math.max(peak, Math.abs(sample));
    const ratio = sample / pcmMax;
    sumSquares += ratio * ratio;
  }
  if (peak === 0) throw new Error(`${name}: generated silent PCM`);
  if (peak > peakLimit) throw new Error(`${name}: peak ${peak} exceeds ${peakLimit}`);
  const peakRatio = peak / pcmMax;
  const rmsRatio = Math.sqrt(sumSquares / pcm.length);
  if (!Number.isFinite(peakRatio) || !Number.isFinite(rmsRatio)) {
    throw new Error(`${name}: generated non-finite PCM metrics`);
  }
  return {
    peakRatio,
    rmsRatio,
    peakDb: ratioToDb(peakRatio),
    rmsDb: ratioToDb(rmsRatio),
  };
}

function ratioToDb(ratio) {
  return 20 * Math.log10(ratio);
}
