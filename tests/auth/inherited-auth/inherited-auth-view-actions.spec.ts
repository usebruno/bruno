import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, openCollection, openRequest, readField, selectRequestPaneTab, typeIntoField } from '../../utils/page';
import { AUTH_MODE_LABELS } from '../../utils/constants';

const COLLECTION_NAME = 'inherited-auth-collection';

test.describe('Inherited OAuth2 auth view actions', () => {
  test.beforeEach(async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, COLLECTION_NAME);
    await openRequest(page, COLLECTION_NAME, 'inherited-request');
    await selectRequestPaneTab(page, 'Auth');
    await expect(locators.auth.inheritedMode()).toHaveText(AUTH_MODE_LABELS.OAUTH2);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Get Access Token, Clear Cache and Add Parameter are not shown', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);

    await expect(auth.oauth2.additionalParams()).toBeVisible();
    await expect(auth.oauth2.getAccessTokenButton()).toHaveCount(0);
    await expect(auth.oauth2.clearCacheButton()).toHaveCount(0);
    await expect(auth.oauth2.addParameterButton()).toHaveCount(0);
  });

  test('Every additional parameters tab shows its params', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    const additionalParams = auth.oauth2.additionalParams();

    await test.step('Authorization tab', async () => {
      await auth.oauth2.additionalParamsTab('authorization').click();
      await expect(additionalParams.getByText('auth-header-key')).toBeVisible();
      await expect(additionalParams.getByText('auth-header-value')).toBeVisible();
    });

    await test.step('Token tab', async () => {
      await auth.oauth2.additionalParamsTab('token').click();
      await expect(additionalParams.getByText('token-body-key')).toBeVisible();
      await expect(additionalParams.getByText('token-body-value')).toBeVisible();
    });

    await test.step('Refresh tab', async () => {
      await auth.oauth2.additionalParamsTab('refresh').click();
      await expect(additionalParams.getByText('refresh-query-key')).toBeVisible();
      await expect(additionalParams.getByText('refresh-query-value')).toBeVisible();
    });
  });

  test('Client secret can be revealed', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);

    await expect(auth.inheritedFields().getByText('inherited-client-secret')).toHaveCount(0);
    await auth.inheritedSecretToggle().click();
    await expect(auth.inheritedFields().getByText('inherited-client-secret')).toBeVisible();
  });

  test('Client secret cannot be edited', async ({ pageWithUserData: page }) => {
    await typeIntoField(page, 'Client Secret', '-edited');
    await expect.poll(() => readField(page, 'Client Secret')).toBe('inherited-client-secret');
  });

  test('Grant type dropdown does not open', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);

    await auth.oauth2.grantTypeDropdown().click();
    await expect(auth.oauth2.grantTypeMenu()).toBeHidden();
  });
});
