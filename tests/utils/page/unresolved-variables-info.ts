import { Page, expect, test } from '../../../playwright';

export const buildUnresolvedVariablesInfoLocators = (page: Page) => ({
  card: () => page.getByTestId('unresolved-variables-info'),
  names: () => page.getByTestId('unresolved-variables-names'),
  count: () => page.getByTestId('unresolved-variables-count'),
  popoverInsideElement: (id: string) => page.locator(`[id="${id}"]`).getByTestId('unresolved-variables-popover'),
  popoverNames: () => page.getByTestId('unresolved-variables-popover').locator('li'),
  copyButton: () => page.getByTestId('unresolved-variables-copy'),
  closeButton: () => page.getByTestId('unresolved-variables-info-close')
});

export const openUnresolvedVariablesPopover = async (page: Page) => {
  await test.step('Open the unresolved variables popover', async () => {
    const info = buildUnresolvedVariablesInfoLocators(page);
    await info.count().hover();
    await info.popoverNames().first().waitFor({ state: 'visible' });
  });
};

export const openUnresolvedVariablesPopoverWithKeyboard = async (page: Page) => {
  await test.step('Focus the variable count to open the popover', async () => {
    const info = buildUnresolvedVariablesInfoLocators(page);
    await info.count().focus();
    await info.popoverNames().first().waitFor({ state: 'visible' });
  });
};

export const copyUnresolvedVariableNames = async (page: Page) => {
  await test.step('Copy the unresolved variable names', async () => {
    const info = buildUnresolvedVariablesInfoLocators(page);
    await info.copyButton().click();
    await expect(info.copyButton()).toHaveAttribute('title', 'Copied');
  });
};
