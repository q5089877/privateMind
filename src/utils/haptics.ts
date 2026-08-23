// 觸覺震動工具函式：確保在使用者手勢點擊時觸發，並處理不同瀏覽器環境
export const triggerHaptic = (pattern: number | number[] = 25) => {
  if (typeof window === 'undefined') return;
  
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.debug('Haptic feedback not available or blocked:', err);
  }
};
