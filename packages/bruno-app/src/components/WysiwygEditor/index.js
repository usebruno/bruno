import './styles.scss';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconSourceCode,
  IconQuote,
  IconList,
  IconListNumbers,
  IconLink,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconMarkdown,
  IconMenu4,
  IconChevronRight,
  IconChevronLeft
} from '@tabler/icons-react';
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import { EditorContent, useEditor, useCurrentEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import React, { useEffect, useRef } from 'react';
import { useMemo, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { uuid } from 'utils/common/index';

const EditorButton = ({ command, tooltip, Icon, editor, showText = false }) => {
  const handleClick = () => {
    editor.chain().focus()[command]().run();
  };

  const isCommandActive = editor.isActive(command);
  const canExecuteCommand = editor.can().chain().focus()[command]().run();
  const id = useMemo(() => uuid(), []);

  return (
    <button
      onClick={handleClick}
      disabled={!canExecuteCommand}
      className={`flex gap-2 cursor-pointer disabled:cursor-not-allowed items-center rounded p-1 ${
        isCommandActive ? 'bg-slate-50 text-gray-800' : 'hover:bg-gray-50 hover:text-gray-800 rounded p-1'
      }`}
      id={id}
    >
      <Icon size={16} />
      {!showText && <Tooltip className="flex" anchorId={id} html={tooltip} />}
      {showText && <span className="text-nowrap">{tooltip}</span>}
    </button>
  );
};

const MenuBar = ({ editor }) => {
  const [selectedHeading, setSelectedHeading] = useState(0);
  const [isToolbarNarrow, setIsToolbarNarrow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toolbarRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && !toolbarRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderExtraButtons = () => {
    if (isToolbarNarrow) {
      return (
        <div className="relative">
          <button
            id="menu"
            className="w-full h-full flex items-center"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
          >
            <IconMenu4 size={18} className="cursor-pointer outline-none " />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="flex flex-col gap-2 p-2 bg-black border border-gray-900 rounded absolute z-100"
            >
              <EditorButton command="toggleCode" tooltip="Code" Icon={IconCode} editor={editor} showText={true} />
              <EditorButton
                command="toggleCodeBlock"
                tooltip="Code block"
                Icon={IconSourceCode}
                editor={editor}
                showText={true}
              />
              <EditorButton
                command="toggleBlockquote"
                tooltip="Block quote"
                Icon={IconQuote}
                editor={editor}
                showText={true}
              />
              <EditorButton command="undo" tooltip="Undo" Icon={IconArrowBackUp} editor={editor} showText={true} />
              <EditorButton command="redo" tooltip="Redo" Icon={IconArrowForwardUp} editor={editor} showText={true} />
            </div>
          )}
        </div>
      );
    }

    return (
      <>
        <EditorButton command="toggleCode" tooltip="Code" Icon={IconCode} editor={editor} />
        <EditorButton command="toggleCodeBlock" tooltip="Code block" Icon={IconSourceCode} editor={editor} />
        <EditorButton command="toggleBlockquote" tooltip="Block quote" Icon={IconQuote} editor={editor} />
        <EditorButton command="undo" tooltip="Undo" Icon={IconArrowBackUp} editor={editor} />
        <EditorButton command="redo" tooltip="Redo" Icon={IconArrowForwardUp} editor={editor} />
      </>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      if (toolbarRef.current) {
        setIsToolbarNarrow(toolbarRef.current.offsetWidth < 366);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('mousemove', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleResize);
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div id="toolbar" ref={toolbarRef} className="flex mb-2 w-full z-50 relative min-w-[270px]">
      <div className="flex flex-wrap w-full items-center">
        <select
          className="border border-slate-800  rounded p-1 mr-2 bg-transparent"
          value={selectedHeading}
          onChange={(e) => {
            const level = parseInt(e.target.value, 10);
            if (!level) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level }).run();
            setSelectedHeading(level);
          }}
        >
          <option value="0">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
          <option value="5">Heading 5</option>
          <option value="6">Heading 6</option>
        </select>
        <EditorButton command="toggleBold" tooltip="Bold" Icon={IconBold} editor={editor} />
        <EditorButton command="toggleItalic" tooltip="Italic" Icon={IconItalic} editor={editor} />
        <EditorButton command="toggleStrike" tooltip="Strike-through" Icon={IconStrikethrough} editor={editor} />
        <EditorButton command="toggleBulletList" tooltip="Bullet list" Icon={IconList} editor={editor} />
        <EditorButton command="toggleOrderedList" tooltip="Ordered list" Icon={IconListNumbers} editor={editor} />
        {renderExtraButtons()}
      </div>
    </div>
  );
};

const extensions = [
  TextStyle.configure({ types: [ListItem.name] }),
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false // TODO : Making this as `false` because marks are not preserved when I try to preserve attrs, awaiting a bit of help
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false // TODO : Making this as `false` because marks are not preserved when I try to preserve attrs, awaiting a bit of help
    }
  }),
  Markdown
];

const WysiwygEditor = ({ editor }) => {
  return <EditorContent editor={editor} className="w-full h-full" />;
};

WysiwygEditor.extensions = extensions;
WysiwygEditor.MenuBar = MenuBar;

export default WysiwygEditor;
