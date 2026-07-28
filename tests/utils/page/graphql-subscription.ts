import { Page } from '../../../playwright';

export const buildGraphqlSubscriptionCommonLocators = (page: Page) => ({
  connectionControls: {
    subscribe: () => page.getByTestId('gql-sub-subscribe-button'),
    unsubscribe: () => page.getByTestId('gql-sub-unsubscribe-button')
  },
  messages: () => page.locator('.gql-subscription-message'),
  incomingMessages: () => page.locator('.gql-subscription-message.gql-subscription-incoming'),
  outgoingMessages: () => page.locator('.gql-subscription-message.gql-subscription-outgoing'),
  errorMessages: () => page.locator('.gql-subscription-error'),
  infoMessages: () => page.locator('.gql-subscription-info'),
  // Info-message text is a single word/phrase (e.g. "Connected"), but the row's own
  // full text also includes an appended ISO timestamp with no separator — an exact
  // match against `.message-content` avoids both that and cross-matching, e.g. a
  // "Closed: Client unsubscribed" row satisfying a case-insensitive "Unsubscribed" filter.
  infoMessage: (text: string) => page.locator('.gql-subscription-info').filter({ has: page.locator('.message-content', { hasText: new RegExp(`^${text}$`) }) }),
  connectionParams: () => page.getByTestId('graphql-subscription-connection-params').locator('.CodeMirror'),
  connectionParamsEditor: () => page.getByTestId('graphql-subscription-connection-params').locator('.CodeMirror-code'),
  tabs: {
    query: () => page.getByRole('tab', { name: 'Query' }),
    headers: () => page.getByRole('tab', { name: 'Headers' }),
    auth: () => page.getByRole('tab', { name: 'Auth' }),
    connection: () => page.getByRole('tab', { name: 'Connection' }),
    settings: () => page.getByRole('tab', { name: 'Settings' }),
    docs: () => page.getByRole('tab', { name: 'Docs' })
  }
});
