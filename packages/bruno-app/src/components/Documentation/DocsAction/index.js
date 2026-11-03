import React from 'react';
import { IconEdit, IconEye } from '@tabler/icons';
import Button from 'ui/Button';
import { useDocsEditingState } from '../useDocsEditingState';
import StyledWrapper from './StyledWrapper';

const DocsAction = () => {
  const { isEditing, setEditing } = useDocsEditingState();

  return (
    <StyledWrapper>
      <Button
        variant="ghost"
        color="secondary"
        size="sm"
        data-testid="docs-edit-toggle"
        className="opacity-70 hover:opacity-100"
        onClick={() => setEditing(!isEditing)}
        icon={isEditing ? <IconEye strokeWidth={1.5} /> : <IconEdit strokeWidth={1.5} />}
      >
        {isEditing ? 'Preview' : 'Edit'}
      </Button>
    </StyledWrapper>
  );
};

export default DocsAction;
