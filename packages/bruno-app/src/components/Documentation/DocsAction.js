import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { IconEdit, IconEye } from '@tabler/icons';
import find from 'lodash/find';

const DocsAction = ({ item }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = !!focusedTab?.docsEditing;

  return (
    <div className="flex flex-grow justify-end items-center mr-2">
      <button
        type="button"
        className="docs-edit-toggle flex items-center text-xs gap-1 opacity-70 hover:opacity-100 focus:outline-none"
        onClick={() => dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: !isEditing }))}
      >
        {isEditing ? (
          <>
            <IconEye size={16} strokeWidth={1.5} /> Preview
          </>
        ) : (
          <>
            <IconEdit size={16} strokeWidth={1.5} /> Edit
          </>
        )}
      </button>
    </div>
  );
};

export default DocsAction;
