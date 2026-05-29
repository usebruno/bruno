import { useState } from 'react';
import { IconX, IconTag } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { useTheme } from 'providers/Theme/index';

// BRU file grammar restricts list items to `(alnum | "_" | "-")+`, so tag input
// must enforce that for `.bru`-format collections to keep generated files
// parseable. OpenCollection (yml) has no such restriction — its `Tag` schema is
// just `string`, so any non-empty trimmed value is valid.
//
// Returns `null` on valid input, or an error message string to display.
export const validateTagName = (text, collectionFormat) => {
  if (!text || !text.trim()) return null; // empty handled by caller
  if (collectionFormat === 'bru') {
    return /^[\p{L}\p{N}_-]+$/u.test(text)
      ? null
      : 'Tags in BRU format must only contain letters, numbers, "-", "_".';
  }
  // yml / opencollection / unknown: allow any non-empty string
  return null;
};

const TagList = ({ tagsHintList = [], handleAddTag, tags, handleRemoveTag, onSave, handleValidation, collectionFormat }) => {
  const { displayedTheme } = useTheme();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (value) => {
    setError('');
    setText(value);
  };

  const handleKeyDown = (e) => {
    if (!text.trim()) {
      return;
    }
    const validationError = validateTagName(text, collectionFormat);
    if (validationError) {
      setError(validationError);
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
        placeholder="e.g., smoke, regression"
        autocomplete={tagsHintList}
        showHintsOnClick={true}
        showHintsFor={[]}
        theme={displayedTheme}
        onChange={handleInputChange}
        onRun={handleKeyDown}
        onSave={onSave}
        data-testid="tag-input"
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
      <ul className="flex flex-wrap gap-1">
        {tags && tags.length
          ? tags.map((_tag) => (
              <li key={_tag}>
                <button
                  className="tag-item"
                  type="button"
                >
                  <IconTag size={12} className="tag-icon" aria-hidden="true" />
                  <span className="tag-text" title={_tag}>
                    {_tag}
                  </span>
                  <span className="tag-remove" title="Remove tag" onClick={() => handleRemoveTag(_tag)}>
                    <IconX size={12} strokeWidth={2} aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))
          : null}
      </ul>
    </StyledWrapper>
  );
};

export default TagList;
