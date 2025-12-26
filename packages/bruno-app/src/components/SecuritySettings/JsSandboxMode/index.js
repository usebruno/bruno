import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconShieldCheck, IconCode, IconX } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { saveCollectionSecurityConfig } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const SANDBOX_OPTIONS = [
  {
    key: 'safe',
    label: 'Safe Mode',
    description: 'JavaScript code is executed in a secure sandbox and cannot access your filesystem or execute system commands.',
    icon: IconShieldCheck,
    recommended: true
  },
  {
    key: 'developer',
    label: 'Developer Mode',
    description: 'JavaScript code has access to the filesystem, can execute system commands and access sensitive information.',
    icon: IconCode,
    warning: 'Use only if you trust the authors of the collection',
    recommended: false
  }
];

const JsSandboxMode = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const [selectedMode, setSelectedMode] = useState(collection?.securityConfig?.jsSandboxMode || 'safe');

  useEffect(() => {
    setSelectedMode(collection?.securityConfig?.jsSandboxMode || 'safe');
  }, [collection?.securityConfig?.jsSandboxMode]);

  const onDropdownCreate = (instance) => {
    dropdownRef.current = instance;
  };

  const closeDropdown = () => {
    dropdownRef.current?.hide();
  };

  const handleKeyDown = (e) => {
    if (e && e.key === 'Escape') {
      closeDropdown();
    }
  };

  const handleModeChange = (mode) => {
    if (!collection?.uid || mode === selectedMode) {
      return;
    }

    dispatch(
      saveCollectionSecurityConfig(collection.uid, {
        jsSandboxMode: mode
      })
    )
      .then(() => {
        setSelectedMode(mode);
        toast.success('Sandbox mode updated successfully');
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to update sandbox mode');
      });
  };

  const renderOption = (option) => {
    const OptionIcon = option.icon;
    const isActive = selectedMode === option.key;

    return (
      <button
        type="button"
        key={option.key}
        className={`sandbox-option ${option.key}-mode ${isActive ? 'active' : ''}`}
        onClick={() => handleModeChange(option.key)}
        data-testid={`sandbox-option-${option.key}`}
        role="menuitemradio"
        aria-checked={isActive}
      >
        <OptionIcon size={24} strokeWidth={2} />

        <div className="dropdown-label">
          <div className="sandbox-option-title">
            {option.label}
            {option.recommended && <span className="recommended-badge">Recommended</span>}
          </div>
          {option.warning && (<div className="developer-mode-warning">{option.warning}</div>)}
          <div className="sandbox-option-description">{option.description}</div>
        </div>
      </button>
    );
  };

  const triggerIcon = (
    <div
      className={`sandbox-icon ${selectedMode === 'developer' ? 'developer-mode' : 'safe-mode'}`}
      data-testid="sandbox-mode-selector"
    >
      {selectedMode === 'developer' ? <IconCode size={14} strokeWidth={2} /> : <IconShieldCheck size={14} strokeWidth={2} />}
    </div>
  );

  return (
    <StyledWrapper className="flex" onKeyDown={handleKeyDown}>
      <Dropdown onCreate={onDropdownCreate} icon={triggerIcon} placement="bottom-start">
        <div className="sandbox-dropdown">
          <div className="sandbox-header flex items-center justify-between">
            JavaScript Sandbox <IconX size={16} strokeWidth={1.5} onClick={closeDropdown} />
          </div>
          {SANDBOX_OPTIONS.map(renderOption)}
          <div className="sandbox-dropdown-footer">
            <p className="sandbox-dropdown-footer-text">You can change this setting anytime</p>
          </div>
        </div>
      </Dropdown>
    </StyledWrapper>
  );
};

export default JsSandboxMode;
