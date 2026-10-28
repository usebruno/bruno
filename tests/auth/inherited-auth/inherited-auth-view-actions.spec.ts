import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, closeAllOpenTabs, openCollection, openInheritedAuth, readField, typeIntoField } from '../../utils/page';
import { AUTH_MODE_LABELS } from '../../utils/constants';

const COLLECTION_NAME = 'inherited-auth-collection';

test.beforeAll(async ({ pageWithUserData: page }) => {
  await openCollection(page, COLLECTION_NAME);
});

test.afterEach(async ({ pageWithUserData: page }) => {
  await closeAllOpenTabs(page);
});

test.afterAll(async ({ pageWithUserData: page }) => {
  await closeAllCollections(page);
});

test.describe('Inherited auth view actions', () => {
  test('Get Access Token, Clear Cache and Add Parameter are not shown', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'inherited-request', AUTH_MODE_LABELS.OAUTH2);

    await expect(auth.oauth2.additionalParams()).toBeVisible();
    await expect(auth.oauth2.getAccessTokenButton()).toHaveCount(0);
    await expect(auth.oauth2.clearCacheButton()).toHaveCount(0);
    await expect(auth.oauth2.addParameterButton()).toHaveCount(0);
  });

  test('Every additional parameters tab shows its params', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'inherited-request', AUTH_MODE_LABELS.OAUTH2);
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

  test('Additional parameter delete button is disabled', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'inherited-request', AUTH_MODE_LABELS.OAUTH2);
    const additionalParams = auth.oauth2.additionalParams();

    await auth.oauth2.additionalParamsTab('token').click();
    await expect(auth.oauth2.deleteParameterButtons()).toHaveCount(1);
    await expect(auth.oauth2.deleteParameterButtons()).toBeDisabled();
    await expect(additionalParams.getByText('token-body-key')).toBeVisible();
  });

  test('Client secret can be revealed', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'inherited-request', AUTH_MODE_LABELS.OAUTH2);

    await expect(auth.inheritedFields().getByText('inherited-client-secret')).toHaveCount(0);
    await auth.inheritedSecretToggle().click();
    await expect(auth.inheritedFields().getByText('inherited-client-secret')).toBeVisible();
  });

  test('Client secret cannot be edited', async ({ pageWithUserData: page }) => {
    await openInheritedAuth(page, COLLECTION_NAME, 'inherited-request', AUTH_MODE_LABELS.OAUTH2);
    await typeIntoField(page, 'Client Secret', '-edited');
    await expect.poll(() => readField(page, 'Client Secret')).toBe('inherited-client-secret');
  });

  test('Token viewer section expands and copies the token', async ({ pageWithUserData: page, installFakeClipboard }) => {
    const { auth } = buildCommonLocators(page);
    const clipboard = await installFakeClipboard(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'oauth2-request', AUTH_MODE_LABELS.OAUTH2, 'oauth2-folder');

    await test.step('Fetch a token from the source folder', async () => {
      await auth.inheritedMode().click();
      await auth.oauth2.getAccessTokenButton().click();
      await expect(auth.oauth2.tokenSection('Access Token')).toBeVisible();
    });

    await test.step('Expand the token section in the inherited view', async () => {
      await openInheritedAuth(page, COLLECTION_NAME, 'oauth2-request', AUTH_MODE_LABELS.OAUTH2);
      await expect(auth.oauth2.copyTokenButton()).toHaveCount(0);
      await auth.oauth2.tokenSection('Access Token').click();
      await auth.oauth2.tokenSection('Access Token').click();
      await auth.inheritedFields().locator('.group').hover();
      await expect(auth.oauth2.copyTokenButton()).toBeVisible();
    });

    await test.step('Copy the token', async () => {
      await auth.oauth2.copyTokenButton().hover();
      await auth.oauth2.copyTokenButton().click();
      const copiedToken = await clipboard.copiedText();
      await expect(auth.inheritedFields().getByText(copiedToken)).toBeVisible();
    });
  });

  test('Grant type dropdown does not open', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'inherited-request', AUTH_MODE_LABELS.OAUTH2);

    await auth.oauth2.grantTypeDropdown().click();
    await expect(auth.oauth2.grantTypeDropdown()).toHaveAttribute('aria-expanded', 'false');
    await expect(auth.oauth2.grantTypeMenu()).toBeHidden();
  });

  test('Signature method dropdown does not open', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'oauth1-request', AUTH_MODE_LABELS.OAUTH1, 'oauth1-folder');

    await auth.oauth1.signatureMethodDropdown().click();
    await expect(auth.oauth1.signatureMethodDropdown()).toHaveAttribute('aria-expanded', 'false');
    await expect(auth.oauth1.signatureMethodMenu()).toBeHidden();
  });

  test('Add params to dropdown does not open', async ({ pageWithUserData: page }) => {
    const { auth } = buildCommonLocators(page);
    await openInheritedAuth(page, COLLECTION_NAME, 'oauth1-request', AUTH_MODE_LABELS.OAUTH1, 'oauth1-folder');

    await auth.oauth1.placementDropdown().click();
    await expect(auth.oauth1.placementDropdown()).toHaveAttribute('aria-expanded', 'false');
    await expect(auth.oauth1.placementMenu()).toBeHidden();
  });
});
