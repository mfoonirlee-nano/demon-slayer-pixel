let audioCtx: AudioContext | null = null;

export function ensureAudio() {
  if (!audioCtx) {
    if (!window.AudioContext) return;
    audioCtx = new window.AudioContext();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
}

export function playTone(freq: number, duration = 0.08, type: OscillatorType = "square", volume = 0.03) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(freq, now);
  osc.type = type;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}
