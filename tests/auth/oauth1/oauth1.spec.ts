import { test, expect } from '../../../playwright';
import {
  closeAllCollections, createCollection, createRequest, openRequest,
  selectRequestPaneTab, saveRequest
} from '../../utils/page';

const label = (page, text: string) => page.locator('label').filter({ hasText: new RegExp(`^${text}$`) });
const sectionLabel = (page, text: string) => page.locator('.oauth1-section-label').filter({ hasText: text });
const dropdownItem = (page, text: string) => page.locator('.dropdown-item').filter({ hasText: text });
const fieldRow = (page, text: string) => label(page, text).locator('..');
const editorIn = (row) => row.locator('.single-line-editor-wrapper .CodeMirror');

const typeInField = async (page, fieldName: string, value: string) => {
  await editorIn(fieldRow(page, fieldName)).click();
  await page.keyboard.type(value);
};

const selectAuthMode = async (page) => {
  await page.locator('.auth-mode-label').click();
  await dropdownItem(page, 'OAuth 1.0').click();
};

test.describe('OAuth 1.0 Authentication', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Request auth UI', async ({ page, createTmpDir }) => {
    // Setup
    await createCollection(page, 'oauth1-test', await createTmpDir());
    await createRequest(page, 'oauth1-request', 'oauth1-test', { url: 'https://example.com/api' });
    await openRequest(page, 'oauth1-test', 'oauth1-request');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page);

    // Sections
    await test.step('Three sections are visible', async () => {
      for (const name of ['Configuration', 'Signature', 'Advanced']) {
        await expect(sectionLabel(page, name)).toBeVisible();
      }
    });

    // HMAC fields (top-level, always visible)
    await test.step('HMAC mode shows correct fields', async () => {
      for (const name of ['Consumer Key', 'Consumer Secret', 'Token', 'Token Secret']) {
        await expect(label(page, name)).toBeVisible();
      }
      await expect(label(page, 'Private Key')).not.toBeVisible();
    });

    // Advanced section is collapsed by default
    await test.step('Advanced fields are hidden by default', async () => {
      for (const name of ['Callback URL', 'Verifier', 'Timestamp', 'Nonce', 'Version', 'Realm']) {
        await expect(label(page, name)).not.toBeVisible();
      }
    });

    // Expand Advanced section
    await test.step('Clicking Advanced expands the section', async () => {
      await sectionLabel(page, 'Advanced').click();
      for (const name of ['Callback URL', 'Verifier', 'Timestamp', 'Nonce', 'Version', 'Realm']) {
        await expect(label(page, name)).toBeVisible();
      }
    });

    // Signature method dropdown
    await test.step('All 7 signature methods in dropdown', async () => {
      const sigDropdown = fieldRow(page, 'Signature Method').locator('.oauth1-dropdown-selector');
      await sigDropdown.click();
      for (const method of ['HMAC-SHA1', 'HMAC-SHA256', 'HMAC-SHA512', 'RSA-SHA1', 'RSA-SHA256', 'RSA-SHA512', 'PLAINTEXT']) {
        await expect(dropdownItem(page, method)).toBeVisible();
      }
    });

    // RSA mode toggles fields
    await test.step('RSA mode shows Private Key, hides Consumer Secret', async () => {
      await dropdownItem(page, 'RSA-SHA256').click();
      const sigDropdown = fieldRow(page, 'Signature Method').locator('.oauth1-dropdown-selector');
      await expect(sigDropdown.locator('.oauth1-dropdown-label')).toContainText('RSA-SHA256');
      await expect(label(page, 'Private Key')).toBeVisible();
      await expect(label(page, 'Consumer Secret')).not.toBeVisible();

      // Private Key editor accepts input
      const pkEditor = page.locator('.private-key-editor-wrapper .CodeMirror');
      await expect(pkEditor).toBeVisible();
      await pkEditor.click();
      await page.keyboard.type('test-private-key');

      // Switch back to HMAC-SHA1
      await sigDropdown.click();
      await dropdownItem(page, 'HMAC-SHA1').click();
      await expect(label(page, 'Consumer Secret')).toBeVisible();
      await expect(label(page, 'Private Key')).not.toBeVisible();
    });

    // Collapse and re-expand Advanced
    await test.step('Clicking Advanced again collapses the section', async () => {
      await sectionLabel(page, 'Advanced').click();
      await expect(label(page, 'Callback URL')).not.toBeVisible();
      await expect(label(page, 'Timestamp')).not.toBeVisible();

      // Re-expand for subsequent steps
      await sectionLabel(page, 'Advanced').click();
      await expect(label(page, 'Callback URL')).toBeVisible();
    });

    // Fill fields
    await test.step('Fill form fields', async () => {
      await typeInField(page, 'Consumer Key', 'my-consumer-key');
      await typeInField(page, 'Token', 'my-token');
      await typeInField(page, 'Timestamp', '1234567890');
    });

    // Add Params To dropdown
    await test.step('Add Params To dropdown cycles options', async () => {
      const apDropdown = fieldRow(page, 'Add Params To').locator('.oauth1-dropdown-selector');
      await expect(apDropdown.locator('.oauth1-dropdown-label')).toContainText('Header');
      await apDropdown.click();
      await dropdownItem(page, 'Query Params').click();
      await expect(apDropdown.locator('.oauth1-dropdown-label')).toContainText('Query Params');
      await apDropdown.click();
      await dropdownItem(page, 'Header').click();
    });

    // Include Body Hash checkbox
    await test.step('Include Body Hash checkbox toggles', async () => {
      const checkbox = page.locator('input[type="checkbox"]');
      const bodyHashLabel = page.locator('label').filter({ hasText: 'Include Body Hash' });
      await expect(checkbox).not.toBeChecked();
      await bodyHashLabel.click();
      await expect(checkbox).toBeChecked();
      await bodyHashLabel.click();
      await expect(checkbox).not.toBeChecked();
    });

    await saveRequest(page);
  });

  test('Collection settings auth', async ({ page }) => {
    const collectionRow = page.getByTestId('collections').locator('#sidebar-collection-name').filter({ hasText: 'oauth1-test' });
    await collectionRow.click();
    await page.locator('.tab.auth').click();
    await selectAuthMode(page);

    await test.step('Sections are visible, Advanced collapsed by default', async () => {
      for (const name of ['Configuration', 'Signature', 'Advanced']) {
        await expect(sectionLabel(page, name)).toBeVisible();
      }
      // Advanced fields hidden by default
      await expect(label(page, 'Callback URL')).not.toBeVisible();
    });

    await test.step('Fill and save', async () => {
      await typeInField(page, 'Consumer Key', 'collection-consumer-key');
      await page.getByRole('button', { name: 'Save' }).click();
    });
  });
});
