import React from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';

import StyledWrapper from './StyledWrapper';

const QueryResult = ({ item, collection, data, width, disableRunEventListener, headers }) => {
  const { storedTheme } = useTheme();
  const dispatch = useDispatch();

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }
    dispatch(sendRequest(item, collection.uid));
  };

  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType);

  const formatResponse = (data, mode) => {
    if (!data) {
      return '';
    }

    if (mode.includes('json')) {
      return safeStringifyJSON(data, true);
    }

    if (mode.includes('xml')) {
      let parsed = safeParseXML(data, { collapseContent: true });

      if (typeof parsed === 'string') {
        return parsed;
      }

      return safeStringifyJSON(parsed, true);
    }

    if (['text', 'html'].includes(mode)) {
      if (typeof data === 'string') {
        return data;
      }

      return safeStringifyJSON(data);
    }

    // final fallback
    if (typeof data === 'string') {
      return data;
    }

    return safeStringifyJSON(data);
  };

  const value = formatResponse(data, mode);

  return (
    <StyledWrapper className="px-3 w-full" style={{ maxWidth: width }}>
      <div className="h-full">
        <CodeEditor collection={collection} theme={storedTheme} onRun={onRun} value={value} mode={mode} readOnly />
      </div>
    </StyledWrapper>
  );
};

export default QueryResult;
