/**
 * Shared onboarding state.
 *
 * The renderer's `renderer:ready` IPC handler must wait for onboarding to
 * complete before reading preferences, because onboarding may update them
 * (e.g. setting hasSeenWelcomeModal for new vs existing users).
 *
 * `resolveOnboarding()` is called from onboardUser's finally block.
 * `waitForOnboarding()` is awaited in the renderer:ready handler.
 */

let _resolve;
const onboardingComplete = new Promise((resolve) => {
  _resolve = resolve;
});

module.exports = {
  resolveOnboarding: () => _resolve(),
  waitForOnboarding: () => onboardingComplete
};
