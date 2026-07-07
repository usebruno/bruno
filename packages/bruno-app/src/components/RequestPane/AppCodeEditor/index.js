import React, { useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconAppWindow } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { buildAiContextPayload } from 'utils/ai';
import { updateAppCode } from 'providers/ReduxStore/slices/collections';
import { saveRequest, toggleAppModeAndSave } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const AppCodeEditor = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const code = item.draft ? get(item, 'draft.app.code', '') : get(item, 'app.code', '');

  const onEdit = (value) =>
    dispatch(updateAppCode({ code: value, itemUid: item.uid, collectionUid: collection.uid }));

  const onPreview = () =>
    dispatch(toggleAppModeAndSave({ enabled: true, itemUid: item.uid, collectionUid: collection.uid }));

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const { requestContext, variables: aiVariables } = useMemo(
    () => buildAiContextPayload(item, collection),
    [item, collection]
  );

  return (
    <StyledWrapper className="w-full h-full flex flex-col">
      <div className="app-toggle-row mb-3 px-1 pb-3 flex items-center justify-between">
        <p className="text-xs opacity-70">
          The app view replaces the request/response panes for this request.
        </p>
        <button
          type="button"
          className="btn btn-sm btn-secondary flex items-center gap-1"
          onClick={onPreview}
          data-testid="app-preview-btn"
        >
          <IconAppWindow size={14} strokeWidth={1.5} />
          Preview
        </button>
      </div>

      <div className="flex-1 app-editor relative" data-testid="app-code-editor">
        <CodeEditor
          collection={collection}
          value={code || ''}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          onEdit={onEdit}
          onSave={onSave}
          mode="htmlmixed"
        />
        <AIAssist
          scriptType="app-request"
          currentScript={code || ''}
          requestContext={requestContext}
          variables={aiVariables}
          onApply={onEdit}
        />
      </div>
    </StyledWrapper>
  );
};

export default AppCodeEditor;
