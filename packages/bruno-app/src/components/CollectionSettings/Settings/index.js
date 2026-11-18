import React, { useRef } from 'react';
import classnames from 'classnames';
import { IconAdjustmentsHorizontal, IconWorld, IconCertificate } from '@tabler/icons';
import StatusDot from 'components/StatusDot';
import Presets from '../Presets';
import ProxySettings from '../ProxySettings';
import ClientCertSettings from '../ClientCertSettings';
import StyledWrapper from './StyledWrapper';

export const SETTINGS_SECTIONS = ['presets', 'proxy', 'clientCert'];
export const DEFAULT_SETTINGS_SECTION = 'presets';

const ITEMS = [
  { key: 'presets', label: 'Presets', Icon: IconAdjustmentsHorizontal },
  { key: 'proxy', label: 'Proxy', Icon: IconWorld },
  { key: 'clientCert', label: 'Client certificates', Icon: IconCertificate }
];

const renderSection = (section, collection) => {
  switch (section) {
    case 'proxy':
      return <ProxySettings collection={collection} />;
    case 'clientCert':
      return <ClientCertSettings collection={collection} />;
    case 'presets':
    default:
      return <Presets collection={collection} />;
  }
};

const Settings = ({ collection, section, onSelect, indicators = {} }) => {
  const activeSection = SETTINGS_SECTIONS.includes(section) ? section : DEFAULT_SETTINGS_SECTION;
  const tabRefs = useRef({});
  const idPrefix = `collection-settings-${collection.uid}`;
  const groupLabelId = `${idPrefix}-group-label`;
  const panelId = `${idPrefix}-panel`;
  const tabId = (key) => `${idPrefix}-tab-${key}`;

  const handleKeyDown = (e) => {
    const focusedItem = ITEMS.find(
      ({ key }) => tabRefs.current[key] === document.activeElement
    );
    const currentKey = focusedItem?.key ?? activeSection;
    const currentIndex = ITEMS.findIndex(({ key }) => key === currentKey);

    let nextIndex;

    switch (e.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % ITEMS.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + ITEMS.length) % ITEMS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = ITEMS.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();

    const nextItem = ITEMS[nextIndex];
    tabRefs.current[nextItem.key]?.focus();
  };

  return (
    <StyledWrapper className="flex h-full w-full overflow-hidden">
      <div className="settings-sidebar" data-testid="collection-settings-sidebar">
        <div id={groupLabelId} className="settings-group-label">General</div>
        <div role="tablist" aria-orientation="vertical" aria-labelledby={groupLabelId} onKeyDown={handleKeyDown}>
          {ITEMS.map(({ key, label, Icon }) => {
            const isActive = key === activeSection;
            return (
              <button
                key={key}
                ref={(el) => (tabRefs.current[key] = el)}
                id={tabId(key)}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                className={classnames('settings-item', { active: isActive })}
                onClick={() => onSelect(key)}
                data-testid={`collection-settings-tab-${key}`}
              >
                <Icon size={16} strokeWidth={1.5} className="settings-item-icon" aria-hidden="true" />
                <span className="settings-item-label">{label}</span>
                {indicators[key] && <StatusDot />}
              </button>
            );
          })}
        </div>
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(activeSection)}
        className="settings-content"
        data-testid="collection-settings-section-content"
      >
        {renderSection(activeSection, collection)}
      </div>
    </StyledWrapper>
  );
};

export default Settings;
