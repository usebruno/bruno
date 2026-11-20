import React, { useCallback, useRef, useState } from 'react';
import { IconChevronDown } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import useOnClickOutside from 'hooks/useOnClickOutside';
import SingleLineEditor from 'components/SingleLineEditor';
import MenuDropdown from 'ui/MenuDropdown';
import { AUTOCOMPLETE_TRIGGER } from 'utils/common/constants';
import { SCOPE_ICONS } from '../constants';
import { focusAtEnd, isInsideFloatingMenu } from '../utils';
import StyledWrapper from './StyledWrapper';

const DefineVariableEditor = ({ name, collection, item, addToScopes, onDefine }) => {
  const { displayedTheme } = useTheme();
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const [text, setText] = useState('');
  const [scopeType, setScopeType] = useState(() => addToScopes.find((scope) => scope.enabled)?.type);
  const selectedScope = addToScopes.find((scope) => scope.type === scopeType);
  const ScopeIcon = SCOPE_ICONS[scopeType];

  const commit = () => {
    if (!text.trim() || !selectedScope?.enabled) return;
    onDefine(name, text, scopeType);
  };

  useOnClickOutside(containerRef, (event) => {
    if (!isInsideFloatingMenu(event.target)) commit();
  }, text.trim() !== '');

  const scopeItems = addToScopes.map((scope) => {
    const Icon = SCOPE_ICONS[scope.type];
    return {
      id: scope.type,
      label: scope.label,
      leftSection: <Icon size={14} strokeWidth={1.5} />,
      disabled: !scope.enabled,
      testId: `variables-sidebar-add-to-${scope.type}`,
      onClick: () => {
        setScopeType(scope.type);
        focusAtEnd(editorRef.current?.editor);
      }
    };
  });

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setText('');
      editorRef.current?.editor?.getInputField().blur();
    }
  }, []);

  return (
    <StyledWrapper ref={containerRef} onKeyDown={handleKeyDown} data-testid="variables-sidebar-define-editor">
      <div className="define-input">
        <SingleLineEditor
          ref={editorRef}
          theme={displayedTheme}
          collection={collection}
          item={item}
          name={`variables-sidebar.define.${name}`}
          value={text}
          placeholder="Value"
          onChange={setText}
          onRun={commit}
          onSave={commit}
          variableAutocomplete={AUTOCOMPLETE_TRIGGER.DOUBLE_BRACE}
        />
      </div>
      <MenuDropdown
        items={scopeItems}
        header={<div className="add-to-label">Add to</div>}
        selectedItemId={scopeType}
        showTickMark
        placement="bottom-end"
        appendTo={() => document.body}
        data-testid="variables-sidebar-add-to"
      >
        <button
          type="button"
          className="scope-trigger"
          title={selectedScope ? `Add to ${selectedScope.label}` : 'Choose where to add it'}
          aria-label={selectedScope ? `Add to ${selectedScope.label}` : 'Choose where to add it'}
        >
          {ScopeIcon && <ScopeIcon size={14} strokeWidth={1.5} className="scope-icon" />}
          <IconChevronDown size={12} strokeWidth={1.5} />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default DefineVariableEditor;
