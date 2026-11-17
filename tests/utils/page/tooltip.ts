import { Page } from '../../../playwright';

/** The visible tooltip containing `text`; hidden tooltips can linger in the DOM while fading out. */
export const tooltipByText = (page: Page, text: string) =>
  page.getByRole('tooltip').filter({ hasText: text, visible: true });
