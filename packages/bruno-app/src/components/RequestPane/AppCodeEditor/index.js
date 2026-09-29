import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconAppWindow } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import { updateAppCode } from 'providers/ReduxStore/slices/collections';
import { setTabAppPreview } from 'providers/ReduxStore/slices/tabs';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const AppCodeEditor = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const code = item.draft ? get(item, 'draft.app.code', '') : get(item, 'app.code', '');

  const onEdit = (value) =>
    dispatch(updateAppCode({ code: value, itemUid: item.uid, collectionUid: collection.uid }));

  const onPreview = () =>
    dispatch(setTabAppPreview({ uid: item.uid, appPreview: true }));

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <StyledWrapper className="w-full h-full flex flex-col">
      <div className="app-toolbar mb-3 pb-3 flex items-center justify-between gap-4">
        <p className="text-xs text-muted min-w-0">
          The app view replaces the request/response panes for this request.
        </p>
        <Button
          size="sm"
          icon={<IconAppWindow size={14} strokeWidth={1.5} />}
          onClick={onPreview}
          className="flex-shrink-0"
          data-testid="app-preview-btn"
        >
          Preview
        </Button>
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
      </div>
    </StyledWrapper>
  );
};

export default AppCodeEditor;
