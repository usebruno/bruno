import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import type { RunOptions, VariableOverrides } from '../types.js';

const require = createRequire(import.meta.url);
const BRU_BIN: string = require.resolve('@usebruno/cli/bin/bru.js');

const MAX_INLINE_BODY_BYTES = 50 * 1024;

// Hard ceiling so a streaming / never-closing request can't hang the caller
// (and, in an AI chat, freeze the conversation) forever.
const DEFAULT_TIMEOUT_MS = 120 * 1000;

// Request-side auth (Bearer, API key headers, WSSE, ...) is resolved to real
// secret values inside the sent request headers. We MUST NOT hand those back to
// the AI agent. Since a user can name an API-key header anything, redacting a
// fixed allow/deny list is not robust — so we return request header *names*
// only, never their values. The agent authored the request; it does not need
// the resolved values, only confirmation of which headers were sent.
//
// Response headers are generally safe and useful (content-type, rate limits,
// Location, ...) so we keep them, redacting only cookie-bearing ones.
const SENSITIVE_RESPONSE_HEADERS = new Set(['set-cookie', 'authorization', 'proxy-authorization']);
const REDACTED = '[redacted]';

// A private, per-process temp dir (0700) for reporter JSON and spilled response
// bodies, so resolved secrets in the on-disk reporter output are never
// world-readable and everything is cleaned up on exit.
let sessionTmpDir: string | null = null;
const spillFiles = new Set<string>();

const getSessionTmpDir = (): string => {
  if (sessionTmpDir && fs.existsSync(sessionTmpDir)) return sessionTmpDir;
  sessionTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mcp-'));
  return sessionTmpDir;
};

const cleanupSessionTmpDir = (): void => {
  if (sessionTmpDir) {
    try {
      fs.rmSync(sessionTmpDir, { recursive: true, force: true });
    } catch (_) {}
    sessionTmpDir = null;
    spillFiles.clear();
  }
};

let cleanupRegistered = false;
const registerCleanup = (): void => {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.once('exit', cleanupSessionTmpDir);
};

// Translate the (deliberately small) set of supported run options into `bru run`
// CLI args. Result-shaping/redaction is owned by us and is not exposed here.
// Exported for unit testing.
const buildRunArgs = (
  paths: string[],
  { environment, variables }: RunOptions = {},
  reportPath: string
): string[] => {
  const args = ['run', ...paths, '--reporter-json', reportPath];

  if (environment) args.push('--env', String(environment));

  if (variables && typeof variables === 'object') {
    for (const [name, value] of Object.entries(variables)) {
      // Bruno splits each override on the first '=', so the name can't contain one.
      if (String(name).includes('=')) {
        throw new Error(`variable name must not contain '=': ${name}`);
      }
      args.push('--env-var', `${name}=${value}`);
    }
  }

  return args;
};

// Return only the header names of the sent request. Names are never secret;
// values (which carry resolved auth) are dropped entirely.
const redactRequestHeaders = (headers: Record<string, unknown> | null | undefined): string[] => {
  if (!headers || typeof headers !== 'object') return [];
  return Object.keys(headers).sort();
};

// Keep response headers, but blank out cookie/auth-bearing values.
const redactResponseHeaders = (
  headers: Record<string, unknown> | null | undefined
): { headers: Record<string, unknown>; redactedCookies: boolean } => {
  if (!headers || typeof headers !== 'object') return { headers: headers || {}, redactedCookies: false };
  let redactedCookies = false;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_RESPONSE_HEADERS.has(key.toLowerCase())) {
      out[key] = REDACTED;
      redactedCookies = true;
    } else {
      out[key] = value;
    }
  }
  return { headers: out, redactedCookies };
};

interface TruncatedBody {
  inline: string | null;
  truncated: boolean;
  truncatedBodyPath?: string;
  originalByteLength?: number;
}

const truncateBody = (body: unknown): TruncatedBody => {
  if (body == null) return { inline: null, truncated: false };
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (Buffer.byteLength(str, 'utf8') <= MAX_INLINE_BODY_BYTES) {
    return { inline: str, truncated: false };
  }
  const dir = getSessionTmpDir();
  const spillPath = path.join(dir, `body-${crypto.randomBytes(8).toString('hex')}`);
  fs.writeFileSync(spillPath, str, { mode: 0o600 });
  spillFiles.add(spillPath);
  registerCleanup();
  return {
    inline: str.slice(0, MAX_INLINE_BODY_BYTES),
    truncated: true,
    truncatedBodyPath: spillPath,
    originalByteLength: Buffer.byteLength(str, 'utf8')
  };
};

