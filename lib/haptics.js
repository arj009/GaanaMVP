export const triggerHaptic = (pattern = 50) => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    // pattern can be a single number (e.g. 50ms) or an array (e.g. [50, 100, 50])
    navigator.vibrate(pattern);
  }
};
