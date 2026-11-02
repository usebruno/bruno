import React from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { IconX } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import CodeEditor from 'components/CodeEditor';
import { toDisplayString } from '@usebruno/common/utils';
import { JSON_MODE } from '../constants';
import StyledWrapper from './StyledWrapper';

const SECTION_LABELS = {
  runtime: 'Runtime',
  environment: 'Environment'
};

const VariableDetailsDrawer = ({
  collection,
  section,
  name,
  value,
  environmentUid,
  onClose
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const editorValue = toDisplayString(value, '');
  const docKey = section === 'environment'
    ? `variables-drawer:environment:${environmentUid}:${name}`
    : `variables-drawer:${section}:${name}`;

  return (
    <StyledWrapper data-testid="variable-details-drawer">
      <div className="panel-header">
        <div className="panel-title">
          <span className="var-name" title={name} data-testid="variable-details-name">{name}</span>
          <span className="section-badge" data-testid="variable-details-section">({SECTION_LABELS[section]})</span>
        </div>
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          title="Close"
          data-testid="variable-details-close"
        >
          <IconX size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div className="panel-content">
        <CodeEditor
          collection={collection}
          value={editorValue}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          mode={JSON_MODE}
          readOnly
          enableBrunoVarInfo
          enableVariableHighlighting
          docKey={docKey}
        />
      </div>
    </StyledWrapper>
  );
};

export default VariableDetailsDrawer;
