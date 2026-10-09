export const fmtMs = (v) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
export const fmtNum = (v) => Math.round(v).toLocaleString();
export const fmtRatio = (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
export const fmtPct = (v) => `${Math.round(v * 100)}%`;
