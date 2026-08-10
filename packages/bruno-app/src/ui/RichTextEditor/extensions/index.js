import TableRow from '@tiptap/extension-table-row';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorGapCursor from './EditorGapCursor';
import EditorHardBreak from './EditorHardBreak';
import { EditorKbd, EditorSuperscript } from './EditorInlineHtmlMarks';
import EditorListKeyboard from './EditorListKeyboard';
import EditorParagraph from './EditorParagraph';
import { createEditorImage, createEditorLink } from './EditorRelativeAssets';
import EditorRawHtmlBlock from './EditorRawHtmlBlock';
import EditorTable from './EditorTable';
import { EditorTableCell, EditorTableHeader } from './EditorTableAlignment';
import EditorTableKeyboard from './EditorTableKeyboard';
import EditorTableView from './EditorTableView';
import {
  EditorBulletList,
  EditorListItem,
  EditorOrderedList,
  EditorTaskItem,
  EditorTaskList
} from './EditorTaskList';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import EditorCodeBlock from './EditorCodeBlock';
import { lowlight } from 'lowlight';

const EditorCodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EditorCodeBlock);
  },
  // Tiptap doesn't support Tab in codeblock. added a literal tab.
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => {
        if (!this.editor.isActive('codeBlock')) {
          return false;
        }
        const { state, view } = this.editor;
        const { tr, selection } = state;
        tr.insertText('\t', selection.from, selection.to);
        view.dispatch(tr);
        return true;
      }
    };
  }
}).configure({
  lowlight
});

const createExtensions = ({ allowHtml = true, collectionPath = '' } = {}) => [
  EditorCodeBlockExtension,
  TextStyle.configure({ types: [EditorListItem.name] }),
  StarterKit.configure({
    bulletList: false,
    listItem: false,
    orderedList: false,
    hardBreak: false,
    gapcursor: false,
    paragraph: false,
    codeBlock: false
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
    transformCopiedText: true,
    // The parsed ProseMirror bulletList node has no memory of whether the
    // source used `-`, `*`, or `+` — the marker carries no semantic meaning,
    // so serialization always normalizes to one consistent marker rather than
    // reading this option from an unset config (which read as accidental).
    bulletListMarker: '-'
  })
];

export default createExtensions;
