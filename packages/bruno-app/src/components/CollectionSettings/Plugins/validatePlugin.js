// Parse-only validation of a plugin snippet.
//
// The renderer enforces a strict CSP (`script-src 'self'`) that blocks
// `new Function(...)` / `eval(...)`, so syntax checking can't happen in the
// renderer. We delegate to an Electron-main IPC handler that does the same
// `new Function(...)` parse in a context without CSP.
//
// Returns { ok: boolean, message: string, at: Date, line?, column? }.

export const validatePlugin = async (code) => {
  if (typeof code !== 'string' || !code.trim()) {
    return { ok: false, message: 'Plugin code is empty.', at: new Date() };
  }

  if (!window?.ipcRenderer?.invoke) {
    return {
      ok: false,
      message: 'IPC not available — validation requires the desktop app.',
      at: new Date()
    };
  }

  try {
    const result = await window.ipcRenderer.invoke('renderer:validate-plugin-syntax', code);
    return { ...result, at: new Date() };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Validation failed.',
      at: new Date()
    };
  }
};

// Heuristic: does the snippet use require('chai-*') / require('...')? Used to
// flag plugins that won't run in Safe mode.
export const usesRequire = (code) => {
  if (typeof code !== 'string') return false;
  return /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/.test(code);
};

// Pull npm package names out of `require('...')` calls. Skips relative paths
// and node builtins so the result is "what would need to be in node_modules/".
const REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const NODE_BUILTINS = new Set([
  'fs', 'path', 'os', 'crypto', 'util', 'http', 'https', 'url', 'stream',
  'buffer', 'querystring', 'zlib', 'events', 'assert', 'child_process'
]);

export const extractRequiredPackages = (code) => {
  if (typeof code !== 'string') return [];
  const names = new Set();
  let m;
  REQUIRE_RE.lastIndex = 0;
  while ((m = REQUIRE_RE.exec(code)) !== null) {
    const pkg = m[1];
    if (!pkg || pkg.startsWith('.') || pkg.startsWith('/')) continue;
    if (NODE_BUILTINS.has(pkg)) continue;
    // For scoped packages keep the @scope/name; for everything else take the
    // first path segment (so `lodash/get` → `lodash`).
    const root = pkg.startsWith('@')
      ? pkg.split('/').slice(0, 2).join('/')
      : pkg.split('/')[0];
    names.add(root);
  }
  return Array.from(names);
};

// Parse chai.use(...) bodies for `addMethod` / `addProperty` /
// `addChainableMethod` calls and return the assertion names they register.
// Heuristic-only (no AST) — covers ~95% of real-world plugin snippets and is
// good enough for a UI preview.
const ASSERTION_PATTERNS = [
  /\.addMethod\s*\(\s*['"]([^'"]+)['"]/g,
  /\.addProperty\s*\(\s*['"]([^'"]+)['"]/g,
  /\.addChainableMethod\s*\(\s*['"]([^'"]+)['"]/g
];

export const extractAddedAssertions = (code) => {
  if (typeof code !== 'string') return [];
  const names = new Set();
  for (const pattern of ASSERTION_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(code)) !== null) {
      names.add(m[1]);
    }
  }
  return Array.from(names);
};
