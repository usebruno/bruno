import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { updateResponseExampleStatusCode, updateResponseExampleStatusText } from 'providers/ReduxStore/slices/collections';
import statusCodePhraseMap from 'components/ResponsePane/StatusCode/get-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const ResponseExampleStatusInput = ({ item, collection, exampleUid, status, statusText }) => {
  const dispatch = useDispatch();
  const currentCode = status !== null && status !== '' ? String(status) : '';

  const options = useMemo(() => {
    const entries = Object.entries(statusCodePhraseMap).map(([code, phrase]) => {
      const isCurrent = currentCode === String(code);
      const label = isCurrent && statusText ? statusText : phrase;
      return {
        code: String(code),
        phrase: label,
        display: `${code} ${label}`
      };
    });

    if (currentCode && !statusCodePhraseMap[currentCode]) {
      entries.unshift({
        code: currentCode,
        phrase: statusText || '',
        display: statusText ? `${currentCode} ${statusText}` : currentCode
      });
    }

    return entries;
  }, [currentCode, statusText]);

  const getStatusClass = (code) => {
    const numStatus = parseInt(code, 10);
    if (!isNaN(numStatus)) {
      if (numStatus >= 200 && numStatus < 300) return 'text-ok';
      if (numStatus >= 300 && numStatus < 400) return 'text-warning';
      if (numStatus >= 400) return 'text-error';
    }
    return 'text-ok';
  };

  const handleChange = (event) => {
    const code = event.target.value;
    if (!code) {
      return;
    }

    const selected = options.find((option) => option.code === code);
    const phrase = selected?.phrase
      || statusCodePhraseMap[code]
      || (code === currentCode ? (statusText || '') : '');

    dispatch(updateResponseExampleStatusCode({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      statusCode: code
    }));

    dispatch(updateResponseExampleStatusText({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      statusText: phrase
    }));
  };

  return (
    <StyledWrapper>
      <select
        value={currentCode}
        onChange={handleChange}
        className={`response-status-input ${getStatusClass(currentCode)}`}
        data-testid="response-status-input"
      >
        {!currentCode ? (
          <option value="">Select status</option>
        ) : null}
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.display}
          </option>
        ))}
      </select>
    </StyledWrapper>
  );
};

export default ResponseExampleStatusInput;
