import fs from 'fs';

/**
 * Read and JSON-parse a file, retrying until it has parseable content.
 *
 * Reading an exported file immediately after the app writes it can observe a
 * created-but-not-yet-flushed (empty) file — most often on Windows — which makes
 * JSON.parse throw "Unexpected end of JSON input". Poll until the file has content
 * that parses as JSON before returning it.
 */
export async function readExportedJson(filePath: string, { tries = 50, interval = 100 } = {}) {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (raw.trim().length > 0) {
        return JSON.parse(raw);
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw lastError ?? new Error(`Timed out waiting for valid JSON at ${filePath}`);
}
