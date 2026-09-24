import { getHTMLFromFragment } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import { ALIGNMENTS } from '../extensions/EditorTableAlignment';

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
    entries.push({
      attrs: listItem.attrs,
      blocks: childNodes(listItem),
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
      state.write('\n');
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

const countPrecedingSiblingsOfSameType = (node, parent, index) => {
  let count = 0;

  for (; index - count > 0; count += 1) {
    if (parent.child(index - count - 1).type.name !== node.type.name) {
      break;
    }
  }

  return count;
};

// CommonMark merges two adjacent ordered lists that use the same `.`/`)`
// separator into a single list. The ProseMirror doc has no field for the
// separator the source markdown originally used (it carries no semantic
// meaning — only the numbering does), so alternating the separator by
// position in a run of adjacent ordered lists is how re-serialization keeps
// them visually and structurally distinct instead of merging on reparse.
const serializeOrderedList = (state, node, parent, index) => {
  const start = node.attrs.start || 1;
  const entries = flattenListItemParagraphs(node);
  const maxW = String(start + entries.length - 1).length;
  const space = state.repeat(' ', maxW + 2);
  const precedingSiblingCount = parent ? countPrecedingSiblingsOfSameType(node, parent, index) : 0;
  const separator = precedingSiblingCount % 2 ? ') ' : '. ';

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

const CODE_SPAN_PATTERN = /(`+)[\s\S]*?\1/g;

const escapePipesAndNewlines = (text) => text.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br/>');

// Backslash escapes (and the table-cell delimiter itself) aren't processed
// inside a code span, so pipes/newlines captured from one must be left as-is
// — only the text outside code spans needs escaping.
const escapeTableCellText = (text) => {
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(CODE_SPAN_PATTERN)) {
    result += escapePipesAndNewlines(text.slice(lastIndex, match.index));
    result += match[0];
    lastIndex = match.index + match[0].length;
  }
  result += escapePipesAndNewlines(text.slice(lastIndex));

  return result;
};

const serializeTableCell = (state, cell) => {
  const start = state.out.length;
  serializeInlineBlocks(state, cell);
  state.out = state.out.slice(0, start) + escapeTableCellText(state.out.slice(start));
};

const getColumnAlignment = (cell) => {
  const { alignment } = cell?.attrs || {};
  return ALIGNMENTS.includes(alignment) ? alignment : null;
};

const serializeDelimiterCell = (alignment) => {
  if (alignment === 'center') return ':---:';
  if (alignment === 'right') return '---:';
  if (alignment === 'left') return ':---';
  return '---';
};

// getHTMLFromFragment renders through the schema's own toDOM, which carries
// editor-only presentation (the `editor-table` class, resize-tracking
// `colgroup`/`colwidth`/inline widths) that has no meaning once it's sitting
// in the user's markdown file.
const stripEditorPresentationMarkup = (html) => html
  .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '')
  .replace(/\s(?:class|style|colwidth)="[^"]*"/g, '');

const serializeTableAsHtml = (state, node) => {
  const html = getHTMLFromFragment(Fragment.from(node), node.type.schema);
  const cleaned = stripEditorPresentationMarkup(html);
  const formatted = cleaned.replace(/><(?!\/table)/g, '>\n<');

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
      const delimiterRow = childNodes(row)
        .map((headerCell) => serializeDelimiterCell(getColumnAlignment(headerCell)))
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
