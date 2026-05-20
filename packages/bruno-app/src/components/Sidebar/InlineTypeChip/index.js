import React from 'react';
import { IconChevronDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import RequestMethod from 'components/Sidebar/Collections/Collection/CollectionItem/RequestMethod';
import StyledWrapper from './StyledWrapper';

export const TYPE_OPTIONS = [
  { id: 'http', label: 'HTTP', bruType: 'http-request' },
  { id: 'graphql', label: 'GraphQL', bruType: 'graphql-request' },
  { id: 'grpc', label: 'gRPC', bruType: 'grpc-request' },
  { id: 'websocket', label: 'WebSocket', bruType: 'ws-request' }
];

const TypeBadge = ({ option }) => {
  if (option.id === 'http') {
    return <span className="inline-type-chip-http-badge">HTTP</span>;
  }
  return <RequestMethod item={{ type: option.bruType, request: { method: '' } }} />;
};

const InlineTypeChip = ({ value, onChange, appendTo }) => {
  const current = TYPE_OPTIONS.find((o) => o.id === value) || TYPE_OPTIONS[0];

  const menuItems = TYPE_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    leftSection: <TypeBadge option={option} />,
    onClick: () => onChange(option.id)
  }));

  return (
    <StyledWrapper>
      <MenuDropdown
        items={menuItems}
        placement="bottom-start"
        appendTo={appendTo}
        popperOptions={{ strategy: 'fixed' }}
        data-testid="inline-type-chip-menu"
      >
        <button
          type="button"
          className="inline-type-chip-trigger"
          onMouseDown={(e) => e.preventDefault()}
          title={`Request type: ${current.label}`}
          aria-label={`Request type: ${current.label}`}
          data-testid="inline-type-chip-trigger"
        >
          <TypeBadge option={current} />
          <IconChevronDown size={10} strokeWidth={2} />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default InlineTypeChip;
