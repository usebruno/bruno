import { IconX } from '@tabler/icons';
import { useState } from 'react';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const TagList = ({ tags, onTagRemove, onTagAdd }) => {
  const tagNameRegex = /^[\w-]+$/;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');

  const handleChange = (e) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.code == 'Escape') {
      setText('');
      setIsEditing(false);
      return;
    }
    if (e.code !== 'Enter' && e.code !== 'Space') {
      return;
    }
    if (!tagNameRegex.test(text)) {
      toast.error('Tags must only contain alpha-numeric characters, "-", "_"');
      return;
    }
    if (tags.includes(text)) {
      toast.error(`Tag "${text}" already exists`);
      return;
    }
    onTagAdd(text);
    setText('');
    setIsEditing(false);
  };

  return (
    <StyledWrapper className="flex flex-wrap gap-2 mt-1">
      <ul className="flex flex-wrap gap-1">
        {tags && tags.length
          ? tags.map((_tag) => (
              <li key={_tag}>
                <span>{_tag}</span>
                <button tabIndex={-1} onClick={() => onTagRemove(_tag)}>
                  <IconX strokeWidth={1.5} size={20} />
                </button>
              </li>
            ))
          : null}
      </ul>
      {isEditing ? (
        <input
          type="text"
          placeholder="Space or Enter to add tag"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <button className="text-link select-none" onClick={() => setIsEditing(true)}>
          + Add
        </button>
      )}
    </StyledWrapper>
  );
};

export default TagList;
