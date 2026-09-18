import React, { useCallback } from 'react';
import find from 'lodash/find';
import { IconLoader2 } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import SpecViewer from 'components/ApiSpecPanel/SpecViewer';
import StyledWrapper from 'components/ApiSpecPanel/StyledWrapper';
import { saveApiSpecToFile, updateApiSpecDraft } from 'providers/ReduxStore/slices/apiSpec';
import { updateApiSpecTabLeftPaneWidth } from 'providers/ReduxStore/slices/tabs';
import { findApiSpecByPathname } from 'utils/api-specs';

const ApiSpecTab = ({ tabUid }) => {
  const dispatch = useDispatch();

  const tab = useSelector((state) => find(state.tabs.tabs, (t) => t.uid === tabUid));
  const apiSpec = useSelector((state) => findApiSpecByPathname(state.apiSpec.apiSpecs, tab?.apiSpecPathname));
  const apiSpecUid = apiSpec?.uid;

  const handleDraftChange = useCallback(
    (content) => {
      if (!apiSpecUid) return;
      dispatch(updateApiSpecDraft({ uid: apiSpecUid, content }));
    },
    [dispatch, apiSpecUid]
  );

  const handleSave = useCallback(
    (content) => {
      if (!apiSpecUid) return;
      dispatch(saveApiSpecToFile({ uid: apiSpecUid, content })).catch(() => {});
    },
    [dispatch, apiSpecUid]
  );

  const handleLeftPaneWidthChange = useCallback(
    (width) => dispatch(updateApiSpecTabLeftPaneWidth({ uid: tabUid, apiSpecLeftPaneWidth: width })),
    [dispatch, tabUid]
  );

  if (!apiSpec) {
    return (
      <div className="flex items-center justify-center h-full gap-2 opacity-50">
        <IconLoader2 size={20} className="animate-spin" />
        <span>Loading API spec...</span>
      </div>
    );
  }

  return (
    <StyledWrapper className="flex flex-col flex-grow relative">
      <SpecViewer
        content={apiSpec.raw}
        resolvedSpec={apiSpec.resolvedJson}
        onSave={handleSave}
        draftContent={apiSpec.draft}
        onDraftChange={handleDraftChange}
        leftPaneWidth={tab?.apiSpecLeftPaneWidth ?? null}
        onLeftPaneWidthChange={handleLeftPaneWidthChange}
      />
    </StyledWrapper>
  );
};

export default ApiSpecTab;
