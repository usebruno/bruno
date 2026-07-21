import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorGapCursor from './EditorGapCursor';
import EditorHardBreak from './EditorHardBreak';
import EditorListKeyboard from './EditorListKeyboard';
import { serializeTable } from './EditorMarkdownSerialize';
import EditorTableKeyboard from './EditorTableKeyboard';
import EditorTableView from './EditorTableView';
import {
  DocsBulletList,
  DocsListItem,
  DocsOrderedList,
  DocsTaskItem,
  EditorTaskList
} from './EditorTaskList';

const DocsTable = Table.extend({
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

const extensions = [
  TextStyle.configure({ types: [DocsListItem.name] }),
  StarterKit.configure({
    bulletList: false,
    listItem: false,
    orderedList: false,
    hardBreak: false,
    gapcursor: false
  }),
  EditorHardBreak,
  EditorListKeyboard,
  DocsBulletList.configure({
    keepMarks: true,
    keepAttributes: false
  }),
  DocsOrderedList.configure({
    keepMarks: true,
    keepAttributes: false
  }),
  DocsListItem,
  EditorGapCursor,
  EditorTaskList,
  DocsTaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'editor-task-item'
    }
  }),
  DocsTable.configure({
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
  TableHeader,
  TableCell,
  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'docs-image'
    }
  }),
  EditorTableKeyboard,
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
      class: 'editor-link'
    }
  }),
  Markdown.configure({
    html: true,
    breaks: true,
    transformPastedText: true,
    transformCopiedText: true
  })
];

export default extensions;
