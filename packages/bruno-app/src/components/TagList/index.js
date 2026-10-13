import { useState } from 'react';
import { IconX, IconTag, IconFolder, IconChevronRight, IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import SingleLineEditor from 'components/SingleLineEditor/index';
import ToolHint from 'components/ToolHint/index';
import { useTheme } from 'providers/Theme/index';

const TagList = ({ tagsHintList = [], handleAddTag, tags, handleRemoveTag, onSave, handleValidation, collectionFormat, inheritedTags = [] }) => {
  const { displayedTheme } = useTheme();
  const isBruFormat = collectionFormat === 'bru';
  const tagNameRegex = isBruFormat ? /^[\p{L}\p{N}_-]+$/u : /^[\p{L}\p{N}_-](?:[\p{L}\p{N}_\s-]*[\p{L}\p{N}_-])?$/u;
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [showInheritedTags, setShowInheritedTags] = useState(false);

  const handleInputChange = (value) => {
    setError('');
    setText(value);
  };

  const handleKeyDown = (e) => {
    if (!text.trim()) {
      return;
    }
    if (!tagNameRegex.test(text)) {
      setError(isBruFormat
        ? 'Tags in BRU format must only contain letters, numbers, "-", "_".'
        : 'Tags must only contain letters, numbers, spaces, "-", "_"'
      );
      return;
    }
    if (tags.includes(text)) {
      setError(`Tag "${text}" already exists`);
      return;
    }
    const inherited = inheritedTags.find(({ tag }) => tag === text);
    if (inherited) {
      setError(`Tag "${text}" is already inherited from folder "${inherited.folder.name}"`);
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
      {error && <span className="text-xs text-red-500" data-testid="tag-error">{error}</span>}
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
      {inheritedTags.length > 0 && (
        <div className="inherited-tags">
          <button
            type="button"
            className="inherited-toggle"
            onClick={() => setShowInheritedTags((shown) => !shown)}
            aria-expanded={showInheritedTags}
            data-testid="inherited-tags-toggle"
          >
            {showInheritedTags ? (
              <IconChevronDown size={14} strokeWidth={2} aria-hidden="true" />
            ) : (
              <IconChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            )}
            <span>
              {inheritedTags.length} Inherited from parent
            </span>
          </button>
          {showInheritedTags && (
            <ul className="flex flex-wrap gap-1" data-testid="inherited-tag-list">
              {inheritedTags.map(({ tag, folder }, index) => (
                <li key={`inherited-${tag}`}>
                  <ToolHint
                    text={`Inherited from folder "${folder.name}"`}
                    toolhintId={`inherited-tag-${folder.uid}-${index}`}
                    className="tag-item inherited"
                    dataTestId="inherited-tag"
                  >
                    <IconFolder size={12} className="tag-icon" aria-hidden="true" />
                    <span className="tag-text">{tag}</span>
                  </ToolHint>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default TagList;
