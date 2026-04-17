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

  const themeName = `bruno-${displayedTheme}-${Date.now()}`;

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

/**
 * Normalize a color to Monaco's #rrggbb format for theme colors.
 * Handles hex, hsl(), and common named colors.
 */
function normalizeColor(color) {
  if (!color) return '#1e1e1e';
  const s = String(color).trim();
  if (s.startsWith('#')) return s.length <= 7 ? s : s.slice(0, 7);
  // For hsl() strings, provide a reasonable fallback since Monaco doesn't support them
  if (s.startsWith('hsl')) {
    // Return a fallback — the base theme will handle most styling
    return undefined;
  }
  return s;
}
