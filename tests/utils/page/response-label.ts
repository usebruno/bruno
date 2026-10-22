import { Page } from '../../../playwright';

/**
 * Locators for the response label pane (PDF / ZPL preview shown beside the response body).
 */
export const buildResponseLabelLocators = (page: Page) => ({
  toggle: () => page.getByTestId('response-label-toggle'),
  pane: () => page.getByTestId('label-pane'),
  allowRendering: () => page.getByTestId('label-allow-rendering'),
  renderedImage: () => page.getByTestId('label-image'),
  error: () => page.getByTestId('label-error'),
  pdfCanvas: () => page.getByTestId('label-pdf-body').locator('canvas'),
  previous: () => page.getByTestId('label-prev'),
  next: () => page.getByTestId('label-next'),
  position: () => page.getByTestId('label-position'),
  downloadZpl: () => page.getByTestId('label-download-zpl'),
  downloadPng: () => page.getByTestId('label-download-png'),
  downloadPdf: () => page.getByTestId('label-download-pdf')
});
