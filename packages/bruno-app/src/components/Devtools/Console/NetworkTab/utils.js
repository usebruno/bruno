export const getGridTemplate = (columns) =>
  columns.map((c) => (c.width ? `${c.width}px` : '1fr')).join(' ');

export const getSeparatorPositions = (columns) => {
  const n = columns.length;
  const positions = new Array(n - 1).fill(null);

  let leftOffset = 0;
  for (let i = 0; i < n - 1; i++) {
    if (columns[i].width === null) break;
    leftOffset += columns[i].width;
    positions[i] = { left: leftOffset };
  }

  let rightOffset = 0;
  for (let i = n - 1; i > 0; i--) {
    if (columns[i].width === null) break;
    rightOffset += columns[i].width;
    if (positions[i - 1] === null) {
      positions[i - 1] = { right: rightOffset };
    }
  }

  return positions;
};

export const getSortValue = (request, key) => {
  const { request: req, response: res, timestamp } = request.data;
  switch (key) {
    case 'method': return req?.method?.toUpperCase() ?? '';
    case 'status': return res?.statusCode || res?.status || 0;
    case 'domain': {
      try { return new URL(req?.url || '').hostname; } catch { return req?.url || ''; }
    }
    case 'path': {
      try {
        const u = new URL(req?.url || '');
        return u.pathname + u.search;
      } catch { return req?.url || ''; }
    }
    case 'time': return timestamp || 0;
    case 'duration': return res?.duration || 0;
    case 'size': return res?.size || 0;
    default: return '';
  }
};

export const sortRequests = (requests, key, direction) => {
  if (!key || !direction) return requests;
  return [...requests].sort((a, b) => {
    const valueA = getSortValue(a, key);
    const valueB = getSortValue(b, key);
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};
