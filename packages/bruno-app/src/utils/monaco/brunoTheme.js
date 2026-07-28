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

  // hexOr avoids the `normalizeColor(x) || fallback` trap — normalizeColor
  // returns '#1e1e1e' for missing input, which is truthy, so the fallback
  // would never fire.
  const hexOr = (source, fallback) => (source ? normalizeColor(source) : fallback);

  const widgetBg = hexOr(brunoTheme?.dropdown?.bg, editorBg);
  const widgetBorder = hexOr(brunoTheme?.dropdown?.border, isDark ? '#454545' : '#c8c8c8');
  const widgetFg = hexOr(brunoTheme?.dropdown?.color, editorFg);
  const widgetSelectedBg = hexOr(brunoTheme?.dropdown?.hoverBg, isDark ? '#04395e' : '#d6ebff');
  const widgetHighlightFg = hexOr(brunoTheme?.textLink, isDark ? '#569cd6' : '#0078d4');
  const bracketFg = hexOr(tokens.tagBracket, editorFg);
  const bracketErrorFg = hexOr(brunoTheme?.codemirror?.variable?.invalid, isDark ? '#f14c4c' : '#e51400');

  const themeName = `bruno-${displayedTheme}`;

  monaco.editor.defineTheme(themeName, {
    base,
    inherit: true,
    rules: [
      // Comments
      { token: 'comment', foreground: normalizeHex(tokens.comment) },
      { token: 'comment.js', foreground: normalizeHex(tokens.comment) },
      { token: 'comment.block', foreground: normalizeHex(tokens.comment) },
      { token: 'comment.doc.js', foreground: normalizeHex(tokens.comment) },
      // Strings
      { token: 'string', foreground: normalizeHex(tokens.string) },
      { token: 'string.js', foreground: normalizeHex(tokens.string) },
      { token: 'string.escape', foreground: normalizeHex(tokens.number) },
      { token: 'string.escape.js', foreground: normalizeHex(tokens.number) },
      { token: 'string.escape.invalid.js', foreground: normalizeHex(tokens.variable) },
      // Numbers
      { token: 'number', foreground: normalizeHex(tokens.number) },
      { token: 'number.js', foreground: normalizeHex(tokens.number) },
      { token: 'number.hex.js', foreground: normalizeHex(tokens.number) },
      { token: 'number.octal.js', foreground: normalizeHex(tokens.number) },
      { token: 'number.binary.js', foreground: normalizeHex(tokens.number) },
      { token: 'number.float.js', foreground: normalizeHex(tokens.number) },
      // Keywords & identifiers
      { token: 'keyword', foreground: normalizeHex(tokens.keyword) },
      { token: 'keyword.js', foreground: normalizeHex(tokens.keyword) },
      { token: 'keyword.flow.js', foreground: normalizeHex(tokens.keyword) },
      { token: 'identifier', foreground: normalizeHex(tokens.variable) },
      { token: 'identifier.js', foreground: normalizeHex(tokens.variable) },
      { token: 'type.identifier', foreground: normalizeHex(tokens.definition) },
      { token: 'type.identifier.js', foreground: normalizeHex(tokens.definition) },
      // Regex
      { token: 'regexp', foreground: normalizeHex(tokens.string) },
      { token: 'regexp.js', foreground: normalizeHex(tokens.string) },
      { token: 'regexp.escape.js', foreground: normalizeHex(tokens.number) },
      // Decorators
      { token: 'annotation', foreground: normalizeHex(tokens.keyword) },
      { token: 'annotation.js', foreground: normalizeHex(tokens.keyword) },
      // Delimiters — brackets/parens/braces all use tagBracket so nothing goes yellow
      { token: 'delimiter', foreground: normalizeHex(tokens.operator) },
      { token: 'delimiter.js', foreground: normalizeHex(tokens.operator) },
      { token: 'delimiter.bracket', foreground: normalizeHex(tokens.tagBracket) },
      { token: 'delimiter.bracket.js', foreground: normalizeHex(tokens.tagBracket) },
      { token: 'delimiter.parenthesis.js', foreground: normalizeHex(tokens.tagBracket) },
      { token: 'delimiter.square.js', foreground: normalizeHex(tokens.tagBracket) },
      { token: 'delimiter.angle.js', foreground: normalizeHex(tokens.tagBracket) },
      // Markup
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
      // Suppress the default focus/contrast borders that would otherwise
      // ring the suggest widget with an unwanted color.
      'focusBorder': widgetBorder,
      'contrastBorder': widgetBorder,
      'contrastActiveBorder': widgetBorder,
      // Override the default rainbow bracket pair colorization — all 6 levels
      // collapse to the theme's tagBracket color so brackets stay monochrome
      // and don't leak yellow/gold into themes that don't want it.
      'editorBracketHighlight.foreground1': bracketFg,
      'editorBracketHighlight.foreground2': bracketFg,
      'editorBracketHighlight.foreground3': bracketFg,
      'editorBracketHighlight.foreground4': bracketFg,
      'editorBracketHighlight.foreground5': bracketFg,
      'editorBracketHighlight.foreground6': bracketFg,
      'editorBracketHighlight.unexpectedBracket.foreground': bracketErrorFg,
      // Hover widget (JSDoc tooltips)
      'editorHoverWidget.background': widgetBg,
      'editorHoverWidget.border': widgetBorder,
      'editorHoverWidget.foreground': widgetFg,
      // Suggest widget (autocomplete)
      'editorSuggestWidget.background': widgetBg,
      'editorSuggestWidget.border': widgetBorder,
      'editorSuggestWidget.foreground': widgetFg,
      'editorSuggestWidget.selectedBackground': widgetSelectedBg,
      'editorSuggestWidget.selectedForeground': widgetFg,
      'editorSuggestWidget.selectedIconForeground': widgetFg,
      'editorSuggestWidget.highlightForeground': widgetHighlightFg,
      'editorSuggestWidget.focusHighlightForeground': widgetHighlightFg,
      // Suggest widget uses list.* colors for hover/focus states
      'list.hoverBackground': widgetSelectedBg,
      'list.hoverForeground': widgetFg,
      'list.focusBackground': widgetSelectedBg,
      'list.focusForeground': widgetFg,
      // Widget (shared - parameter hints, find widget, etc.)
      'editorWidget.background': widgetBg,
      'editorWidget.border': widgetBorder,
      'editorWidget.foreground': widgetFg
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
 * Return a 6-char hex (no '#') for Monaco token rules.
 * Accepts hex or hsl()/hsla() strings; returns undefined for missing input.
 */
function normalizeHex(color) {
  if (!color) return undefined;
  const normalized = normalizeColor(color);
  return normalized.startsWith('#') ? normalized.slice(1) : normalized;
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
    result = expandHex(s);
  } else if (s.startsWith('hsl')) {
    result = hslStringToHex(s);
  } else if (s.startsWith('rgb')) {
    result = rgbStringToHex(s);
  } else {
    result = s;
  }

  colorCache.set(s, result);
  return result;
}

/**
 * Expand shorthand hex (#rgb / #rgba) to full #rrggbb, and truncate 8-char to 6-char.
 * Monaco requires exactly 6-char hex in theme colors.
 */
function expandHex(hex) {
  if (hex.length === 4) {
    // #rgb -> #rrggbb
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (hex.length === 5) {
    // #rgba -> #rrggbb (drop alpha)
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.length <= 7 ? hex : hex.slice(0, 7);
}

/**
 * Convert an rgb()/rgba() string to #rrggbb hex. Alpha is dropped — Monaco's
 * theme colors don't accept it in this format. Supports both legacy
 * (comma) and modern (space + slash) CSS syntax.
 */
function rgbStringToHex(rgbString) {
  const match = rgbString.match(
    /rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/
  );
  if (!match) return '#1e1e1e';

  const toHex = (n) => {
    const v = Math.max(0, Math.min(255, Math.round(parseFloat(n))));
    return v.toString(16).padStart(2, '0');
  };
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

/**
 * Convert an hsl()/hsla() string to #rrggbb hex using pure math.
 * Supports both legacy (comma) and modern (space) CSS syntax, with an
 * optional `deg` unit on the hue — e.g. `hsl(210, 90%, 76%)`,
 * `hsl(0deg 0% 80%)`, `hsl(0 0% 80%)`.
 */
function hslStringToHex(hslString) {
  const match = hslString.match(
    /hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/
  );
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
