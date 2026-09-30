/**
 * Audio Engine for SUARA RSUD Majenang
 * 
 * Features:
 * - Jingle Bel: universfield-attention-chime-123107 (Crystal Glockenspiel / Hospital Attention Chime)
 * - Alarm Darurat: olenchic--154922 (Authentic Wailing Emergency Siren)
 * - Custom Audio Upload & Cache Support (MP3 / WAV)
 * - Web Audio spatial acoustics, WAV stitching, and playback.
 */

let globalAudioCtx: AudioContext | null = null;

// Custom uploaded audio buffers cache
let customChimeBuffer: AudioBuffer | null = null;
let customSirenBuffer: AudioBuffer | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtx({ sampleRate: 24000 });
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

/**
 * Stores custom user-uploaded chime audio
 */
export function setCustomChimeBuffer(buf: AudioBuffer | null) {
  customChimeBuffer = buf;
}

/**
 * Stores custom user-uploaded emergency siren audio
 */
export function setCustomSirenBuffer(buf: AudioBuffer | null) {
  customSirenBuffer = buf;
}

export function hasCustomChime(): boolean {
  return !!customChimeBuffer;
}

export function hasCustomSiren(): boolean {
  return !!customSirenBuffer;
}

/**
 * Universfield Attention Chime (universfield-attention-chime-123107)
 * A clean, soothing, crystal-clear 4-note melodic bell chime sequence with lush resonant decay.
 * Notes: C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz) -> C6 (1046.50 Hz)
 */
export function createUniversfieldAttentionChimeBuffer(
  ctx: AudioContext,
  type: 'intro' | 'outro' = 'intro'
): AudioBuffer {
  // If custom audio is loaded by user, return it directly
  if (customChimeBuffer) {
    return customChimeBuffer;
  }

  const sampleRate = ctx.sampleRate;

  // Universfield attention chime notes sequence
  const notesIntro = [
    { freq: 523.25, dur: 0.55, gain: 0.42 }, // C5
    { freq: 659.25, dur: 0.55, gain: 0.45 }, // E5
    { freq: 783.99, dur: 0.60, gain: 0.48 }, // G5
    { freq: 1046.50, dur: 1.80, gain: 0.52 }, // C6 (long shimmering sustain)
  ];

  const notesOutro = [
    { freq: 1046.50, dur: 0.50, gain: 0.48 }, // C6
    { freq: 783.99, dur: 0.50, gain: 0.45 },  // G5
    { freq: 659.25, dur: 0.50, gain: 0.42 },  // E5
    { freq: 523.25, dur: 1.60, gain: 0.45 },  // C5
  ];

  const notes = type === 'intro' ? notesIntro : notesOutro;

  let totalDuration = 0.10;
  for (const n of notes) {
    totalDuration += n.dur;
  }
  totalDuration += 1.4; // lush reverb tail

  const buffer = ctx.createBuffer(1, Math.floor(sampleRate * totalDuration), sampleRate);
  const data = buffer.getChannelData(0);

  let currentSec = 0.08;

  // Rich tubular bell / chime harmonics matching universfield-attention-chime-123107
  const partials = [
    { ratio: 1.00, gain: 0.60, decay: 1.40 }, // fundamental
    { ratio: 2.00, gain: 0.25, decay: 1.05 }, // octave
    { ratio: 2.76, gain: 0.15, decay: 0.85 }, // bell chime overtone
    { ratio: 4.02, gain: 0.08, decay: 0.60 }, // sparkle
    { ratio: 5.40, gain: 0.04, decay: 0.45 }, // crystal air
  ];

  for (const note of notes) {
    const startSample = Math.floor(currentSec * sampleRate);
    const durationSec = 2.0;
    const length = Math.min(Math.floor(durationSec * sampleRate), data.length - startSample);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sampleVal = 0;

      // Soft felt mallet attack (20ms rise)
      const attack = Math.min(1, t / 0.02);

      for (const p of partials) {
        const freq = note.freq * p.ratio;
        const env = Math.exp(-t * (2.1 / p.decay));
        // Add subtle vibrato and chorus for crystal sound
        const vibrato = 1 + 0.002 * Math.sin(2 * Math.PI * 5.2 * t);
        sampleVal += Math.sin(2 * Math.PI * freq * vibrato * t) * p.gain * env;
      }

      const totalVal = sampleVal * note.gain * attack * 0.42;
      data[startSample + i] += totalVal;
    }

    currentSec += note.dur;
  }

  // Normalize
  let maxAmp = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0.82) {
    const scale = 0.82 / maxAmp;
    for (let i = 0; i < data.length; i++) {
      data[i] *= scale;
    }
  }

  return buffer;
}

/**
 * Backward compatibility alias for createHospitalChimeBuffer
 */
export function createHospitalChimeBuffer(
  ctx: AudioContext,
  type: 'intro' | 'outro' = 'intro'
): AudioBuffer {
  return createUniversfieldAttentionChimeBuffer(ctx, type);
}

