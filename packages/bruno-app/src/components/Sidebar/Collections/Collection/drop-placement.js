export const DROP_PLACEMENTS = {
  BEFORE: 'before',
  INSIDE: 'inside',
  AFTER: 'after'
};

export const resolveCollectionItemDropPlacement = ({ isFolder, rect, clientOffset }) => {
  if (!rect || !clientOffset) {
    return null;
  }

  const relativeY = clientOffset.y - rect.top;

  if (!isFolder) {
    return relativeY < rect.height / 2 ? DROP_PLACEMENTS.BEFORE : DROP_PLACEMENTS.AFTER;
  }

  const upperBoundary = rect.height * 0.35;
  const lowerBoundary = rect.height * 0.65;

  if (relativeY < upperBoundary) {
    return DROP_PLACEMENTS.BEFORE;
  }

  if (relativeY > lowerBoundary) {
    return DROP_PLACEMENTS.AFTER;
  }

  return DROP_PLACEMENTS.INSIDE;
};

export const resolveCollectionDropPlacement = ({ dragType, rect, clientOffset }) => {
  if (dragType === 'collection-item') {
    return DROP_PLACEMENTS.INSIDE;
  }

  if (!rect || !clientOffset) {
    return null;
  }

  const relativeY = clientOffset.y - rect.top;
  return relativeY < rect.height / 2 ? DROP_PLACEMENTS.BEFORE : DROP_PLACEMENTS.AFTER;
};
