import React, { useId, useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconX, IconTag } from '@tabler/icons';
import { StyledWrapper, Menu } from './StyledWrapper';

const TAG_NAME_REGEX = /^[\p{L}\p{N}_-](?:[\p{L}\p{N}_\s-]*[\p{L}\p{N}_-])?$/u;

const TagPicker = ({
  tags = [],
  tagsHintList = [],
  handleAddTag,
  handleRemoveTag,
  handleValidation,
  ariaLabel,
  placeholder = 'e.g., smoke, regression'
}) => {
  const baseId = useId();
  const menuId = `${baseId}-listbox`;
  const optionId = (index) => `${baseId}-option-${index}`;
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);
  const fieldRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = tagsHintList.filter((tag) => tag.toLowerCase().includes(text.trim().toLowerCase()));

  const positionMenu = useCallback(() => {
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    setMenuStyle({ top: rect.bottom + 2, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    positionMenu();
  }, [isOpen, positionMenu]);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);
    return () => {
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  }, [isOpen, positionMenu]);

  const addTag = (rawTag) => {
    const tag = rawTag.trim();
    if (!tag) return;
    if (!TAG_NAME_REGEX.test(tag)) {
      setError('Tags must only contain letters, numbers, spaces, "-", "_"');
      return;
    }
    if (tags.includes(tag)) {
      setError(`Tag "${tag}" already exists`);
      return;
    }
    if (handleValidation) {
      const validationError = handleValidation(tag);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    handleAddTag(tag);
    setText('');
    setError('');
    setIsOpen(false);
    setHighlighted(-1);
    inputRef.current?.blur();
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    setError('');
    setIsOpen(true);
    setHighlighted(e.target.value.trim() ? 0 : -1);
  };

  const showMenu = isOpen && suggestions.length > 0 && menuStyle;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      addTag(isOpen && highlighted >= 0 && suggestions[highlighted] ? suggestions[highlighted] : text);
      return;
    }
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setIsOpen(true);
      setHighlighted((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setIsOpen(true);
      setHighlighted((index) => Math.max(index - 1, 0));
      return;
    }
    if (e.key === 'Escape' && showMenu) {
      e.stopPropagation();
      setIsOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <StyledWrapper>
      <div className="tag-picker-field" ref={fieldRef}>
        <input
          ref={inputRef}
          type="text"
          className="tag-picker-input"
          value={text}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setIsOpen(false);
            setHighlighted(-1);
          }}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={Boolean(showMenu)}
          aria-controls={showMenu ? menuId : undefined}
          aria-activedescendant={showMenu && highlighted >= 0 ? optionId(highlighted) : undefined}
          aria-autocomplete="list"
          data-testid="tag-picker-input"
        />
      </div>

      {showMenu
        && createPortal(
          <Menu
            id={menuId}
            role="listbox"
            aria-label={ariaLabel}
            style={menuStyle}
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlighted}
                className={`tag-picker-menu-item ${index === highlighted ? 'highlighted' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(suggestion);
                }}
                onMouseEnter={() => setHighlighted(index)}
              >
                {suggestion}
              </li>
            ))}
          </Menu>,
          document.body
        )}

      {error && (
        <span className="tag-picker-error" role="alert">
          {error}
        </span>
      )}

      {tags.length > 0 && (
        <ul className="tag-picker-list">
          {tags.map((tag) => (
            <li key={tag} className="tag-picker-item">
              <IconTag size={16} className="tag-picker-icon" aria-hidden="true" strokeWidth={1.33} />
              <span className="tag-picker-text">
                {tag}
              </span>
              <button
                type="button"
                className="tag-picker-remove"
                aria-label={`Remove ${tag}`}
                onClick={() => handleRemoveTag(tag)}
              >
                <IconX size={12} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </StyledWrapper>
  );
};

export default TagPicker;
