let audioCtx: AudioContext | null = null;

/** Yeni ihbar için kısa, hafif bildirim sesi (harici dosya gerekmez). */
export function playReportAlertSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, t);
    osc.frequency.exponentialRampToValueAtTime(988, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.22);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.34);
  } catch {
    /* Tarayıcı ses politikas veya AudioContext desteklemiyorsa sessiz kal */
  }
}
