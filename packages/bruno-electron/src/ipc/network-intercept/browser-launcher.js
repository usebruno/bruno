const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const { nanoid } = require('nanoid');

const BROWSER_CONFIGS = {
  chrome: {
    name: 'Google Chrome',
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      `${os.homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    ]
  },
  edge: {
    name: 'Microsoft Edge',
    darwin: [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      `${os.homedir()}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`
    ],
    win32: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ],
    linux: [
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable'
    ]
  },
  firefox: {
    name: 'Mozilla Firefox',
    darwin: [
      '/Applications/Firefox.app/Contents/MacOS/firefox',
      `${os.homedir()}/Applications/Firefox.app/Contents/MacOS/firefox`
    ],
    win32: [
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
    ],
    linux: [
      '/usr/bin/firefox',
      '/usr/bin/firefox-esr',
      '/snap/bin/firefox'
    ]
  },
  brave: {
    name: 'Brave Browser',
    darwin: [
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      `${os.homedir()}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
    ],
    win32: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    ],
    linux: [
      '/usr/bin/brave-browser',
      '/usr/bin/brave',
      '/snap/bin/brave'
    ]
  }
  // Note: Safari is not supported because it uses system proxy settings
  // and cannot be configured per-instance via command-line arguments.
  // Users who want to intercept Safari traffic should use the Terminal Setup
  // option and configure macOS system proxy settings manually.
};

class BrowserLauncher {
  constructor() {
    this.launchedBrowsers = new Map();
    this.tempProfileDir = path.join(app.getPath('userData'), 'browser-profiles');
  }

  /**
   * Detect installed browsers
   * @returns {Array} List of available browsers
   */
  async detectBrowsers() {
    const platform = process.platform;
    const available = [];

    for (const [browserType, config] of Object.entries(BROWSER_CONFIGS)) {
      const paths = config[platform] || [];
      for (const browserPath of paths) {
        if (fs.existsSync(browserPath)) {
          available.push({
            type: browserType,
            name: config.name,
            path: browserPath
          });
          break; // Found this browser, move to next
        }
      }
    }

    return available;
  }

  /**
   * Find browser executable path
   * @param {string} browserType - Type of browser (chrome, edge, firefox, brave)
   * @returns {string|null} Path to browser executable
   */
  findBrowserPath(browserType) {
    const platform = process.platform;
    const config = BROWSER_CONFIGS[browserType];

    if (!config) {
      return null;
    }

    const paths = config[platform] || [];
    for (const browserPath of paths) {
      if (fs.existsSync(browserPath)) {
        return browserPath;
      }
    }

    return null;
  }

  /**
   * Create a temporary profile directory for sandboxed browsing
   * @param {string} browserId - Unique ID for this browser instance
   * @returns {string} Path to temp profile
   */
  createTempProfile(browserId) {
    const profilePath = path.join(this.tempProfileDir, browserId);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    return profilePath;
  }

