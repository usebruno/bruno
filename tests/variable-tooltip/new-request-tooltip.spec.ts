import { test, expect } from '../../playwright';
import {
  addEnvironmentVariable,
  closeEnvironmentPanel,
  createCollection,
  createEnvironment,
  openNewRequestModal,
  openUrlVarTooltip,
  saveEnvironment
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

for (const { position, prefix } of [
  { position: 'below the URL', prefix: '' },
  { position: 'across the right dialog edge', prefix: 'https://example.com/?key=' }
]) {
  test(`New Request variable tooltip is usable ${position}`, async ({ newPage: page, createTmpDir, installFakeClipboard }, testInfo) => {
    const collectionName = 'Tooltip example';
    const requestName = 'Variable request';
    const variableValue = 'example-api-key';
    const { codeMirror, modal, request, sidebar, varInfoPopup } = buildCommonLocators(page);
    const clipboard = await installFakeClipboard(page);
    const tooltip = varInfoPopup.byName('apiKey');

    await test.step('Create an isolated collection with an environment variable', async () => {
      await page.setViewportSize({ width: 1000, height: 720 });
      await createCollection(page, collectionName, await createTmpDir('new-request-tooltip'));
      await createEnvironment(page, 'Example', 'collection');
      await addEnvironmentVariable(page, { name: 'apiKey', value: variableValue });
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);
    });

    await test.step('Select URL autocomplete in the New Request dialog', async () => {
      await openNewRequestModal(page, collectionName);
      await request.requestNameInput().fill(requestName);
      await request.newRequestUrl().click();
      await page.keyboard.type(`${prefix}{{api`);
      await codeMirror.hint('apiKey').click();
      await expect(request.newRequestUrl()).toContainClass('CodeMirror-focused');
      await page.keyboard.type('}}');
      await expect(request.newRequestUrl()).toContainText(`${prefix}{{apiKey}}`);
    });

    await test.step('Hover the URL variable and verify the popup is not occluded', async () => {
      await modal.newRequestVariableToken('apiKey').hover();
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveCSS('opacity', '1');
      await expect(varInfoPopup.editableValue(tooltip)).toHaveText(variableValue);
      await expect(tooltip).toBeInViewport({ ratio: 1 });
      await testInfo.attach('new-request-variable-tooltip', {
        body: await page.screenshot(),
        contentType: 'image/png'
      });

      // Visibility alone passes even when the modal covers the body-mounted popup.
      await expect.poll(() => tooltip.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].every(([x, y]) =>
          element.contains(document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y))
        );
      }), { message: 'The variable popup must be above the modal at its center and corners' }).toBe(true);
    });

    await test.step('Use the popup without closing the dialog, then create the request', async () => {
      await varInfoPopup.copyButton(tooltip).click();
      await expect.poll(clipboard.copiedText).toBe(variableValue);
      await expect(modal.byTitle('New Request')).toBeVisible();
      await expect(request.requestNameInput()).toHaveValue(requestName);
      await request.requestNameInput().click();
      await expect(tooltip).toHaveCount(0);
      await modal.button('Create').click();
      await expect(modal.any()).toHaveCount(0);
      await expect(tooltip).toHaveCount(0);
      await expect(sidebar.request(requestName)).toBeVisible();
    });

    await test.step('Use the same variable popup outside the dialog', async () => {
      await sidebar.request(requestName).click();
      await openUrlVarTooltip(page, 'apiKey');
      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
    });
  });
}
