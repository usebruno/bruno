import { useRef } from 'react';
import { IconChevronRight, IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useSidebarAccordion } from '../SidebarAccordionContext';
import ActionIcon from 'ui/ActionIcon/index';

const SidebarSection = ({
  id,
  title,
  icon: Icon,
  actions,
  children,
  className = ''
}) => {
  const { isExpanded, setSectionExpanded } = useSidebarAccordion();
  const expanded = isExpanded(id);
  const sectionRef = useRef(null);

  const handleToggle = () => setSectionExpanded(id, !expanded);

  return (
    <StyledWrapper className={className}>
      <div
        ref={sectionRef}
        className={`sidebar-section ${expanded ? 'expanded' : ''}`}
      >
        <div
          className="section-header"
          onClick={handleToggle}
        >
          <div className="section-header-left">
            <div
              className="section-icon-wrapper"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault(); handleToggle();
                }
              }}
            >
              <ActionIcon size="sm" className="section-toggle">
                {expanded ? (
                  <IconChevronDown size={12} stroke={1.5} />
                ) : (
                  <IconChevronRight size={12} stroke={1.5} />
                )}
              </ActionIcon>
              {Icon && <Icon size={14} stroke={1.5} className="section-icon" />}
            </div>
            <span className="section-title">{title}</span>
          </div>
          {actions && (
            <div
              className="section-actions"
              onClick={(e) => {
                e.stopPropagation();
                if (!expanded) {
                  setSectionExpanded(id, true);
                }
              }}
            >
              {actions}
            </div>
          )}
        </div>
        {expanded && (
          <div className="section-content">
            {children}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default SidebarSection;
