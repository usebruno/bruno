import React from 'react';
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

  return (
    <StyledWrapper className="flex h-full w-full overflow-hidden">
      <nav className="settings-sidebar" aria-label="Collection settings" data-testid="collection-settings-sidebar">
        <div className="settings-group-label">General</div>
        {ITEMS.map(({ key, label, Icon }) => {
          const isActive = key === activeSection;
          return (
            <button
              key={key}
              type="button"
              className={classnames('settings-item', { active: isActive })}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect(key)}
              data-testid={`collection-settings-tab-${key}`}
            >
              <Icon size={16} strokeWidth={1.5} className="settings-item-icon" aria-hidden="true" />
              <span className="settings-item-label">{label}</span>
              {indicators[key] && <StatusDot />}
            </button>
          );
        })}
      </nav>
      <div className="settings-content" data-testid="collection-settings-section-content">
        {renderSection(activeSection, collection)}
      </div>
    </StyledWrapper>
  );
};

export default Settings;
