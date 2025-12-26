import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import registry from 'integrations/registry';

// Synchronize registry state with the stored preferences.integrations map.
const useIntegrations = (context = {}) => {
  const preferences = useSelector((state) => state.app.preferences);
  const previouslyEnabledRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    const syncIntegrations = async () => {
      const integrationsPref = preferences?.integrations || {};
      const targetEnabled = new Set(
        Object.keys(integrationsPref).filter((id) => integrationsPref[id]?.enabled)
      );

      const prevEnabled = previouslyEnabledRef.current;
      const toDisable = [...prevEnabled].filter((id) => !targetEnabled.has(id));
      const toEnable = [...targetEnabled].filter((id) => !prevEnabled.has(id));

      // Disable ones that were previously enabled but are no longer marked enabled.
      for (const id of toDisable) {
        try {
          await registry.disable(id);
        } catch (err) {
          console.error(`Failed to disable integration ${id}:`, err);
        }
      }

      // Enable newly requested integrations that are registered.
      for (const id of toEnable) {
        if (!registry.getRegistered().includes(id)) {
          continue;
        }
        try {
          await registry.enable(id, context);
        } catch (err) {
          console.error(`Failed to enable integration ${id}:`, err);
        }
      }

      if (!cancelled) {
        previouslyEnabledRef.current = targetEnabled;
      }
    };

    syncIntegrations();

    return () => {
      cancelled = true;
    };
  }, [preferences]);
};

export default useIntegrations;
