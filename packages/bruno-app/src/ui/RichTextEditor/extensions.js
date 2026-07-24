import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorGapCursor from './utils/EditorGapCursor';
import EditorHardBreak from './utils/EditorHardBreak';
import EditorListKeyboard from './utils/EditorListKeyboard';
import { serializeTable } from './utils/editorMarkdownSerialize';
import EditorTableKeyboard from './utils/EditorTableKeyboard';
import EditorTableView from './utils/EditorTableView';
import {
  EditorBulletList,
  EditorListItem,
  EditorOrderedList,
  EditorTaskItem,
  EditorTaskList
} from './utils/EditorTaskList';

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

const extensions = [
  TextStyle.configure({ types: [EditorListItem.name] }),
  StarterKit.configure({
    bulletList: false,
    listItem: false,
    orderedList: false,
    hardBreak: false,
    gapcursor: false
  }),
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
  TableHeader,
  TableCell,
  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      class: 'editor-image'
    }
  }),
  EditorTableKeyboard,
  Link.configure({
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
    html: true,
    breaks: true,
    linkify: true,
    transformPastedText: true,
    transformCopiedText: true
  })
];

export default extensions;
