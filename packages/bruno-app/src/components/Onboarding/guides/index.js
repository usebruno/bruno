/**
 * Onboarding Guide Definitions
 *
 * Each guide contains:
 * - id: Unique identifier
 * - name: Display name
 * - description: Brief description shown in preferences
 * - steps: Array of step configurations
 *
 * Each step contains:
 * - id: Unique step identifier
 * - target: CSS selector for the element to highlight
 * - title: Step title
 * - content: Step description/content
 * - placement: Tooltip placement (top, bottom, left, right)
 * - spotlightPadding: Padding around highlighted element (default: 8)
 * - action: Optional action type that triggers next step ('click', 'input', etc.)
 * - waitForElement: Whether to wait for target element to appear
 * - highlightClick: Whether clicking the highlight should trigger action
 */

export const GUIDE_IDS = {
  WELCOME: 'welcome'
};

export const guides = {
  [GUIDE_IDS.WELCOME]: {
    id: GUIDE_IDS.WELCOME,
    name: 'Welcome to Bruno',
    description: 'Learn the basics of Bruno - create your first collection and send a request',
    icon: 'rocket',
    estimatedTime: '2 min',
    steps: [
      {
        id: 'collections-intro',
        target: '[data-onboarding="collections-section"]',
        title: 'Welcome to Bruno!',
        content: 'Bruno stores your API collections as files on your filesystem, making them perfect for Git version control. Let\'s create your first collection!',
        placement: 'right',
        spotlightPadding: 4
      },
      {
        id: 'create-collection-button',
        target: '[data-onboarding="add-collection-menu"]',
        title: 'Add a Collection',
        content: 'Click this button to create a new collection.',
        placement: 'bottom',
        spotlightPadding: 8,
        highlightClick: true,
        pulse: true
      },
      {
        id: 'create-collection-option',
        target: '[data-onboarding="create-collection-option"]',
        title: 'Create Collection',
        content: 'Select "Create Collection" to start a new collection from scratch.',
        placement: 'right',
        spotlightPadding: 4,
        waitForElement: true,
        highlightClick: true
      },
      {
        id: 'collection-name-input',
        target: '[data-onboarding="inline-collection-creator"]',
        title: 'Name Your Collection',
        content: 'Enter a name and press Enter or click the checkmark to create.',
        placement: 'right',
        spotlightPadding: 4,
        waitForElement: true,
        allowInteraction: true,
        advanceOnTargetRemoval: true
      },
      {
        id: 'collection-created',
        target: '[data-onboarding="collection-row"]:last',
        title: 'Collection Created!',
        content: 'Your collection is ready. Click on it to expand and see its contents.',
        placement: 'right',
        spotlightPadding: 4,
        waitForElement: true,
        highlightClick: true,
        pulse: true
      },
      {
        id: 'add-request-link',
        target: '[data-onboarding="add-request-link"]',
        title: 'Add a Request',
        content: 'Now let\'s add your first API request. Click here.',
        placement: 'right',
        spotlightPadding: 8,
        waitForElement: true,
        highlightClick: true,
        pulse: true
      },
      {
        id: 'add-http-request',
        target: '[data-onboarding="add-http-request-option"]',
        title: 'Create HTTP Request',
        content: 'Select "HTTP" to create a standard HTTP request.',
        placement: 'right',
        spotlightPadding: 4,
        waitForElement: true,
        highlightClick: true
      },
      {
        id: 'request-tabs',
        target: '[data-onboarding="request-tabs"]',
        title: 'Request Created!',
        content: 'Your new request is now open. You can have multiple requests open as tabs.',
        placement: 'bottom',
        spotlightPadding: 4,
        waitForElement: true
      },
      {
        id: 'url-bar',
        target: '[data-onboarding="url-bar"]',
        title: 'Enter URL',
        content: 'Type your API endpoint URL here. Select the HTTP method (GET, POST, etc.) on the left.',
        placement: 'bottom',
        spotlightPadding: 8,
        waitForElement: true
      },
      {
        id: 'send-button',
        target: '[data-onboarding="send-button"]',
        title: 'Send Request',
        content: 'Click here or press Ctrl/Cmd + Enter to send your request.',
        placement: 'left',
        spotlightPadding: 8,
        pulse: true,
        waitForElement: true
      },
      {
        id: 'response-pane',
        target: '[data-onboarding="response-pane"]',
        title: 'You\'re All Set!',
        content: 'Responses appear here with status, headers, and body. Explore more features like environments, scripts, and tests!',
        placement: 'top',
        spotlightPadding: 4,
        waitForElement: true
      }
    ]
  }
};

// Get all guides as array
export const getAllGuides = () => Object.values(guides);

// Get guide by ID
export const getGuideById = (guideId) => guides[guideId];

// Get guide step
export const getGuideStep = (guideId, stepIndex) => {
  const guide = guides[guideId];
  return guide?.steps?.[stepIndex] || null;
};

// Get total steps for a guide
export const getGuideTotalSteps = (guideId) => {
  const guide = guides[guideId];
  return guide?.steps?.length || 0;
};

export default guides;
