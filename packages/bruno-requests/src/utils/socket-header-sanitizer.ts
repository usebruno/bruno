import http from 'node:http';
import net from 'node:net';
import type { Socket } from 'node:net';
import tls from 'node:tls';

const HEADER_BLOCK_END = Buffer.from('\r\n\r\n', 'latin1');
const DEFAULT_MAX_HEADER_SIZE = 16 * 1024;

/** Sockets that already have the inbound interceptor installed. */
const sanitizedSockets = new WeakSet<object>();

type SanitizerState = {
  buffer: Buffer;
  awaitingHeaders: boolean;
};

/**
 * Parse Transfer-Encoding values as comma-separated tokens (case-insensitive).
 * Returns true when an exact `chunked` coding is present.
 */
function hasChunkedTransferEncoding(headerLines: string[]): boolean {
  for (const line of headerLines) {
    const colon = line.indexOf(':');
    if (colon === -1) {
      continue;
    }
    const name = line.slice(0, colon).trim().toLowerCase();
    if (name !== 'transfer-encoding') {
      continue;
    }
    const value = line.slice(colon + 1);
    const tokens = value.split(',').map((t) => t.trim().toLowerCase().split(/\s+/)[0]);
    if (tokens.includes('chunked')) {
      return true;
    }
  }
  return false;
}

/**
 * Strip every Content-Length field from a header block when TE includes chunked.
 * Handles Content-Length as the last header (no trailing CRLF inside the sliced block).
 */
function sanitizeHeaderBlock(rawHeadersLatin1: string): string {
  const lines = rawHeadersLatin1.split(/\r?\n/);
  if (lines.length === 0) {
    return rawHeadersLatin1;
  }

  const statusLine = lines[0];
  const headerLines = lines.slice(1).filter((line) => line.length > 0);

  if (!hasChunkedTransferEncoding(headerLines)) {
    return rawHeadersLatin1;
  }

  const kept = headerLines.filter((line) => {
    const colon = line.indexOf(':');
    if (colon === -1) {
      return true;
    }
    return line.slice(0, colon).trim().toLowerCase() !== 'content-length';
  });

  if (kept.length === 0) {
    return statusLine;
  }
  return `${statusLine}\r\n${kept.join('\r\n')}`;
}

