import React, { useState, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { updateResponseExampleStatusCode, updateResponseExampleStatusText } from 'providers/ReduxStore/slices/collections';
import statusCodePhraseMap from 'components/ResponsePane/StatusCode/get-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const ResponseExampleStatusInput = ({ item, collection, exampleUid, status, statusText }) => {
  const dispatch = useDispatch();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Derive the display value directly from Redux state
  const getDisplayValue = () => {
    if (status && statusText) {
      return `${status} ${statusText}`;
    } else if (status) {
      return status;
    }
    return '';
  };

  // Create suggestions from status code map
  const suggestions = Object.entries(statusCodePhraseMap).map(([code, phrase]) => ({
    code: parseInt(code),
    phrase,
    display: `${code} ${phrase}`
  }));

  const handleInputChange = (e) => {
    const value = e.target.value;

    // Immediately update Redux state as user types
    parseAndSaveStatus(value);

    if (value.trim()) {
      // Filter suggestions based on input
      const filtered = suggestions.filter((suggestion) =>
        suggestion.display.toLowerCase().includes(value.toLowerCase())
        || suggestion.code.toString().includes(value)
        || suggestion.phrase.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    setShowSuggestions(false);

    // Save the status and statusText
    dispatch(updateResponseExampleStatusCode({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      statusCode: String(suggestion.code)
    }));

    dispatch(updateResponseExampleStatusText({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      statusText: suggestion.phrase
    }));
  };

  const parseAndSaveStatus = (value) => {
    const trimmedValue = value.trim();

    // Split on first space
    const parts = trimmedValue.split(' ');
    const statusCode = parts[0] || '';
    const statusText = parts.slice(1).join(' ');

    // Save both as strings - no validation needed
    dispatch(updateResponseExampleStatusCode({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      statusCode: statusCode
    }));

    dispatch(updateResponseExampleStatusText({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      statusText: statusText
    }));

    setShowSuggestions(false);
  };

  const handleBlur = (e) => {
    // Check if the blur is caused by clicking on a suggestion
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && relatedTarget.closest('.status-suggestions')) {
      return; // Don't close suggestions if clicking on them
    }

    // Small delay to allow click events on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const handleFocus = () => {
    const currentValue = getDisplayValue();
    if (currentValue.trim()) {
      const filtered = suggestions.filter((suggestion) =>
        suggestion.display.toLowerCase().includes(currentValue.toLowerCase())
        || suggestion.code.toString().includes(currentValue)
        || suggestion.phrase.toLowerCase().includes(currentValue.toLowerCase()));
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    }
  };

  const getStatusClass = (status) => {
    const numStatus = parseInt(status);
    if (!isNaN(numStatus)) {
      if (numStatus >= 200 && numStatus < 300) return 'text-ok';
      if (numStatus >= 300 && numStatus < 400) return 'text-warning';
      if (numStatus >= 400) return 'text-error';
    }
    return 'text-ok';
  };

  return (
    <StyledWrapper className="relative">
      <input
        ref={inputRef}
        type="text"
        value={getDisplayValue()}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder="e.g., 200 OK, 404 Unknown, 999 Custom Error"
        className={`response-status-input ${getStatusClass(status)}`}
        data-testid="response-status-input"
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="status-suggestions"
          data-testid="status-suggestions"
          onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking on suggestions
        >
          {filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.code}
              className="suggestion-item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectSuggestion(suggestion);
              }}
              onMouseDown={(e) => e.preventDefault()}
              data-testid={`suggestion-${suggestion.code}`}
            >
              <span className="status-code">{suggestion.code}</span>
              <span className="status-phrase">{suggestion.phrase}</span>
            </div>
          ))}
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponseExampleStatusInput;
