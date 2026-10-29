import React from 'react';
import { SCOPE_ICON } from 'utils/codemirror/scopeIcons';

const VariableScopeIcon = ({ scopeType, muted }) => (
  <span
    className={`var-add-to-option-icon var-add-to-option-icon-${muted ? 'muted' : scopeType}`}
    dangerouslySetInnerHTML={{ __html: SCOPE_ICON[scopeType] }}
  />
);

export default VariableScopeIcon;
