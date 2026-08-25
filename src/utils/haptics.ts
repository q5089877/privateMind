export type HapticType = 'settle' | 'step' | 'release' | 'light';

export const triggerHaptic = (type: HapticType = 'settle') => {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'settle':
          // 沉降落地感：單次充足脈衝 (50ms 克服馬達靜摩擦力)
          navigator.vibrate(50);
          break;
        case 'step':
          // 行動微步驟感：清晰雙發脈衝
          navigator.vibrate([35, 40, 35]);
          break;
        case 'release':
          // 釋放感：單次俐落脈衝 (30ms)
          navigator.vibrate(30);
          break;
        case 'light':
          navigator.vibrate(20);
          break;
      }
    }
  } catch (err) {
    console.debug('Haptic feedback not available or blocked:', err);
  }
};

