import { Locator, Page, expect, test } from '../../../playwright';

export type SecretTargetType = 'global' | 'environment';

export const buildSecretVariableFormLocators = (page: Page) => {
  const noEnvironmentNote = (type: SecretTargetType) => page.getByTestId(`secret-variable-no-env-${type}`);
  return {
    actionLink: (fieldName: string) => page.getByTestId(`sensitive-field-action-${fieldName}`),
    container: () => page.getByTestId('secret-variable-form'),
    nameInput: () => page.getByTestId('secret-variable-name-input'),
    valueInput: () => page.getByTestId('secret-variable-value-input'),
    source: () => page.getByTestId('secret-variable-source'),
    target: (type: SecretTargetType) => page.getByTestId(`secret-variable-target-${type}`),
    noEnvironmentNote,
    createOneLink: (type: SecretTargetType) => page.getByTestId(`secret-variable-create-env-link-${type}`),
    createEnvironmentInput: (type: SecretTargetType) => page.getByTestId(`secret-variable-create-env-input-${type}`),
    createEnvironmentSubmit: (type: SecretTargetType) => page.getByTestId(`secret-variable-create-env-submit-${type}`),
    error: () => page.getByTestId('secret-variable-error')
  };
};

/** Pins the warning beside a sensitive input and clicks its action link. */
export const clickSensitiveFieldAction = async (page: Page, warning: Locator, fieldName: string) => {
  await test.step(`Click the action link on the "${fieldName}" warning`, async () => {
    const form = buildSecretVariableFormLocators(page);
    await warning.click();
    await form.actionLink(fieldName).click();
  });
};

/** Picks a "Save to" row and presses Enter in the Value input. */
export const saveSecretTo = async (page: Page, type: SecretTargetType) => {
  await test.step(`Save the secret to the ${type} environment`, async () => {
    const form = buildSecretVariableFormLocators(page);
    await form.target(type).click();
    await expect(form.target(type)).toHaveAttribute('aria-pressed', 'true');
    await form.valueInput().press('Enter');
  });
};
