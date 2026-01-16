import { IconPlug } from '@tabler/icons';
import SidebarSection from 'components/Sidebar/SidebarSection';
import { useSidebarSlots } from 'integrations/hooks/useIntegrationSlot';
import StyledWrapper from './StyledWrapper';

/**
 * Sidebar section that renders components from enabled integrations.
 * Only renders if at least one enabled integration provides a sidebar slot.
 */
const IntegrationsSection = () => {
  const sidebarSlots = useSidebarSlots();

  // Don't render section if no integrations have sidebar components
  if (sidebarSlots.length === 0) {
    return null;
  }

  return (
    <SidebarSection
      id="integrations"
      title="Integrations"
      icon={IconPlug}
    >
      <StyledWrapper>
        {sidebarSlots.map((slot) => {
          const Component = slot.component;
          return (
            <div key={slot.integrationId} className="integration-panel">
              {slot.title && <div className="integration-panel-title">{slot.title}</div>}
              <Component />
            </div>
          );
        })}
      </StyledWrapper>
    </SidebarSection>
  );
};

export default IntegrationsSection;
