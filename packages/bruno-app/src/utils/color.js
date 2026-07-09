/**
 * Parse hex颜色字符串为 RGB 对象
 * @param {string} hex - e.g. '#d20f39' or 'd20f39'
 * @returns {{r: number, g: number, b: number}|null}
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
};

/**
 * 计算 WCAG 2.0 相对亮度 (relative luminance)
 * 公式: L = 0.2126*R + 0.7152*G + 0.0722*B
 * 输入的 R/G/B 需要先做 sRGB → linear 转换
 * @param {string} hex - hex 颜色
 * @returns {number} 0.0 ~ 1.0
 */
export const getRelativeLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const linearize = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * linearize(rgb.r)
    + 0.7152 * linearize(rgb.g)
    + 0.0722 * linearize(rgb.b)
  );
};

/**
 * hex 颜色转 rgba 字符串
 * @param {string} hex - hex 颜色
 * @param {number} alpha - 透明度 0.0 ~ 1.0
 * @returns {string} 'rgba(r, g, b, alpha)'
 */
export const hexToRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

/**
 * 根据背景色计算 Send 按钮的文字颜色（自适应对比度）
 * 白字对比度 ≥ 2.8 → 白字, 否则深色字
 * @param {string} hex - 环境色 hex
 * @returns {string} '#ffffff' | '#1e1e2e'
 */
export const getSendButtonTextColor = (hex) => {
  const L = getRelativeLuminance(hex);
  const whiteCR = 1.05 / (L + 0.05);
  return whiteCR >= 2.8 ? '#ffffff' : '#1e1e2e';
};