function parseStatusCode(statusLine: string): number | null {
  const match = /^HTTP\/\d+(?:\.\d+)?\s+(\d{3})\b/i.exec(statusLine);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

/** 1xx except 101 Switching Protocols — continue scanning for the final response. */
function isInformationalStatus(code: number): boolean {
  return code >= 100 && code < 200 && code !== 101;
}

function isWrappableSocket(socket: unknown): socket is Socket {
  return socket instanceof net.Socket || socket instanceof tls.TLSSocket;
}

function getMaxHeaderSize(): number {
  const fromHttp = (http.globalAgent as { maxHeaderSize?: number } | undefined)?.maxHeaderSize;
  if (typeof fromHttp === 'number' && fromHttp > 0) {
    return fromHttp;
  }
  return DEFAULT_MAX_HEADER_SIZE;
}

/**
 * Install an inbound interceptor on the real socket so Node's llhttp parser sees sanitized
 * response headers when both `Transfer-Encoding: chunked` and `Content-Length` are present.
 * Preserves socket identity (required for keep-alive, TLS, hybrid fallback, proxy agents).
 */
function installSocketHeaderSanitizer<T extends object>(socket: T): T {
  if (!isWrappableSocket(socket) || sanitizedSockets.has(socket)) {
    return socket;
  }

  sanitizedSockets.add(socket);

  const state: SanitizerState = {
    buffer: Buffer.alloc(0),
    awaitingHeaders: true
  };

  const maxHeaderSize = getMaxHeaderSize();
  const originalEmit = socket.emit.bind(socket);

  const flushPassthrough = (chunk: Buffer) => {
    if (chunk.length > 0) {
      originalEmit('data', chunk);
    }
  };

  const processBufferedHeaders = (): void => {
    while (state.awaitingHeaders) {
      const headerEnd = state.buffer.indexOf(HEADER_BLOCK_END);
      if (headerEnd === -1) {
        if (state.buffer.length > maxHeaderSize) {
          const overflow = state.buffer;
          state.buffer = Buffer.alloc(0);
          state.awaitingHeaders = false;
          flushPassthrough(overflow);
        }
        return;
      }

      const rawHeaders = state.buffer.subarray(0, headerEnd).toString('latin1');
      const afterHeaders = state.buffer.subarray(headerEnd + HEADER_BLOCK_END.length);
      const statusLine = rawHeaders.split(/\r?\n/, 1)[0] || '';
      const statusCode = parseStatusCode(statusLine);

      const sanitizedHeaders = sanitizeHeaderBlock(rawHeaders);
      const headerAndDelimiter = Buffer.concat([
        Buffer.from(sanitizedHeaders, 'latin1'),
        HEADER_BLOCK_END
      ]);

      state.buffer = Buffer.alloc(0);
      flushPassthrough(headerAndDelimiter);

      if (statusCode !== null && isInformationalStatus(statusCode)) {
        // Keep scanning for the final response headers.
        if (afterHeaders.length > 0) {
          state.buffer = afterHeaders;
          continue;
        }
        return;
      }

      // Final (or 101 / unparseable) response: pass remaining bytes as body.
      state.awaitingHeaders = false;
      if (afterHeaders.length > 0) {
        flushPassthrough(afterHeaders);
      }
      return;
    }
  };

  socket.emit = function sanitizedEmit(event: string | symbol, ...args: any[]): boolean {
    if (event !== 'data') {
      return originalEmit(event, ...args);
    }

    const chunk = args[0];
    const data = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk == null ? '' : String(chunk), 'latin1');

    if (!state.awaitingHeaders) {
      return originalEmit('data', data);
    }

    state.buffer = state.buffer.length === 0 ? data : Buffer.concat([state.buffer, data]);
    processBufferedHeaders();
    return true;
  } as typeof socket.emit;

  // Incomplete headers on EOF — forward buffered bytes so llhttp can report the real error.
  socket.prependListener('end', () => {
    if (state.awaitingHeaders && state.buffer.length > 0) {
      const leftover = state.buffer;
      state.buffer = Buffer.alloc(0);
      state.awaitingHeaders = false;
      flushPassthrough(leftover);
    }
  });

  // Keep-alive: Agent.reuseSocket re-arms before the next request on this socket.
  (socket as any).__brunoRearmHeaderSanitizer = () => {
    state.buffer = Buffer.alloc(0);
    state.awaitingHeaders = true;
  };

  return socket;
}

type AgentConstructor = new (...args: any[]) => any;

/**
 * Outermost agent mixin: install the inbound header sanitizer on every connected socket.
 * Sanitizes both the sync return value and any socket passed to the callback (idempotent).
 */
function withSocketHeaderSanitizer<T extends AgentConstructor>(AgentClass: T): T {
  return class SocketSanitizingAgent extends AgentClass {
    createConnection(options: any, callback?: (...args: any[]) => void) {
      const sanitizeIfSocket = (value: unknown) => {
        if (isWrappableSocket(value)) {
          return installSocketHeaderSanitizer(value);
        }
        return value;
      };

      let wrappedCallback = callback;
      if (typeof callback === 'function') {
        wrappedCallback = (...args: any[]) => {
          // Node Agent oncreate is (err, socket). net.connect's connect-listener is ().
          // Only sanitize arguments that are actual sockets.
          const nextArgs = args.map((arg) => sanitizeIfSocket(arg));
          return callback(...nextArgs);
        };
      }

      const socket = super.createConnection(options, wrappedCallback);
      return sanitizeIfSocket(socket);
    }

    reuseSocket(socket: any, req: any) {
      if (socket && typeof socket.__brunoRearmHeaderSanitizer === 'function') {
        socket.__brunoRearmHeaderSanitizer();
      }
      if (typeof super.reuseSocket === 'function') {
        return super.reuseSocket(socket, req);
      }
      return undefined;
    }
  } as unknown as T;
}

export {
  installSocketHeaderSanitizer,
  withSocketHeaderSanitizer,
  isWrappableSocket,
  sanitizeHeaderBlock,
  hasChunkedTransferEncoding
};
