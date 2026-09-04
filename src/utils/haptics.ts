export type HapticType = 'settle' | 'step' | 'release' | 'light' | 'unlatch' | 'docking' | 'heavyVent' | 'heartbeat';

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

/** Plays a dual-tone "lub-dub" calm heartbeat audio tone */
export const playHeartbeatAudio = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const now = audioCtx.currentTime;

    // Lub (第一心音 S1: 低沉深厚 60Hz -> 30Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.08);
    gain1.gain.setValueAtTime(0.32, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Dub (第二心音 S2: 稍高沉 75Hz -> 35Hz，延遲 140ms)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(75, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.20);
    gain2.gain.setValueAtTime(0.22, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.20);
  } catch {
    /* Silent on blocked audio */
  }
};

export const cancelHaptics = () => {
  if (typeof window === 'undefined') return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
    }
  } catch {
    /* ignore */
  }
};

export const triggerHaptic = (type: HapticType = 'settle') => {
  if (typeof window === 'undefined') return;

  if (type === 'heartbeat') {
    playHeartbeatAudio();
  } else if (type === 'unlatch' || type === 'light') {
    playHapticThump(90, 0.035);
  } else if (type === 'heavyVent') {
    playHapticThump(75, 0.05);
  } else if (type === 'docking' || type === 'settle') {
    playHapticThump(55, 0.08);
  }

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'heartbeat':
          // 平靜生理心跳 (lub-dub: 50ms 震, 90ms 停, 40ms 震)
          navigator.vibrate([50, 90, 40]);
          break;
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

