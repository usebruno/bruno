import * as monaco from 'monaco-editor';

let registeredThemeId = null;

/**
 * Registers a custom Monaco theme based on the active Bruno styled-components theme.
 * Maps the codemirror.tokens.* colors from the Bruno theme to Monaco token rules.
 *
 * @param {Object} brunoTheme - The styled-components theme object (props.theme)
 * @param {string} displayedTheme - 'dark' or 'light'
 * @returns {string} The registered Monaco theme name
 */
export const registerBrunoTheme = (brunoTheme, displayedTheme) => {
  const isDark = displayedTheme === 'dark';
  const base = isDark ? 'vs-dark' : 'vs';
  const tokens = brunoTheme?.codemirror?.tokens || {};
  const bg = brunoTheme?.codemirror?.bg || (isDark ? '#1a1a1a' : '#ffffff');
  const fg = brunoTheme?.text || (isDark ? '#d4d4d4' : '#1e1e1e');
  const gutterBg = brunoTheme?.codemirror?.gutter?.bg || bg;

  // Normalize bg — Monaco needs hex, not hsl() strings
  const editorBg = normalizeColor(bg);
  const editorFg = normalizeColor(fg);
  const gutterBgNorm = normalizeColor(gutterBg);

  const themeName = `bruno-${displayedTheme}`;

  monaco.editor.defineTheme(themeName, {
    base,
    inherit: true,
    rules: [
      { token: 'comment', foreground: normalizeHex(tokens.comment) },
      { token: 'comment.js', foreground: normalizeHex(tokens.comment) },
      { token: 'comment.block', foreground: normalizeHex(tokens.comment) },
      { token: 'string', foreground: normalizeHex(tokens.string) },
      { token: 'string.js', foreground: normalizeHex(tokens.string) },
      { token: 'number', foreground: normalizeHex(tokens.number) },
      { token: 'number.js', foreground: normalizeHex(tokens.number) },
      { token: 'keyword', foreground: normalizeHex(tokens.keyword) },
      { token: 'keyword.js', foreground: normalizeHex(tokens.keyword) },
      { token: 'identifier', foreground: normalizeHex(tokens.variable) },
      { token: 'identifier.js', foreground: normalizeHex(tokens.variable) },
      { token: 'type.identifier', foreground: normalizeHex(tokens.definition) },
      { token: 'type.identifier.js', foreground: normalizeHex(tokens.definition) },
      { token: 'delimiter', foreground: normalizeHex(tokens.operator) },
      { token: 'delimiter.js', foreground: normalizeHex(tokens.operator) },
      { token: 'delimiter.bracket', foreground: normalizeHex(tokens.tagBracket) },
      { token: 'tag', foreground: normalizeHex(tokens.tag) },
      { token: 'attribute.name', foreground: normalizeHex(tokens.property) },
      { token: 'attribute.value', foreground: normalizeHex(tokens.string) },
      // JSON specific
      { token: 'string.key.json', foreground: normalizeHex(tokens.property) },
      { token: 'string.value.json', foreground: normalizeHex(tokens.string) },
      { token: 'number.json', foreground: normalizeHex(tokens.number) },
      { token: 'keyword.json', foreground: normalizeHex(tokens.atom) }
    ],
    colors: {
      'editor.background': editorBg,
      'editor.foreground': editorFg,
      'editorGutter.background': gutterBgNorm,
      'editorLineNumber.foreground': isDark ? '#858585' : '#999999',
      // Hover widget (JSDoc tooltips)
      'editorHoverWidget.background': normalizeColor(brunoTheme?.dropdown?.bg) || editorBg,
      'editorHoverWidget.border': normalizeColor(brunoTheme?.dropdown?.border) || (isDark ? '#454545' : '#c8c8c8'),
      'editorHoverWidget.foreground': editorFg,
      // Suggest widget (autocomplete)
      'editorSuggestWidget.background': normalizeColor(brunoTheme?.dropdown?.bg) || editorBg,
      'editorSuggestWidget.border': normalizeColor(brunoTheme?.dropdown?.border) || (isDark ? '#454545' : '#c8c8c8'),
      'editorSuggestWidget.foreground': editorFg,
      'editorSuggestWidget.selectedBackground': normalizeColor(brunoTheme?.dropdown?.hoverBg) || (isDark ? '#04395e' : '#d6ebff'),
      'editorSuggestWidget.highlightForeground': normalizeColor(brunoTheme?.textLink) || (isDark ? '#569cd6' : '#0078d4'),
      // Widget (shared - parameter hints, find widget, etc.)
      'editorWidget.background': normalizeColor(brunoTheme?.dropdown?.bg) || editorBg,
      'editorWidget.border': normalizeColor(brunoTheme?.dropdown?.border) || (isDark ? '#454545' : '#c8c8c8'),
      'editorWidget.foreground': editorFg
    }
  });

  registeredThemeId = themeName;
  return themeName;
};

/**
 * Gets the currently registered theme name, or a fallback.
 */
export const getCurrentThemeName = (displayedTheme) => {
  return registeredThemeId || (displayedTheme === 'dark' ? 'vs-dark' : 'vs');
};

/**
 * Strip '#' prefix and return 6-char hex for Monaco token rules.
 * Handles undefined/null gracefully.
 */
function normalizeHex(color) {
  if (!color) return undefined;
  const s = String(color).trim();
  if (s.startsWith('#')) return s.slice(1);
  return s;
}

// Memoize color conversions to avoid repeated computation
const colorCache = new Map();

/**
 * Normalize a color to Monaco's #rrggbb format for theme colors.
 * Handles hex and hsl() strings. Results are memoized.
 */
function normalizeColor(color) {
  if (!color) return '#1e1e1e';
  const s = String(color).trim();

  const cached = colorCache.get(s);
  if (cached) return cached;

  let result;
  if (s.startsWith('#')) {
    result = s.length <= 7 ? s : s.slice(0, 7);
  } else if (s.startsWith('hsl')) {
    result = hslStringToHex(s);
  } else {
    result = s;
  }

  colorCache.set(s, result);
  return result;
}

/**
 * Convert an hsl()/hsla() string to #rrggbb hex using pure math.
 * Avoids DOM manipulation and layout thrashing.
 */
function hslStringToHex(hslString) {
  const match = hslString.match(/hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/);
  if (!match) return '#1e1e1e';

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
