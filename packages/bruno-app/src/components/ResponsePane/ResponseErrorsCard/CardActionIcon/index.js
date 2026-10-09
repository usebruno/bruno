import React from 'react';
import ActionIcon from 'ui/ActionIcon';

const CardActionIcon = ({ label, tooltipId, children, ...props }) => (
  <ActionIcon size="md" aria-label={label} data-tooltip-id={tooltipId} data-tooltip-content={label} {...props}>
    {children}
  </ActionIcon>
);

export default CardActionIcon;
