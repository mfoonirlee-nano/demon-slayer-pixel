const AUDIO_CONFIG = {
  defaultToneDuration: 0.08,
  defaultToneVolume: 0.03,
  fadeOutVolume: 0.0001,
};

type AudioWindow = Window & typeof globalThis & {
  AudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;

function getAudioContextConstructor() {
  return (window as AudioWindow).AudioContext;
}

export function ensureAudio() {
  if (!audioCtx) {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;
    audioCtx = new AudioContextConstructor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
}

export function playTone(
  freq: number,
  duration = AUDIO_CONFIG.defaultToneDuration,
  type: OscillatorType = "square",
  volume = AUDIO_CONFIG.defaultToneVolume,
) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(freq, now);
  osc.type = type;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(AUDIO_CONFIG.fadeOutVolume, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}
