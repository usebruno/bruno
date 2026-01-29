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

      // Log ALPN protocols offered
      if (this.alpnProtocols && this.alpnProtocols.length > 0) {
        this.log('tls', `ALPN: offers ${this.alpnProtocols.join(', ')}`);
      }

      const rootCerts = this.caCertificatesCount.root || 0;
      const systemCerts = this.caCertificatesCount.system || 0;
      const extraCerts = this.caCertificatesCount.extra || 0;
      const customCerts = this.caCertificatesCount.custom || 0;

      this.log('tls', `CA Certificates: ${rootCerts} root, ${systemCerts} system, ${extraCerts} extra, ${customCerts} custom`);

      // Log "Trying host:port..."
      this.log('info', `Trying ${host}:${port}...`);

      let socket: any;
      try {
        socket = super.createConnection(options, callback);
      } catch (error: any) {
        this.log('error', `Error creating connection: ${error.message}`);
        error.timeline = this.timeline;
        throw error;
      }

      // Attach event listeners to the socket
      socket?.on('lookup', (err: Error | null, address: string, family: number, host: string) => {
        if (err) {
          this.log('error', `DNS lookup error for ${host}: ${err.message}`);
        } else {
          this.log('info', `DNS lookup: ${host} -> ${address}`);
        }
      });

      socket?.on('connect', () => {
        const address = socket.remoteAddress || host;
        const remotePort = socket.remotePort || port;

        this.log('info', `Connected to ${host} (${address}) port ${remotePort}`);
      });

      socket?.on('secureConnect', () => {
        const protocol = socket.getProtocol?.() || 'SSL/TLS';
        const cipher = socket.getCipher?.();
        const cipherSuite = cipher ? `${cipher.name} (${cipher.version})` : 'Unknown cipher';

        this.log('tls', `SSL connection using ${protocol} / ${cipherSuite}`);

        // ALPN protocol
        const alpnProtocol = socket.alpnProtocol || 'None';
        this.log('tls', `ALPN: server accepted ${alpnProtocol}`);

        // Server certificate
        const cert = socket.getPeerCertificate?.(true);
        if (cert) {
          this.log('tls', `Server certificate:`);
          if (cert.subject) {
            this.log('tls', ` subject: ${Object.entries(cert.subject).map(([k, v]) => `${k}=${v}`).join(', ')}`);
          }
          if (cert.valid_from) {
            this.log('tls', ` start date: ${cert.valid_from}`);
          }
          if (cert.valid_to) {
            this.log('tls', ` expire date: ${cert.valid_to}`);
          }
          if (cert.subjectaltname) {
            this.log('tls', ` subjectAltName: ${cert.subjectaltname}`);
          }
          if (cert.issuer) {
            this.log('tls', ` issuer: ${Object.entries(cert.issuer).map(([k, v]) => `${k}=${v}`).join(', ')}`);
          }

          // SSL certificate verify ok
          this.log('tls', `SSL certificate verify ok.`);
        }
      });

      socket?.on('error', (err: Error) => {
        this.log('error', `Socket error: ${err.message}`);
      });

      return socket;
    }
  } as unknown as AgentClass;
}

export { createTimelineAgentClass, TimelineEntry, AgentOptions, CaCertificatesCount, AgentClass, ProxyAgentClass };