// The reporter URL is fully resolved/interpolated, so a `{{secret}}` in the URL,
// API-key auth with `placement: queryparams`, OAuth2 `tokenPlacement: url`, or
// `user:pass@host` userinfo all put resolved secrets in it. As with headers, we
// can't know which query params are secret (a user can name one anything), so we
// withhold every query value (keeping names) and strip userinfo — deny-by-default.
// Path segments are left intact. Returns whether anything was actually redacted.
const redactUrl = (rawUrl: any): { url: string | null; redacted: boolean } => {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return { url: rawUrl == null ? null : rawUrl, redacted: false };
  }
  try {
    const u = new URL(rawUrl);
    let redacted = false;
    if (u.username || u.password) {
      u.username = '';
      u.password = '';
      redacted = true;
    }
    for (const key of Array.from(u.searchParams.keys())) {
      u.searchParams.set(key, REDACTED);
      redacted = true;
    }
    return { url: u.toString(), redacted };
  } catch (_) {
    // Unparseable (relative or an unresolved template): defensively drop userinfo
    // and the entire query string rather than risk leaking a value.
    const noUserinfo = rawUrl.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, '$1');
    const qIndex = noUserinfo.indexOf('?');
    const url = qIndex === -1 ? noUserinfo : `${noUserinfo.slice(0, qIndex)}?${REDACTED}`;
    return { url, redacted: url !== rawUrl };
  }
};

// Assertion/test results can embed resolved secret values: an assertion like
// `expect res.headers.authorization equals {{token}}` puts the token in its
// operand / actual / error fields. The MCP server never sees the resolved secret
// values (they live inside the CLI subprocess), so it can't string-match to redact
// them — instead we keep only known-safe structural fields and drop everything else
// (deny-by-default). Full detail is returned only when the caller opts into verbose.
const ASSERTION_SAFE_FIELDS = ['lhsExpr', 'operator', 'status', 'uid'];
const TEST_SAFE_FIELDS = ['description', 'status', 'uid', 'suitename'];

const pickFields = (obj: any, fields: string[]) => {
  const out: Record<string, any> = {};
  if (obj && typeof obj === 'object') {
    for (const f of fields) {
      if (obj[f] !== undefined) out[f] = obj[f];
    }
  }
  return out;
};

const redactResultList = (list: any, safeFields: string[], verbose: boolean) => {
  if (!Array.isArray(list)) return list == null ? null : list;
  if (verbose) return list;
  return list.map((item) => pickFields(item, safeFields));
};

const formatResponse = (response: any) => {
  if (!response) return { response: null, redactedCookies: false };
  const bodyResult = truncateBody(response.data);
  const { headers, redactedCookies } = redactResponseHeaders(response.headers);
  return {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers,
      responseTimeMs: response.responseTime,
      body: bodyResult.inline,
      bodyTruncated: bodyResult.truncated,
      bodyPath: bodyResult.truncatedBodyPath,
      bodyByteLength: bodyResult.originalByteLength
    },
    redactedCookies
  };
};

// Format one `bru run` result entry into a redacted, agent-facing object.
const formatResultEntry = (entry: any, verbose: boolean) => {
  const rawRequest = entry && entry.request ? entry.request : null;
  const { url, redacted: redactedUrl } = redactUrl(rawRequest ? rawRequest.url : null);
  const request = rawRequest
    ? {
        method: rawRequest.method,
        url,
        // Header values and query-param/userinfo values are withheld on purpose
        // (they carry resolved auth secrets); only names / structure are returned.
        headerNames: redactRequestHeaders(rawRequest.headers)
      }
    : null;
  const { response, redactedCookies } = formatResponse(entry && entry.response ? entry.response : null);
  const responseOk = response && typeof response.status === 'number' && response.status > 0;
  return {
    path: (entry && entry.path) || null,
    ok: Boolean(responseOk),
    request,
    response,
    assertionResults: redactResultList(entry ? entry.assertionResults : null, ASSERTION_SAFE_FIELDS, verbose),
    testResults: redactResultList(entry ? entry.testResults : null, TEST_SAFE_FIELDS, verbose),
    error: entry && entry.error ? entry.error : null,
    _redactedCookies: redactedCookies,
    _redactedUrl: redactedUrl
  };
};

