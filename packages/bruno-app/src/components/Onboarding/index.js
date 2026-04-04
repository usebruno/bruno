/**
 * Onboarding System
 *
 * Provides interactive guided tours for Bruno.
 *
 * Usage:
 * 1. Import and render <OnboardingOverlay /> in your app root
 * 2. Add data-onboarding="target-name" attributes to elements you want to highlight
 * 3. Define guides in guides/index.js with steps referencing those targets
 * 4. Dispatch startGuide({ guideId }) to begin a tour
 *
 * Example:
 * <button data-onboarding="create-collection-button">Create Collection</button>
 *
 * In guide definition:
 * {
 *   target: '[data-onboarding="create-collection-button"]',
 *   title: 'Create Collection',
 *   content: 'Click here to create a new collection'
 * }
 */

export { default as OnboardingOverlay } from './OnboardingOverlay';
export { guides, getAllGuides, getGuideById, getGuideStep, getGuideTotalSteps, GUIDE_IDS } from './guides';
