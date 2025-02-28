const parseUrl = require('url').parse;
const { isEmpty } = require('lodash');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');


const DEFAULT_PORTS = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
/**
 * check for proxy bypass, copied form 'proxy-from-env'
 */
const shouldUseProxy = (url, proxyBypass) => {
  if (proxyBypass === '*') {
    return false; // Never proxy if wildcard is set.
  }

  // use proxy if no proxyBypass is set
  if (!proxyBypass || typeof proxyBypass !== 'string' || isEmpty(proxyBypass.trim())) {
    return true;
  }

  const parsedUrl = typeof url === 'string' ? parseUrl(url) : url || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  let port = parsedUrl.port;
  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return false; // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(':', 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, '');
  port = parseInt(port) || DEFAULT_PORTS[proto] || 0;

  return proxyBypass.split(/[,;\s]/).every(function (dontProxyFor) {
    if (!dontProxyFor) {
      return true; // Skip zero-length hosts.
    }
    const parsedProxy = dontProxyFor.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : dontProxyFor;
    const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true; // Skip if ports don't match.
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      // No wildcards, so stop proxying if there is an exact match.
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === '*') {
      // Remove leading wildcard.
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    // Stop proxying if the hostname ends with the no_proxy host.
    return !hostname.endsWith(parsedProxyHostname);
  });
};

/**
 * Patched version of HttpsProxyAgent to get around a bug that ignores
 * options like ca and rejectUnauthorized when upgrading the socket to TLS:
 * https://github.com/TooTallNate/proxy-agents/issues/194
 */
class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  constructor(proxy, opts) {
    super(proxy, opts);
    this.constructorOpts = opts;
  }

  async connect(req, opts) {
    const combinedOpts = { ...this.constructorOpts, ...opts };
    return super.connect(req, combinedOpts);
  }
}


const getSystemProxyEnvVariables = () => {
  const platform = process.platform;

  if (platform === 'darwin') {
    try {
      // Get the user's default shell
      const defaultShell = process.env.SHELL || '/bin/bash';
      const shellName = path.basename(defaultShell);

      let shellConfigFile = '';
      const homeDir = os.homedir();

      if (shellName.includes('zsh')) {
        shellConfigFile = path.join(homeDir, '.zshrc');
      } else if (shellName.includes('bash')) {
        shellConfigFile = path.join(homeDir, '.bashrc');
      } else {
        shellConfigFile = path.join(homeDir, `.${shellName}rc`);
      }
      let shellProxyEnv = {};
      if (fs.existsSync(shellConfigFile)) {
        shellProxyEnv = parseShellConfigFile(shellConfigFile);
      }

      // If shell proxy variables are available, give them priority
      if (
        shellProxyEnv.http_proxy ||
        shellProxyEnv.HTTP_PROXY ||
        shellProxyEnv.https_proxy ||
        shellProxyEnv.HTTPS_PROXY ||
        shellProxyEnv.no_proxy ||
        shellProxyEnv.NO_PROXY
      ) {
        return {
          http_proxy: shellProxyEnv.http_proxy || shellProxyEnv.HTTP_PROXY || null,
          https_proxy: shellProxyEnv.https_proxy || shellProxyEnv.HTTPS_PROXY || null,
          no_proxy: shellProxyEnv.no_proxy || shellProxyEnv.NO_PROXY || null,
        };
      } else {
        // Use "scutil --proxy" to get system-level proxy settings
        const systemProxyEnv = getSystemLevelProxies();
        return systemProxyEnv;
      }
    } catch (error) {
      console.error('Error retrieving proxy settings on macOS:', error.message);
    }
  }

  const { http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY, no_proxy, NO_PROXY } = process.env;
  return {
    http_proxy: http_proxy || HTTP_PROXY || null,
    https_proxy: https_proxy || HTTPS_PROXY || null,
    no_proxy: no_proxy || NO_PROXY || null,
  };
};

function parseShellConfigFile(configFilePath) {
  try {
    const content = fs.readFileSync(configFilePath, { encoding: 'utf8' });
    const proxyEnv = {};

    // Regex to match export statements for proxy variables
    // Handles variations like: export http_proxy="value", export http_proxy='value', export http_proxy=value
    const proxyVars = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'];
    const exportRegex = new RegExp(
      `^\\s*(?:export\\s+)?(${proxyVars.join('|')})\\s*=\\s*['"]?([^'"\n\\s]+)['"]?\\s*$`,
      'gm'
    );

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const key = match[1];
      const value = match[2];
      proxyEnv[key] = value;
    }

    return proxyEnv;
  } catch (error) {
    console.error('Error parsing shell configuration file:', error.message);
    return {};
  }
}

// Helper function to get system-level proxy settings using "scutil --proxy"
function getSystemLevelProxies() {
  try {
    const scutilOutput = execSync('scutil --proxy', { encoding: 'utf8' });
    const proxies = {};
    const lines = scutilOutput.split('\n');
    lines.forEach((line) => {
      const [key, value] = line.split(' : ').map((s) => s.trim());
      if (key && value) {
        proxies[key] = value;
      }
    });

    const httpEnable = proxies['HTTPEnable'] === '1';
    const httpProxy = httpEnable ? `${proxies['HTTPProxy']}:${proxies['HTTPPort']}` : null;

    const httpsEnable = proxies['HTTPSEnable'] === '1';
    const httpsProxy = httpsEnable ? `${proxies['HTTPSProxy']}:${proxies['HTTPSPort']}` : null;

    const noProxyList = proxies['ExceptionsList'] ? proxies['ExceptionsList'] : null;
    let noProxy = null;
    if (noProxyList) {
      noProxy = noProxyList.replace(/[(),\n]/g, '').trim().split(' ').join(',');
    }

    return {
      http_proxy: httpProxy,
      https_proxy: httpsProxy,
      no_proxy: noProxy,
    };
  } catch (error) {
    console.error('Error retrieving system-level proxies:', error.message);
    return {
      http_proxy: null,
      https_proxy: null,
      no_proxy: null,
    };
  }
}


module.exports = {
  shouldUseProxy,
  PatchedHttpsProxyAgent,
  getSystemProxyEnvVariables
};
