import React, { useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import ToggleSwitch from 'components/ToggleSwitch';
import AIAssist from 'components/AIAssist';
import { buildRequestContextFromItem } from 'utils/ai';
import { updateAppCode, toggleAppMode } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const AppCodeEditor = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const code = item.draft ? get(item, 'draft.app.code', '') : get(item, 'app.code', '');
  const enabled = item.draft ? get(item, 'draft.app.enabled', false) : get(item, 'app.enabled', false);

  const onEdit = (value) =>
    dispatch(updateAppCode({ code: value, itemUid: item.uid, collectionUid: collection.uid }));

  const onToggle = () =>
    dispatch(toggleAppMode({ enabled: !enabled, itemUid: item.uid, collectionUid: collection.uid }));

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const requestContext = useMemo(() => buildRequestContextFromItem(item), [item]);

  return (
    <StyledWrapper className="w-full h-full flex flex-col">
      <div className="app-toggle-row mb-3 px-1 pb-3 flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-xs font-medium">Enable App</label>
          <p className="text-xs opacity-70">
            When enabled, replaces the request/response panes with the app view for this request.
          </p>
        </div>
        <ToggleSwitch isOn={enabled} handleToggle={onToggle} size="m" data-testid="app-enable-toggle" />
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
          mode="javascript"
        />
        <AIAssist
          scriptType="app-request"
          currentScript={code || ''}
          requestContext={requestContext}
          onApply={onEdit}
        />
      </div>
    </StyledWrapper>
  );
};

export default AppCodeEditor;
