// Integrations Registry
// Minimal skeleton for milestone 1 per spec

const registry = new Map(); // id -> metadata
const enabledIntegrations = new Map(); // id -> { metadata, instance, dispose }

const register = (metadata) => {
  if (!metadata || !metadata.id) {
    throw new Error('Integration metadata must include an `id`');
  }
  if (registry.has(metadata.id)) {
    return false;
  }
  registry.set(metadata.id, metadata);
  return true;
};

const unregister = async (id) => {
  if (!registry.has(id)) return false;
  if (enabledIntegrations.has(id)) {
    await disable(id);
  }
  registry.delete(id);
  return true;
};

const enable = async (id, context = {}) => {
  if (!registry.has(id)) {
    throw new Error(`Integration not registered: ${id}`);
  }
  if (enabledIntegrations.has(id)) return true; // already enabled

  const metadata = registry.get(id);
  let disposeFn = null;
  try {
    if (metadata.init) {
      const maybeDispose = await metadata.init(context);
      // If init returns a dispose function, prefer that, otherwise use metadata.dispose
      if (typeof maybeDispose === 'function') {
        disposeFn = maybeDispose;
      } else if (metadata.dispose && typeof metadata.dispose === 'function') {
        disposeFn = metadata.dispose;
      }
    }
  } catch (err) {
    console.error(`Error initializing integration ${id}:`, err);
    return false;
  }

  enabledIntegrations.set(id, { metadata, dispose: disposeFn });
  return true;
};

const disable = async (id) => {
  if (!enabledIntegrations.has(id)) return true; // already disabled
  const wrapper = enabledIntegrations.get(id);
  try {
    if (wrapper.dispose) {
      await wrapper.dispose();
    }
  } catch (err) {
    console.error(`Error disposing integration ${id}:`, err);
  }
  enabledIntegrations.delete(id);
  return true;
};

const getEnabled = () => {
  return Array.from(enabledIntegrations.keys());
};

const getRegistered = () => {
  return Array.from(registry.keys());
};

const getRegisteredMetadata = () => {
  return Array.from(registry.values());
};

const initWithPreferences = async (preferences = {}, context = {}) => {
  const integrations = preferences.integrations || {};
  for (const id of Object.keys(integrations)) {
    if (integrations[id]?.enabled) {
      // Only attempt to enable if registered
      if (registry.has(id)) {
        // don't await whole loop sequentially (but we can await each to keep lifecycle predictable)
        // await enable(id, context);
        try { await enable(id, context); } catch (err) { /* swallow and continue */ }
      }
    }
  }
};

// Test helper to reset internal state
const unregisterAll = () => {
  registry.clear();
  enabledIntegrations.clear();
};

const api = {
  register,
  unregister,
  enable,
  disable,
  getEnabled,
  getRegistered,
  getRegisteredMetadata,
  initWithPreferences,
  unregisterAll
};

export default api;
export {
  register,
  unregister,
  enable,
  disable,
  getEnabled,
  getRegistered,
  getRegisteredMetadata,
  initWithPreferences,
  unregisterAll
};
