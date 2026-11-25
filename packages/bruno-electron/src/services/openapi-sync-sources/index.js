const net = require('node:net');
const { OpenApiSyncSourcesStore, toAutoCheckInterval } = require('../../store/openapi-sync-sources');

let sourcesStore;
const getStore = () => sourcesStore || (sourcesStore = new OpenApiSyncSourcesStore());

// Synced here before this release: approved once, keeping the auto check settings from the collection file.
const migrateSyncedSource = ({ collectionPath, sourceKey, syncConfig, syncedSourceKey }) => {
  if (!sourceKey || syncedSourceKey !== sourceKey) {
    return null;
  }
  const record = {
    approvedSource: sourceKey,
    autoCheck: syncConfig?.autoCheck !== false,
    autoCheckInterval: toAutoCheckInterval(syncConfig?.autoCheckInterval)
  };
  getStore().set(collectionPath, record);
  return record;
};

const getSourceRecord = (args) => getStore().get(args.collectionPath) || migrateSyncedSource(args);

const getSourceState = (args) => {
  const record = getSourceRecord(args);
  const isApproved = Boolean(args.sourceKey) && record?.approvedSource === args.sourceKey;
  const isDismissed = !isApproved && Boolean(args.sourceKey) && record?.dismissedSource === args.sourceKey;
  return {
    status: isApproved ? 'approved' : isDismissed ? 'dismissed' : 'pending',
    autoCheck: isApproved && record.autoCheck !== false,
    autoCheckInterval: toAutoCheckInterval(record?.autoCheckInterval)
  };
};

const isSourceApproved = (args) => getSourceState(args).status === 'approved';

const approveSource = ({ collectionPath, sourceKey, autoCheck, autoCheckInterval }) => {
  const previous = getStore().get(collectionPath) || {};
  getStore().set(collectionPath, {
    approvedSource: sourceKey,
    autoCheck: typeof autoCheck === 'boolean' ? autoCheck : previous.autoCheck !== false,
    autoCheckInterval: toAutoCheckInterval(autoCheckInterval ?? previous.autoCheckInterval)
  });
};

const dismissSource = ({ collectionPath, sourceKey }) => {
  const { approvedSource, ...previous } = getStore().get(collectionPath) || {};
  getStore().set(collectionPath, {
    ...previous,
    ...(approvedSource && approvedSource !== sourceKey ? { approvedSource } : {}),
    dismissedSource: sourceKey
  });
};

const forgetSource = (collectionPath) => getStore().remove(collectionPath);

const isPrivateIPv4 = (ip) => {
  const [a, b] = ip.split('.').map(Number);
  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
};

const isPrivateIPv6 = (ip) => {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const [high, low] = mappedHex.slice(1).map((part) => parseInt(part, 16));
    return isPrivateIPv4([high >> 8, high & 255, low >> 8, low & 255].join('.'));
  }
  return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
};

// Banner hint only, not a security check; a host with no dot is usually an internal name.
const isLocalOrPrivateHost = (hostname) => {
  const host = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (net.isIPv4(host)) return isPrivateIPv4(host);
  if (net.isIPv6(host)) return isPrivateIPv6(host);
  return !host.includes('.');
};

const describeSource = (sourceKey) => {
  try {
    const url = new URL(sourceKey);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { kind: 'url', isLocalOrPrivate: isLocalOrPrivateHost(url.hostname) };
    }
  } catch {
    // not a URL, so a file path
  }
  // UNC paths are read over the network.
  if (/^(\\\\|\/\/)/.test(sourceKey)) {
    return { kind: 'network-share', isLocalOrPrivate: true };
  }
  return { kind: 'file', isLocalOrPrivate: true };
};

module.exports = {
  getSourceState,
  isSourceApproved,
  approveSource,
  dismissSource,
  forgetSource,
  describeSource,
  isLocalOrPrivateHost
};
