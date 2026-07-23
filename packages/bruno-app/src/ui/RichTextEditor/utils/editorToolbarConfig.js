import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconCode,
  IconItalic,
  IconLink,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconQuote,
  IconSourceCode,
  IconStrikethrough,
  IconTable
} from '@tabler/icons';

export const HEADING_OPTIONS = [
  { id: 'normal', label: 'Normal', level: 0 },
  { id: 'h1', label: 'Heading 1', level: 1 },
  { id: 'h2', label: 'Heading 2', level: 2 },
  { id: 'h3', label: 'Heading 3', level: 3 },
  { id: 'h4', label: 'Heading 4', level: 4 },
  { id: 'h5', label: 'Heading 5', level: 5 },
  { id: 'h6', label: 'Heading 6', level: 6 }
];

export const buildToolbarActions = (onLinkClick) => [
  {
    id: 'bold',
    tooltip: 'Bold',
    Icon: IconBold,
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
    canRun: (editor) => editor.can().chain().focus().toggleBold().run()
  },
  {
    id: 'italic',
    tooltip: 'Italic',
    Icon: IconItalic,
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
    canRun: (editor) => editor.can().chain().focus().toggleItalic().run()
  },
  {
    id: 'strike',
    tooltip: 'Strikethrough',
    Icon: IconStrikethrough,
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
    canRun: (editor) => editor.can().chain().focus().toggleStrike().run()
  },
  {
    id: 'link',
    tooltip: 'Link',
    Icon: IconLink,
    run: (editor) => onLinkClick(editor),
    isActive: (editor) => editor.isActive('link'),
    canRun: (editor) =>
      !editor.isActive('code') && !editor.isActive('codeBlock')
  },
  {
    id: 'bulletList',
    tooltip: 'Bullet list',
    Icon: IconList,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
    canRun: (editor) => editor.can().chain().focus().toggleBulletList().run()
  },
  {
    id: 'orderedList',
    tooltip: 'Numbered list',
    Icon: IconListNumbers,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
    canRun: (editor) => editor.can().chain().focus().toggleOrderedList().run()
  },
  {
    id: 'taskList',
    tooltip: 'Task list',
    Icon: IconListCheck,
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
    isActive: (editor) => editor.isActive('taskList'),
    canRun: (editor) => editor.can().chain().focus().toggleTaskList().run()
  },
  {
    id: 'table',
    tooltip: 'Table',
    Icon: IconTable,
    run: (editor) => {
      const inserted = editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      if (!inserted) return;

      const { doc } = editor.state;
      if (doc.lastChild?.type.name === 'table') {
        editor.chain().insertContentAt(doc.content.size, { type: 'paragraph' }).run();
      }
    },
    isActive: (editor) => editor.isActive('table'),
    canRun: (editor) =>
      !editor.isActive('table')
      && !editor.isActive('codeBlock')
      && editor.can().chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    id: 'code',
    tooltip: 'Inline code',
    Icon: IconCode,
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
    canRun: (editor) =>
      !editor.isActive('code')
      && !editor.isActive('codeBlock')
      && editor.can().chain().focus().toggleCode().run()
  },
  {
    id: 'codeBlock',
    tooltip: 'Code block',
    Icon: IconSourceCode,
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive('codeBlock'),
    canRun: (editor) =>
      !editor.isActive('codeBlock') && editor.can().chain().focus().toggleCodeBlock().run()
  },
  {
    id: 'blockquote',
    tooltip: 'Quote',
    Icon: IconQuote,
    run: (editor) => {
      if (editor.isActive('blockquote')) {
        editor.commands.unsetBlockquote();
      } else {
        editor.chain()
          .unsetBlockquote() // unwrap any existing blockquotes to prevent nesting
          .setBlockquote()
          .command(({ tr }) => {
            let pos = 0;
            while (pos < tr.doc.content.size) {
              const node = tr.doc.nodeAt(pos);
              if (!node) {
                pos++;
                continue;
              }
              const $pos = tr.doc.resolve(pos);
              if ($pos.nodeBefore && $pos.nodeBefore.type.name === 'blockquote' && node.type.name === 'blockquote') {
                tr.join(pos);
                continue;
              }
              pos += node.nodeSize;
            }
            return true;
          })
          .run();
      }
      editor.commands.focus();
    },
    isActive: (editor) => editor.isActive('blockquote'),
    canRun: (editor) =>
      !editor.isActive('codeBlock')
      && (editor.can().unsetBlockquote() || editor.can().setBlockquote())
  },
  {
    id: 'undo',
    tooltip: 'Undo',
    Icon: IconArrowBackUp,
    run: (editor) => editor.chain().focus().undo().run(),
    canRun: (editor) => editor.can().chain().focus().undo().run()
  },
  {
    id: 'redo',
    tooltip: 'Redo',
    Icon: IconArrowForwardUp,
    run: (editor) => editor.chain().focus().redo().run(),
    canRun: (editor) => editor.can().chain().focus().redo().run()
  }
];