// `bru run` writes failing assertion/test messages and user-script console.log
// output to stdout/stderr, which can contain resolved secret values the server
// can't identify to strip. So the raw child output is withheld unless the caller
// opts into verbose (a deliberate debugging exposure). Our own parse error is safe.
const diagnosticsOf = (stderr: string, stdout: string, reportParseError: string | null, verbose: boolean) => {
  if (!verbose) {
    return { reportParseError: reportParseError || null, stderr: null, stdoutTail: null, outputWithheld: true };
  }
  return {
    reportParseError: reportParseError || null,
    stderr: stderr && stderr.trim() ? stderr.trim() : null,
    stdoutTail: stdout && stdout.trim() ? stdout.trim().split('\n').slice(-20).join('\n') : null,
    outputWithheld: false
  };
};

interface RawRunResult {
  exitCode: number | null;
  report: any;
  stderr: string;
  stdout: string;
  reportParseError: string | null;
  verbose?: boolean;
}

// bru's `--reporter-json` container shape differs across CLI majors, though the
// per-entry request/response shape is identical:
//   cli <= 1.16 : { results: [entry, ...], summary }
//   cli >= 4    : [ { iterationIndex, results: [entry, ...] }, ... ]  (no top-level summary)
// Normalize both into a flat entry list (+ summary when the reporter provides one)
// so the formatters (and this package) work against either CLI version. This is the
// one place that has to know about the CLI's on-disk reporter format.
const normalizeReport = (report: any): { entries: any[]; summary: any } => {
  if (Array.isArray(report)) {
    const entries = report.flatMap((iteration) =>
      iteration && Array.isArray(iteration.results) ? iteration.results : []
    );
    return { entries, summary: null };
  }
  if (report && Array.isArray(report.results)) {
    return { entries: report.results, summary: report.summary != null ? report.summary : null };
  }
  return { entries: [], summary: null };
};

// Format a single-request run (execute_request). Flat, for ergonomics. Exported for tests.
const formatResult = ({ exitCode, report, stderr, stdout, reportParseError, verbose = false }: RawRunResult) => {
  const { entries, summary } = normalizeReport(report);
  const entry = formatResultEntry(entries.length > 0 ? entries[0] : null, verbose);
  return {
    exitCode,
    ok: Boolean(exitCode === 0 && entry.ok),
    request: entry.request,
    response: entry.response,
    assertionResults: entry.assertionResults,
    testResults: entry.testResults,
    error: entry.error,
    summary,
    redaction: {
      requestHeaderValuesWithheld: true,
      requestUrlSecretsRedacted: entry._redactedUrl,
      responseCookiesRedacted: entry._redactedCookies,
      assertionAndTestDetailsWithheld: !verbose,
      diagnosticsOutputWithheld: !verbose
    },
    diagnostics: diagnosticsOf(stderr, stdout, reportParseError, verbose)
  };
};

interface RunBruArgs {
  collectionPath: string;
  paths: string[];
  options?: RunOptions;
  verbose?: boolean;
  timeoutMs?: number;
}

// Low-level runner: spawn `bru run` for the given paths + options.
const runBru = async ({
  collectionPath,
  paths,
  options = {},
  verbose = false,
  timeoutMs = DEFAULT_TIMEOUT_MS
}: RunBruArgs): Promise<RawRunResult> => {
  const dir = getSessionTmpDir();
  registerCleanup();
  const reportPath = path.join(dir, `report-${crypto.randomBytes(8).toString('hex')}.json`);
  const args = buildRunArgs(paths, options, reportPath);

  if (verbose) process.stderr.write(`[bruno-mcp] spawn: node ${BRU_BIN} ${args.join(' ')} (cwd=${collectionPath})\n`);

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  const child = spawn(process.execPath, [BRU_BIN, ...args], { cwd: collectionPath });

  child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
  child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Request execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('exit', (code) => { clearTimeout(timer); resolve(code); });
  });

  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');

  let report: any = null;
  let reportParseError: string | null = null;
  if (fs.existsSync(reportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch (err: any) {
      reportParseError = err.message;
    } finally {
      // The reporter file transiently contains resolved secrets — remove it now.
      try { fs.unlinkSync(reportPath); } catch (_) {}
    }
  }

  return { exitCode, report, stderr, stdout, reportParseError };
};

interface ExecuteRequestArgs {
  collectionPath: string;
  requestPath: string;
  environment?: string;
  variables?: VariableOverrides;
  verbose?: boolean;
  timeoutMs?: number;
}

// Execute a single request. `environment` and `variables` are the supported knobs.
export const executeRequest = async ({
  collectionPath,
  requestPath,
  environment,
  variables,
  verbose = false,
  timeoutMs = DEFAULT_TIMEOUT_MS
}: ExecuteRequestArgs) => {
  const raw = await runBru({ collectionPath, paths: [requestPath], options: { environment, variables }, verbose, timeoutMs });
  return formatResult({ ...raw, verbose });
};
