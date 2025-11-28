const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

class SshConnectionManager {
  constructor() {
    this.connections = new Map(); // Map of connectionId -> { client, config, lastUsed }
    this.connectionTimeout = 30 * 60 * 1000; // 30 minutes

    // Cleanup inactive connections periodically
    setInterval(() => this.cleanupInactiveConnections(), 5 * 60 * 1000);
  }

  /**
     * Generate a unique connection ID from config
     */
  getConnectionId(config) {
    return `${config.username}@${config.host}:${config.port || 22}`;
  }

  /**
     * Connect to SSH server
     */
  async connect(config) {
    const connectionId = this.getConnectionId(config);

    // Reuse existing connection if available
    if (this.connections.has(connectionId)) {
      const conn = this.connections.get(connectionId);
      conn.lastUsed = Date.now();
      return connectionId;
    }

    const sftp = new SftpClient();

    try {
      const connectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username
      };

      // Handle authentication
      if (config.privateKey) {
        // Private key authentication
        const keyPath = config.privateKey;
        if (fs.existsSync(keyPath)) {
          connectConfig.privateKey = fs.readFileSync(keyPath);
          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase;
          }
        } else {
          throw new Error(`Private key file not found: ${keyPath}`);
        }
      } else if (config.password) {
        // Password authentication
        connectConfig.password = config.password;
      } else {
        throw new Error('Either privateKey or password must be provided');
      }

      await sftp.connect(connectConfig);

      this.connections.set(connectionId, {
        client: sftp,
        config: config,
        lastUsed: Date.now()
      });

      console.log(`SSH connection established: ${connectionId}`);
      return connectionId;
    } catch (error) {
      console.error(`Failed to connect to SSH server: ${error.message}`);
      throw new Error(`SSH Connection Failed: ${error.message}`);
    }
  }

  /**
     * Get an active SFTP client
     */
  getClient(connectionId) {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error('Connection not found. Please reconnect.');
    }
    conn.lastUsed = Date.now();
    return conn.client;
  }

  /**
     * Disconnect from SSH server
     */
  async disconnect(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      try {
        await conn.client.end();
        this.connections.delete(connectionId);
        console.log(`SSH connection closed: ${connectionId}`);
      } catch (error) {
        console.error(`Error closing SSH connection: ${error.message}`);
      }
    }
  }

  /**
     * Disconnect all connections
     */
  async disconnectAll() {
    const promises = Array.from(this.connections.keys()).map((id) => this.disconnect(id));
    await Promise.all(promises);
  }

  /**
     * Cleanup inactive connections
     */
  async cleanupInactiveConnections() {
    const now = Date.now();
    for (const [connectionId, conn] of this.connections.entries()) {
      if (now - conn.lastUsed > this.connectionTimeout) {
        console.log(`Closing inactive connection: ${connectionId}`);
        await this.disconnect(connectionId);
      }
    }
  }

  /**
     * Get all active connection IDs
     */
  getActiveConnections() {
    return Array.from(this.connections.keys());
  }
}

// Singleton instance
const sshConnectionManager = new SshConnectionManager();

module.exports = sshConnectionManager;
