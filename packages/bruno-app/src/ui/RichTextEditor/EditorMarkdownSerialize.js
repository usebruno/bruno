import { getHTMLFromFragment } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';

const childNodes = (node) => node?.content?.content ?? [];

const hasSpan = (node) => node.attrs.colspan > 1 || node.attrs.rowspan > 1;

const isMarkdownSerializableTable = (node) => {
  const rows = childNodes(node);
  const firstRow = rows[0];
  const bodyRows = rows.slice(1);

  if (!firstRow) {
    return false;
  }

  if (childNodes(firstRow).some((cell) => cell.type.name !== 'tableHeader' || hasSpan(cell))) {
    return false;
  }

  if (
    bodyRows.some((row) =>
      childNodes(row).some((cell) => cell.type.name === 'tableHeader' || hasSpan(cell))
    )
  ) {
    return false;
  }

  return true;
};

const flattenListItemParagraphs = (listNode) => {
  const entries = [];

  listNode.forEach((listItem) => {
    const blocks = childNodes(listItem);
    const allParagraphs = blocks.length > 0 && blocks.every((block) => block.type.name === 'paragraph');

    if (allParagraphs && blocks.length > 1) {
      blocks.forEach((paragraph) => {
        entries.push({
          attrs: listItem.attrs,
          blocks: [paragraph],
          itemType: listItem.type.name
        });
      });
      return;
    }

    entries.push({
      attrs: listItem.attrs,
      blocks,
      itemType: listItem.type.name
    });
  });

  return entries;
};

const serializeFlattenedEntryContent = (state, entry) => {
  state.inListItem = true;

  if (entry.itemType === 'taskItem') {
    const check = entry.attrs.checked ? '[x]' : '[ ]';
    state.write(`${check} `);
  }

  entry.blocks.forEach((block, blockIndex) => {
    if (blockIndex) {
      state.write('<br/>');
    }

    if (block.isTextblock) {
      if (block.textContent.length || block.content.size > 0) {
        state.renderInline(block);
      }
      return;
    }

    state.render(block, null, blockIndex);
  });

  state.inListItem = false;
};

const renderFlattenedListEntries = (state, node, entries, delim, getMarker) => {
  const previousTight = state.inTightList;
  state.inTightList = true;

  entries.forEach((entry, index) => {
    if (index) {
      state.flushClose(1);
    }

    state.wrapBlock(delim, getMarker(index, entry), node, () => {
      serializeFlattenedEntryContent(state, entry);
    });
  });

  state.inTightList = previousTight;
  state.closeBlock(node);
};

const serializeBulletList = (state, node) => {
  const marker = `${state.editor?.storage?.markdown?.options?.bulletListMarker || '-'}`;
  const entries = flattenListItemParagraphs(node);

  renderFlattenedListEntries(state, node, entries, '  ', () => `${marker} `);
};

const findIndexOfAdjacentNode = (node, parent, index) => {
  let adjacentIndex = 0;

  for (; index - adjacentIndex > 0; adjacentIndex += 1) {
    if (parent.child(index - adjacentIndex - 1).type.name !== node.type.name) {
      break;
    }
  }

  return adjacentIndex;
};

const serializeOrderedList = (state, node, parent, index) => {
  const start = node.attrs.start || 1;
  const entries = flattenListItemParagraphs(node);
  const maxW = String(start + entries.length - 1).length;
  const space = state.repeat(' ', maxW + 2);
  const adjacentIndex = parent ? findIndexOfAdjacentNode(node, parent, index) : 0;
  const separator = adjacentIndex % 2 ? ') ' : '. ';

  renderFlattenedListEntries(state, node, entries, space, (entryIndex) => {
    const number = String(start + entryIndex);

    return state.repeat(' ', maxW - number.length) + number + separator;
  });
};

const serializeTaskList = (state, node) => {
  const entries = flattenListItemParagraphs(node);

  renderFlattenedListEntries(state, node, entries, '  ', () => '- ');
};

const serializeListItemContent = (state, node) => {
  state.inListItem = true;
  state.renderContent(node);
  state.inListItem = false;
};

const serializeInlineBlocks = (state, parent, separator = '<br/>') => {
  let first = true;

  parent.forEach((block) => {
    if (!first) {
      state.write(separator);
    }

    first = false;

    if (block.isTextblock) {
      if (block.textContent.length || block.content.size > 0) {
        state.renderInline(block);
      }
      return;
    }

    state.render(block, parent, 0);
  });
};

const serializeTableCell = (state, cell) => {
  serializeInlineBlocks(state, cell);
};

const serializeTableAsHtml = (state, node) => {
  const html = getHTMLFromFragment(Fragment.from(node), node.type.schema);
  const formatted = html.replace(/><(?!\/table)/g, '>\n<');

  state.write(formatted);
  state.closeBlock(node);
};

const serializeTable = (state, node) => {
  if (!isMarkdownSerializableTable(node)) {
    serializeTableAsHtml(state, node);
    return;
  }

  state.inTable = true;

  node.forEach((row, _p, rowIndex) => {
    state.write('| ');

    row.forEach((cell, _cp, cellIndex) => {
      if (cellIndex) {
        state.write(' | ');
      }

      serializeTableCell(state, cell);
    });

    state.write(' |');
    state.ensureNewLine();

    if (!rowIndex) {
      const delimiterRow = Array.from({ length: row.childCount })
        .map(() => '---')
        .join(' | ');

      state.write(`| ${delimiterRow} |`);
      state.ensureNewLine();
    }
  });

  state.closeBlock(node);
  state.inTable = false;
};

export {
  serializeBulletList,
  serializeListItemContent,
  serializeOrderedList,
  serializeTable,
  serializeTaskList
};
