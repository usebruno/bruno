import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import DocsGapCursor from './DocsGapCursor';
import DocsHardBreak from './DocsHardBreak';
import DocsListKeyboard from './DocsListKeyboard';
import { serializeTable } from './DocsMarkdownSerialize';
import DocsTableKeyboard from './DocsTableKeyboard';
import DocsTableView from './DocsTableView';
import {
  DocsBulletList,
  DocsListItem,
  DocsOrderedList,
  DocsTaskItem,
  DocsTaskList
} from './DocsTaskList';

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
  DocsHardBreak,
  DocsListKeyboard,
  DocsBulletList.configure({
    keepMarks: true,
    keepAttributes: false
  }),
  DocsOrderedList.configure({
    keepMarks: true,
    keepAttributes: false
  }),
  DocsListItem,
  DocsGapCursor,
  DocsTaskList,
  DocsTaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'docs-task-item'
    }
  }),
  DocsTable.configure({
    resizable: true,
    renderWrapper: false,
    handleWidth: 8,
    cellMinWidth: 60,
    lastColumnResizable: true,
    View: DocsTableView,
    HTMLAttributes: {
      class: 'docs-table'
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
  DocsTableKeyboard,
  Link.configure({
    openOnClick: true,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
      class: 'docs-link'
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
