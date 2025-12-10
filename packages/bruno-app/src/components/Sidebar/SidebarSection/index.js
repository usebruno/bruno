import React, { useState, useEffect } from 'react';
import { IconChevronRight, IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useSidebarAccordion } from '../SidebarAccordionContext';

const SidebarSection = ({
  id,
  title,
  icon: Icon,
  actions,
  children,
  className = ''
}) => {
  const { isExpanded, setSectionExpanded, getExpandedCount } = useSidebarAccordion();
  const [localExpanded, setLocalExpanded] = useState(() => isExpanded(id));
  const sectionRef = React.useRef(null);

  // Sync with context
  useEffect(() => {
    const expanded = isExpanded(id);
    setLocalExpanded(expanded);
  }, [id, isExpanded]);

  const handleToggle = () => {
    const newExpanded = !localExpanded;
    setLocalExpanded(newExpanded);
    setSectionExpanded(id, newExpanded);
  };

  const expandedCount = getExpandedCount();
  // Check if this is the only expanded section
  const isOnlyExpanded = expandedCount === 1 && localExpanded;

  return (
    <StyledWrapper className={className}>
      <div
        ref={sectionRef}
        className={`sidebar-section ${localExpanded ? 'expanded' : ''} ${isOnlyExpanded ? 'single-expanded' : ''} ${expandedCount > 1 && localExpanded ? 'multi-expanded' : ''}`}
        style={expandedCount > 1 && localExpanded ? { flex: '1 1 0%', marginBottom: 0 } : {}}
      >
        <div
          className="section-header"
          onClick={handleToggle}
        >
          <div className="section-header-left">
            <div className="section-icon-wrapper">
              <div className="section-toggle">
                {localExpanded ? (
                  <IconChevronDown size={12} stroke={1.5} />
                ) : (
                  <IconChevronRight size={12} stroke={1.5} />
                )}
              </div>
              {Icon && <Icon size={14} stroke={1.5} className="section-icon" />}
            </div>
            <span className="section-title">{title}</span>
          </div>
          {actions && (
            <div
              className="section-actions"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
        {localExpanded && (
          <div className="section-content">
            {children}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default SidebarSection;
