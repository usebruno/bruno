import React from 'react';
import DocsTagList from '../DocsTagList';
import StyledWrapper from './StyledWrapper';

const IncludeExcludeTags = ({
  tags = { include: [], exclude: [] },
  availableTags = [],
  onChange,
  className = ''
}) => {
  const include = tags.include || [];
  const exclude = tags.exclude || [];
  const tagsHintList = availableTags.filter((tag) => !exclude.includes(tag) && !include.includes(tag));

  const handleValidation = (tag) => {
    const trimmedTag = tag.trim();
    if (!availableTags.includes(trimmedTag)) {
      return 'Tag does not exist';
    }
    if (include.includes(trimmedTag)) {
      return 'Tag is already in the include list';
    }
    if (exclude.includes(trimmedTag)) {
      return 'Tag is already in the exclude list';
    }
  };

  const handleAddTag = (tag, to) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    if (include.includes(trimmedTag) || exclude.includes(trimmedTag)) return;
    if (!availableTags.includes(trimmedTag)) return;
    onChange({ include, exclude, [to]: [...tags[to], trimmedTag].sort() });
  };

  const handleRemoveTag = (tag, from) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    if (!tags[from].includes(trimmedTag)) return;
    onChange({ include, exclude, [from]: tags[from].filter((existing) => existing !== trimmedTag) });
  };

  return (
    <StyledWrapper className={className}>
      <div className="tags-columns">
        <div className="tags-column">
          <span className="tags-label">Include tags</span>
          <DocsTagList
            tags={include}
            tagsHintList={tagsHintList}
            handleAddTag={(tag) => handleAddTag(tag, 'include')}
            handleRemoveTag={(tag) => handleRemoveTag(tag, 'include')}
            handleValidation={handleValidation}
            ariaLabel="Include tags"
            placeholder="e.g. Production ready"
          />
        </div>
        <div className="tags-column">
          <span className="tags-label">Exclude tags</span>
          <DocsTagList
            tags={exclude}
            tagsHintList={tagsHintList}
            handleAddTag={(tag) => handleAddTag(tag, 'exclude')}
            handleRemoveTag={(tag) => handleRemoveTag(tag, 'exclude')}
            handleValidation={handleValidation}
            ariaLabel="Exclude tags"
            placeholder="e.g, Work in progress"
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default IncludeExcludeTags;
