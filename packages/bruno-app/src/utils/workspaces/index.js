// Utility functions for workspace pinning and reordering

export const sortWorkspaces = (workspaces, preferences) => {
  const pinnedUids = preferences?.workspaces?.pinnedWorkspaceUids || [];
  const pinnedOrder = preferences?.workspaces?.pinnedOrder || [];
  const unpinnedOrder = preferences?.workspaces?.unpinnedOrder || [];

  const defaultWs = workspaces.find((w) => w.type === 'default');
  const pinnedWs = workspaces.filter((w) => w.type !== 'default' && pinnedUids.includes(w.uid));
  const unpinnedWs = workspaces.filter((w) => w.type !== 'default' && !pinnedUids.includes(w.uid));

  const sortedPinned = [...pinnedWs].sort((a, b) => {
    const aIndex = pinnedOrder.indexOf(a.uid);
    const bIndex = pinnedOrder.indexOf(b.uid);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return (a.name || '').localeCompare(b.name || '');
  });

  const sortedUnpinned = [...unpinnedWs].sort((a, b) => {
    const aIndex = unpinnedOrder.indexOf(a.uid);
    const bIndex = unpinnedOrder.indexOf(b.uid);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return (a.name || '').localeCompare(b.name || '');
  });

  // Combine: default -> pinned -> unpinned
  return [
    ...(defaultWs ? [defaultWs] : []),
    ...sortedPinned,
    ...sortedUnpinned
  ];
};

export const toggleWorkspacePin = (workspaceUid, preferences) => {
  const pinnedUids = preferences?.workspaces?.pinnedWorkspaceUids || [];
  const pinnedOrder = preferences?.workspaces?.pinnedOrder || [];
  const unpinnedOrder = preferences?.workspaces?.unpinnedOrder || [];

  const isPinned = pinnedUids.includes(workspaceUid);

  if (isPinned) {
    return {
      ...preferences,
      workspaces: {
        ...preferences.workspaces,
        pinnedWorkspaceUids: pinnedUids.filter((uid) => uid !== workspaceUid),
        pinnedOrder: pinnedOrder.filter((uid) => uid !== workspaceUid),
        unpinnedOrder: [...unpinnedOrder, workspaceUid]
      }
    };
  } else {
    return {
      ...preferences,
      workspaces: {
        ...(preferences?.workspaces || {}),
        pinnedWorkspaceUids: [...pinnedUids, workspaceUid],
        pinnedOrder: [...pinnedOrder, workspaceUid],
        unpinnedOrder: unpinnedOrder.filter((uid) => uid !== workspaceUid)
      }
    };
  }
};

export const reorderWorkspaces = (draggedUid, targetUid, dropPosition, preferences) => {
  const pinnedUids = preferences?.workspaces?.pinnedWorkspaceUids || [];
  const pinnedOrder = preferences?.workspaces?.pinnedOrder || [];
  const unpinnedOrder = preferences?.workspaces?.unpinnedOrder || [];

  const isDraggedPinned = pinnedUids.includes(draggedUid);
  const isTargetPinned = pinnedUids.includes(targetUid);

  if (isDraggedPinned !== isTargetPinned) {
    return preferences;
  }

  const orderArray = isDraggedPinned ? [...pinnedOrder] : [...unpinnedOrder];

  const filteredOrder = orderArray.filter((uid) => uid !== draggedUid);

  let targetIndex = filteredOrder.indexOf(targetUid);

  if (targetIndex === -1) {
    filteredOrder.push(targetUid);
    targetIndex = filteredOrder.length - 1;
  }

  const insertIndex = dropPosition === 'after' ? targetIndex + 1 : targetIndex;
  filteredOrder.splice(insertIndex, 0, draggedUid);

  if (isDraggedPinned) {
    return {
      ...preferences,
      workspaces: {
        ...(preferences?.workspaces || {}),
        pinnedOrder: filteredOrder
      }
    };
  } else {
    return {
      ...preferences,
      workspaces: {
        ...(preferences?.workspaces || {}),
        unpinnedOrder: filteredOrder
      }
    };
  }
};
