import * as jq from 'jq-wasm';

export async function runJqFilter(data, filter) {
  try {
    const result = await jq.raw(data, filter);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'jq error');
    }
    return result.stdout;
  } catch (e) {
    console.warn('Could not apply jq filter:', e.message);
    throw e;
  }
}
