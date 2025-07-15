import { useState } from 'react';
import { IconX, IconTag } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { useTheme } from 'providers/Theme/index';

const TagList = ({ tagsHintList = [], handleAddTag, tags, handleRemoveTag, onSave, handleValidation }) => {
  const { displayedTheme } = useTheme();
  const tagNameRegex = /^[\w-]+$/;
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (value) => {
    setError('');
    setText(value);
  };

  const handleKeyDown = (e) => {
    if (!tagNameRegex.test(text)) {
      setError('Tags must only contain alpha-numeric characters, "-", "_"');
      return;
    }
    if (tags.includes(text)) {
      setError(`Tag "${text}" already exists`);
      return;
    }
    if (handleValidation) {
      const error = handleValidation(text);
      if (error) {
        setError(error);
        setText('');
        return;
      }
    }
    handleAddTag(text);
    setText('');
  };

  return (
    <StyledWrapper className="flex flex-wrap flex-col gap-2">
      <SingleLineEditor
        className="border border-gray-500/50 px-2"
        value={text}
        placeholder="Enter tag name (e.g., smoke, regression etc)"
        autocomplete={tagsHintList}
        showHintsOnClick={true}
        showHintsFor={[]}
        theme={displayedTheme}
        onChange={handleInputChange}
        onRun={handleKeyDown}
        onSave={onSave}
      />
      {error && <span className='text-xs text-red-500'>{error}</span>}
      <ul className="flex flex-wrap gap-1">
        {tags && tags.length
          ? tags.map((_tag) => (
              <li key={_tag}>
                <button
                  className="tag-item"
                  onClick={() => handleRemoveTag(_tag)}
                  type="button"
                >
                  <IconTag size={12} className="tag-icon" aria-hidden="true" />
                  <span className="tag-text" title={_tag}>
                    {_tag}
                  </span>
                  <IconX size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            ))
          : null}
      </ul>
    </StyledWrapper>
  );
};

export default TagList;
