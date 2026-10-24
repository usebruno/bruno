import type { TLSSocket } from 'node:tls';

export type Http2RequestDetails = {
  streamId: number | null;
  alpn: string | null;
  protocol: string | null;
  cipher: string | null;
  remote: string | null;
  pseudoHeaders: Record<string, string>;
  requestLine: string;
  certificateLines: string[];
};

/** Run a socket accessor that can throw on a torn-down session, isolating each one. */
const safe = <T>(fn: () => T): T | null => {
  try {
    return fn();
  } catch {
    return null;
  }
};

const formatCertificateFields = (fields: object | undefined | null): string | null =>
  fields
    ? Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')
    : null;

/**
 * Collect HTTP/2 request and TLS details for the timeline.
 */
export const getHttp2RequestDetails = (stream: any): Http2RequestDetails | null => {
  const socket: TLSSocket | undefined = stream?.session?.socket;
  if (!socket) return null;

  const pseudoHeaders: Record<string, string> = {};

  for (const [name, value] of Object.entries(stream.sentHeaders || {})) {
    if (name.startsWith(':')) {
      pseudoHeaders[name] = String(value);
    }
  }

  const requestLine = [':method', ':path', ':authority', ':scheme']
    .filter((name) => name in pseudoHeaders)
    .map((name) => `${name} ${pseudoHeaders[name]}`)
    .join(' · ');

  const streamId = (safe(() => stream?.id) as number | null) ?? null;

  // alpnProtocol/remoteAddress are plain properties; the getters can throw on a closed session.
  const alpn = (safe(() => socket.alpnProtocol) as string | false | null) || null;
  const protocol = safe(() => socket.getProtocol?.()) || null;
  const cipher = safe(() => socket.getCipher?.()?.name) || null;
  const remote = socket.remoteAddress ? `${socket.remoteAddress}:${socket.remotePort}` : null;

  const certificate = safe(() => socket.getPeerCertificate?.());
  const authorized = safe(() => socket.authorized);
  const authorizationError = safe(() => socket.authorizationError);

  const certificateLines: string[] = [];
  if (certificate?.subject) {
    certificateLines.push(
      'Server certificate:',
      ` subject: ${formatCertificateFields(certificate.subject)}`,
      ` start date: ${certificate.valid_from}`,
      ` expire date: ${certificate.valid_to}`
    );

    if (certificate.subjectaltname) {
      certificateLines.push(` subjectAltName: ${certificate.subjectaltname}`);
    }

    certificateLines.push(
      ` issuer: ${formatCertificateFields(certificate.issuer)}`,
      authorized
        ? 'SSL certificate verify ok.'
        : `SSL certificate verification skipped or failed (${authorizationError || 'rejectUnauthorized: false'}).`
    );
  }

  return {
    streamId,
    alpn,
    protocol,
    cipher,
    remote,
    pseudoHeaders,
    requestLine,
    certificateLines
  };
};
