const path = require('path');
const { sortByNameThenSequence } = require('../utils/collection');

/**
 * Stamp contiguous seq on folder.bru siblings using current bru display order
 * (sortByNameThenSequence), so yml migration keeps drag/alpha order.
 */
const stampFolderSeqFromDisplayOrder = (folderItems) => {
  const byParent = new Map();

  for (const item of folderItems) {
    const parentPath = path.dirname(item.folderPath);
    if (!byParent.has(parentPath)) {
      byParent.set(parentPath, []);
    }
    byParent.get(parentPath).push(item);
  }

  for (const siblings of byParent.values()) {
    const sorted = sortByNameThenSequence(
      siblings.map((item) => ({
        ...item,
        name: item.name,
        seq: item.seq
      }))
    );

    sorted.forEach((item, index) => {
      if (!item.folderData.meta) {
        item.folderData.meta = {};
      }
      item.folderData.meta.seq = index + 1;
    });
  }

  return folderItems;
};

module.exports = { stampFolderSeqFromDisplayOrder };
