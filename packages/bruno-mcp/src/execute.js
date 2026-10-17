const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const BRU_BIN = require.resolve('@usebruno/cli/bin/bru.js');

const MAX_INLINE_BODY_BYTES = 50 * 1024;

const tmpReportPath = () => {
  const id = crypto.randomBytes(8).toString('hex');
  return path.join(os.tmpdir(), `bruno-mcp-${id}.json`);
};

const truncateBody = (body) => {
  if (body == null) return { inline: null, truncated: false };
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (Buffer.byteLength(str, 'utf8') <= MAX_INLINE_BODY_BYTES) {
    return { inline: str, truncated: false };
  }
  const id = crypto.randomBytes(8).toString('hex');
  const spillPath = path.join(os.tmpdir(), `bruno-mcp-body-${id}`);
  fs.writeFileSync(spillPath, str);
  return {
    inline: str.slice(0, MAX_INLINE_BODY_BYTES),
    truncated: true,
    truncatedBodyPath: spillPath,
    originalByteLength: Buffer.byteLength(str, 'utf8')
  };
};

const executeRequest = async ({ collectionPath, requestPath, environment, verbose = false }) => {
  const reportPath = tmpReportPath();
  const args = ['run', requestPath, '--reporter-json', reportPath];
  if (environment) {
    args.push('--env', environment);
  }

  const debug = (msg) => {
    if (verbose) process.stderr.write(`[bruno-mcp] ${msg}\n`);
  };
  debug(`spawn: node ${BRU_BIN} ${args.join(' ')} (cwd=${collectionPath})`);

  const stdoutChunks = [];
  const stderrChunks = [];
  const child = spawn(process.execPath, [BRU_BIN, ...args], {
    cwd: collectionPath,
    env: process.env
  });

  child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
  child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });

  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');

  let report = null;
  let reportParseError = null;
  if (fs.existsSync(reportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch (err) {
      reportParseError = err.message;
    } finally {
      try { fs.unlinkSync(reportPath); } catch (_) {}
    }
  }

  const firstResult = report && Array.isArray(report.results) && report.results.length > 0 ? report.results[0] : null;
  const response = firstResult && firstResult.response ? firstResult.response : null;
  const bodyResult = truncateBody(response && response.data);

  const responseOk = response && typeof response.status === 'number' && response.status > 0;

  return {
    exitCode,
    ok: exitCode === 0 && responseOk,
    request: firstResult && firstResult.request ? {
      method: firstResult.request.method,
      url: firstResult.request.url,
      headers: firstResult.request.headers
    } : null,
    response: response ? {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      responseTimeMs: response.responseTime,
      body: bodyResult.inline,
      bodyTruncated: bodyResult.truncated,
      bodyPath: bodyResult.truncatedBodyPath,
      bodyByteLength: bodyResult.originalByteLength
    } : null,
    assertionResults: firstResult ? firstResult.assertionResults : null,
    testResults: firstResult ? firstResult.testResults : null,
    error: firstResult && firstResult.error ? firstResult.error : null,
    summary: report ? report.summary : null,
    diagnostics: {
      reportParseError,
      stderr: stderr.trim() || null,
      stdoutTail: stdout.trim().split('\n').slice(-20).join('\n') || null
    }
  };
};

module.exports = {
  executeRequest
};
