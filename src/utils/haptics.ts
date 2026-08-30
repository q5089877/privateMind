export type HapticType = 'settle' | 'step' | 'release' | 'light' | 'unlatch' | 'docking';

export const triggerHaptic = (type: HapticType = 'settle') => {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'unlatch':
          // 第一段脫扣感：極短輕巧單脈衝 (15ms)
          navigator.vibrate(15);
          break;
        case 'docking':
          // 第二段落底咬合感：深沉機械咬合脈衝 (30ms 震, 40ms 停, 20ms 震)
          navigator.vibrate([30, 40, 20]);
          break;
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

