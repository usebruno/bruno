import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { IconEdit, IconEye } from '@tabler/icons';
import find from 'lodash/find';
import Button from 'ui/Button';

const DocsAction = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = !!focusedTab?.docsEditing;

  return (
    <div className="flex flex-grow justify-end items-center mr-2">
      <Button
        variant="ghost"
        color="secondary"
        size="xs"
        className="docs-edit-toggle opacity-70 hover:opacity-100"
        onClick={() => dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: !isEditing }))}
        icon={isEditing ? <IconEye strokeWidth={1.5} /> : <IconEdit strokeWidth={1.5} />}
      >
        {isEditing ? 'Preview' : 'Edit'}
      </Button>
    </div>
  );
};

export default DocsAction;
