import http from 'node:http';
import https from 'node:https';

type TimelineEntry = {
  timestamp: Date;
  type: 'info' | 'tls' | 'error';
  message: string;
};

type CaCertificatesCount = {
  root?: number;
  system?: number;
  extra?: number;
  custom?: number;
};

type AgentOptions = {
  rejectUnauthorized?: boolean;
  ca?: string | string[] | Buffer | Buffer[];
  cert?: string | Buffer;
  key?: string | Buffer;
  pfx?: string | Buffer;
  passphrase?: string;
  minVersion?: string;
  secureProtocol?: string;
  keepAlive?: boolean;
  ALPNProtocols?: string[];
  caCertificatesCount?: CaCertificatesCount;
  proxy?: string;
};

type AgentClass = new (options: AgentOptions, timeline?: TimelineEntry[]) => https.Agent;
type ProxyAgentClass = new (proxyUri: string, options?: AgentOptions) => https.Agent;

type HttpAgentOptions = {
  keepAlive?: boolean;
  proxy?: string;
};

type HttpAgentClass = new (options: HttpAgentOptions, timeline?: TimelineEntry[]) => http.Agent;
type HttpProxyAgentClass = new (proxyUri: string, options?: HttpAgentOptions) => http.Agent;

/**
 * Creates a timeline-aware agent class that logs TLS connection events.
 * The returned class wraps the base agent and adds timeline logging for:
 * - SSL validation status
 * - Proxy usage
 * - ALPN protocol negotiation
 * - CA certificates info
 * - DNS lookups
 * - Connection establishment
 * - TLS handshake details
 * - Server certificate info
 */
function createTimelineAgentClass<T extends ProxyAgentClass | typeof https.Agent>(BaseAgentClass: T): AgentClass {
  return class TimelineAgent extends (BaseAgentClass as any) {
    timeline: TimelineEntry[];
    alpnProtocols: string[];
    caProvided: boolean;
    caCertificatesCount: CaCertificatesCount;

    /**
     * Helper method to log entries to the timeline.
     */
    private log(type: 'info' | 'tls' | 'error', message: string): void {
      this.timeline.push({
        timestamp: new Date(),
        type,
        message
      });
    }

    constructor(options: AgentOptions, timeline?: TimelineEntry[]) {
      const caCertificatesCount = options.caCertificatesCount || {};
      const optionsCopy = { ...options };
      delete optionsCopy.caCertificatesCount;

      // For proxy agents, the first argument is the proxy URI and the second is options
      if (optionsCopy?.proxy) {
        const { proxy: proxyUri, ...agentOptions } = optionsCopy;
        // Ensure TLS options are properly set
        const tlsOptions = {
          ...agentOptions,
          rejectUnauthorized: agentOptions.rejectUnauthorized ?? true
        };
        super(proxyUri, tlsOptions);
        this.timeline = Array.isArray(timeline) ? timeline : [];
        this.alpnProtocols = tlsOptions.ALPNProtocols || ['h2', 'http/1.1'];
        this.caProvided = !!tlsOptions.ca;

        // Log TLS verification status and proxy details
        this.log('info', `SSL validation: ${tlsOptions.rejectUnauthorized ? 'enabled' : 'disabled'}`);
        this.log('info', `Using proxy: ${proxyUri}`);
      } else {
        // This is a regular HTTPS agent case
        const tlsOptions = {
          ...optionsCopy,
          rejectUnauthorized: optionsCopy.rejectUnauthorized ?? true
        };
        super(tlsOptions);
        this.timeline = Array.isArray(timeline) ? timeline : [];
        this.alpnProtocols = optionsCopy.ALPNProtocols || ['h2', 'http/1.1'];
        this.caProvided = !!optionsCopy.ca;

        // Log TLS verification status
        this.log('info', `SSL validation: ${tlsOptions.rejectUnauthorized ? 'enabled' : 'disabled'}`);
      }

      this.caCertificatesCount = caCertificatesCount;
    }

    createConnection(options: any, callback: any) {
      const { host, port } = options;

      // Capture the current timeline reference to avoid race conditions
      // when multiple concurrent requests reuse the same cached agent
      const timeline = this.timeline;
      const log = (type: 'info' | 'tls' | 'error', message: string): void => {
        timeline.push({
          timestamp: new Date(),
          type,
          message
        });
      };

      // Log ALPN protocols offered
      if (this.alpnProtocols && this.alpnProtocols.length > 0) {
        log('tls', `ALPN: offers ${this.alpnProtocols.join(', ')}`);
      }

      const rootCerts = this.caCertificatesCount.root || 0;
      const systemCerts = this.caCertificatesCount.system || 0;
      const extraCerts = this.caCertificatesCount.extra || 0;
      const customCerts = this.caCertificatesCount.custom || 0;

      log('tls', `CA Certificates: ${rootCerts} root, ${systemCerts} system, ${extraCerts} extra, ${customCerts} custom`);

      // Log "Trying host:port..."
      log('info', `Trying ${host}:${port}...`);

      let socket: any;
      try {
        socket = super.createConnection(options, callback);
      } catch (error: any) {
        log('error', `Error creating connection: ${error.message}`);
        error.timeline = timeline;
        throw error;
      }

      // Attach event listeners to the socket
      socket?.on('lookup', (err: Error | null, address: string, family: number, host: string) => {
        if (err) {
          log('error', `DNS lookup error for ${host}: ${err.message}`);
        } else {
          log('info', `DNS lookup: ${host} -> ${address}`);
        }
      });

      socket?.on('connect', () => {
        const address = socket.remoteAddress || host;
        const remotePort = socket.remotePort || port;

        log('info', `Connected to ${host} (${address}) port ${remotePort}`);
      });

      socket?.on('secureConnect', () => {
        const protocol = socket.getProtocol?.() || 'SSL/TLS';
        const cipher = socket.getCipher?.();
        const cipherSuite = cipher ? `${cipher.name} (${cipher.version})` : 'Unknown cipher';

        log('tls', `SSL connection using ${protocol} / ${cipherSuite}`);

        // ALPN protocol
        const alpnProtocol = socket.alpnProtocol || 'None';
        log('tls', `ALPN: server accepted ${alpnProtocol}`);

        // Server certificate
        const cert = socket.getPeerCertificate?.(true);
        if (cert) {
          log('tls', `Server certificate:`);
          if (cert.subject) {
            log('tls', ` subject: ${Object.entries(cert.subject).map(([k, v]) => `${k}=${v}`).join(', ')}`);
          }
          if (cert.valid_from) {
            log('tls', ` start date: ${cert.valid_from}`);
          }
          if (cert.valid_to) {
            log('tls', ` expire date: ${cert.valid_to}`);
          }
          if (cert.subjectaltname) {
            log('tls', ` subjectAltName: ${cert.subjectaltname}`);
          }
          if (cert.issuer) {
            log('tls', ` issuer: ${Object.entries(cert.issuer).map(([k, v]) => `${k}=${v}`).join(', ')}`);
          }

          // SSL certificate verification status
          if (socket.authorized !== false) {
            log('tls', `SSL certificate verify ok.`);
          } else {
            log('tls', `SSL certificate verification skipped (rejectUnauthorized: false).`);
          }
        }
      });

      socket?.on('error', (err: Error) => {
        log('error', `Socket error: ${err.message}`);
      });

      return socket;
    }
  } as unknown as AgentClass;
}

