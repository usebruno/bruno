import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import Paragraph from '@tiptap/extension-paragraph';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorGapCursor from './extensions/EditorGapCursor';
import EditorHardBreak from './extensions/EditorHardBreak';
import { EditorKbd, EditorSuperscript } from './extensions/EditorInlineHtmlMarks';
import EditorListKeyboard from './extensions/EditorListKeyboard';
import { serializeTable } from './utils/editorMarkdownSerialize';
import { createEditorImage, createEditorLink } from './extensions/EditorRelativeAssets';
import EditorRawHtmlBlock from './extensions/EditorRawHtmlBlock';
import { EditorTableCell, EditorTableHeader } from './extensions/EditorTableAlignment';
import EditorTableKeyboard from './extensions/EditorTableKeyboard';
import EditorTableView from './extensions/EditorTableView';
import {
  EditorBulletList,
  EditorListItem,
  EditorOrderedList,
  EditorTaskItem,
  EditorTaskList
} from './extensions/EditorTaskList';

const EditorTable = Table.extend({
  parseHTML() {
    return [{ tag: 'div.tableWrapper > table' }, { tag: 'table' }];
  },
  addStorage() {
    return {
      markdown: {
        serialize: serializeTable,
        parse: {
          updateDOM(element) {
            element.querySelectorAll('div.tableWrapper').forEach((wrapper) => {
              const table = wrapper.querySelector(':scope > table');
              if (table) {
                wrapper.replaceWith(table);
              }
            });
          }
        }
      }
    };
  }
});

const EditorParagraph = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          if (node.content.size === 0) {
            state.write('<br/>');
            state.closeBlock(node);
          } else {
            state.renderInline(node);
            state.closeBlock(node);
          }
        }
      }
    };
  }
});

const createExtensions = ({ allowHtml = true, collectionPath = '' } = {}) => [
  TextStyle.configure({ types: [EditorListItem.name] }),
  StarterKit.configure({
    bulletList: false,
    listItem: false,
    orderedList: false,
    hardBreak: false,
    gapcursor: false,
    paragraph: false
  }),
  EditorParagraph,
  EditorHardBreak,
  EditorListKeyboard,
  EditorBulletList.configure({
    keepMarks: true,
    keepAttributes: false
  }),
  EditorOrderedList.configure({
    keepMarks: true,
    keepAttributes: false
  }),
  EditorListItem,
  EditorGapCursor,
  EditorTaskList,
  EditorTaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'editor-task-item'
    }
  }),
  EditorTable.configure({
    resizable: true,
    renderWrapper: false,
    handleWidth: 8,
    cellMinWidth: 60,
    lastColumnResizable: true,
    View: EditorTableView,
    HTMLAttributes: {
      class: 'editor-table'
    }
  }),
  TableRow,
  EditorTableHeader,
  EditorTableCell,
  createEditorImage(collectionPath).configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'editor-image'
    }
  }),
  EditorTableKeyboard,
  ...(allowHtml ? [EditorRawHtmlBlock] : []),
  EditorKbd,
  EditorSuperscript,
  createEditorLink(collectionPath).configure({
    openOnClick: 'whenNotEditable',
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
      class: 'editor-link'
    }
  }),
  Markdown.configure({
    html: allowHtml,
    breaks: true,
    linkify: true,
    transformPastedText: true,
    transformCopiedText: true
  })
];

export default createExtensions;
