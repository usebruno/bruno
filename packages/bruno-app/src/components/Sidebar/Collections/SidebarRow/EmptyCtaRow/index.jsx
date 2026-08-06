import React from 'react';
import range from 'lodash/range';
import { useDispatch } from 'react-redux';
import MenuDropdown from 'ui/MenuDropdown';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import { createEmptyStateMenuItems } from 'utils/collections/emptyStateRequest';
import StyledWrapper from './StyledWrapper';

// Flat "+ Add request" row emitted for an empty, expanded collection or folder.
const EmptyCtaRow = ({ collection, itemUid = null, depth = 1 }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const dispatch = useDispatch();

  if (!collection) return null;

  const menuItems = createEmptyStateMenuItems({ dispatch, collection, itemUid });
  const testId = itemUid ? 'add-request-cta-folder' : 'add-request-cta';

  return (
    <StyledWrapper>
      <div className="empty-cta-message">
        {range(depth).map((i) => (
          <div className="indent-block" key={i} style={{ width: 16, minWidth: 16, height: '100%' }}>
            &nbsp;
          </div>
        ))}
        <div style={{ paddingLeft: 8 }}>
          <MenuDropdown
            data-testid={testId}
            items={menuItems}
            placement="bottom-start"
            appendTo={dropdownContainerRef?.current || document.body}
            popperOptions={{ strategy: 'fixed' }}
          >
            <button className="ml-1 add-request-link">+ Add request</button>
          </MenuDropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default React.memo(EmptyCtaRow);
