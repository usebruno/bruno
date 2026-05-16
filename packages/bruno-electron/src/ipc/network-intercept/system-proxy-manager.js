const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SystemProxyManager {
  /**
   * Set system proxy for the current platform
   * @param {number} port - Proxy port
   */
  async setProxy(port) {
    const platform = process.platform;
    if (platform === 'darwin') {
      return this.setMacOSProxy(port);
    } else if (platform === 'win32') {
      return this.setWindowsProxy(port);
    } else if (platform === 'linux') {
      return this.setLinuxProxy(port);
    }
    throw new Error(`Unsupported platform: ${platform}`);
  }

  /**
   * Clear system proxy for the current platform
   */
  async clearProxy() {
    const platform = process.platform;
    if (platform === 'darwin') {
      return this.clearMacOSProxy();
    } else if (platform === 'win32') {
      return this.clearWindowsProxy();
    } else if (platform === 'linux') {
      return this.clearLinuxProxy();
    }
    throw new Error(`Unsupported platform: ${platform}`);
  }

  async setMacOSProxy(port) {
    const service = await this.getMacOSActiveService();
    // No longer throwing here, we'll use 'Wi-Fi' as a best-effort fallback if discovery fails
    const serviceName = service || 'Wi-Fi';

    try {
      await execPromise(`networksetup -setwebproxy "${serviceName}" 127.0.0.1 ${port}`);
      await execPromise(`networksetup -setsecurewebproxy "${serviceName}" 127.0.0.1 ${port}`);
    } catch (error) {
      if (error.message.includes('requires admin') || error.message.includes('privileges')) {
        throw new Error('Permission denied. Setting system proxy requires administrator privileges.');
      }
      if (error.message.includes('not a recognized network service')) {
        throw new Error(`Failed to set proxy: "${serviceName}" is not a recognized network service. Please set it manually in System Settings.`);
      }
      throw error;
    }
  }

  async clearMacOSProxy() {
    const service = await this.getMacOSActiveService();
    const serviceName = service || 'Wi-Fi';

    try {
      await execPromise(`networksetup -setwebproxystate "${serviceName}" off`);
      await execPromise(`networksetup -setsecurewebproxystate "${serviceName}" off`);
    } catch (error) {
      // Ignore errors on cleanup or if service doesn't exist
    }
  }

  async getMacOSActiveService() {
    try {
      // 1. Try scutil to find the primary interface (more modern and reliable than 'route')
      const { stdout: scutilOut } = await execPromise('scutil --nwi | grep \'Network interfaces:\' | head -n 1 | cut -d: -f2 | awk \'{print $1}\'');
      let iface = scutilOut.trim();

      // 2. Fallback to 'route' if scutil fails
      if (!iface) {
        const { stdout: routeOut } = await execPromise('route -n get default | grep interface | awk \'{print $2}\'');
        iface = routeOut.trim();
      }

      if (!iface) return null;

      // 3. Map interface (en0) to service name (Wi-Fi)
      const { stdout: serviceOut } = await execPromise(`networksetup -listnetworkserviceorder | grep -B 1 "Device: ${iface}" | head -n 1`);

      // Expected output: (Hardware Port: Wi-Fi, Device: en0)
      const match = serviceOut.match(/Hardware Port: ([^,]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }

      return null;
    } catch (e) {
      console.error('Failed to discover active macOS network service:', e);
      return null;
    }
  }

  async setWindowsProxy(port) {
    const server = `127.0.0.1:${port}`;
    try {
      await execPromise(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
      await execPromise(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${server}" /f`);
      // Notify system of change
      await execPromise(`powershell.exe -command "$reg = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; Set-ItemProperty -Path $reg -Name ProxyEnable -Value 1"`);
    } catch (error) {
      throw new Error(`Failed to set Windows proxy: ${error.message}`);
    }
  }

  async clearWindowsProxy() {
    try {
      await execPromise(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
    } catch (error) {
      throw new Error(`Failed to clear Windows proxy: ${error.message}`);
    }
  }

  async setLinuxProxy(port) {
    try {
      await execPromise(`gsettings set org.gnome.system.proxy mode 'manual'`);
      await execPromise(`gsettings set org.gnome.system.proxy.http host '127.0.0.1'`);
      await execPromise(`gsettings set org.gnome.system.proxy.http port ${port}`);
      await execPromise(`gsettings set org.gnome.system.proxy.https host '127.0.0.1'`);
      await execPromise(`gsettings set org.gnome.system.proxy.https port ${port}`);
    } catch (error) {
      throw new Error(`Failed to set Linux proxy (GNOME): ${error.message}`);
    }
  }

  async clearLinuxProxy() {
    try {
      await execPromise(`gsettings set org.gnome.system.proxy mode 'none'`);
    } catch (error) {
      throw new Error(`Failed to clear Linux proxy: ${error.message}`);
    }
  }
}

module.exports = new SystemProxyManager();
