import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DocsCodeBlock } from './DocsCodeBlock';
import { lowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import protobuf from 'highlight.js/lib/languages/protobuf';

lowlight.registerLanguage('javascript', javascript);
lowlight.registerLanguage('typescript', typescript);
lowlight.registerLanguage('python', python);
lowlight.registerLanguage('java', java);
lowlight.registerLanguage('c', c);
lowlight.registerLanguage('cpp', cpp);
lowlight.registerLanguage('csharp', csharp);
lowlight.registerLanguage('go', go);
lowlight.registerLanguage('rust', rust);
lowlight.registerLanguage('ruby', ruby);
lowlight.registerLanguage('php', php);
lowlight.registerLanguage('bash', bash);
lowlight.registerLanguage('sql', sql);
lowlight.registerLanguage('yaml', yaml);
lowlight.registerLanguage('xml', xml);
lowlight.registerLanguage('css', css);
lowlight.registerLanguage('json', json);
lowlight.registerLanguage('markdown', markdown);
lowlight.registerLanguage('kotlin', kotlin);
lowlight.registerLanguage('swift', swift);
lowlight.registerLanguage('protobuf', protobuf);

const DocsCodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DocsCodeBlock);
  }
}).configure({ lowlight });

import EditorGapCursor from './EditorGapCursor';
import EditorHardBreak from './EditorHardBreak';
import EditorListKeyboard from './EditorListKeyboard';
import { serializeTable } from './EditorMarkdownSerialize';
import EditorTableKeyboard from './EditorTableKeyboard';
import EditorTableView from './EditorTableView';
import {
  EditorBulletList,
  EditorListItem,
  EditorOrderedList,
  EditorTaskItem,
  EditorTaskList
} from './EditorTaskList';

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
    gapcursor: false,
    codeBlock: false
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
  DocsCodeBlockExtension,
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
