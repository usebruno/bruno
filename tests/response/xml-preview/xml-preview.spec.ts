import type { Page } from '@playwright/test';
import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  openRequest,
  sendRequestAndWaitForResponse,
  switchToPreviewTab,
  expandAllXmlNodes
} from '../../utils/page/actions';

const COLLECTION_NAME = 'xml-preview';

/**
 * Every request in the fixture collection posts its payload to the echo server under an
 * `application/xml` content type, so the response body is exactly the XML named by the request.
 */
const openRequestAndPreviewXMLResponse = async (page: Page, name: string) => {
  await openRequest(page, COLLECTION_NAME, name);
  await sendRequestAndWaitForResponse(page);
  await switchToPreviewTab(page);
};

const expectCannotPreviewAsXml = async (page: Page) => {
  const locators = buildCommonLocators(page);

  await expect(locators.response.xmlTree()).toHaveCount(0);
  await expect(locators.response.previewErrorBanner()).toContainText('Cannot preview as XML');
  await expect(locators.response.previewErrorBanner()).toContainText('Failed to parse XML string. Invalid XML format.');
};

test.describe('XML Preview - well-formed responses', () => {
  test('renders the XML tree for a response served as application/xml', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openRequestAndPreviewXMLResponse(page, 'xml-response');

    await test.step('an application/xml response selects the XML format', async () => {
      await expect(locators.response.formatTab()).toHaveText('XML');
    });

    await test.step('expanding the tree reveals the nested element and its text', async () => {
      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      await expect(xmlTree).toBeVisible();
      await expect(xmlTree).toContainText('catalog');
      await expect(xmlTree).toContainText('_version');
      await expect(xmlTree).toContainText('2');
      await expect(xmlTree).toContainText('book');
      await expect(xmlTree).toContainText('_id');
      await expect(xmlTree).toContainText('b1');
      await expect(xmlTree).toContainText('title');
      await expect(xmlTree).toContainText('Bruno');
    });
  });

  test('renders the tree for a response whose root element is named <error>', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openRequestAndPreviewXMLResponse(page, 'xml-error-root');

    await test.step('an element named "error" is response data, not a parse failure', async () => {
      await expect(locators.response.previewErrorBanner()).toHaveCount(0);

      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      await expect(xmlTree).toContainText('Unauthorized');
      await expect(xmlTree).toContainText('The credentials provided are incorrect');
    });
  });

  test('renders the tree for a response with an <error> element nested below the root', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openRequestAndPreviewXMLResponse(page, 'xml-nested-error');

    await test.step('a nested "error" element is response data, not a parse failure', async () => {
      await expect(locators.response.previewErrorBanner()).toHaveCount(0);

      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      await expect(xmlTree).toContainText('response');
      await expect(xmlTree).toContainText('failed');
      await expect(xmlTree).toContainText('errors');
      await expect(xmlTree).toContainText('Unauthorized');
      await expect(xmlTree).toContainText('The credentials provided are incorrect');
    });
  });
});

test.describe('XML Preview - malformed responses', () => {
  test('shows the cannot-preview banner for XML whose root element is never closed', async ({
    pageWithUserData: page
  }) => {
    await openRequestAndPreviewXMLResponse(page, 'xml-unclosed-root');

    await expectCannotPreviewAsXml(page);
  });
});
