import React from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { IconCheck, IconChevronLeft, IconChevronRight, IconCopy } from '@tabler/icons';
import { toDisplayString } from '@usebruno/common/utils';
import { useTheme } from 'providers/Theme';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import CodeEditor from 'components/CodeEditor';
import { COPY_FEEDBACK_MS, JSON_MODE, SCOPE_ICONS } from '../constants';
import ScopePill from '../ScopePill';
import { secretRevealKey } from '../utils';
import StyledWrapper from './StyledWrapper';

const ObjectView = ({ section, row, collection, onBack }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { copied, copyToClipboard } = useCopyToClipboard(COPY_FEEDBACK_MS);
  const editorValue = toDisplayString(row.value, '');
  const ScopeIcon = SCOPE_ICONS[section.scope];

  return (
    <StyledWrapper data-testid="variables-sidebar-object-view">
      <div className="object-breadcrumb">
        <button type="button" className="back-btn" onClick={onBack} title="Back" aria-label="Back" data-testid="variables-sidebar-object-back">
          <IconChevronLeft size={14} strokeWidth={1.5} />
        </button>
        <ScopeIcon size={14} strokeWidth={1.5} className="scope-icon" />
        <span className="scope-title">{section.title}</span>
        {section.pill && <ScopePill label={section.pill.label} color={section.pill.color} />}
        <IconChevronRight size={12} strokeWidth={1.5} className="separator" />
        <span className="variable-name" title={row.name} data-testid="variables-sidebar-object-name">{row.name}</span>
      </div>
      <div className="object-editor">
        <button
          type="button"
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={() => copyToClipboard(editorValue).catch(() => {})}
          title="Copy value"
          aria-label="Copy value"
        >
          {copied ? <IconCheck size={14} strokeWidth={2} /> : <IconCopy size={14} strokeWidth={1.5} />}
        </button>
        <CodeEditor
          collection={collection}
          value={editorValue}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          mode={JSON_MODE}
          docKey={`variables-sidebar-object:${secretRevealKey(section, row.name)}`}
          readOnly
          enableBrunoVarInfo
          enableVariableHighlighting
        />
      </div>
    </StyledWrapper>
  );
};

export default ObjectView;
