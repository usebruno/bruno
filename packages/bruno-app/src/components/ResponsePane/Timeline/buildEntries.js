export const getEntryKind = (entry) => {
  if (entry.type === 'request') return 'main';
  if (entry.type === 'oauth2') return 'oauth';
  if (entry.type === 'scripted-request') {
    // 'post-response' and 'tests' both run after the main response — bucket together.
    if (entry.phase === 'post-response' || entry.phase === 'tests') return 'post';
    return 'pre';
  }
  return 'main';
};

const findPairedMainTimestamps = (fullTimeline) => {
  const map = new Map();
  fullTimeline.forEach((entry, idx) => {
    if (entry.type !== 'oauth2') return;
    for (let j = idx + 1; j < fullTimeline.length; j++) {
      const candidate = fullTimeline[j];
      if (
        candidate.type === 'request'
        && candidate.itemUid === entry.itemUid
        && typeof candidate.timestamp === 'number'
      ) {
        map.set(idx, candidate.timestamp);
        break;
      }
    }
  });
  return map;
};

const isVisibleEntry = (entry, itemUid, authSource) => {
  if (entry.itemUid === itemUid) return true;
  if (entry.type === 'oauth2' && authSource) {
    if (authSource.type === 'folder' && entry.folderUid === authSource.uid) return true;
    if (authSource.type === 'collection' && !entry.folderUid) return true;
  }
  return false;
};

const expandOauthEntry = (entry, paired) => {
  const debugInfo = entry.data?.debugInfo || [];
  if (debugInfo.length === 0) {
    return [{ ...entry, timestamp: paired != null ? paired - 1 : entry.timestamp }];
  }
  const n = debugInfo.length;
  const mainAnchor = paired != null ? paired : entry.timestamp + n;
  return debugInfo.map((sub, i) => ({
    ...entry,
    timestamp: mainAnchor - (n - i),
    _oauth2Child: sub
  }));
};

export const buildTimelineEntries = (timeline, itemUid, authSource) => {
  const fullTimeline = timeline || [];
  const visible = fullTimeline.filter((entry) => isVisibleEntry(entry, itemUid, authSource));
  const pairedMainByOauthIdx = findPairedMainTimestamps(fullTimeline);

  const flat = [];
  visible.forEach((entry) => {
    if (entry.type === 'oauth2') {
      const paired = pairedMainByOauthIdx.get(fullTimeline.indexOf(entry));
      flat.push(...expandOauthEntry(entry, paired));
    } else {
      flat.push(entry);
    }
  });

  return flat.sort((a, b) => b.timestamp - a.timestamp);
};

export const countByKind = (entries) => {
  const counts = { all: entries.length, main: 0, pre: 0, post: 0, oauth: 0 };
  entries.forEach((entry) => {
    const kind = getEntryKind(entry);
    if (counts[kind] != null) counts[kind]++;
  });
  return counts;
};
