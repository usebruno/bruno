import { T_LoggerInstance } from '../../../utils/logger';
import { CertificateLogger } from './certificate-logger';

/**
 * Socket event handler configuration
 */
interface T_SocketEventConfig {
  socket: any;
  timeline: T_LoggerInstance;
  host: string;
  port: number;
  timeout?: number;
}

/**
 * Handles socket events with proper cleanup and logging
 */
export class SocketEventHandler {
  private config: T_SocketEventConfig;
  private certificateLogger: CertificateLogger;
  private eventListeners: Map<string, Function> = new Map();
  private isCleanedUp: boolean = false;

  constructor(config: T_SocketEventConfig) {
    this.config = { timeout: 60000, ...config };
    this.certificateLogger = new CertificateLogger(config.timeline);
  }

  /**
   * Set up all socket event listeners
   */
  setupEventListeners(): void {
    if (this.isCleanedUp) return;

    this.setupTimeoutHandler();
    this.setupLookupHandler();
    this.setupConnectionHandlers();
    this.setupTLSHandlers();
    this.setupErrorHandlers();
    this.setupCleanupHandlers();
  }

  /**
   * Clean up all event listeners
   */
  cleanup(): void {
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;

    const { socket } = this.config;
    
    try {
      // Clear timeout
      if (socket && typeof socket.setTimeout === 'function') {
        socket.setTimeout(0);
      }

      // Remove all registered event listeners
      this.eventListeners.forEach((listener, event) => {
        if (socket && typeof socket.removeListener === 'function') {
          socket.removeListener(event, listener);
        }
      });

      this.eventListeners.clear();
    } catch (error) {
      // Ignore cleanup errors - socket might already be destroyed
    }
  }

  /**
   * Setup socket timeout handling
   */
  private setupTimeoutHandler(): void {
    const { socket, timeline, timeout } = this.config;
    
    const timeoutHandler = () => {
      timeline.add('error', `Operation timed out after ${timeout} milliseconds with 0 bytes received`);
      this.cleanup();
      if (socket && typeof socket.destroy === 'function') {
        socket.destroy();
      }
    };

    if (socket && typeof socket.setTimeout === 'function') {
      socket.setTimeout(timeout, timeoutHandler);
    }
  }

  /**
   * Setup DNS lookup event handler
   */
  private setupLookupHandler(): void {
    const { socket, timeline, host, port } = this.config;

    const lookupHandler = (err: Error | null, address: string, family: string | number, hostname: string) => {
      timeline.add('info', 'Socket: lookup event');
      if (this.isCleanedUp) return;
      
      if (err) {
        timeline.add('error', `Could not resolve host: ${hostname}: ${err.message}`);
      } else {
        const familyStr = family === 6 ? 'IPv6' : 'IPv4';
        timeline.add('info', `Host ${hostname}:${port} was resolved.`);
        timeline.add('info', `${familyStr}: ${address}`);
        timeline.add('info', `  Trying ${family === 6 ? `[${address}]` : address}:${port}...`);
      }
    };

    this.addEventListenerOnce('lookup', lookupHandler);
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    const { timeline, host, port } = this.config;

    const connectHandler = () => {
      timeline.add('info', 'Socket: connect event');
      if (this.isCleanedUp) return;
      
      const { socket } = this.config;
      const address = socket?.remoteAddress || host;
      const remotePort = socket?.remotePort || port;
      timeline.add('info', `Connected to ${host} (${address}) port ${remotePort}`);
    };

    this.addEventListenerOnce('connect', connectHandler);
  }

  /**
   * Setup TLS-related event handlers
   */
  private setupTLSHandlers(): void {
    const { socket, timeline, host } = this.config;

    const secureConnectHandler = () => {
      timeline.add('info', 'Socket: secureConnect event');
      if (this.isCleanedUp) return;

      this.logTLSDetails(socket, timeline);
      this.certificateLogger.logCertificateDetails(socket, host);
    };

    this.addEventListenerOnce('secureConnect', secureConnectHandler);
  }

  /**
   * Setup error event handlers
   */
  private setupErrorHandlers(): void {
    const { timeline } = this.config;

    const errorHandler = (err: Error) => {
      timeline.add('info', 'Socket: error event');
      timeline.add('error', err.message);
      this.cleanup();
    };

    this.addEventListener('error', errorHandler);
  }

  /**
   * Setup cleanup event handlers
   */
  private setupCleanupHandlers(): void {
    const { timeline, host } = this.config;

    const closeHandler = (hadError: boolean) => {
      timeline.add('info', 'Socket: close event');
      if (hadError) {
        timeline.add('info', 'Closing connection');
      } else {
        timeline.add('info', `Connection #0 to host ${host} left intact`);
      }
      this.cleanup();
    };

    const endHandler = () => {
      timeline.add('info', 'Socket: end event');
      this.cleanup();
    };

    const destroyHandler = () => {
      timeline.add('info', 'Socket: destroy event');
      this.cleanup();
    };

    this.addEventListenerOnce('close', closeHandler);
    this.addEventListenerOnce('end', endHandler);
    this.addEventListenerOnce('destroy', destroyHandler);
  }

  /**
   * Log TLS connection details
   */
  private logTLSDetails(socket: any, timeline: T_LoggerInstance): void {
    try {
      timeline.add('tls', 'Axios currently only supports: http/1.1');
      
      // ALPN negotiation
      const alpnProtocol = socket?.alpnProtocol;
      if (alpnProtocol) {
        timeline.add('tls', `ALPN: server accepted ${alpnProtocol}`);
      } else {
        timeline.add('tls', 'ALPN: server did not agree to a protocol');
      }

      // TLS version and cipher
      const protocol = socket?.getProtocol?.();
      const cipher = socket?.getCipher?.();
      
      if (protocol && cipher) {
        const cipherName = cipher.name || 'unknown';
        timeline.add('tls', `SSL connection using ${protocol} / ${cipherName}`);
      }
    } catch (error) {
      timeline.add('error', `Failed to log TLS details: ${(error as Error).message}`);
    }
  }

  /**
   * Add event listener that fires once
   */
  private addEventListenerOnce(event: string, listener: Function): void {
    const { socket } = this.config;
    if (!socket || this.isCleanedUp) return;

    const onceListener = (...args: any[]) => {
      this.eventListeners.delete(event);
      listener(...args);
    };

    this.eventListeners.set(event, onceListener);
    if (typeof socket.once === 'function') {
      socket.once(event, onceListener);
    }
  }

  /**
   * Add event listener that can fire multiple times
   */
  private addEventListener(event: string, listener: Function): void {
    const { socket } = this.config;
    if (!socket || this.isCleanedUp) return;

    this.eventListeners.set(event, listener);
    if (typeof socket.on === 'function') {
      socket.on(event, listener);
    }
  }
} 