/**
 * Creates a timeline-aware HTTP agent class that logs connection events.
 * The returned class wraps the base HTTP agent and adds timeline logging for:
 * - Proxy usage (when applicable)
 * - DNS lookups
 * - Connection establishment
 * - Errors
 *
 * This is a simplified version of createTimelineAgentClass for HTTP (non-TLS) connections.
 */
function createTimelineHttpAgentClass<T extends HttpProxyAgentClass | typeof http.Agent>(BaseAgentClass: T): HttpAgentClass {
  return class TimelineHttpAgent extends (BaseAgentClass as any) {
    timeline: TimelineEntry[];

    /**
     * Helper method to log entries to the timeline.
     */
    private log(type: 'info' | 'tls' | 'error', message: string): void {
      this.timeline.push({
        timestamp: new Date(),
        type,
        message
      });
    }

    constructor(options: HttpAgentOptions, timeline?: TimelineEntry[]) {
      const optionsCopy = { ...options };

      // For proxy agents, the first argument is the proxy URI and the second is options
      if (optionsCopy?.proxy) {
        const { proxy: proxyUri, ...agentOptions } = optionsCopy;
        super(proxyUri, agentOptions);
        this.timeline = Array.isArray(timeline) ? timeline : [];

        // Log proxy details
        this.log('info', `Using proxy: ${proxyUri}`);
      } else {
        super(optionsCopy);
        this.timeline = Array.isArray(timeline) ? timeline : [];
      }
    }

    createConnection(options: any, callback: any) {
      const { host, port } = options;

      // Capture the current timeline reference to avoid race conditions
      // when multiple concurrent requests reuse the same cached agent
      const timeline = this.timeline;
      const log = (type: 'info' | 'tls' | 'error', message: string): void => {
        timeline.push({
          timestamp: new Date(),
          type,
          message
        });
      };

      // Log "Trying host:port..."
      log('info', `Trying ${host}:${port}...`);

      let socket: any;
      try {
        socket = super.createConnection(options, callback);
      } catch (error: any) {
        log('error', `Error creating connection: ${error.message}`);
        error.timeline = timeline;
        throw error;
      }

      // Attach event listeners to the socket
      socket?.on('lookup', (err: Error | null, address: string, family: number, host: string) => {
        if (err) {
          log('error', `DNS lookup error for ${host}: ${err.message}`);
        } else {
          log('info', `DNS lookup: ${host} -> ${address}`);
        }
      });

      socket?.on('connect', () => {
        const address = socket.remoteAddress || host;
        const remotePort = socket.remotePort || port;

        log('info', `Connected to ${host} (${address}) port ${remotePort}`);
      });

      socket?.on('error', (err: Error) => {
        log('error', `Socket error: ${err.message}`);
      });

      return socket;
    }
  } as unknown as HttpAgentClass;
}

export { createTimelineAgentClass, createTimelineHttpAgentClass, TimelineEntry, AgentOptions, HttpAgentOptions, CaCertificatesCount, AgentClass, HttpAgentClass, ProxyAgentClass, HttpProxyAgentClass };
