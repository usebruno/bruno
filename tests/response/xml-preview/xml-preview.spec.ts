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
const openXmlResponseRequest = async (page: Page, name: string) => {
  await openRequest(page, COLLECTION_NAME, name);
  await sendRequestAndWaitForResponse(page);
  await switchToPreviewTab(page);
};

/**
 * Every malformed-XML response must fail the same way: no tree at all, plus a banner saying
 * why. Asserting only the banner would still pass if a half-built tree rendered beside it.
 */
const expectCannotPreviewAsXml = async (page: Page) => {
  const locators = buildCommonLocators(page);

  await expect(locators.response.xmlTree()).toHaveCount(0);
  await expect(locators.response.previewErrorBanner()).toContainText('Cannot preview as XML');
  await expect(locators.response.previewErrorBanner()).toContainText('Failed to parse XML string. Invalid XML format.');
};

test.describe('XML Preview - well-formed responses', () => {
  test('renders the XML tree for a response served as application/xml', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openXmlResponseRequest(page, 'xml-response');

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

    await openXmlResponseRequest(page, 'xml-error-root');

    await test.step('an element named "error" is response data, not a parse failure', async () => {
      await expect(locators.response.previewErrorBanner()).toHaveCount(0);

      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      await expect(xmlTree).toContainText('Unauthorized');
      await expect(xmlTree).toContainText('The credentials provided are incorrect');
    });
  });

  test('renders text content that is only significant because of its whitespace', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openXmlResponseRequest(page, 'xml-whitespace-text');

    await test.step('leading and trailing whitespace is trimmed away', async () => {
      await expandAllXmlNodes(page);

      await expect(locators.response.xmlTree()).toContainText('spaced');
    });
  });

  test('renders an element whose value differs between its attribute and its child element', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openXmlResponseRequest(page, 'xml-attributes-vs-elements');

    await test.step('both values are shown, and the attribute stays distinguishable by its prefix', async () => {
      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      // An attribute and a child element can share a name and disagree. The preview must show
      // both rather than let one silently overwrite the other, hence the `_` prefix on attributes.
      await expect(xmlTree).toContainText('_id');
      await expect(xmlTree).toContainText('from-attribute');
      await expect(xmlTree).toContainText('from-element');
    });
  });

  test('renders comments and a processing instruction without leaking them into the tree', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openXmlResponseRequest(page, 'xml-comments-and-pi');

    await test.step('only element data is rendered', async () => {
      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      await expect(xmlTree).toContainText('Bruno');
      // A comment or stylesheet instruction is markup, not response data; rendering it as a node
      // would invent fields the server never sent.
      await expect(xmlTree).not.toContainText('internal note');
      await expect(xmlTree).not.toContainText('xml-stylesheet');
    });
  });

  // DTD stands for Document Type Definition. In XML, a DTD defines the structure and allowed elements and attributes of the document.
  // Documents can declare a DTD inline with a <!DOCTYPE ...> declaration, which may also define custom entities or validation rules.
  test('renders a document declaring an inline DTD', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openXmlResponseRequest(page, 'xml-doctype-dtd');

    await test.step('the DTD is skipped and the document body still renders', async () => {
      await expandAllXmlNodes(page);
      const xmlTree = locators.response.xmlTree();
      await expect(xmlTree).toContainText('Bruno');
      await expect(xmlTree).not.toContainText('ELEMENT');
    });
  });

  test('renders XML prefixed with a UTF-8 byte order mark', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // The fixture carries its payload as `contentBase64`: a literal BOM in the request file would
    // be invisible in review and easy for an editor or formatter to silently strip.
    await openXmlResponseRequest(page, 'xml-bom-prefix');

    await test.step('the byte order mark does not make an otherwise valid document unpreviewable', async () => {
      await expandAllXmlNodes(page);
      await expect(locators.response.xmlTree()).toContainText('Bruno');
    });
  });
});

test.describe('XML Preview - malformed responses', () => {
  test('shows the cannot-preview banner for XML whose root element is never closed', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-unclosed-root');

    await expectCannotPreviewAsXml(page);
  });

  test('shows the cannot-preview banner for an element closed by a different tag name', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-mismatched-tag');

    await expectCannotPreviewAsXml(page);
  });

  test('shows the cannot-preview banner for text content holding an unescaped ampersand', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-unescaped-ampersand');

    await expectCannotPreviewAsXml(page);
  });

  test('shows the cannot-preview banner for an element carrying the same attribute twice', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-duplicate-attribute');

    await expectCannotPreviewAsXml(page);
  });

  test('shows the cannot-preview banner for a reference to an undeclared entity', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-undefined-entity');

    await expectCannotPreviewAsXml(page);
  });

  test('shows the cannot-preview banner for a document with two root elements', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-multiple-roots');

    await expectCannotPreviewAsXml(page);
  });

  test('shows the cannot-preview banner for a CDATA section that is never terminated', async ({
    pageWithUserData: page
  }) => {
    await openXmlResponseRequest(page, 'xml-unclosed-cdata');

    await expectCannotPreviewAsXml(page);
  });
});
