const DAY = 24 * 60 * 60 * 1000;

/** A time-based guard: insufficient history never earns a cross-time insight. */
export const hasInsightEligibility = <T extends { createdAt: number }>(moments: T[]) => {
  if (moments.length < 3) return false;
  const dates = new Set(moments.map(moment => new Date(moment.createdAt).toDateString()));
  const span = Math.max(...moments.map(moment => moment.createdAt)) - Math.min(...moments.map(moment => moment.createdAt));
  return dates.size >= 2 && span >= DAY;
};