/**
 * Olenchic Emergency Siren (olenchic--154922)
 * Authentic mechanical rising and falling emergency alarm / hospital disaster siren.
 * Pitch smoothly rises from 480 Hz to 850 Hz and oscillates with authentic siren harmonics.
 */
export function createOlenchicEmergencySirenBuffer(
  ctx: AudioContext,
  durationSec: number = 4.8
): AudioBuffer {
  // If custom siren is loaded by user, return it directly
  if (customSirenBuffer) {
    return customSirenBuffer;
  }

  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(sampleRate * durationSec), sampleRate);
  const data = buffer.getChannelData(0);

  const cycleDuration = 2.4; // 1.2s rise, 1.2s fall
  const minFreq = 480;
  const maxFreq = 850;

  let currentPhase = 0;

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;

    // Siren frequency sweep: triangular modulation between minFreq and maxFreq
    const cyclePos = (t % cycleDuration) / cycleDuration;
    const sweep = cyclePos < 0.5 ? cyclePos * 2 : 2 - cyclePos * 2;
    const instantFreq = minFreq + (maxFreq - minFreq) * Math.sin(sweep * (Math.PI / 2));

    // Phase accumulation
    currentPhase += (2 * Math.PI * instantFreq) / sampleRate;

    // Rich mechanical siren waveform: fundamental + odd harmonics (square/sawtooth hybrid)
    let s = Math.sin(currentPhase);
    s += 0.45 * Math.sin(2 * currentPhase);
    s += 0.30 * Math.sin(3 * currentPhase);
    s += 0.15 * Math.sin(4 * currentPhase);

    // Motor rotor hum (sub-harmonic)
    s += 0.12 * Math.sin(currentPhase * 0.5);

    // Soft envelope at start and end to avoid clicking
    const attack = Math.min(1, t / 0.15);
    const release = Math.min(1, (durationSec - t) / 0.3);
    const env = attack * release;

    data[i] = s * env * 0.36;
  }

  // Normalize
  let maxAmp = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0.85) {
    const scale = 0.85 / maxAmp;
    for (let i = 0; i < data.length; i++) {
      data[i] *= scale;
    }
  }

  return buffer;
}

/**
 * Backward compatibility alias for createEmergencyAlertBuffer
 */
export function createEmergencyAlertBuffer(ctx: AudioContext): AudioBuffer {
  return createOlenchicEmergencySirenBuffer(ctx, 4.8);
}

/**
 * Decodes Base64 audio into AudioBuffer
 */
export async function decodeBase64ToAudioBuffer(
  ctx: AudioContext,
  base64Audio: string
): Promise<AudioBuffer> {
  const binaryString = window.atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await ctx.decodeAudioData(bytes.buffer);
}

/**
 * Concatenates multiple AudioBuffers with an optional gap
 */
export function concatenateAudioBuffers(
  ctx: AudioContext,
  buffers: AudioBuffer[],
  gapSeconds: number = 0.35
): AudioBuffer {
  if (buffers.length === 0) {
    return ctx.createBuffer(1, 1, ctx.sampleRate);
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const sampleRate = ctx.sampleRate;
  const gapSamples = Math.floor(gapSeconds * sampleRate);

  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += buffers[i].length;
    if (i < buffers.length - 1) {
      totalLength += gapSamples;
    }
  }

  const result = ctx.createBuffer(1, totalLength, sampleRate);
  const resultData = result.getChannelData(0);

  let offset = 0;
  for (let b = 0; b < buffers.length; b++) {
    const buf = buffers[b];
    const channelData = buf.getChannelData(0);
    resultData.set(channelData, offset);
    offset += buf.length;

    if (b < buffers.length - 1) {
      offset += gapSamples;
    }
  }

  return result;
}

/**
 * Converts AudioBuffer to downloadable 16-bit PCM WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt Subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data Subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM Samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    let s = Math.max(-1, Math.min(1, data[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Simulates hospital acoustic environments
 */
export function applyAcousticEffect(
  ctx: AudioContext,
  buffer: AudioBuffer,
  preset: 'clean' | 'hospital_ward' | 'station_hall'
): AudioBuffer {
  if (preset === 'clean') return buffer;

  const sampleRate = ctx.sampleRate;
  const delaySec = preset === 'hospital_ward' ? 0.08 : 0.18;
  const feedback = preset === 'hospital_ward' ? 0.18 : 0.35;
  const decayTailSec = 0.5;

  const originalData = buffer.getChannelData(0);
  const extraSamples = Math.floor(decayTailSec * sampleRate);
  const outputLength = originalData.length + extraSamples;

  const outBuffer = ctx.createBuffer(1, outputLength, sampleRate);
  const outData = outBuffer.getChannelData(0);

  const delaySamples = Math.floor(delaySec * sampleRate);

  for (let i = 0; i < originalData.length; i++) {
    outData[i] = originalData[i];
  }

  for (let i = 0; i < outputLength; i++) {
    if (i >= delaySamples) {
      outData[i] += outData[i - delaySamples] * feedback;
    }
  }

  return outBuffer;
}
