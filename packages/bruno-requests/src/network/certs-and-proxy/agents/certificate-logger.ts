import { T_LoggerInstance } from "../../../utils/logger";

/**
 * Interface for certificate details
 */
interface T_CertificateInfo {
  subject?: Record<string, string>;
  issuer?: Record<string, string>;
  valid_from?: string;
  valid_to?: string;
  subjectaltname?: string;
}

/**
 * Logs SSL certificate details in curl-like format
 */
export class CertificateLogger {
  private timeline: T_LoggerInstance;

  constructor(timeline: T_LoggerInstance) {
    this.timeline = timeline;
  }

  /**
   * Logs certificate details from a socket connection
   * @param socket - The socket with certificate information
   * @param hostname - The hostname to check against SAN
   */
  logCertificateDetails(socket: any, hostname: string): void {
    try {
      const cert = this.getCertificateInfo(socket);
      if (!cert) {
        return;
      }

      this.timeline.add('tls', 'Server certificate:');
      this.logSubject(cert.subject);
      this.logValidityDates(cert.valid_from, cert.valid_to);
      this.logSubjectAltNames(cert.subjectaltname, hostname);
      this.logIssuer(cert.issuer);
      this.timeline.add('tls', ' SSL certificate verify ok.');
    } catch (error) {
      this.timeline.add('error', `Failed to log certificate details: ${(error as Error).message}`);
    }
  }

  /**
   * Extracts certificate information from socket
   */
  private getCertificateInfo(socket: any): T_CertificateInfo | null {
    if (!socket || typeof socket.getPeerCertificate !== 'function') {
      return null;
    }

    const cert = socket.getPeerCertificate(true);
    if (!cert || typeof cert !== 'object' || Object.keys(cert).length === 0) {
      return null;
    }

    return cert;
  }

  /**
   * Logs certificate subject information
   */
  private logSubject(subject?: Record<string, string>): void {
    if (!subject) return;

    const subjectStr = Object.entries(subject)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    this.timeline.add('tls', ` subject: ${subjectStr}`);
  }

  /**
   * Logs certificate validity dates
   */
  private logValidityDates(validFrom?: string, validTo?: string): void {
    if (validFrom) {
      this.timeline.add('tls', ` start date: ${validFrom}`);
    }
    if (validTo) {
      this.timeline.add('tls', ` expire date: ${validTo}`);
    }
  }

  /**
   * Logs Subject Alternative Names and hostname matching
   */
  private logSubjectAltNames(subjectAltName?: string, hostname?: string): void {
    if (!subjectAltName) return;

    if (hostname && subjectAltName.includes(hostname)) {
      this.timeline.add('tls', ` subjectAltName: host "${hostname}" matched cert's "${hostname}"`);
    } else {
      this.timeline.add('tls', ` subjectAltName: ${subjectAltName}`);
    }
  }

  /**
   * Logs certificate issuer information
   */
  private logIssuer(issuer?: Record<string, string>): void {
    if (!issuer) return;

    const issuerStr = Object.entries(issuer)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    this.timeline.add('tls', ` issuer: ${issuerStr}`);
  }
} 