import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import ButtonBar from 'components/ButtonBar';
import { IconPencil, IconCheck, IconX } from '@tabler/icons';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';

const md = new MarkdownIt();

const MarkdownEditor = ({ collection, content, defaultContent, isCurrentlyEditing, onEdit, onSave, onCancel }) => {
  const [isEditing, setIsEditing] = useState(isCurrentlyEditing);
  const [calculatedHeight, setCalculatedHeight] = useState(0);
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();
  const ref = useRef(null);
  const markdownItOptions = {
    replaceLink: function (link, env) {
      return link.replace(/^\./, collection.pathname);
    }
  };

  const handleClick = (event) => {
    if (event?.detail === 2) {
      // double click
      setIsEditing(true);
    }
  };

  const handleClickOutside = (event) => {
    // If the user clicks outside the editor, save the content and stop editing.
    if (isEditing && ref.current && !ref.current.contains(event.target)) {
      setIsEditing(false);
      onSave();
    }
  };

  useEffect(() => {
    // Attach the listeners on component mount.
    document.addEventListener('mousedown', handleClickOutside);

    // Detach the listeners on component unmount.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const md = new MarkdownIt(markdownItOptions).use(MarkdownItReplaceLink);
  const htmlFromMarkdown = md.render(content != null && content !== '' ? content : defaultContent);

  useEffect(() => {
    const updateHeight = () => {
      const div = ref.current;
      // get the top position of the div
      const top = div.getBoundingClientRect().top;
      // Calculate the remaining height
      const remainingHeight = window.innerHeight - top - 1;
      console.log('remainingHeight', remainingHeight);
      console.log('top', top);
      console.log('window.innerHeight', window.innerHeight);
      setCalculatedHeight(remainingHeight - 15);
    };

    // Run once to set initial height
    updateHeight();

    // Set up event listener for window resize
    window.addEventListener('resize', updateHeight);

    // Set up resize observer to update height when content changes
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(ref.current);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <StyledWrapper ref={ref} className="w-full relative">
      <div className="flex flex-col justify-between gap-3" style={{ height: `${calculatedHeight}px` }}>
        {isEditing ? (
          <>
            <div style={{ height: '100%', overflowY: 'scroll' }}>
              <CodeEditor
                collection={collection}
                theme={displayedTheme}
                value={content != null ? content : defaultContent}
                onEdit={onEdit}
                onSave={() => {
                  setIsEditing(false);
                  onSave();
                }}
                font={get(preferences, 'font.codeFont', 'default')}
                mode="application/text"
              />
            </div>
            <ButtonBar>
              <button
                onClick={() => {
                  setIsEditing(false);
                  onCancel();
                }}
              >
                <span className="flex items-center">
                  Cancel
                  <IconX size={18} strokeWidth={2} className="ml-1" />
                </span>
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  onSave();
                }}
              >
                <span className="flex items-center">
                  Save
                  <IconCheck size={18} strokeWidth={2} className="ml-1" />
                </span>
              </button>
            </ButtonBar>
          </>
        ) : (
          <>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: htmlFromMarkdown }}
              onClick={handleClick}
              style={{ cursor: 'text', width: '100%' }}
            />
            <ButtonBar text="Edit" handleClick={() => setIsEditing(true)}>
              <button
                onClick={() => {
                  setIsEditing(true);
                }}
              >
                <span className="flex items-center">
                  Edit
                  <IconPencil size={18} strokeWidth={2} className="ml-2" />
                </span>
              </button>
            </ButtonBar>
          </>
        )}
      </div>
    </StyledWrapper>
  );
};

export default MarkdownEditor;
