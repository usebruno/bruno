import React from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';

const SecretEyeButton = ({ masked, onToggle, testId }) => (
  <button type="button" className="mx-2 shrink-0" onClick={onToggle} data-testid={testId}>
    {masked ? (
      <IconEyeOff size={18} strokeWidth={2} />
    ) : (
      <IconEye size={18} strokeWidth={2} />
    )}
  </button>
);

export default SecretEyeButton;