  /**
   * Get browser launch arguments for proxy configuration
   * @param {string} browserType - Type of browser
   * @param {number} proxyPort - Proxy port
   * @param {string} profilePath - Path to temp profile
   * @returns {Array} Launch arguments
   */
  getBrowserArgs(browserType, proxyPort, profilePath) {
    const proxyServer = `http://127.0.0.1:${proxyPort}`;

    // Common Chromium-based args
    const chromiumArgs = [
      `--proxy-server=${proxyServer}`,
      `--user-data-dir=${profilePath}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-features=TranslateUI',
      '--ignore-certificate-errors', // Accept our MITM certs
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list',
      '--allow-insecure-localhost',
      'about:blank'
    ];

    switch (browserType) {
      case 'chrome':
      case 'edge':
      case 'brave':
        return chromiumArgs;

      case 'firefox':
        // Firefox uses different proxy configuration
        // We need to set preferences via user.js
        this.createFirefoxProfile(profilePath, proxyPort);
        return [
          '-profile', profilePath,
          '-no-remote',
          'about:blank'
        ];

      default:
        return chromiumArgs;
    }
  }

  /**
   * Create Firefox profile with proxy settings
   * @param {string} profilePath - Profile directory
   * @param {number} proxyPort - Proxy port
   */
  createFirefoxProfile(profilePath, proxyPort) {
    const userJs = `
// Bruno Network Intercept Proxy Settings
user_pref("network.proxy.type", 1);
user_pref("network.proxy.http", "127.0.0.1");
user_pref("network.proxy.http_port", ${proxyPort});
user_pref("network.proxy.ssl", "127.0.0.1");
user_pref("network.proxy.ssl_port", ${proxyPort});
user_pref("network.proxy.no_proxies_on", "");
user_pref("security.enterprise_roots.enabled", true);
user_pref("security.cert_pinning.enforcement_level", 0);
user_pref("security.mixed_content.block_active_content", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
`;
    fs.writeFileSync(path.join(profilePath, 'user.js'), userJs);
  }

  /**
   * Launch a browser with proxy configuration
   * @param {string} browserType - Type of browser to launch
   * @param {number} proxyPort - Proxy port to use
   * @returns {Object} Browser instance info
   */
  async launch(browserType, proxyPort) {
    const browserPath = this.findBrowserPath(browserType);
    if (!browserPath) {
      throw new Error(`Browser "${browserType}" not found on this system`);
    }

    const browserId = nanoid();
    const profilePath = this.createTempProfile(browserId);
    const args = this.getBrowserArgs(browserType, proxyPort, profilePath);

    console.log(`Launching ${browserType} with proxy on port ${proxyPort}`);
    console.log(`Browser path: ${browserPath}`);
    console.log(`Profile path: ${profilePath}`);

    const process = spawn(browserPath, args, {
      detached: true,
      stdio: 'ignore'
    });

    process.unref();

    const browserInfo = {
      id: browserId,
      type: browserType,
      name: BROWSER_CONFIGS[browserType].name,
      pid: process.pid,
      profilePath,
      launchedAt: new Date().toISOString()
    };

    this.launchedBrowsers.set(browserId, {
      ...browserInfo,
      process
    });

    // Listen for process exit
    process.on('exit', () => {
      this.launchedBrowsers.delete(browserId);
      this.cleanupProfile(profilePath);
    });

    return browserInfo;
  }

  /**
   * Close a launched browser
   * @param {string} browserId - ID of browser to close
   */
  async close(browserId) {
    const browser = this.launchedBrowsers.get(browserId);
    if (!browser) {
      return;
    }

    try {
      // Try to kill the process
      if (browser.process && !browser.process.killed) {
        browser.process.kill();
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }

    this.launchedBrowsers.delete(browserId);
    this.cleanupProfile(browser.profilePath);
  }

  /**
   * Close all launched browsers
   */
  async closeAll() {
    const promises = [];
    for (const [browserId] of this.launchedBrowsers) {
      promises.push(this.close(browserId));
    }
    await Promise.all(promises);
  }

  /**
   * Get list of launched browsers
   * @returns {Array} List of launched browser info
   */
  getLaunchedBrowsers() {
    const browsers = [];
    for (const [, browser] of this.launchedBrowsers) {
      browsers.push({
        id: browser.id,
        type: browser.type,
        name: browser.name,
        pid: browser.pid,
        launchedAt: browser.launchedAt
      });
    }
    return browsers;
  }

  /**
   * Cleanup temporary profile directory
   * @param {string} profilePath - Path to profile directory
   */
  cleanupProfile(profilePath) {
    try {
      if (fs.existsSync(profilePath)) {
        fs.rmSync(profilePath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error cleaning up profile:', error);
    }
  }
}

// Singleton instance
let browserLauncherInstance = null;

const getBrowserLauncher = () => {
  if (!browserLauncherInstance) {
    browserLauncherInstance = new BrowserLauncher();
  }
  return browserLauncherInstance;
};

module.exports = {
  BrowserLauncher,
  getBrowserLauncher,
  BROWSER_CONFIGS
};
