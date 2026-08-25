export type HapticType = 'settle' | 'step' | 'release' | 'light';

export const triggerHaptic = (type: HapticType = 'settle') => {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'settle':
          // 沉降落地感：單次短脈衝 (15ms)
          navigator.vibrate(15);
          break;
        case 'step':
          // 行動微步驟感：輕微雙發脈衝
          navigator.vibrate([10, 30, 10]);
          break;
        case 'release':
          // 釋放/清除感：單次超短微脈衝 (10ms)
          navigator.vibrate(10);
          break;
        case 'light':
          navigator.vibrate(8);
          break;
      }
    }
  } catch (err) {
    console.debug('Haptic feedback not available or blocked:', err);
  }
};

