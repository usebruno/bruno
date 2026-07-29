import React from 'react';
import { IconEdit, IconEye } from '@tabler/icons';
import Button from 'ui/Button';
import { useDocsEditingState } from '../useDocsEditingState';

const DocsAction = () => {
  const { isEditing, setEditing } = useDocsEditingState();

  return (
    <div className="flex flex-grow justify-end items-center mr-2">
      <Button
        variant="ghost"
        color="secondary"
        size="sm"
        className="docs-edit-toggle opacity-70 hover:opacity-100"
        onClick={() => setEditing(!isEditing)}
        icon={isEditing ? <IconEye strokeWidth={1.5} /> : <IconEdit strokeWidth={1.5} />}
      >
        {isEditing ? 'Preview' : 'Edit'}
      </Button>
    </div>
  );
};

export default DocsAction;
