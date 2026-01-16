import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import registry from 'integrations/registry';

/**
 * Generic hook to query integration slots.
 * Re-renders when preferences change (integration enabled/disabled).
 *
 * @param {string} slotName - The slot type to query ('sidebar', 'search', 'menu', etc.)
 * @returns {Array} Array of slot configurations from enabled integrations
 */
const useIntegrationSlot = (slotName) => {
  const preferences = useSelector((state) => state.app.preferences);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    // Re-query when preferences change (integration enabled/disabled)
    console.log(registry.getSlot(slotName));
    setSlots(registry.getSlot(slotName));
  }, [slotName, preferences?.integrations]);

  return slots;
};

export default useIntegrationSlot;

// Convenience hooks for common slots
export const useSidebarSlots = () => useIntegrationSlot('sidebar');
export const useSearchSlots = () => useIntegrationSlot('search');
export const useMenuSlots = () => useIntegrationSlot('menu');
