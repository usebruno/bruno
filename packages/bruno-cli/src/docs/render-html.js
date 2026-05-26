'use strict';
/**
 * packages/bruno-cli/src/docs/render-html.js
 *
 * Renders the final single-file HTML documentation.
 * Embeds the OpenCollection YAML string and initializes the official
 * OpenCollection viewer from cdn.opencollection.com.
 *
 * Embedding strategy:
 *   JSON.stringify(yamlString) is used to produce a JS string literal.
 *   This correctly escapes every character that would break a JS string:
 *   backslashes, quotes, newlines, null bytes, Unicode surrogates — everything.
 *   It is more robust than template literals or manual escaping.
 */

/**
 * @param {{ title: string, yamlString: string, theme: 'light'|'dark', gitUrl: string }} opts
 * @returns {string}  Complete HTML document
 */
function renderHtml({ title, yamlString, theme, gitUrl }) {
  // JSON.stringify produces a valid JS string literal including the outer quotes.
  const yamlLiteral = JSON.stringify(yamlString);
  const gitUrlLiteral = JSON.stringify(gitUrl || '');
  const themeLiteral = JSON.stringify(theme === 'dark' ? 'dark' : 'light');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - API Documentation</title>
  <link rel="stylesheet" href="https://cdn.opencollection.com/docs.css" />
  <style>
    body { margin: 0; padding: 0; }
    #app { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script src="https://cdn.opencollection.com/docs.js"></script>
  <script>
    (function () {
      var collectionYaml  = ${yamlLiteral};
      var gitCollectionUrl = ${gitUrlLiteral};
      var theme           = ${themeLiteral};

      // The bundle exports window.OpenCollectionPlayground (current name as of Bruno v3).
      // Fallback chain covers possible future renames.
      var Component =
        window.OpenCollection ||
        window.OpenCollectionPlayground           ||
        window.OpenCollectionDocs;

      if (!Component) {
        document.getElementById('app').innerHTML =
          '<div style="font-family:sans-serif;padding:48px;max-width:640px">' +
            '<h2 style="color:#c00">OpenCollection viewer failed to load</h2>' +
            '<p>The CDN asset <code>cdn.opencollection.com/docs.js</code> did not export a component.</p>' +
            '<p>Check your internet connection and that the CDN is reachable.</p>' +
          '</div>';
        return;
      }

      try {
var target = document.getElementById('app');

function render(currentTheme) {
  target.innerHTML = '';

  if (typeof Component === 'function') {
    new Component({
      target         : target,
      opencollection : collectionYaml,
      theme          : currentTheme,
      ...(gitCollectionUrl ? { gitCollectionUrl: gitCollectionUrl } : {})
    });

  } else if (Component && typeof Component.mount === 'function') {
    Component.mount(target, {
      opencollection : collectionYaml,
      theme          : currentTheme,
      ...(gitCollectionUrl ? { gitCollectionUrl: gitCollectionUrl } : {})
    });

  } else {
    throw new Error('OpenCollection component has unsupported format');
  }
}

render(theme);

} catch (err) {
        console.error('[bruno-docs] Failed to initialise OpenCollection component:', err);
        document.getElementById('app').innerHTML =
          '<div style="font-family:sans-serif;padding:48px;max-width:640px">' +
            '<h2 style="color:#c00">Render error</h2>' +
            '<pre style="background:#f4f4f4;padding:16px;border-radius:6px;overflow:auto">' +
              escapeHtmlRuntime(err.message) +
            '</pre>' +
            '<p>Open the browser DevTools console for the full stack trace.</p>' +
          '</div>';
      }

      function escapeHtmlRuntime(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters for safe embedding in HTML content.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { renderHtml };
