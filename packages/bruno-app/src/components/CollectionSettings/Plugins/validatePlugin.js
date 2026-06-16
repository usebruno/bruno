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
// flag plugins that won't run in QuickJS.
export const usesRequire = (code) => {
  if (typeof code !== 'string') return false;
  return /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/.test(code);
};
