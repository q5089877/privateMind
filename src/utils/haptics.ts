export type HapticType = 'settle' | 'step' | 'release' | 'light' | 'unlatch' | 'docking' | 'heavyVent';

let audioCtx: AudioContext | null = null;

const playHapticThump = (freq = 85, duration = 0.04) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    /* Silent on blocked audio */
  }
};

export const triggerHaptic = (type: HapticType = 'settle') => {
  if (typeof window === 'undefined') return;

  if (type === 'unlatch' || type === 'light') playHapticThump(90, 0.035);
  else if (type === 'heavyVent') playHapticThump(75, 0.05);
  else if (type === 'docking' || type === 'settle') playHapticThump(55, 0.08);

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'unlatch':
          // 提升至 55ms 激勵脈衝，克服馬達慣性
          navigator.vibrate(55);
          break;
        case 'heavyVent':
          // 重擊雙脈衝
          navigator.vibrate([60, 30, 60]);
          break;
        case 'docking':
          // 深沉機械咬合重磅脈衝 (80ms 震, 40ms 停, 110ms 震)
          navigator.vibrate([80, 40, 110]);
          break;
        case 'settle':
          // 沉降落地感：70ms 充分震盪
          navigator.vibrate(70);
          break;
        case 'step':
          // 清晰雙發脈衝
          navigator.vibrate([50, 40, 50]);
          break;
        case 'release':
          navigator.vibrate(40);
          break;
        case 'light':
          navigator.vibrate(30);
          break;
      }
    }
  } catch (err) {
    console.debug('Haptic feedback not available or blocked:', err);
  }
};

